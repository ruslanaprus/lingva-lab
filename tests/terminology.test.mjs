import test from "node:test";
import assert from "node:assert/strict";
import { getPath, LANGUAGES, buildPath, TREASURES } from "../content/registry.js";
import french from "../content/tracks/fr/foundations.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { freshState, validateBackup } from "../src/persistence/state.js";
import {
  recordAttempt,
  sectionStats,
  trackStats,
  recordTreasureAttempt,
  badges,
} from "../src/learning/progress.js";
import { feedbackModule } from "../src/features/feedback-model.js";
import { createReportData } from "../src/reports/data.js";
import { parseCsv } from "../src/tools/csv.js";
import {
  TERM_SECTIONS,
  GLOSSARY_COLUMNS,
  conceptCards,
} from "../content/shared/chapters/terminology/materials.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

for (const code of ["de", "fr", "en"]) {
  test(`${code}: terminology core work completes with a reviewable glossary, without optional investigations`, () => {
    const course = getPath(`${code}-foundations`),
      chapter = course.chapters.find((c) => c.id === "terminology");
    const dossier = chapter.tasks.find((t) => t.id === "terminology-glossary-dossier");
    const state = freshState(),
      track = state.paths[course.id];
    assert.equal(feedbackModule(state, course.id, chapter.id), null);
    for (const task of chapter.tasks.filter((t) => t.required && t.id !== dossier.id)) {
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
    const valid = portfolioAnswer(dossier, code);
    assert.equal(sectionStats(chapter, track).complete, false);
    assert.equal(
      evaluateTask(dossier, {
        ...valid,
        method: chapter.workshop.documents.find((d) => d.id === "template").content,
      }).status,
      "failed",
    );
    for (const heading of TERM_SECTIONS)
      assert.equal(
        evaluateTask(dossier, {
          ...valid,
          method: valid.method.replace(heading, "Пропущена частина"),
        }).status,
        "failed",
        heading,
      );
    recordAttempt(track, dossier, valid, evaluateTask(dossier, valid));
    assert.equal(sectionStats(chapter, track).complete, true);
    assert.ok(feedbackModule(state, course.id, chapter.id));
    assert.equal(
      badges(course, track).find((b) => b.id === "terminology-editor").unlocked,
      true,
    );
    assert.ok(
      chapter.tasks.filter((t) => !t.required).every((t) => !track.answers[t.id]),
    );
    const xp = trackStats(course, track).xp;
    recordAttempt(track, dossier, valid, evaluateTask(dossier, valid));
    assert.equal(trackStats(course, track).xp, xp);
    recordTreasureAttempt(track, "boundary", TREASURES.boundary.answer, chapter.id);
    recordTreasureAttempt(track, "boundary", TREASURES.boundary.answer, chapter.id);
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
      report.tasks.find((t) => t.id === dossier.id).record.attempts[0].status,
      "submitted",
    );
  });
}

test("Term CSV exercises accept equivalent quoting and retain wrong concept IDs, scopes and raw choices", () => {
  const course = getPath("fr-foundations"),
    chapter = course.chapters.find((c) => c.id === "terminology");
  const state = freshState(),
    track = state.paths[course.id];
  const variant = chapter.tasks.find((t) => t.id === "terminology-variant-csv");
  const status = chapter.tasks.find((t) => t.id === "terminology-status-csv");
  const single = chapter.tasks.find((t) => t.id === "terminology-hidden-measure");
  const multiple = chapter.tasks.find((t) => t.multiple);
  const entries = [
    [variant, variant.answer.replaceAll("C08", "C09")],
    [
      status,
      status.answer
        .replace("deprecated", "preferred")
        .replaceAll("цей проєкт", "уся мова"),
    ],
    [single, 0],
    [multiple, [0, 1]],
  ];
  for (const [task, value] of entries) {
    assert.equal(evaluateTask(task, value).status, "failed", task.id);
    recordAttempt(track, task, value, evaluateTask(task, value));
    const corrected =
      task.checker === "csv"
        ? task.expectedRows
            .map((row) =>
              row.map((field) => '"' + field.replaceAll('"', '""') + '"').join(","),
            )
            .join("\n")
        : task.answer;
    assert.equal(evaluateTask(task, corrected).status, "passed");
    recordAttempt(track, task, corrected, evaluateTask(task, corrected));
  }
  const restored = validateBackup(JSON.parse(JSON.stringify(state)));
  const report = createReportData({
    state: restored,
    course,
    track: restored.paths[course.id],
    chapterId: chapter.id,
  });
  for (const [task, value] of entries) {
    const attempt = report.tasks.find((t) => t.id === task.id).record.attempts[0];
    assert.deepEqual(attempt.value, value);
    assert.ok(attempt.definition.prompt.includes(task.lesson.paragraphs[0]));
    for (const option of attempt.selectedOptions || [])
      assert.equal(option.value, task.options[option.index]);
  }
});

