import { LANGUAGES, PATHS, getPath, getChapter } from "../../content/registry.js";
import { sectionStats } from "../learning/progress.js";

// Keep feedback drafts outside assessment backups and named chapter reports.
export const FEEDBACK_STORAGE_KEY = "lingva-lab:feedback:v2";
export const FEEDBACK_TOPICS = {
  difficulty: "Було занадто складно",
  instructions: "Не зовсім зрозуміло, що робити",
  explanation: "Бракує пояснення або прикладу",
  practice: "Хочеться більше практики",
  missing: "Варто додати тему чи завдання",
  other: "Інша пропозиція",
};
export const freshFeedbackDraft = () => ({
  topics: [],
  taskId: null,
  comment: "",
  anonymous: true,
});
export const freshFeedbackStore = () => ({
  schemaVersion: 2,
  paths: Object.fromEntries(Object.keys(PATHS).map((id) => [id, {}])),
});
const onlyKeys = (value, keys) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => keys.includes(key));

export function feedbackModule(state, pathId, id) {
  if (!Object.hasOwn(PATHS, pathId)) return null;
  const module = getChapter(pathId, id);
  return module &&
    state.paths[pathId] &&
    sectionStats(module, state.paths[pathId]).complete
    ? module
    : null;
}

export function validateFeedbackDraft(draft, pathId, id) {
  const module = Object.hasOwn(PATHS, pathId) ? getChapter(pathId, id) : null;
  if (
    !module ||
    !onlyKeys(draft, ["topics", "taskId", "comment", "anonymous"]) ||
    !Array.isArray(draft.topics) ||
    draft.topics.length > Object.keys(FEEDBACK_TOPICS).length ||
    !draft.topics.every(
      (topic) => typeof topic === "string" && Object.hasOwn(FEEDBACK_TOPICS, topic),
    ) ||
    new Set(draft.topics).size !== draft.topics.length ||
    !(draft.taskId === null || module.tasks.some((t) => t.id === draft.taskId)) ||
    typeof draft.comment !== "string" ||
    draft.comment.length > 4000 ||
    typeof draft.anonymous !== "boolean"
  )
    throw new Error("Не вдалося прочитати чернетку відгуку.");
  return {
    topics: [...draft.topics],
    taskId: draft.taskId,
    comment: draft.comment,
    anonymous: draft.anonymous,
  };
}

export function validateFeedbackStore(store) {
  if (
    !onlyKeys(store, ["schemaVersion", "paths"]) ||
    store.schemaVersion !== 2 ||
    !onlyKeys(store.paths, Object.keys(PATHS))
  )
    throw new Error("Несумісне сховище відгуків.");
  const clean = freshFeedbackStore();
  for (const pathId of Object.keys(PATHS)) {
    if (
      !onlyKeys(
        store.paths[pathId],
        getPath(pathId).chapters.map((m) => m.id),
      )
    )
      throw new Error("Несумісне сховище відгуків.");
    for (const [id, draft] of Object.entries(store.paths[pathId]))
      clean.paths[pathId][id] = validateFeedbackDraft(draft, pathId, id);
  }
  return clean;
}

export function createChapterFeedback(state, pathId, id, input) {
  const module = feedbackModule(state, pathId, id);
  if (!module)
    throw new Error("Відгук доступний після виконання всіх завдань розділу.");
  const draft = validateFeedbackDraft(input, pathId, id);
  if (!draft.topics.length && !draft.comment.trim())
    throw new Error("Оберіть хоча б одну тему або напишіть свою пропозицію.");
  // Explicit allowlist: never copy the profile, attempts, timing or exact dates
  // into the feedback artifact. Identity requires the student's explicit choice.
  const language = getPath(pathId).language;
  return {
    pathId,
    application: "lingva.lab",
    version: 1,
    type: "chapter-feedback",
    language,
    languageName: LANGUAGES[language].name,
    chapter: { id: module.id, title: module.title },
    task: draft.taskId
      ? {
          id: draft.taskId,
          title: module.tasks.find((t) => t.id === draft.taskId).title,
        }
      : null,
    topics: draft.topics.map((key) => ({ key, label: FEEDBACK_TOPICS[key] })),
    comment: draft.comment,
    anonymous: draft.anonymous,
    ...(!draft.anonymous
      ? { author: { name: state.student, group: state.group } }
      : {}),
  };
}

export function chapterFeedbackText(feedback) {
  return [
    "LINGVA.LAB / ВІДГУК ПРО РОЗДІЛ",
    "",
    `Розділ ${feedback.chapter.id}: ${feedback.chapter.title}`,
    `Мова матеріалів: ${feedback.languageName}`,
    `Завдання: ${feedback.task ? feedback.task.id + " / " + feedback.task.title : "Увесь розділ"}`,
    feedback.anonymous
      ? "Авторство: без імені та групи"
      : `Ім’я: ${feedback.author.name || "Не вказано"}\nГрупа: ${feedback.author.group || "Не вказано"}`,
    "",
    "Що варто покращити:",
    feedback.topics.length
      ? feedback.topics.map((topic) => "• " + topic.label).join("\n")
      : "Не зазначено",
    "",
    "Пропозиції:",
    feedback.comment.trim() ? feedback.comment : "Без додаткового коментаря",
    "",
    "Добровільний відгук. Не є частиною звіту з оцінюванням.",
    "",
  ].join("\n");
}
