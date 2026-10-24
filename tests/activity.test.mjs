import test from "node:test";
import assert from "node:assert/strict";
import { PageActivityClock, ACTIVITY_IDLE_MS, activitySummary, formatDuration } from "../activity.js";
import { freshState, validateBackup, recordAttempt, evaluateTask, formatAttemptValue, selectionDetails } from "../engine.js";
import { getModules } from "../course.js";

function controlledClock() {
  let milliseconds = 0;
  return { timer: new PageActivityClock(() => milliseconds), advance: (ms) => { milliseconds += ms; } };
}

test("Active time stops exactly at the idle threshold, even with a late heartbeat", () => {
  const { timer, advance } = controlledClock();
  timer.sample({ key: "de/1", visible: true, focused: true });
  advance(ACTIVITY_IDLE_MS + 45_000);
  assert.deepEqual(timer.sample(), {
    key: "de/1", enteredKey: null, pageMs: 165_000, visibleMs: 165_000, activeMs: 120_000,
  });
  advance(5_000);
  assert.equal(timer.sample({ interacted: true }).activeMs, 0, "new input does not backfill idle time");
  advance(10_000);
  assert.equal(timer.sample().activeMs, 10_000);
});

test("Hiding or blurring closes the old interval before pausing active time", () => {
  const { timer, advance } = controlledClock();
  timer.sample({ key: "fr/3", visible: true, focused: true });
  advance(20_000);
  assert.equal(timer.sample({ visible: false }).activeMs, 20_000);
  advance(300_000);
  assert.deepEqual(timer.sample({ visible: true, focused: false }), {
    key: "fr/3", enteredKey: null, pageMs: 300_000, visibleMs: 0, activeMs: 0,
  });
  advance(10_000);
  assert.equal(timer.sample({ focused: true }).activeMs, 0);
  advance(15_000);
  assert.equal(timer.sample().activeMs, 15_000, "returning to the page starts a fresh reading interval");
});

test("Rerenders do not reset idle or visits; routes, languages and closed pages stay separate", () => {
  const { timer, advance } = controlledClock();
  assert.equal(timer.sample({ key: "de/1", visible: true, focused: true }).enteredKey, "de/1");
  advance(100_000);
  assert.equal(timer.sample({ key: "de/1" }).enteredKey, null);
  advance(50_000);
  assert.equal(timer.sample({ key: "de/1" }).activeMs, 20_000);
  const change = timer.sample({ key: "fr/1" });
  assert.equal(change.key, "de/1");
  assert.equal(change.enteredKey, "fr/1");
  advance(25_000);
  assert.equal(timer.sample({ key: null }).activeMs, 25_000);
  advance(86_400_000);
  assert.equal(timer.sample({ key: "fr/1" }).pageMs, 0, "a closed page does not gain overnight time");
  assert.equal(timer.sample().activeMs, 0, "sampling twice cannot count the same interval twice");
});

test("Legacy progress has unknown timing; new timing survives backup and cannot contain invalid counters", () => {
  const legacy = freshState();
  for (const track of Object.values(legacy.tracks)) delete track.activity;
  const restored = validateBackup(legacy);
  assert.deepEqual(restored.tracks.de.activity, {});
  assert.equal(activitySummary(restored.tracks.de.activity[1]).tracked, false);
  const record = {
    firstVisitedAt: "2026-10-24T10:00:00.000Z", lastVisitedAt: "2026-10-24T10:06:00.000Z",
    visits: 2, pageMs: 120_000, visibleMs: 90_000, activeMs: 60_000,
  };
  restored.tracks.de.activity[1] = record;
  const copy = validateBackup(JSON.parse(JSON.stringify(restored)));
  assert.deepEqual(copy, restored);
  assert.deepEqual(activitySummary(copy.tracks.de.activity[1]), {
    ...record, tracked: true, idleMs: 30_000, awayMs: 30_000, idleAfterMs: 120_000,
  });
  record.activeMs = 1;
  assert.equal(copy.tracks.de.activity[1].activeMs, 60_000, "import does not retain object references");
  for (const mutation of [
    { pageMs: -1 }, { visibleMs: 120_001 }, { activeMs: 90_001 }, { activeMs: NaN },
    { pageMs: Infinity }, { activeMs: 1.2 }, { visits: 0 }, { extra: {} },
    { lastVisitedAt: "2020-01-01" }, { firstVisitedAt: "invalid" },
  ]) {
    const bad = structuredClone(copy);
    Object.assign(bad.tracks.de.activity[1], mutation);
    assert.throws(() => validateBackup(bad));
  }
  const bad = structuredClone(copy);
  bad.tracks.de.activity[13] = { ...copy.tracks.de.activity[1] };
  assert.throws(() => validateBackup(bad));
  assert.equal(formatDuration(3_723_999), "1 год 2 хв 3 с");
});

