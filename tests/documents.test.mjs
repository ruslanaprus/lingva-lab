import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getPath,
  getChapter,
  buildPath,
  LANGUAGES,
  SOURCES,
  TREASURES,
} from "../content/registry.js";
import french from "../content/tracks/fr/foundations.js";
import { freshState, validateBackup } from "../src/persistence/state.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import {
  recordAttempt,
  sectionStats,
  recordTreasureAttempt,
  trackStats,
  badges,
} from "../src/learning/progress.js";
import { createReportData } from "../src/reports/data.js";
import { reportHtml } from "../src/reports/html.js";
import { feedbackModule } from "../src/features/feedback-model.js";
import { renderWorkshopIntro } from "../src/ui/exercises/workshop.js";
import { createExerciseView } from "../src/ui/exercises/render.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

for (const code of ["de", "fr", "en"]) {
  test(`${code}: chapter two leads from structural practice to reviewed translation and a real-editor portfolio`, () => {
    const course = getPath(`${code}-foundations`),
      chapter = course.chapters[1];
    assert.equal(chapter.id, "academic-documents");
    assert.deepEqual(
      course.chapters.slice(0, 4).map((c) => c.id),
      ["workspace", "academic-documents", "data-formats", "unicode"],
    );
    assert.equal(chapter.tasks.filter((t) => t.required).length, 29);
    assert.equal(chapter.time, 155);
    assert.equal(
      chapter.tasks.filter((t) => t.required && t.type === "portfolio").length,
      8,
    );
    assert.equal(
      chapter.tasks.filter((t) => !t.required).reduce((n, t) => n + t.minutes, 0),
      28,
    );
    assert.ok(
      chapter.tasks
        .filter((t) => t.required)
        .every((t) => t.lesson.paragraphs.length >= 2),
    );
    assert.ok(
      chapter.tasks.findIndex((t) => t.id === "academic-documents-translation-review") <
        chapter.tasks.findIndex((t) => t.id === "academic-documents-portfolio"),
    );
    for (const section of chapter.tasks.find(
      (t) => t.id === "academic-documents-portfolio",
    ).submission.sections) {
      assert.ok(
        chapter.workshop.documents
          .find((d) => d.id === "template")
          .content.includes(section),
      );
      assert.ok(
        chapter.workshop.documents
          .find((d) => d.id === "example")
          .content.includes(section),
      );
    }
    const files = chapter.workshop.files;
    assert.ok(
      files
        .find((f) => f.name === `terminology-${code}.txt`)
        .content.includes(LANGUAGES[code].documents.terms[0][1]),
    );
    assert.ok(
      files
        .find((f) => f.name === "pair-review.txt")
        .content.includes(LANGUAGES[code].documents.limitedClaim),
    );
    assert.ok(files.find((f) => f.name === "source-uk.txt").content.includes("[C]"));
    const intro = renderWorkshopIntro(chapter);
    assert.ok(intro.includes("Документ, який можна редагувати разом."));
    assert.ok(!intro.includes("приклад README"));
    assert.equal(
      course.chapters.flatMap((c) => c.tasks).some((t) => t.id === "unicode-portfolio"),
      false,
    );
  });
  test(`${code}: required-only work unlocks feedback/report while journal text, errors and context survive backup`, () => {
    const course = getPath(`${code}-foundations`),
      chapter = course.chapters[1],
      state = freshState(),
      track = state.paths[course.id];
    state.activePathId = course.id;
    const final = chapter.tasks.find((t) => t.id === "academic-documents-portfolio"),
      answer = portfolioAnswer(final, code);
    const bad = {
      ...answer,
      method: answer.method.replace("6. Відкриті питання", "6. Інше"),
    };
    recordAttempt(track, final, bad, evaluateTask(final, bad));
    assert.equal(sectionStats(chapter, track).complete, false);
    assert.equal(feedbackModule(state, course.id, chapter.id), null);
    for (const task of chapter.tasks.filter((t) => t.required)) {
      const value =
        task.type === "portfolio" ? portfolioAnswer(task, code) : task.answer;
      recordAttempt(track, task, value, evaluateTask(task, value));
    }
    assert.equal(sectionStats(chapter, track).complete, true);
    assert.equal(sectionStats(chapter, track).errors, 1);
    assert.equal(sectionStats(chapter, track).submitted, 8);
    assert.ok(feedbackModule(state, course.id, chapter.id));
    assert.ok(
      chapter.tasks.filter((t) => !t.required).every((t) => !track.answers[t.id]),
    );
    const restored = validateBackup(JSON.parse(JSON.stringify(state)));
    const report = createReportData({
      state: restored,
      course,
      track: restored.paths[course.id],
      chapterId: chapter.id,
    });
    const record = report.tasks.find((t) => t.id === final.id).record;
    assert.equal(record.attempts[0].value.method, bad.method);
    assert.equal(record.attempts[1].value.method, answer.method);
    assert.ok(record.attempts[1].definition.prompt.includes("Сайт перевіряє лише"));
    assert.ok(reportHtml(report).includes("Журнал редакції"));
    assert.ok(
      badges(course, track).some((b) => b.id === "academic-editor" && b.unlocked),
    );
  });
}

