import { LANGUAGES, getModules } from "./course.js";
import { sectionStats } from "./engine.js";

// Keep feedback drafts outside assessment backups and named chapter reports.
export const FEEDBACK_STORAGE_KEY = "lingva-lab:feedback:v1";
export const FEEDBACK_TOPICS = {
  difficulty: "Було занадто складно",
  instructions: "Не зовсім зрозуміло, що робити",
  explanation: "Бракує пояснення або прикладу",
  practice: "Хочеться більше практики",
  missing: "Варто додати тему чи завдання",
  other: "Інша пропозиція",
};
export const freshFeedbackDraft = () => ({
  topics: [], taskId: null, comment: "", anonymous: true,
});
export const freshFeedbackStore = () => ({
  version: 1, tracks: { de: {}, fr: {}, en: {} },
});
const onlyKeys = (value, keys) => value !== null &&
  typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).every((key) => keys.includes(key));

export function feedbackModule(state, language, id) {
  if (!Object.hasOwn(LANGUAGES, language)) return null;
  const module = getModules(language).find((m) => m.id === Number(id));
  return module && state.tracks[language] && sectionStats(module, state.tracks[language]).complete
    ? module : null;
}

export function validateFeedbackDraft(draft, language, id) {
  const module = Object.hasOwn(LANGUAGES, language)
    ? getModules(language).find((m) => String(m.id) === String(id)) : null;
  if (!module || !onlyKeys(draft, ["topics", "taskId", "comment", "anonymous"]) ||
      !Array.isArray(draft.topics) || draft.topics.length > Object.keys(FEEDBACK_TOPICS).length ||
      !draft.topics.every((topic) => typeof topic === "string" && Object.hasOwn(FEEDBACK_TOPICS, topic)) ||
      new Set(draft.topics).size !== draft.topics.length ||
      !(draft.taskId === null || module.tasks.some((t) => t.id === draft.taskId)) ||
      typeof draft.comment !== "string" || draft.comment.length > 4000 ||
      typeof draft.anonymous !== "boolean")
    throw new Error("Не вдалося прочитати чернетку відгуку.");
  return { topics: [...draft.topics], taskId: draft.taskId, comment: draft.comment, anonymous: draft.anonymous };
}

export function validateFeedbackStore(store) {
  if (!onlyKeys(store, ["version", "tracks"]) || store.version !== 1 ||
      !onlyKeys(store.tracks, Object.keys(LANGUAGES)))
    throw new Error("Несумісне сховище відгуків.");
  const clean = freshFeedbackStore();
  for (const language of Object.keys(LANGUAGES)) {
    if (!onlyKeys(store.tracks[language], getModules(language).map((m) => String(m.id))))
      throw new Error("Несумісне сховище відгуків.");
    for (const [id, draft] of Object.entries(store.tracks[language]))
      clean.tracks[language][id] = validateFeedbackDraft(draft, language, id);
  }
  return clean;
}

export function createChapterFeedback(state, language, id, input) {
  const module = feedbackModule(state, language, id);
  if (!module) throw new Error("Відгук доступний після виконання всіх завдань розділу.");
  const draft = validateFeedbackDraft(input, language, id);
  if (!draft.topics.length && !draft.comment.trim())
    throw new Error("Оберіть хоча б одну тему або напишіть свою пропозицію.");
  // Explicit allowlist: never copy the profile, attempts, timing or exact dates
  // into the feedback artifact. Identity requires the student's explicit choice.
  return {
    application: "lingva.lab", version: 1, type: "chapter-feedback",
    language, languageName: LANGUAGES[language].name,
    chapter: { id: module.id, title: module.title },
    task: draft.taskId ? {
      id: draft.taskId, title: module.tasks.find((t) => t.id === draft.taskId).title,
    } : null,
    topics: draft.topics.map((key) => ({ key, label: FEEDBACK_TOPICS[key] })),
    comment: draft.comment,
    anonymous: draft.anonymous,
    ...(!draft.anonymous ? { author: { name: state.student, group: state.group } } : {}),
  };
}

export function chapterFeedbackText(feedback) {
  return [
    "LINGVA.LAB / ВІДГУК ПРО РОЗДІЛ", "",
    `Розділ ${feedback.chapter.id}: ${feedback.chapter.title}`,
    `Мова матеріалів: ${feedback.languageName}`,
    `Завдання: ${feedback.task ? feedback.task.id + " / " + feedback.task.title : "Увесь розділ"}`,
    feedback.anonymous ? "Авторство: без імені та групи" :
      `Ім’я: ${feedback.author.name || "Не вказано"}\nГрупа: ${feedback.author.group || "Не вказано"}`,
    "", "Що варто покращити:",
    feedback.topics.length ? feedback.topics.map((topic) => "• " + topic.label).join("\n") : "Не зазначено",
    "", "Пропозиції:", feedback.comment.trim() ? feedback.comment : "Без додаткового коментаря",
    "", "Добровільний відгук. Не є частиною звіту з оцінюванням.", "",
  ].join("\n");
}