test("Failed text submissions retain original whitespace, spelling and Unicode after resubmission", () => {
  const state = freshState();
  const task = getModules("fr")[0].tasks.find((t) => t.type === "exact");
  const typed = "\n  cafe\u0301 <script> не ВИПРАВЛЯТИ  \n";
  recordAttempt(state.tracks.fr, task, typed, evaluateTask(task, typed));
  recordAttempt(state.tracks.fr, task, task.answer, evaluateTask(task, task.answer));
  const restored = validateBackup(JSON.parse(JSON.stringify(state)));
  const attempts = restored.tracks.fr.answers[task.id].attempts;
  assert.equal(attempts[0].status, "failed");
  assert.equal(attempts[0].value, typed);
  assert.equal(formatAttemptValue(task, attempts[0]), typed);
  assert.equal(attempts[1].status, "passed");
});

test("Choice attempts snapshot both zero-based indexes and option wording, including legacy attempts", () => {
  const state = freshState();
  const task = structuredClone(getModules("de")[0].tasks[0]);
  const value = String(task.answer === 0 ? 1 : 0);
  recordAttempt(state.tracks.de, task, value, evaluateTask(task, value));
  const attempt = state.tracks.de.answers[task.id].attempts[0];
  const wording = task.options[Number(value)];
  assert.deepEqual(attempt.selectedOptions, [{ index: Number(value), number: Number(value) + 1, value: wording }]);
  task.options[Number(value)] = "Later course wording";
  assert.match(formatAttemptValue(task, attempt), new RegExp(`індекс ${value}`));
  assert.ok(formatAttemptValue(task, attempt).includes(wording));
  assert.ok(!formatAttemptValue(task, attempt).includes("Later course wording"));
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(state))).tracks.de.answers[task.id].attempts[0], attempt);
  delete attempt.selectedOptions;
  assert.ok(formatAttemptValue(getModules("de")[0].tasks[0], attempt).includes(wording));
  for (const selectedOptions of [true, {}, [{ index: 0, number: 2, value: "x" }], [{ index: Number(value), number: Number(value) + 1, value: { toString: null } }]]) {
    attempt.selectedOptions = selectedOptions;
    assert.throws(() => validateBackup(state));
    assert.equal(formatAttemptValue(task, attempt), "Некоректні дані відповіді");
  }
});

test("Multiple selections retain every chosen index and value; duplicates and extra selections cannot pass", () => {
  const task = { id: "multi", type: "choice", multiple: true, options: ["TXT", "CSV", "WAV"], answer: [0, 1], xp: 40 };
  const track = freshState().tracks.en;
  const selected = ["0", "2"];
  recordAttempt(track, task, selected, evaluateTask(task, selected));
  selected[0] = "1";
  const attempt = track.answers.multi.attempts[0];
  assert.equal(attempt.status, "failed");
  assert.deepEqual(attempt.value, ["0", "2"]);
  assert.deepEqual(attempt.selectedOptions, [{ index: 0, number: 1, value: "TXT" }, { index: 2, number: 3, value: "WAV" }]);
  assert.ok(formatAttemptValue(task, attempt).includes("WAV"));
  assert.equal(evaluateTask(task, ["1", "0"]).status, "passed");
  for (const value of [[0, 0], [0, 1, 2], [0], [], [true, 1], "0", null])
    assert.equal(evaluateTask(task, value).status, "failed");
  assert.deepEqual(selectionDetails(task, null), []);
});