test("Editorial journal checks its own headings and messages without pretending to inspect DOCX", () => {
  const task = getChapter("en-foundations", "academic-documents").tasks.find(
      (t) => t.id === "academic-documents-portfolio",
    ),
    answer = portfolioAnswer(task, "en");
  assert.equal(evaluateTask(task, answer).status, "submitted");
  const result = evaluateTask(task, {
    ...answer,
    method: answer.method.replace("2. Переклад і терміни", "2. Інше"),
  });
  assert.equal(result.status, "failed");
  assert.ok(result.feedback.includes("Журнал редакції"));
  assert.ok(!result.feedback.includes("README"));
  assert.equal(
    evaluateTask(task, { ...answer, reflection: "Замало" }).status,
    "failed",
  );
  const view = createExerciseView({
    track: () => freshState().paths["en-foundations"],
    language: () => "en",
  });
  const html = view.taskInput(task, answer);
  assert.ok(html.includes(task.submission.methodPlaceholder));
  assert.ok(!html.includes("Вставте повний текст README"));
});

test("French document examples can change independently; shared instructions do not own terminology", () => {
  const original = JSON.stringify(getPath("de-foundations")),
    material = structuredClone(LANGUAGES.fr);
  material.documents.terms[0][1] = "corpus de démonstration";
  const edited = buildPath(french, material).chapters[1];
  assert.ok(
    edited.workshop.files
      .find((f) => f.name === "terminology-fr.txt")
      .content.includes("corpus de démonstration"),
  );
  assert.equal(JSON.stringify(getPath("de-foundations")), original);
});

test("Retired Unicode portfolio stays historical and never completes the new document portfolio", () => {
  const state = freshState(),
    course = getPath("de-foundations"),
    track = state.paths[course.id];
  const old = {
    id: "unicode-portfolio",
    chapterId: "unicode",
    revision: 1,
    type: "portfolio",
    title: "Академічний документ і мовне середовище",
    prompt: "Попереднє документне портфоліо",
    xp: 30,
    rubric: ["Попередня умова"],
  };
  const answer = portfolioAnswer(old, "de");
  recordAttempt(track, old, answer, evaluateTask(old, answer));
  const restored = validateBackup(JSON.parse(JSON.stringify(state)));
  assert.equal(
    restored.paths[course.id].answers[old.id].attempts[0].value.method,
    answer.method,
  );
  assert.equal(
    sectionStats(course.chapters[1], restored.paths[course.id]).complete,
    false,
  );
  const report = createReportData({
    state: restored,
    course,
    track: restored.paths[course.id],
    chapterId: "unicode",
  });
  assert.ok(reportHtml(report).includes(old.title));
  const fixture = JSON.parse(
    readFileSync(new URL("./fixtures/progress-v2.json", import.meta.url), "utf8"),
  );
  assert.doesNotThrow(() => validateBackup(fixture));
});

test("Hidden editorial challenge records wrong indexes and gives XP once without controlling completion", () => {
  const state = freshState(),
    track = state.paths["de-foundations"],
    t = TREASURES.editorial;
  recordTreasureAttempt(track, "editorial", 0);
  recordTreasureAttempt(track, "editorial", 1);
  recordTreasureAttempt(track, "editorial", 1);
  assert.equal(trackStats("de-foundations", track).xp, 60);
  assert.equal(track.treasures.editorial.attempts[0].selectedOptions[0].index, 0);
  assert.equal(
    track.treasures.editorial.attempts[0].selectedOptions[0].value,
    t.options[0],
  );
  assert.equal(
    sectionStats(getChapter("de-foundations", "academic-documents"), track).complete,
    false,
  );
  assert.ok(Object.hasOwn(SOURCES, "word-changes"));
});
