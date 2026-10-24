import { portfolioAnswer } from "./helpers/answers.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { foundationChapters as getModules } from "./helpers/course.mjs";
import { freshState } from "../src/persistence/state.js";
import { recordAttempt, trackStats, sectionStats } from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import {
  FEEDBACK_STORAGE_KEY,
  freshFeedbackDraft,
  freshFeedbackStore,
  validateFeedbackDraft,
  validateFeedbackStore,
  feedbackModule,
  createChapterFeedback,
  chapterFeedbackText,
} from "../src/features/feedback-model.js";

function completedChapter(language = "de", id = "workspace") {
  const state = freshState();
  state.activePathId = `${language}-foundations`;
  state.student = "PRIVATE_STUDENT_NAME";
  state.group = "PRIVATE_GROUP_ID";
  const module = getModules(language).find((m) => m.id === id);
  for (const task of module.tasks) {
    const value =
      task.type === "portfolio"
        ? portfolioAnswer(task, language)
        : task.type === "json"
          ? JSON.stringify(task.expected)
          : task.answer;
    const result = evaluateTask(task, value);
    assert.notEqual(result.status, "failed");
    recordAttempt(state.paths[`${language}-foundations`], task, value, result);
  }
  return state;
}

test("Feedback requires a completed chapter and never changes grades, XP or attempts", () => {
  const incomplete = freshState();
  const draft = { ...freshFeedbackDraft(), topics: ["practice"] };
  assert.equal(feedbackModule(incomplete, "de-foundations", "workspace"), null);
  assert.throws(
    () => createChapterFeedback(incomplete, "de-foundations", "workspace", draft),
    /всіх завдань/,
  );
  const state = completedChapter();
  const original = structuredClone(state);
  const stats = trackStats("de-foundations", state.paths["de-foundations"]);
  assert.ok(feedbackModule(state, "de-foundations", "workspace"));
  assert.equal(feedbackModule(state, "fr-foundations", "workspace"), null);
  assert.equal(feedbackModule(state, "de-foundations", "data-formats"), null);
  assert.equal(feedbackModule(state, "de-foundations", "unknown-chapter"), null);
  assert.equal(feedbackModule(state, "__proto__", "workspace"), null);
  createChapterFeedback(state, "de-foundations", "workspace", draft);
  assert.deepEqual(state, original);
  assert.deepEqual(trackStats("de-foundations", state.paths["de-foundations"]), stats);
  state.paths["de-foundations"].answers["workspace-portfolio"].attempts = [];
  assert.throws(() =>
    createChapterFeedback(state, "de-foundations", "workspace", draft),
  );
  assert.equal(
    sectionStats(getModules("de")[0], state.paths["de-foundations"]).complete,
    false,
  );
});

test("Anonymous feedback exports only feedback content, with no profile, assessment or timing metadata", () => {
  const state = completedChapter();
  state.paths["de-foundations"].activity["workspace"] = {
    activeMs: 123456,
    firstVisitedAt: "PRIVATE_ACTIVITY_DATE",
  };
  const draft = {
    ...freshFeedbackDraft(),
    topics: ["instructions", "explanation"],
    taskId: "workspace-recording-filename",
    comment: "Потрібен приклад імені файла.",
  };
  const feedback = createChapterFeedback(state, "de-foundations", "workspace", draft);
  assert.deepEqual(
    Object.keys(feedback).sort(),
    [
      "pathId",
      "application",
      "version",
      "type",
      "language",
      "languageName",
      "chapter",
      "task",
      "topics",
      "comment",
      "anonymous",
    ].sort(),
  );
  assert.equal(feedback.anonymous, true);
  assert.equal(feedback.task.id, "workspace-recording-filename");
  const serialized = JSON.stringify(feedback) + chapterFeedbackText(feedback);
  for (const privateValue of [
    "PRIVATE_STUDENT_NAME",
    "PRIVATE_GROUP_ID",
    "PRIVATE_ACTIVITY_DATE",
    "123456",
    "private-research-file.txt",
  ])
    assert.ok(!serialized.includes(privateValue));
  assert.ok(chapterFeedbackText(feedback).includes("без імені та групи"));
  assert.ok(chapterFeedbackText(feedback).includes(draft.comment));
  assert.ok(!FEEDBACK_STORAGE_KEY.startsWith("lingva-lab:v1"));
});

