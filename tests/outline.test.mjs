import test from "node:test";
import assert from "node:assert/strict";
import {
  getPath,
  practiceChapters,
  buildPath,
  LANGUAGES,
  SOURCES,
  TREASURES,
  nextChapter,
} from "../content/registry.js";
import { validateCourse } from "../content/schema.js";
import french from "../content/tracks/fr/foundations.js";
import { freshState, validateBackup } from "../src/persistence/state.js";
import {
  recordAttempt,
  trackStats,
  sectionStats,
  nextPracticeChapter,
  badges,
} from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { createReportData } from "../src/reports/data.js";
import { feedbackModule } from "../src/features/feedback-model.js";
import { renderPlannedChapter } from "../src/ui/pages/overview.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

for (const language of ["de", "fr", "en"]) {
  test(`${language}: descriptions never create completion, XP or reports, and never block real practice`, () => {
    const course = getPath(`${language}-foundations`),
      state = freshState(),
      track = state.paths[course.id];
    const planned = course.chapters.filter((c) => c.status === "planned");
    assert.equal(course.chapters.length, 32);
    assert.equal(planned.length, 18);
    assert.equal(practiceChapters(course).length, 14);
    for (const chapter of planned) {
      assert.equal(chapter.tasks.length, 0);
      assert.equal(sectionStats(chapter, track).complete, false);
      assert.equal(feedbackModule(state, course.id, chapter.id), null);
      assert.throws(() =>
        createReportData({ state, course, track, chapterId: chapter.id }),
      );
      const html = renderPlannedChapter(chapter, course.id);
      assert.ok(html.includes("Вправи готуються"));
      assert.ok(!html.includes("data-check="));
      assert.ok(!html.includes('data-action="report"'));
    }
    for (const chapter of practiceChapters(course)) {
      assert.equal(nextPracticeChapter(course, track).id, chapter.id);
      for (const task of chapter.tasks.filter((t) => t.required)) {
        const value =
          task.type === "portfolio" ? portfolioAnswer(task, language) : task.answer;
        // This check concerns progression; interactive tools are covered by engine/browser tests.
        const result =
          task.type === "portfolio"
            ? evaluateTask(task, value)
            : { status: "passed", feedback: "Змодельовано для перевірки навігації" };
        recordAttempt(track, task, value ?? null, result);
      }
    }
    const stats = trackStats(course, track);
    assert.equal(stats.complete, true);
    assert.equal(stats.sections, 14);
    assert.equal(stats.sectionTotal, 14);
    assert.equal(stats.plannedTotal, 18);
    assert.equal(
      stats.done,
      course.chapters.flatMap((c) => c.tasks).filter((t) => t.required).length,
    );
    assert.ok(!track.answers["data-formats-dictionary-json"]);
    assert.ok(
      badges(course, track).find((b) => b.name === "Цифровий лінгвіст").unlocked,
    );
    assert.equal(nextPracticeChapter(course, track).id, "nlp-ai");
    assert.equal(nextChapter(course.id, "nlp-ai").id, "large-language-models");
    assert.equal(
      trackStats(
        course,
        validateBackup(JSON.parse(JSON.stringify(state))).paths[course.id],
      ).complete,
      true,
    );
  });
}

test("Only explicit descriptions may omit tasks, timing and required work", () => {
  const course = getPath("de-foundations");
  for (const mutate of [
    (c) => {
      c.chapters[4].required = true;
    },
    (c) => {
      c.chapters[4].tasks = [structuredClone(c.chapters[0].tasks[0])];
    },
    (c) => {
      c.chapters[4].time = 120;
    },
    (c) => {
      delete c.chapters[4].overview;
    },
    (c) => {
      c.chapters[4].status = "unknown";
    },
    (c) => {
      c.chapters[0].tasks = [];
    },
  ]) {
    const invalid = structuredClone(course);
    mutate(invalid);
    assert.throws(() => validateCourse(invalid, SOURCES, TREASURES));
  }
});

test("A language path can supply its own examples and dictionary without changing another path", () => {
  const baseline = JSON.stringify(getPath("de-foundations")),
    material = structuredClone(LANGUAGES.fr);
  material.outline.dictionaryExample = "Новий французький контекст для статті.";
  material.outline.dictionarySource = "cambridge";
  const changed = buildPath(french, material).chapters.find(
    (c) => c.id === "digital-dictionaries",
  );
  assert.equal(changed.overview.example, material.outline.dictionaryExample);
  assert.deepEqual(changed.sources, ["cambridge"]);
  assert.equal(JSON.stringify(getPath("de-foundations")), baseline);
});

test("Description pages escape author-supplied text and preserve navigation without assessment controls", () => {
  const chapter = structuredClone(
    getPath("en-foundations").chapters.find((c) => c.id === "spreadsheets"),
  );
  chapter.title = '<img src=x onerror="alert(1)">';
  chapter.overview.example = '<script>alert("example")</script>';
  const html = renderPlannedChapter(chapter, "en-foundations");
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes('href="#lab/information-search"'));
  assert.ok(!html.includes("0/0"));
});
