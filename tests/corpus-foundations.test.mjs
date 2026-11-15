import test from "node:test";
import assert from "node:assert/strict";
import { getPath, LANGUAGES, buildPath, TREASURES } from "../content/registry.js";
import french from "../content/tracks/fr/foundations.js";
import {
  corpusRecords,
  INVENTORY_COLUMNS,
  CORPUS_SECTIONS,
} from "../content/shared/chapters/corpus-foundations/materials.js";
import { parseCsv } from "../src/tools/csv.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { freshState, validateBackup } from "../src/persistence/state.js";
import {
  recordAttempt,
  sectionStats,
  trackStats,
  recordTreasureAttempt,
  badges,
} from "../src/learning/progress.js";
import { createReportData } from "../src/reports/data.js";
import { feedbackModule } from "../src/features/feedback-model.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

for (const code of ["de", "fr", "en"]) {
  test(`${code}: corpus core completes with a pilot, optional challenges remain unattempted and XP is awarded once`, () => {
    const course = getPath(`${code}-foundations`),
      chapter = course.chapters.find((c) => c.id === "corpus-foundations");
    assert.equal(chapter.tasks.length, 31);
    assert.equal(chapter.tasks.filter((t) => t.required).length, 28);
    assert.equal(chapter.time, 109);
    assert.equal(
      chapter.tasks.filter((t) => !t.required).reduce((n, t) => n + t.minutes, 0),
      26,
    );
    const state = freshState(),
      track = state.paths[course.id];
    assert.equal(feedbackModule(state, course.id, chapter.id), null);
    for (const task of chapter.tasks.filter((t) => t.required)) {
      const value =
        task.type === "portfolio" ? portfolioAnswer(task, code) : task.answer;
      const result = evaluateTask(task, value);
      assert.equal(
        result.status,
        task.type === "portfolio" ? "submitted" : "passed",
        task.id,
      );
      recordAttempt(track, task, value, result);
    }
    assert.equal(sectionStats(chapter, track).complete, true);
    assert.ok(feedbackModule(state, course.id, chapter.id));
    assert.equal(
      badges(course, track).find((b) => b.id === "corpus-designer").unlocked,
      true,
    );
    assert.ok(
      chapter.tasks.filter((t) => !t.required).every((t) => !track.answers[t.id]),
    );
    const xp = trackStats(course, track).xp;
    const pilot = chapter.tasks.find((t) => t.id === "corpus-foundations-pilot-study"),
      value = portfolioAnswer(pilot, code);
    recordAttempt(track, pilot, value, evaluateTask(pilot, value));
    assert.equal(trackStats(course, track).xp, xp);
    recordTreasureAttempt(track, "sampling", TREASURES.sampling.answer, chapter.id);
    recordTreasureAttempt(track, "sampling", TREASURES.sampling.answer, chapter.id);
    assert.equal(trackStats(course, track).xp, xp + 60);
    const restored = validateBackup(JSON.parse(JSON.stringify(state)));
    const report = createReportData({
      state: restored,
      course,
      track: restored.paths[course.id],
      chapterId: chapter.id,
    });
    assert.equal(report.summary.complete, true);
    assert.equal(
      report.tasks.find((t) => t.id === pilot.id).record.attempts[0].status,
      "submitted",
    );
    for (const section of CORPUS_SECTIONS)
      assert.equal(
        evaluateTask(pilot, {
          ...value,
          method: value.method.replace(section, "Пропущено"),
        }).status,
        "failed",
      );
    assert.equal(
      evaluateTask(pilot, {
        ...value,
        method: chapter.workshop.documents.find((d) => d.id === "template").content,
      }).status,
      "failed",
    );
  });
}

