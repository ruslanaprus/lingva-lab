import test from "node:test";
import assert from "node:assert/strict";
import { LANGUAGES, getPath, buildPath, TREASURES } from "../content/registry.js";
import french from "../content/tracks/fr/foundations.js";
import {
  searchMaterials,
  LOG_SECTIONS,
} from "../content/shared/chapters/information-search/materials.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { freshState, validateBackup } from "../src/persistence/state.js";
import {
  recordAttempt,
  sectionStats,
  recordTreasureAttempt,
  badges,
  trackStats,
  taskStatus,
} from "../src/learning/progress.js";
import { feedbackModule } from "../src/features/feedback-model.js";
import { createReportData } from "../src/reports/data.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

for (const code of ["de", "fr", "en"]) {
  test(`${code}: search dossier records submitted work and unlocks completion without optional challenges`, () => {
    const course = getPath(`${code}-foundations`);
    const chapter = course.chapters.find((c) => c.id === "information-search");
    const state = freshState(),
      track = state.paths[course.id];
    const dossier = chapter.tasks.find(
      (t) => t.id === "information-search-research-log",
    );
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
    assert.equal(sectionStats(chapter, track).complete, false);
    const answer = portfolioAnswer(dossier, code);
    const incomplete = {
      ...answer,
      method: answer.method.replace(LOG_SECTIONS[3], "Відсутній заголовок"),
    };
    assert.equal(evaluateTask(dossier, incomplete).status, "failed");
    recordAttempt(track, dossier, incomplete, evaluateTask(dossier, incomplete));
    assert.equal(sectionStats(chapter, track).complete, false);
    const result = evaluateTask(dossier, answer);
    assert.equal(result.status, "submitted");
    recordAttempt(track, dossier, answer, result);
    assert.equal(sectionStats(chapter, track).complete, true);
    assert.ok(feedbackModule(state, course.id, chapter.id));
    assert.equal(
      badges(course, track).find((b) => b.id === "source-navigator").unlocked,
      true,
    );
    const restored = validateBackup(JSON.parse(JSON.stringify(state)));
    const record = restored.paths[course.id].answers[dossier.id];
    assert.equal(record.attempts.length, 2);
    assert.equal(record.attempts[0].value.method, incomplete.method);
    assert.equal(record.attempts[1].value.method, answer.method);
    assert.equal(record.attempts[1].status, "submitted");
    const report = createReportData({
      state: restored,
      course,
      track: restored.paths[course.id],
      chapterId: chapter.id,
    });
    assert.equal(
      report.tasks.find((t) => t.id === dossier.id).record.attempts[1].value.method,
      answer.method,
    );
    const before = trackStats(course, track).xp;
    const treasure = TREASURES.provenance;
    recordTreasureAttempt(track, "provenance", treasure.answer, chapter.id);
    assert.equal(trackStats(course, track).xp, before + treasure.xp);
    recordTreasureAttempt(track, "provenance", treasure.answer, chapter.id);
    assert.equal(trackStats(course, track).xp, before + treasure.xp);
  });
}

test("French search material can change without altering German, shared grading, or other chapters", () => {
  const before = structuredClone(getPath("de-foundations"));
  const original = getPath("fr-foundations");
  const material = structuredClone(LANGUAGES.fr);
  material.search.phrase = "nouvel exemple pour une équipe francophone";
  material.search.recordingPlace = "Ville de test";
  const changed = buildPath(french, material);
  assert.deepEqual(getPath("de-foundations"), before);
  for (const chapter of changed.chapters)
    if (chapter.id !== "information-search")
      assert.deepEqual(
        chapter,
        original.chapters.find((c) => c.id === chapter.id),
      );
  const ch = changed.chapters.find((c) => c.id === "information-search");
  assert.ok(JSON.stringify(ch).includes(material.search.phrase));
  assert.ok(JSON.stringify(ch).includes(material.search.recordingPlace));
});

test("Revised quiz options retain original indexes and wording without completing or awarding XP twice", () => {
  const course = getPath("de-foundations");
  const chapter = course.chapters.find((c) => c.id === "information-search");
  const current = chapter.tasks.find((t) => t.id === "information-search-site-scope");
  const previous = {
    ...structuredClone(current),
    revision: 1,
    options: [
      current.options[0],
      current.options[2],
      current.options[1],
      current.options[3],
    ],
    answer: [0, 1],
  };
  const state = freshState(),
    track = state.paths[course.id];
  recordAttempt(track, previous, [0, 1], evaluateTask(previous, [0, 1]));
  assert.equal(taskStatus(track.answers[current.id], current), "new");
  const xp = trackStats(course, track).xp;
  recordAttempt(track, current, [0, 1], evaluateTask(current, [0, 1]));
  assert.equal(taskStatus(track.answers[current.id], current), "failed");
  recordAttempt(track, current, current.answer, evaluateTask(current, current.answer));
  assert.equal(taskStatus(track.answers[current.id], current), "passed");
  assert.equal(trackStats(course, track).xp, xp);
  const restored = validateBackup(JSON.parse(JSON.stringify(state)));
  const attempts = restored.paths[course.id].answers[current.id].attempts;
  assert.equal(attempts[0].definition.revision, 1);
  assert.equal(attempts[1].definition.revision, 2);
  assert.equal(attempts[0].selectedOptions[1].index, 1);
  assert.equal(attempts[0].selectedOptions[1].value, current.options[2]);
  assert.equal(attempts[1].selectedOptions[1].value, current.options[1]);
  assert.equal(attempts[0].status, "passed");
});

test("Offline cases remain explicitly fictional and do not contain invented recordings or active example domains", () => {
  for (const language of Object.values(LANGUAGES)) {
    const material = searchMaterials(language);
    const cards = material.files.find(
      (file) => file.name === "evidence-cards.txt",
    ).content;
    assert.match(cards, /S1–S8 вигадані/u);
    assert.match(cards, /немає WAV\/транскрипту\/TextGrid/u);
    assert.match(cards, new RegExp(language.search.languageCode));
    for (const file of material.files) assert.ok(/\.(txt|csv)$/u.test(file.name));
    const chapter = getPath(`${language.code}-foundations`).chapters.find(
      (c) => c.id === "information-search",
    );
    assert.ok(chapter.time >= 120);
    assert.ok(chapter.tasks.every((t) => ["choice", "portfolio"].includes(t.type)));
    assert.ok(!JSON.stringify(chapter).includes("—"));
  }
});
