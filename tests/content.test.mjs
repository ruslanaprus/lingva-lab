import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PATHS,
  LANGUAGES,
  buildPath,
  getPath,
  nextChapter,
  SOURCES,
  TREASURES,
} from "../content/registry.js";
import { validateCourse } from "../content/schema.js";
import german from "../content/tracks/de/foundations.js";
import french from "../content/tracks/fr/foundations.js";
import { adaptChapter, defineChapter, exact } from "../content/shared/builders.js";
import {
  freshState,
  freshPathState,
  validateBackup,
  loadProgress,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
} from "../src/persistence/state.js";
import {
  recordAttempt,
  sectionStats,
  trackStats,
  taskStatus,
} from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { checkAnswer, createAnswerChecker } from "../src/learning/check-answer.js";
import { createReportData } from "../src/reports/data.js";
import { createChapterView } from "../src/ui/pages/chapter.js";
import { createExerciseView } from "../src/ui/exercises/render.js";
import { t, setInterfaceLocale } from "../src/i18n/index.js";

test("The saved schema-2 fixture restores without rewriting historical attempts", async () => {
  const fixture = JSON.parse(
    await readFile(new URL("./fixtures/progress-v2.json", import.meta.url), "utf8"),
  );
  const restored = validateBackup(fixture);
  assert.deepEqual(restored, fixture);
  const record = restored.paths["fr-foundations"].answers["workspace-original-storage"];
  assert.equal(record.attempts[0].at, "2026-10-24T00:00:00.000Z");
  assert.equal(record.attempts[0].selectedOptions[0].number, 2);
});

test("Answer checking accepts an exercise and answer without page or storage dependencies", async () => {
  const course = getPath("fr-foundations");
  const choice = course.chapters[0].tasks[0];
  assert.equal((await checkAnswer(choice, choice.answer)).status, "passed");
  const exercise = course.chapters.find((chapter) => chapter.id === "regex-search")
    .tasks[0];
  const answer = { pattern: "example", flags: "gu" };
  const checker = createAnswerChecker(async (receivedExercise, receivedAnswer) => {
    assert.equal(receivedExercise, exercise);
    assert.equal(receivedAnswer, answer);
    return { matches: exercise.targets.map((text) => ({ text })) };
  });
  const result = await checker(exercise, answer);
  assert.equal(result.status, "passed");
  assert.deepEqual(
    result.toolResult.matches.map((match) => match.text),
    exercise.targets,
  );
});

test("French language edits do not change German content or shared chapter factories", () => {
  const baseline = JSON.stringify(getPath("de-foundations"));
  const material = structuredClone(LANGUAGES.fr);
  material.word = "nouveau-mot";
  const edited = buildPath(french, material);
  assert.ok(
    edited.chapters
      .find((chapter) => chapter.id === "data-formats")
      .tasks.some((task) => task.prompt.includes("nouveau-mot")),
  );
  assert.equal(JSON.stringify(getPath("de-foundations")), baseline);
  assert.equal(LANGUAGES.fr.word, "langue");
  assert.equal(
    german.chapters[0],
    french.chapters[0],
    "the shared implementation is reused",
  );
});

test("A path can reuse, adapt and author chapters with its own order and task counts", () => {
  const extra = exact(
    "additional-practice",
    "Ще практика",
    "Введіть A",
    "A",
    "Пояснення",
    "Підказка",
    { required: false },
  );
  const adapted = adaptChapter(french.chapters[0], (chapter) => ({
    ...chapter,
    tasks: [chapter.tasks[0], { ...extra, revision: 1, xp: 10 }],
  }));
  const authored = defineChapter({
    id: "independent-research",
    title: "Дослідження",
    short: "Практика",
    category: "ДОСЛІДЖЕННЯ",
    time: 15,
    outcome: "Дослідити",
    case: "Приклад",
    theory: "Теорія",
    sources: [],
    terms: [],
    tasks: () => [
      exact("research-evidence", "Доказ", "Введіть B", "B", "Пояснення", "Підказка"),
    ],
  });
  const course = buildPath(
    {
      ...french,
      id: "fr-advanced",
      level: "advanced",
      milestones: [],
      chapters: [authored, adapted],
    },
    LANGUAGES.fr,
  );
  PATHS[course.id] = course;
  try {
    assert.equal(nextChapter(course.id, "independent-research").id, "workspace");
    assert.equal(nextChapter(course.id, "workspace"), null);
    const state = freshState(),
      track = state.paths[course.id];
    const chapter = course.chapters[1],
      required = chapter.tasks[0];
    recordAttempt(
      track,
      required,
      required.answer,
      evaluateTask(required, required.answer),
    );
    const stats = sectionStats(chapter, track);
    assert.equal(stats.complete, true);
    assert.equal(stats.total, 2);
    assert.equal(stats.requiredTotal, 1);
    assert.equal(stats.done, 1);
    assert.equal(trackStats(course, track).sectionTotal, 2);
    assert.equal(trackStats(course, track).gradedTotal, 3);
    const exerciseView = createExerciseView({
      track: () => track,
      language: () => "fr",
    });
    const view = createChapterView({
      track: () => track,
      pathId: () => course.id,
      language: () => "fr",
      renderTask: exerciseView.renderTask,
      renderChapterFeedback: () => "",
    });
    const html = view.renderLab(chapter);
    assert.ok(html.includes("1 / 1"));
    assert.ok(html.includes("2 ЗАВДАНЬ"));
    assert.ok(html.includes("НЕОБОВ’ЯЗКОВА ПРАКТИКА"));
    assert.ok(html.includes('href="#portfolio"'));
    assert.equal(state.paths["fr-foundations"].answers[required.id], undefined);
  } finally {
    delete PATHS[course.id];
  }
});