test("Corpus materials preserve text boundaries, metadata links, duplicate identity and the intended 3+3 sampling choices", () => {
  for (const code of ["de", "fr", "en"]) {
    const chapter = getPath(`${code}-foundations`).chapters.find(
        (c) => c.id === "corpus-foundations",
      ),
      records = corpusRecords(LANGUAGES[code]);
    assert.ok(!JSON.stringify(chapter).includes("—"));
    assert.equal(records.length, 12);
    const reordered = structuredClone(LANGUAGES[code]);
    reordered.corpus.texts = Object.fromEntries(
      Object.entries(reordered.corpus.texts).reverse(),
    );
    assert.deepEqual(corpusRecords(reordered), records);
    assert.equal(new Set(records.map((r) => r.id)).size, 12);
    const rows = parseCsv(
      chapter.workshop.files.find((f) => f.name === "metadata.csv").content,
    );
    assert.deepEqual(rows[0], INVENTORY_COLUMNS);
    assert.equal(rows.length, 13);
    for (const [i, r] of records.entries()) {
      assert.deepEqual(rows[i + 1], [
        r.id,
        r.file,
        r.group,
        r.sourceId,
        r.published,
        code,
        r.origin,
        r.duplicateOf,
      ]);
      assert.equal(
        chapter.workshop.files.find((f) => f.name === r.file).content.trim(),
        r.text,
      );
    }
    assert.equal(records[6].text, records[0].text);
    assert.equal(records[6].duplicateOf, "T01");
    const eligible = records.filter(
      (r) =>
        r.published.startsWith("2025") &&
        r.origin === "original" &&
        !r.duplicateOf &&
        r.id !== "T11",
    );
    assert.deepEqual(
      eligible.map((r) => r.id),
      ["T01", "T02", "T03", "T04", "T05", "T06", "T12"],
    );
    for (const group of ["service", "club"])
      assert.equal(
        new Set(
          eligible
            .filter((r) => r.group === group)
            .slice(0, 3)
            .map((r) => r.sourceId),
        ).size,
        3,
      );
    assert.ok(records[0].text.toLowerCase().includes(LANGUAGES[code].corpus.polite));
    assert.ok(!records[5].text.toLowerCase().includes(LANGUAGES[code].corpus.polite));
    for (const [term] of LANGUAGES[code].corpus.terms)
      assert.ok(eligible.filter((r) => r.text.includes(term)).length >= 2, term);
  }
});

test("Corpus CSV compares values, rejects wrong grouping and records exact mistakes and selected options", () => {
  const course = getPath("de-foundations"),
    chapter = course.chapters.find((c) => c.id === "corpus-foundations");
  const csv = chapter.tasks.find((t) => t.checker === "csv"),
    multiple = chapter.tasks.find((t) => t.multiple);
  const state = freshState(),
    track = state.paths[course.id];
  const wrong = csv.answer.replace("service", "club");
  recordAttempt(track, csv, wrong, evaluateTask(csv, wrong));
  assert.equal(evaluateTask(csv, wrong).status, "failed");
  const quoted = csv.expectedRows
    .map((row) => row.map((field) => '"' + field.replaceAll('"', '""') + '"').join(","))
    .join("\n");
  assert.equal(evaluateTask(csv, quoted).status, "passed");
  recordAttempt(track, csv, quoted, evaluateTask(csv, quoted));
  const selected = [0, 1];
  assert.equal(evaluateTask(multiple, selected).status, "failed");
  recordAttempt(track, multiple, selected, evaluateTask(multiple, selected));
  const restored = validateBackup(JSON.parse(JSON.stringify(state)));
  const report = createReportData({
    state: restored,
    course,
    track: restored.paths[course.id],
    chapterId: chapter.id,
  });
  assert.equal(
    report.tasks.find((t) => t.id === csv.id).record.attempts[0].value,
    wrong,
  );
  const attempt = report.tasks.find((t) => t.id === multiple.id).record.attempts[0];
  assert.deepEqual(attempt.value, selected);
  for (const option of attempt.selectedOptions)
    assert.equal(option.value, multiple.options[option.index]);
});

test("French corpus content is independent of German examples and other chapters", () => {
  const german = structuredClone(getPath("de-foundations")),
    original = getPath("fr-foundations"),
    material = structuredClone(LANGUAGES.fr);
  material.corpus.texts.T01 = "Nouveau texte français pour le test.";
  const changed = buildPath(french, material);
  const records = corpusRecords(material);
  assert.equal(records.find((r) => r.id === "T07").text, material.corpus.texts.T01);
  assert.ok(
    JSON.stringify(
      changed.chapters.find((c) => c.id === "corpus-foundations"),
    ).includes(material.corpus.texts.T01),
  );
  for (const chapter of changed.chapters.filter((c) => c.id !== "corpus-foundations"))
    assert.deepEqual(
      chapter,
      original.chapters.find((c) => c.id === chapter.id),
    );
  assert.deepEqual(getPath("de-foundations"), german);
});

test("Corpus quiz answer positions vary and correct choices are not routinely the longest", () => {
  for (const code of ["de", "fr", "en"]) {
    const quiz = getPath(`${code}-foundations`)
      .chapters.find((c) => c.id === "corpus-foundations")
      .tasks.filter((t) => t.type === "choice" && !t.multiple);
    assert.deepEqual(new Set(quiz.map((t) => t.answer)), new Set([0, 1, 2]));
    assert.ok(
      quiz.filter(
        (t) => t.options[t.answer].length < Math.max(...t.options.map((o) => o.length)),
      ).length >=
        quiz.length / 2,
    );
  }
});
