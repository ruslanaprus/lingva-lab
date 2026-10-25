import { portfolioAnswer } from "./helpers/answers.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { LANGUAGES } from "../content/registry.js";
import { foundationChapters as getModules } from "./helpers/course.mjs";
import { freshState, validateBackup } from "../src/persistence/state.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import {
  recordAttempt,
  taskStatus,
  trackStats,
  sectionStats,
} from "../src/learning/progress.js";
import { createTerminal, runTerminal } from "../src/tools/terminal.js";
import { createGit, runGit } from "../src/tools/git.js";
import { wer, unicodePoints } from "../src/tools/text.js";
import { exportTextGrid } from "../src/tools/audio.js";

const workerSource = readFileSync(
  new URL("../src/workers/regex-worker.js", import.meta.url),
  "utf8",
);
function regex(task, value) {
  let response;
  const self = { postMessage: (v) => (response = v) };
  vm.runInNewContext(workerSource, { self });
  self.onmessage({ data: { ...value, corpus: task.corpus, type: task.type } });
  return response;
}
const portfolio = {
  artifact: "results/research-report.txt",
  method:
    "Я описую джерела, інструменти та дослідницьке питання. Вказую точні параметри аналізу, називаю отримані результати і спосіб їх незалежної перевірки.",
  reflection:
    "Мала вибірка не дозволяє узагальнювати результат на всю мовну спільноту. Потрібні додаткові контексти, незалежна анотація та перевірка даних.",
  confirm: true,
};

for (const lang of Object.keys(LANGUAGES))
  test(`All current tasks have attainable outcomes for ${lang}; portfolio remains pending review`, () => {
    const state = freshState(),
      track = state.paths[`${lang}-foundations`],
      l = LANGUAGES[lang];
    state.activePathId = `${lang}-foundations`;
    const modules = getModules(lang);
    assert.ok(modules.length > 0);
    const tasks = modules.flatMap((m) => m.tasks);
    assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length);
    for (const m of modules) {
      for (const t of m.tasks) {
        let v, result;
        if (["choice", "unicode", "wave"].includes(t.type)) v = t.answer;
        else if (t.type === "exact") v = t.answer;
        else if (t.type === "json") v = JSON.stringify(t.expected);
        else if (t.type === "regex") {
          v = {
            pattern:
              t.id === "regex-search-word-forms" ? l.regexExample : l.variantExample,
          };
          result = regex(t, v);
        } else if (t.type === "replace") {
          v = { pattern: "\\[\\d{2}:\\d{2}:\\d{2}\\] ", replacement: "" };
          result = regex(t, v);
        } else if (t.type === "portfolio") v = portfolioAnswer(t, lang);
        else if (t.type === "wer") v = t.reference;
        else if (t.type === "interval") v = { start: "0,60", end: "1.10", label: "B" };
        else if (t.type === "git") {
          v = createGit(lang);
          v.text = t.expected;
          v = runGit(v, "git add transcription.txt").state;
          v = runGit(v, 'git commit -m "Виправлено транскрипцію за джерелом"').state;
          v = runGit(v, "git log").state;
        } else if (t.type === "terminal") {
          v = { machine: createTerminal(lang), commands: [] };
          const commands =
            t.goal === "navigate"
              ? ["ls", "cd original/archive/1893", "cat lost.txt"]
              : t.goal === "copy"
                ? ["mkdir results", "cp original/interview.txt results/interview.txt"]
                : [`grep "${l.word}" corpus.txt`];
          for (const command of commands) {
            const r = runTerminal(v.machine, command);
            v.machine = r.machine;
            v.commands.push({
              input: command,
              ok: r.ok,
              action: r.action,
              target: r.target,
              pattern: r.pattern,
            });
            assert.equal(r.ok, true);
          }
        }
        const evaluated = evaluateTask(t, v, result);
        assert.equal(
          evaluated.status,
          t.type === "portfolio" ? "submitted" : "passed",
          `${lang} ${t.id}: ${JSON.stringify(result)} ${evaluated.feedback}`,
        );
        recordAttempt(track, t, v, evaluated);
      }
      assert.equal(sectionStats(m, track).complete, true);
    }
    const stats = trackStats(`${lang}-foundations`, track);
    assert.equal(
      stats.xp,
      tasks.reduce((sum, task) => sum + task.xp, 0),
    );
    assert.equal(
      stats.passed,
      tasks.filter((task) => task.type !== "portfolio").length,
    );
    assert.equal(
      stats.submitted,
      tasks.filter((task) => task.type === "portfolio").length,
    );
    assert.equal(stats.sections, modules.filter((chapter) => chapter.required).length);
    assert.equal(
      validateBackup(JSON.parse(JSON.stringify(state))).activePathId,
      `${lang}-foundations`,
    );
  });

test("Errors, hints, retries and mastery survive resubmission without XP farming", () => {
  const track = freshState().paths["en-foundations"],
    t = getModules("en")[0].tasks[0];
  assert.equal(recordAttempt(track, t, 0, evaluateTask(t, 0)).newXP, 0);
  track.answers[t.id].hints = 1;
  assert.equal(recordAttempt(track, t, 1, evaluateTask(t, 1)).newXP, 40);
  assert.equal(recordAttempt(track, t, 1, evaluateTask(t, 1)).newXP, 0);
  assert.equal(recordAttempt(track, t, 0, evaluateTask(t, 0)).newXP, 0);
  assert.equal(taskStatus(track.answers[t.id]), "passed");
  const stats = trackStats("en-foundations", track);
  assert.equal(stats.errors, 2);
  assert.equal(stats.attempts, 4);
  assert.equal(stats.resubmissions, 3);
  assert.equal(stats.xp, 40);
  assert.equal(track.answers[t.id].attempts[1].hints, 1);
});