test("Stable exercise identities survive insertion and reorder; content validation rejects invalid references", () => {
  const original = getPath("de-foundations");
  const changed = structuredClone(original);
  changed.chapters.reverse();
  changed.chapters[0].tasks.reverse();
  const before = new Set(
    original.chapters.flatMap((chapter) => chapter.tasks.map((task) => task.id)),
  );
  assert.deepEqual(
    new Set(
      changed.chapters.flatMap((chapter) => chapter.tasks.map((task) => task.id)),
    ),
    before,
  );
  for (const mutate of [
    (course) => {
      course.chapters[0].tasks[1].id = course.chapters[0].tasks[0].id;
    },
    (course) => {
      course.chapters[0].sources.push("missing-source");
    },
    (course) => {
      course.chapters[0].tasks[0].type = "unknown-renderer";
    },
    (course) => {
      course.chapters[0].tasks[0].answer = 10000;
    },
    (course) => {
      course.chapters[0].tasks.forEach((task) => {
        task.required = false;
      });
    },
  ]) {
    const broken = structuredClone(original);
    mutate(broken);
    assert.throws(() => validateCourse(broken, SOURCES, TREASURES));
  }
});

test("Exercise revisions preserve historical prompts, choices and outcomes without regrading on import", () => {
  const state = freshState(),
    course = getPath("de-foundations"),
    track = state.paths[course.id];
  const first = course.chapters[0].tasks[0];
  recordAttempt(track, first, first.answer, evaluateTask(first, first.answer));
  const revised = {
    ...first,
    revision: 2,
    prompt: "Нові умови",
    options: ["Новий A", "Новий B"],
    answer: 0,
  };
  assert.equal(taskStatus(track.answers[first.id], revised), "new");
  recordAttempt(track, revised, 0, evaluateTask(revised, 0));
  assert.equal(track.answers[first.id].attempts.length, 2);
  const clean = validateBackup(JSON.parse(JSON.stringify(state)));
  assert.equal(
    clean.paths[course.id].answers[first.id].attempts[0].definition.prompt,
    first.prompt,
  );
  assert.equal(
    clean.paths[course.id].answers[first.id].attempts[0].selectedOptions[0].value,
    first.options[first.answer],
  );
  assert.equal(
    trackStats(course, track).xp,
    first.xp,
    "updating a revision cannot farm XP",
  );
  const revisedCourse = structuredClone(course);
  revisedCourse.chapters[0].tasks[0] = revised;
  const report = createReportData({
    state: clean,
    course: revisedCourse,
    track: clean.paths[course.id],
    chapterId: "workspace",
  });
  assert.equal(report.tasks[0].record.attempts[0].definition.prompt, first.prompt);
  assert.equal(report.tasks[0].record.attempts[1].definition.prompt, "Нові умови");
});

test("Retired exercises and paths remain in backups; retired exercises appear in chapter reports", () => {
  const state = freshState(),
    course = structuredClone(getPath("de-foundations")),
    track = state.paths[course.id];
  const retired = course.chapters[0].tasks.shift();
  recordAttempt(track, retired, retired.answer, evaluateTask(retired, retired.answer));
  const clean = validateBackup(state);
  const report = createReportData({
    state: clean,
    course,
    track: clean.paths[course.id],
    chapterId: "workspace",
  });
  assert.equal(report.tasks.find((task) => task.id === retired.id).retired, true);
  const archived = { ...getPath("fr-foundations"), id: "retired-french-course" };
  state.paths[archived.id] = freshPathState(archived);
  state.activePathId = archived.id;
  const restored = validateBackup(state);
  assert.ok(restored.paths[archived.id]);
  assert.equal(restored.activePathId, null);
});

test("Unreadable, legacy and future data are never overwritten by loading; locale is independent of path", () => {
  const values = new Map([[STORAGE_KEY, '{"schemaVersion":999}']]);
  const storage = { getItem: (key) => values.get(key) ?? null };
  const loaded = loadProgress(storage);
  assert.equal(loaded.writable, false);
  assert.equal(loaded.recovery, values.get(STORAGE_KEY));
  values.delete(STORAGE_KEY);
  values.set(LEGACY_STORAGE_KEY, '{"version":1}');
  assert.equal(loadProgress(storage).recovery, '{"version":1}');
  assert.throws(() => validateBackup({ schemaVersion: 999 }));
  const state = freshState();
  state.activePathId = "fr-foundations";
  assert.equal(validateBackup(state).interfaceLocale, "uk");
  setInterfaceLocale("uk");
  assert.equal(t("task.checkAnswer"), "Перевірити відповідь");
  assert.throws(() => setInterfaceLocale("en"), "English has not been implemented");
});