test("Identity is included only by explicit choice and disappears when anonymous is reselected", () => {
  const state = completedChapter("fr");
  const draft = {
    ...freshFeedbackDraft(),
    comment: "Більше вправ на формати.",
    anonymous: false,
  };
  const named = createChapterFeedback(state, "fr-foundations", "workspace", draft);
  assert.deepEqual(named.author, { name: state.student, group: state.group });
  assert.ok(chapterFeedbackText(named).includes(state.student));
  draft.anonymous = true;
  const anonymous = createChapterFeedback(state, "fr-foundations", "workspace", draft);
  assert.equal(Object.hasOwn(anonymous, "author"), false);
  assert.ok(!chapterFeedbackText(anonymous).includes(state.student));
});

test("A topic or a comment is sufficient; drafts may be empty and optional fields stay optional", () => {
  const state = completedChapter();
  assert.doesNotThrow(() =>
    validateFeedbackDraft(freshFeedbackDraft(), "de-foundations", "workspace"),
  );
  assert.throws(
    () =>
      createChapterFeedback(state, "de-foundations", "workspace", freshFeedbackDraft()),
    /хоча б одну/,
  );
  assert.throws(() =>
    createChapterFeedback(state, "de-foundations", "workspace", {
      ...freshFeedbackDraft(),
      comment: "  \n ",
    }),
  );
  assert.doesNotThrow(() =>
    createChapterFeedback(state, "de-foundations", "workspace", {
      ...freshFeedbackDraft(),
      topics: ["difficulty"],
    }),
  );
  assert.doesNotThrow(() =>
    createChapterFeedback(state, "de-foundations", "workspace", {
      ...freshFeedbackDraft(),
      comment: "Ще приклад",
    }),
  );
});

test("Separate drafts survive round trips, remain isolated by language/chapter and reject malformed data", () => {
  const store = freshFeedbackStore();
  store.paths["de-foundations"]["workspace"] = {
    ...freshFeedbackDraft(),
    comment: "Німецька, перший розділ",
  };
  store.paths["fr-foundations"]["workspace"] = {
    ...freshFeedbackDraft(),
    comment: "Французька, перший розділ",
  };
  store.paths["de-foundations"]["data-formats"] = {
    ...freshFeedbackDraft(),
    topics: ["practice"],
  };
  const copy = validateFeedbackStore(JSON.parse(JSON.stringify(store)));
  assert.deepEqual(copy, store);
  store.paths["de-foundations"]["data-formats"].topics.push("other");
  assert.deepEqual(copy.paths["de-foundations"]["data-formats"].topics, ["practice"]);
  for (const mutation of [
    { topics: ["unknown"] },
    { topics: ["practice", "practice"] },
    { topics: [true] },
    { topics: {} },
    { comment: { toString: null } },
    { comment: "x".repeat(4001) },
    { anonymous: "true" },
    { taskId: "invalid/id" },
    { extra: {} },
    { author: { name: "injected" } },
  ]) {
    const malformed = structuredClone(copy);
    Object.assign(malformed.paths["de-foundations"]["workspace"], mutation);
    assert.throws(() => validateFeedbackStore(malformed));
  }
  const malformed = structuredClone(copy);
  malformed.paths["en-foundations"]["invalid/chapter"] = freshFeedbackDraft();
  assert.throws(() => validateFeedbackStore(malformed));
  assert.throws(() =>
    validateFeedbackDraft(
      { ...freshFeedbackDraft(), taskId: "data-formats-structured-format" },
      "de-foundations",
      "workspace",
    ),
  );
});

test("Feedback survives adding paths and retiring chapters, tasks or whole paths", () => {
  const store = freshFeedbackStore();
  delete store.paths["en-foundations"];
  store.paths["de-foundations"]["retired-chapter"] = {
    ...freshFeedbackDraft(),
    taskId: "retired-exercise",
    comment: "Додайте приклад",
  };
  store.paths["retired-course"] = { "retired-chapter": freshFeedbackDraft() };
  const restored = validateFeedbackStore(store);
  assert.deepEqual(restored.paths["en-foundations"], {});
  assert.deepEqual(restored.paths["de-foundations"], store.paths["de-foundations"]);
  assert.deepEqual(restored.paths["retired-course"], store.paths["retired-course"]);
});
