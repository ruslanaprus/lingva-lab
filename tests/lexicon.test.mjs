import test from "node:test";
import assert from "node:assert/strict";
import {
  newLexicon,
  addEntry,
  readLexicon,
  serializeLexicon,
  inspectLexicon,
  lexiconText,
} from "../src/tools/lexicon.js";
import { renderDictionaryBuilder } from "../src/ui/exercises/lexicon.js";
import { lexiconFixture, lexiconMethod } from "./helpers/lexicon.mjs";
import { getPath } from "../content/registry.js";
import { freshState, validateBackup } from "../src/persistence/state.js";
import {
  recordAttempt,
  badges,
  trackStats,
  taskStatus,
} from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { portfolioAnswer } from "./helpers/answers.mjs";
import { createReportData } from "../src/reports/data.js";

test("Lexicon IDs remain stable after deletion; broken relations are retained as editable problems", () => {
  let d = lexiconFixture("de");
  d.entries = d.entries.filter((e) => e.id !== "S4");
  d = addEntry(d);
  assert.equal(d.entries.at(-1).id, "S6");
  assert.equal(d.entries.find((e) => e.id === "S3").target, "S4");
  const restored = readLexicon(serializeLexicon(d), "de");
  assert.deepEqual(restored, d);
  assert.ok(
    inspectLexicon(d).some((s) => s.includes("S3") && s.includes("наявного ID")),
  );
  assert.ok(
    renderDictionaryBuilder(serializeLexicon(d), "de").includes("запис видалений"),
  );
});

test("Lexicon parsing rejects unknown shapes, cross-language data, oversized fields and hostile keys", () => {
  const valid = lexiconFixture("fr");
  assert.deepEqual(readLexicon(serializeLexicon(valid), "fr"), valid);
  assert.equal(readLexicon(serializeLexicon(valid), "de"), null);
  for (const change of [
    (d) => {
      d.entries[0].extra = "unexpected";
    },
    (d) => {
      d.nextId = 1;
    },
    (d) => {
      d.entries[0].lemma = "x".repeat(81);
    },
    (d) => {
      d.entries[0].pos = "TRANSPORT";
    },
    (d) => {
      d.entries[0].target = "<img src=x onerror=alert(1)>";
    },
    (d) => {
      d.entries[1].id = d.entries[0].id;
    },
    (d) => {
      d.version = 999;
    },
  ]) {
    const d = structuredClone(valid);
    change(d);
    assert.equal(readLexicon(JSON.stringify(d), "fr"), null);
  }
  assert.equal(readLexicon('{"__proto__":{}}', "fr"), null);
  let d = newLexicon("en");
  while (d.entries.length < 8) d = addEntry(d);
  assert.throws(() => addEntry(d));
});

test("Lexicon UI escapes learner text and exports preserve Unicode and exact source fields", () => {
  const d = lexiconFixture("fr");
  d.entries[0].definition = '<img src=x onerror="alert(1)">';
  d.entries[0].note = "e\u0301 « цитата », знак < та &";
  const raw = serializeLexicon(d),
    html = renderDictionaryBuilder(raw, "fr");
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;img"));
  assert.equal(readLexicon(raw, "fr").entries[0].note, d.entries[0].note);
  assert.ok(lexiconText(d).includes(d.entries[0].note));
  assert.ok(!renderDictionaryBuilder("<img src=x>", "fr").includes("<img src=x>"));
});

for (const code of ["de", "fr", "en"]) {
  test(`${code}: mini-dictionary submission checks structure, records mistakes and awards the optional milestone once`, () => {
    const course = getPath(`${code}-foundations`),
      chapter = course.chapters.find((c) => c.id === "digital-dictionaries");
    const task = chapter.tasks.find((t) => t.editor === "dictionary");
    const state = freshState(),
      track = state.paths[course.id];
    const badge = () =>
      badges(course, track).find((b) => b.id === "mini-lexicographer");
    assert.equal(badge().unlocked, false);
    assert.deepEqual(inspectLexicon(lexiconFixture(code)), []);
    const answer = portfolioAnswer(task, code);
    const invalid = { ...answer, method: serializeLexicon(newLexicon(code)) };
    assert.equal(evaluateTask(task, invalid).status, "failed");
    recordAttempt(track, task, invalid, evaluateTask(task, invalid));
    assert.equal(badge().unlocked, false);
    assert.equal(evaluateTask(task, answer).status, "submitted");
    recordAttempt(track, task, answer, evaluateTask(task, answer));
    assert.equal(badge().unlocked, true);
    const xp = trackStats(course, track).xp;
    assert.equal(xp, 80);
    recordAttempt(track, task, answer, evaluateTask(task, answer));
    assert.equal(trackStats(course, track).xp, xp);
    const restored = validateBackup(JSON.parse(JSON.stringify(state)));
    assert.equal(
      restored.paths[course.id].answers[task.id].draft.method,
      lexiconMethod(code),
    );
    const report = createReportData({
      state: restored,
      course,
      track: restored.paths[course.id],
      chapterId: chapter.id,
    });
    assert.equal(
      report.tasks.find((t) => t.id === task.id).record.attempts[0].value.method,
      invalid.method,
    );
    assert.equal(
      report.tasks.find((t) => t.id === task.id).record.attempts[1].status,
      "submitted",
    );
  });
}

test("Revised dictionary distractors preserve old option text, indexes and XP without regrading history", () => {
  const course = getPath("de-foundations");
  const task = course.chapters
    .find((c) => c.id === "digital-dictionaries")
    .tasks.find((t) => t.id === "digital-dictionaries-first-equivalent");
  const previous = {
    ...structuredClone(task),
    revision: 1,
    options: [
      "Старий варіант помилки",
      "Стара правильна відповідь",
      "Інший старий варіант",
    ],
  };
  const state = freshState(),
    track = state.paths[course.id];
  recordAttempt(track, previous, 1, evaluateTask(previous, 1));
  track.answers[task.id].attempts[0].graderVersion = 5;
  assert.equal(taskStatus(track.answers[task.id], task), "new");
  recordAttempt(track, task, 0, evaluateTask(task, 0));
  recordAttempt(track, task, task.answer, evaluateTask(task, task.answer));
  assert.equal(trackStats(course, track).xp, task.xp);
  const restored = validateBackup(JSON.parse(JSON.stringify(state)));
  const attempts = restored.paths[course.id].answers[task.id].attempts;
  assert.equal(attempts[0].selectedOptions[0].value, previous.options[1]);
  assert.equal(attempts[1].selectedOptions[0].value, task.options[0]);
  assert.equal(attempts[0].graderVersion, 5);
  assert.equal(attempts[1].graderVersion, 6);
  assert.equal(attempts[0].definition.revision, 1);
  assert.equal(attempts[1].definition.revision, 2);
});