test("Portfolio rejects an empty attestation and never marks a reflection as automatically passed", () => {
  const t = getModules("de")[0].tasks.find(
    (task) => task.type === "portfolio" && !task.submission,
  );
  assert.equal(evaluateTask(t, { ...portfolio, confirm: false }).status, "failed");
  assert.equal(evaluateTask(t, { ...portfolio, method: "ok" }).status, "failed");
  assert.equal(evaluateTask(t, portfolio).status, "submitted");
});

test("NFC accepts canonical equivalents, but does not collapse visually similar scripts", () => {
  assert.equal(unicodePoints("cafe\u0301").length, 5);
  assert.equal(unicodePoints("café").length, 4);
  const t = { type: "exact", answer: "café", explain: "ok" };
  assert.equal(evaluateTask(t, "cafe\u0301").status, "passed");
  assert.equal(
    evaluateTask({ type: "exact", answer: "data" }, "dаta").status,
    "failed",
  );
});

test("Regex grading rejects prefix matches, invalid syntax and empty matches", () => {
  const t = getModules("en").find((chapter) => chapter.id === "regex-search").tasks[0];
  assert.equal(evaluateTask(t, {}, regex(t, { pattern: "go" })).status, "failed");
  assert.ok(regex(t, { pattern: "[" }).error);
  assert.ok(regex(t, { pattern: "x*" }).error);
  const replacement = getModules("fr").find((chapter) => chapter.id === "regex-cleanup")
    .tasks[0];
  assert.equal(
    evaluateTask(
      replacement,
      {},
      regex(replacement, { pattern: ".*", replacement: "" }),
    ).status,
    "failed",
  );
});

test("Terminal distinguishes copying and moving; quoted paths work and missing files fail", () => {
  const initial = createTerminal("en");
  assert.equal(
    runTerminal(initial, 'cd "Field notes"').machine.cwd,
    "/project/Field notes",
  );
  assert.equal(runTerminal(initial, "cat missing.txt").ok, false);
  assert.equal(runTerminal(initial, "rm original/interview.txt").ok, false);
  const task = getModules("en")
    .find((chapter) => chapter.id === "terminal-navigation")
    .tasks.find((task) => task.goal === "copy");
  const created = runTerminal(initial, "mkdir results").machine;
  const moved = runTerminal(created, "mv original/interview.txt results/interview.txt");
  assert.equal(
    evaluateTask(task, { machine: moved.machine, commands: [] }).status,
    "failed",
  );
  const copied = runTerminal(
    created,
    "cp original/interview.txt results/interview.txt",
  );
  assert.equal(
    evaluateTask(task, { machine: copied.machine, commands: [] }).status,
    "passed",
  );
  assert.equal(initial.files["/project/results/interview.txt"], undefined);
});

test("Git stages a snapshot rather than the latest working text", () => {
  const t = getModules("fr")
    .find((chapter) => chapter.id === "git-history")
    .tasks.find((task) => task.type === "git");
  let g = createGit("fr");
  assert.equal(runGit(g, 'git commit -m "Sans index"').ok, false);
  g = runGit(g, "git add transcription.txt").state;
  g.text = t.expected;
  g = runGit(g, 'git commit -m "Modification du texte"').state;
  g = runGit(g, "git log").state;
  assert.equal(evaluateTask(t, g).status, "failed");
  g = runGit(g, "git add transcription.txt").state;
  g = runGit(g, 'git commit -m "Correction vérifiée dans la source"').state;
  assert.equal(evaluateTask(t, g).status, "failed");
  g = runGit(g, "git log").state;
  assert.equal(evaluateTask(t, g).status, "passed");
});

test("WER aligns insertions, deletions and substitutions and handles empty references", () => {
  const pick = ({ S, D, I, N, rate }) => ({ S, D, I, N, rate });
  assert.deepEqual(pick(wer("a b c", "a x c")), {
    S: 1,
    D: 0,
    I: 0,
    N: 3,
    rate: 1 / 3,
  });
  assert.deepEqual(pick(wer("a b c", "a c")), {
    S: 0,
    D: 1,
    I: 0,
    N: 3,
    rate: 1 / 3,
  });
  assert.deepEqual(pick(wer("a b", "a x b")), {
    S: 0,
    D: 0,
    I: 1,
    N: 2,
    rate: 1 / 2,
  });
  assert.equal(wer("", "new words").rate, null);
  assert.equal(wer("word", "word plus two more").rate, 3);
  assert.equal(wer("CAFÉ!", "cafe\u0301").rate, 0);
});

test("Languages keep independent progress and malformed backups are rejected", () => {
  const s = freshState();
  s.activePathId = "de-foundations";
  const t = getModules("de")[0].tasks[0];
  recordAttempt(s.paths["de-foundations"], t, 1, evaluateTask(t, 1));
  assert.equal(trackStats("fr-foundations", s.paths["fr-foundations"]).xp, 0);
  assert.equal(trackStats("de-foundations", s.paths["de-foundations"]).xp, 40);
  assert.throws(() => validateBackup({ version: 99 }));
  const bad = structuredClone(s);
  bad.paths["de-foundations"].answers["999-1"] = {};
  assert.throws(() => validateBackup(bad));
  const forged = structuredClone(s);
  forged.paths["de-foundations"].answers[t.id].attempts[0].status =
    "unrecognized-status";
  assert.throws(() => validateBackup(forged));
});

test("TextGrid export contains contiguous intervals and escapes annotation quotes", () => {
  const text = exportTextGrid(0.6, 1.1, 'B "test"');
  assert.ok(text.includes("xmax = 1.8"));
  assert.ok(text.includes("intervals: size = 3"));
  assert.ok(text.includes('text = "B ""test"""'));
});