test("French terminology examples change without changing German or any other chapter", () => {
  const german = structuredClone(getPath("de-foundations"));
  const original = getPath("fr-foundations"),
    material = structuredClone(LANGUAGES.fr);
  material.terminology.candidateText = "Nouveau texte français pour le test.";
  const changed = buildPath(french, material);
  assert.ok(
    JSON.stringify(changed.chapters.find((c) => c.id === "terminology")).includes(
      material.terminology.candidateText,
    ),
  );
  for (const chapter of changed.chapters.filter((c) => c.id !== "terminology"))
    assert.deepEqual(
      chapter,
      original.chapters.find((c) => c.id === chapter.id),
    );
  assert.deepEqual(getPath("de-foundations"), german);
});

test("Terminology packs keep concept records, aliases, evidence, statuses and Unicode distinct", () => {
  for (const code of ["de", "fr", "en"]) {
    const l = LANGUAGES[code],
      chapter = getPath(`${code}-foundations`).chapters.find(
        (c) => c.id === "terminology",
      );
    assert.equal(chapter.tasks.length, 42);
    assert.equal(chapter.tasks.filter((t) => t.required).length, 38);
    assert.equal(chapter.time, 180);
    assert.equal(
      chapter.tasks.filter((t) => !t.required).reduce((n, t) => n + t.minutes, 0),
      36,
    );
    assert.ok(!JSON.stringify(chapter).includes("—"));
    const files = chapter.workshop.files;
    const starter = parseCsv(
      files.find((f) => f.name === `glossary-template-${code}.csv`).content,
    );
    assert.deepEqual(starter[0], GLOSSARY_COLUMNS);
    assert.equal(new Set(starter.slice(1).map((r) => r[0])).size, 5);
    assert.ok(starter.every((r) => r.length === GLOSSARY_COLUMNS.length));
    const sample = parseCsv(
      files.find((f) => f.name === `entry-example-${code}.csv`).content,
    );
    assert.equal(sample[1][2], l.terminology.terms[8]);
    assert.equal(sample[1][4], "термінологічна база");
    assert.equal(sample[1][14], "draft");
    assert.ok(sample[1][8].includes(l.terminology.terms[8]));
    const cards = conceptCards(l);
    assert.equal(cards.length, 10);
    assert.equal(new Set(cards.map((c) => c.id)).size, 10);
    assert.equal(cards[4].deprecated, "навчальний корпус");
    const statusTask = chapter.tasks.find((t) => t.id === "terminology-status-csv");
    const statusDraft = parseCsv(
      statusTask.lesson.example.split("\n").slice(0, 3).join("\n"),
    );
    assert.ok(statusDraft.every((row) => row.length === 3));
    assert.deepEqual(statusDraft.slice(0, 2), statusTask.expectedRows.slice(0, 2));
    assert.equal(statusDraft[2][0], statusTask.expectedRows[2][0]);
    assert.notEqual(statusDraft[2][1], statusTask.expectedRows[2][1]);
    assert.notEqual(statusDraft[2][2], statusTask.expectedRows[2][2]);
    assert.match(files.find((f) => f.name === "README.txt").content, /не витяги/u);
    assert.match(
      files.find((f) => f.name === "fields-and-policy.txt").content,
      /не універсальний словник ISO/u,
    );
    assert.ok(
      files
        .find((f) => f.name.startsWith("candidates-"))
        .content.includes(l.terminology.candidateText),
    );
  }
});

test("Terminology questions distribute answer positions and avoid a consistently longest correct option", () => {
  for (const code of ["de", "fr", "en"]) {
    const quiz = getPath(`${code}-foundations`)
      .chapters.find((c) => c.id === "terminology")
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
