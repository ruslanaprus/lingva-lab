import test from "node:test";
import assert from "node:assert/strict";
import { getModules } from "../course.js";
import { freshState, recordAttempt, evaluateTask, trackStats, sectionStats } from "../engine.js";
import {
  FEEDBACK_STORAGE_KEY, freshFeedbackDraft, freshFeedbackStore, validateFeedbackDraft,
  validateFeedbackStore, feedbackModule, createChapterFeedback, chapterFeedbackText,
} from "../feedback.js";

function completedChapter(language = "de", id = 1) {
  const state = freshState();
  state.activeLanguage = language;
  state.student = "PRIVATE_STUDENT_NAME";
  state.group = "PRIVATE_GROUP_ID";
  const module = getModules(language).find((m) => m.id === id);
  for (const task of module.tasks) {
    const value = task.type === "portfolio" ? {
      artifact: "private-research-file.txt", method: "Method ".repeat(30),
      reflection: "Limitations ".repeat(20), confirm: true,
    } : task.type === "json" ? JSON.stringify(task.expected) : task.answer;
    const result = evaluateTask(task, value);
    assert.notEqual(result.status, "failed");
    recordAttempt(state.tracks[language], task, value, result);
  }
  return state;
}

test("Feedback requires a completed chapter and never changes grades, XP or attempts", () => {
  const incomplete = freshState();
  const draft = { ...freshFeedbackDraft(), topics: ["practice"] };
  assert.equal(feedbackModule(incomplete, "de", 1), null);
  assert.throws(() => createChapterFeedback(incomplete, "de", 1, draft), /всіх завдань/);
  const state = completedChapter();
  const original = structuredClone(state);
  const stats = trackStats("de", state.tracks.de);
  assert.ok(feedbackModule(state, "de", 1));
  assert.equal(feedbackModule(state, "fr", 1), null);
  assert.equal(feedbackModule(state, "de", 2), null);
  assert.equal(feedbackModule(state, "de", 13), null);
  assert.equal(feedbackModule(state, "__proto__", 1), null);
  createChapterFeedback(state, "de", 1, draft);
  assert.deepEqual(state, original);
  assert.deepEqual(trackStats("de", state.tracks.de), stats);
  state.tracks.de.answers["1-5"].attempts = [];
  assert.throws(() => createChapterFeedback(state, "de", 1, draft));
  assert.equal(sectionStats(getModules("de")[0], state.tracks.de).complete, false);
});

test("Anonymous feedback exports only feedback content, with no profile, assessment or timing metadata", () => {
  const state = completedChapter();
  state.tracks.de.activity[1] = { activeMs: 123456, firstVisitedAt: "PRIVATE_ACTIVITY_DATE" };
  const draft = { ...freshFeedbackDraft(), topics: ["instructions", "explanation"],
    taskId: "1-2", comment: "Потрібен приклад імені файла." };
  const feedback = createChapterFeedback(state, "de", 1, draft);
  assert.deepEqual(Object.keys(feedback).sort(), [
    "application", "version", "type", "language", "languageName", "chapter", "task", "topics", "comment", "anonymous",
  ].sort());
  assert.equal(feedback.anonymous, true);
  assert.equal(feedback.task.id, "1-2");
  const serialized = JSON.stringify(feedback) + chapterFeedbackText(feedback);
  for (const privateValue of ["PRIVATE_STUDENT_NAME", "PRIVATE_GROUP_ID", "PRIVATE_ACTIVITY_DATE", "123456", "private-research-file.txt"])
    assert.ok(!serialized.includes(privateValue));
  assert.ok(chapterFeedbackText(feedback).includes("без імені та групи"));
  assert.ok(chapterFeedbackText(feedback).includes(draft.comment));
  assert.ok(!FEEDBACK_STORAGE_KEY.startsWith("lingva-lab:v1"));
});

test("Identity is included only by explicit choice and disappears when anonymous is reselected", () => {
  const state = completedChapter("fr");
  const draft = { ...freshFeedbackDraft(), comment: "Більше вправ на формати.", anonymous: false };
  const named = createChapterFeedback(state, "fr", 1, draft);
  assert.deepEqual(named.author, { name: state.student, group: state.group });
  assert.ok(chapterFeedbackText(named).includes(state.student));
  draft.anonymous = true;
  const anonymous = createChapterFeedback(state, "fr", 1, draft);
  assert.equal(Object.hasOwn(anonymous, "author"), false);
  assert.ok(!chapterFeedbackText(anonymous).includes(state.student));
});

test("A topic or a comment is sufficient; drafts may be empty and optional fields stay optional", () => {
  const state = completedChapter();
  assert.doesNotThrow(() => validateFeedbackDraft(freshFeedbackDraft(), "de", 1));
  assert.throws(() => createChapterFeedback(state, "de", 1, freshFeedbackDraft()), /хоча б одну/);
  assert.throws(() => createChapterFeedback(state, "de", 1, { ...freshFeedbackDraft(), comment: "  \n " }));
  assert.doesNotThrow(() => createChapterFeedback(state, "de", 1, { ...freshFeedbackDraft(), topics: ["difficulty"] }));
  assert.doesNotThrow(() => createChapterFeedback(state, "de", 1, { ...freshFeedbackDraft(), comment: "Ще приклад" }));
});

test("Separate drafts survive round trips, remain isolated by language/chapter and reject malformed data", () => {
  const store = freshFeedbackStore();
  store.tracks.de[1] = { ...freshFeedbackDraft(), comment: "Німецька, перший розділ" };
  store.tracks.fr[1] = { ...freshFeedbackDraft(), comment: "Французька, перший розділ" };
  store.tracks.de[2] = { ...freshFeedbackDraft(), topics: ["practice"] };
  const copy = validateFeedbackStore(JSON.parse(JSON.stringify(store)));
  assert.deepEqual(copy, store);
  store.tracks.de[2].topics.push("other");
  assert.deepEqual(copy.tracks.de[2].topics, ["practice"]);
  for (const mutation of [
    { topics: ["unknown"] }, { topics: ["practice", "practice"] }, { topics: [true] },
    { topics: {} }, { comment: { toString: null } }, { comment: "x".repeat(4001) },
    { anonymous: "true" }, { taskId: "2-1" }, { extra: {} }, { author: { name: "injected" } },
  ]) {
    const malformed = structuredClone(copy);
    Object.assign(malformed.tracks.de[1], mutation);
    assert.throws(() => validateFeedbackStore(malformed));
  }
  const malformed = structuredClone(copy);
  malformed.tracks.en[13] = freshFeedbackDraft();
  assert.throws(() => validateFeedbackStore(malformed));
});
