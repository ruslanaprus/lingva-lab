import test from "node:test";
import assert from "node:assert/strict";
import {
  getPath,
  LANGUAGES,
  buildPath,
  TREASURES,
  SOURCES,
} from "../content/registry.js";
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
import { DOSSIER_SECTIONS } from "../content/shared/chapters/digital-dictionaries/materials.js";
import { portfolioAnswer } from "./helpers/answers.mjs";
import { parseCsv } from "../src/tools/csv.js";

for (const code of ["de", "fr", "en"]) {
  test(`${code}: dictionary completion accepts submitted evidence without requiring optional investigations`, () => {
    const course = getPath(`${code}-foundations`);
    const chapter = course.chapters.find((c) => c.id === "digital-dictionaries");
    const dossier = chapter.tasks.find(
      (t) => t.id === "digital-dictionaries-word-dossier",
    );
    const state = freshState(),
      track = state.paths[course.id];
    assert.equal(feedbackModule(state, course.id, chapter.id), null);
    for (const task of chapter.tasks.filter((t) => t.required && t.id !== dossier.id)) {
      const answer =
        task.type === "portfolio" ? portfolioAnswer(task, code) : task.answer;
      const result = evaluateTask(task, answer);
      assert.equal(
        result.status,
        task.type === "portfolio" ? "submitted" : "passed",
        task.id,
      );
      recordAttempt(track, task, answer, result);
    }
    const valid = portfolioAnswer(dossier, code);
    const template = chapter.workshop.documents.find(
      (d) => d.id === "template",
    ).content;
    assert.equal(
      evaluateTask(dossier, { ...valid, method: template }).status,
      "failed",
    );
    for (const heading of DOSSIER_SECTIONS) {
      const missing = {
        ...valid,
        method: valid.method.replace(heading, "Пропущена частина"),
      };
      assert.equal(evaluateTask(dossier, missing).status, "failed", heading);
    }
    assert.equal(sectionStats(chapter, track).complete, false);
    recordAttempt(track, dossier, valid, evaluateTask(dossier, valid));
    assert.equal(sectionStats(chapter, track).complete, true);
    assert.ok(feedbackModule(state, course.id, chapter.id));
    assert.equal(
      badges(course, track).find((b) => b.id === "dictionary-editor").unlocked,
      true,
    );
    assert.ok(
      chapter.tasks.filter((t) => !t.required).every((t) => !track.answers[t.id]),
    );
    const xp = trackStats(course, track).xp;
    recordAttempt(track, dossier, valid, evaluateTask(dossier, valid));
    assert.equal(trackStats(course, track).xp, xp);
    recordTreasureAttempt(track, "lexicon", TREASURES.lexicon.answer, chapter.id);
    recordTreasureAttempt(track, "lexicon", TREASURES.lexicon.answer, chapter.id);
    assert.equal(trackStats(course, track).xp, xp + TREASURES.lexicon.xp);
  });
}

test("Incorrect typed forms and choice indexes survive dictionary reports and backup validation", () => {
  const course = getPath("de-foundations"),
    chapter = course.chapters.find((c) => c.id === "digital-dictionaries");
  const typed = chapter.tasks.find((t) => t.type === "exact");
  const single = chapter.tasks.find((t) => t.type === "choice" && !t.multiple);
  const multiple = chapter.tasks.find((t) => t.multiple);
  const state = freshState(),
    track = state.paths[course.id];
  const entries = [
    [typed, " Bänke? "],
    [single, 0],
    [multiple, [0, 3]],
  ];
  for (const [task, value] of entries) {
    const failed = evaluateTask(task, value);
    assert.equal(failed.status, "failed");
    recordAttempt(track, task, value, failed);
    recordAttempt(track, task, task.answer, evaluateTask(task, task.answer));
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
    if (task.type === "choice")
      for (const option of attempt.selectedOptions)
        assert.equal(option.value, task.options[option.index]);
    assert.ok(attempt.definition.prompt.includes(task.lesson.paragraphs[0]));
  }
});

test("French dictionary examples change independently of German content and every other chapter", () => {
  const before = structuredClone(getPath("de-foundations"));
  const original = getPath("fr-foundations");
  const material = structuredClone(LANGUAGES.fr);
  material.dictionaries.context = "Une phrase nouvelle pour la carte de test.";
  material.dictionaries.primary = "dictionary-larousse-avocat";
  const changed = buildPath(french, material);
  for (const chapter of changed.chapters)
    if (chapter.id !== "digital-dictionaries")
      assert.deepEqual(
        chapter,
        original.chapters.find((c) => c.id === chapter.id),
      );
  const chapter = changed.chapters.find((c) => c.id === "digital-dictionaries");
  assert.ok(JSON.stringify(chapter).includes(material.dictionaries.context));
  assert.ok(chapter.sources.includes(material.dictionaries.primary));
  assert.deepEqual(getPath("de-foundations"), before);
});

test("Dictionary packs distinguish authored cards from live sources and preserve multilingual values in CSV", () => {
  for (const code of ["de", "fr", "en"]) {
    const chapter = getPath(`${code}-foundations`).chapters.find(
      (c) => c.id === "digital-dictionaries",
    );
    const d = LANGUAGES[code].dictionaries;
    const cards = chapter.workshop.files.find(
      (f) => f.name === `entry-cards-${code}.txt`,
    ).content;
    assert.match(cards, /не копія/u);
    assert.ok(cards.includes(d.headword) && cards.includes(d.context));
    assert.ok(cards.includes(d.formContext) && d.formContext.includes(d.form));
    const map = chapter.workshop.files.find(
      (f) => f.name === "resource-map.txt",
    ).content;
    assert.ok(map.includes(SOURCES[d.primary].url));
    assert.ok(map.includes(SOURCES[d.secondary].url));
    assert.ok(chapter.time >= 120);
    assert.ok(!JSON.stringify(chapter).includes("—"));
    assert.ok(!chapter.workshop.files.some((f) => /\.(wav|mp3)$/u.test(f.name)));
    const rows = parseCsv(
      chapter.workshop.files.find((f) => f.name.endsWith(".csv")).content,
    );
    assert.deepEqual(rows[1].slice(0, 3), [d.form, d.headword, d.target]);
  }
});
