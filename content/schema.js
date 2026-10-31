import { validateWorkshop } from "./workshop-schema.js";
/**
 * @typedef {Object} Exercise
 * @property {string} id Permanent identity; never generated from display order.
 * @property {number} revision Increment when instructions or checking meaning changes.
 * @property {string} type Shared renderer/checker contract.
 * @property {boolean} required Whether this exercise controls chapter completion.
 * @property {number} xp One-time reward for the exercise identity in its path.
 */
export const EXERCISE_TYPES = [
  "choice",
  "exact",
  "json",
  "unicode",
  "terminal",
  "regex",
  "replace",
  "git",
  "wave",
  "interval",
  "wer",
  "portfolio",
];
export const validId = (value) =>
  typeof value === "string" && /^[a-z][a-z0-9-]{0,99}$/.test(value);
const positive = (value) => Number.isSafeInteger(value) && value > 0;

export function validateCourse(course, sources = {}, challenges = {}) {
  const fail = (message) => {
    throw new Error(`${course?.id || "course"}: ${message}`);
  };
  if (
    !validId(course.id) ||
    !validId(course.language) ||
    !validId(course.level) ||
    !positive(course.revision) ||
    typeof course.title !== "string" ||
    !Array.isArray(course.chapters) ||
    !course.chapters.length
  )
    fail("invalid course manifest");
  const chapterIds = new Set(),
    exerciseIds = new Set();
  for (const chapter of course.chapters) {
    if (
      !validId(chapter.id) ||
      chapterIds.has(chapter.id) ||
      !positive(chapter.revision) ||
      typeof chapter.required !== "boolean" ||
      !Array.isArray(chapter.tasks) ||
      (chapter.status !== undefined && chapter.status !== "planned") ||
      (chapter.status === "planned"
        ? chapter.required ||
          chapter.tasks.length !== 0 ||
          chapter.workshop ||
          chapter.treasure
        : !chapter.tasks.length)
    )
      fail("invalid or duplicate chapter");
    chapterIds.add(chapter.id);
    if (
      !Number.isFinite(chapter.time) ||
      (chapter.status === "planned" ? chapter.time !== 0 : chapter.time <= 0) ||
      !Array.isArray(chapter.terms) ||
      chapter.terms.some((term) => typeof term !== "string")
    )
      fail(`${chapter.id}: invalid duration or terms`);
    for (const key of ["title", "short", "outcome", "case", "theory", "category"])
      if (typeof chapter[key] !== "string" || !chapter[key].trim())
        fail(`${chapter.id}: missing ${key}`);
    if (
      !Array.isArray(chapter.sources) ||
      chapter.sources.some((key) => !Object.hasOwn(sources, key))
    )
      fail(`${chapter.id}: unknown source`);
    if (chapter.treasure && !Object.hasOwn(challenges, chapter.treasure))
      fail(`${chapter.id}: unknown challenge`);
    for (const task of chapter.tasks) {
      if (
        !validId(task.id) ||
        exerciseIds.has(task.id) ||
        !positive(task.revision) ||
        !EXERCISE_TYPES.includes(task.type) ||
        typeof task.required !== "boolean" ||
        !Number.isSafeInteger(task.xp) ||
        task.xp < 0
      )
        fail(`${chapter.id}: invalid or duplicate exercise`);
      exerciseIds.add(task.id);
      for (const key of ["title", "prompt", "hint"])
        if (typeof task[key] !== "string" || !task[key].trim())
          fail(`${task.id}: missing ${key}`);
      if (["choice", "unicode", "wave"].includes(task.type)) {
        if (
          !Array.isArray(task.options) ||
          task.options.length < 2 ||
          task.options.some((value) => typeof value !== "string")
        )
          fail(`${task.id}: invalid options`);
        const answers = task.multiple ? task.answer : [task.answer];
        if (
          !Array.isArray(answers) ||
          !answers.length ||
          new Set(answers).size !== answers.length ||
          answers.some(
            (value) =>
              !Number.isInteger(value) || value < 0 || value >= task.options.length,
          )
        )
          fail(`${task.id}: invalid answer indexes`);
      }
      if (task.type === "exact" && !["string", "number"].includes(typeof task.answer))
        fail(`${task.id}: missing answer`);
      if (
        task.checker === "unicode" &&
        (task.type !== "exact" ||
          typeof task.answer !== "string" ||
          !["NFC", "none"].includes(task.normalization))
      )
        fail(`${task.id}: invalid Unicode checking contract`);
      if (task.normalization !== undefined && task.checker !== "unicode")
        fail(`${task.id}: normalization requires a Unicode checker`);
      if (
        task.checker !== undefined &&
        task.checker !== "unicode" &&
        (task.type !== "exact" ||
          task.checker !== "csv" ||
          !Array.isArray(task.expectedRows) ||
          !task.expectedRows.length ||
          task.expectedRows.length > 200 ||
          task.expectedRows.some(
            (row) =>
              !Array.isArray(row) ||
              !row.length ||
              row.length > 100 ||
              row.some((field) => typeof field !== "string"),
          ))
      )
        fail(`${task.id}: invalid CSV checking contract`);
      if (
        task.inspector !== undefined &&
        (task.type !== "exact" ||
          !["characters", "typography"].includes(task.inspector))
      )
        fail(`${task.id}: invalid character inspector`);
      if (
        task.palette !== undefined &&
        (task.inspector !== "typography" ||
          !Array.isArray(task.palette) ||
          task.palette.length > 24 ||
          new Set(task.palette).size !== task.palette.length ||
          task.palette.some(
            (symbol) => typeof symbol !== "string" || Array.from(symbol).length !== 1,
          ))
      )
        fail(`${task.id}: invalid symbol palette`);
      if (
        task.probe !== undefined &&
        (task.inspector !== "typography" ||
          typeof task.probe !== "string" ||
          !task.probe.length ||
          task.probe.length > 100)
      )
        fail(`${task.id}: invalid literal search probe`);
      if (task.type === "json" && (!task.expected || typeof task.expected !== "object"))
        fail(`${task.id}: missing JSON expectation`);
      if (["regex", "replace"].includes(task.type) && typeof task.corpus !== "string")
        fail(`${task.id}: missing corpus`);
      if (
        task.type === "regex" &&
        (!Array.isArray(task.targets) ||
          task.targets.some((value) => typeof value !== "string"))
      )
        fail(`${task.id}: missing regex targets`);
      if (["replace", "git"].includes(task.type) && typeof task.expected !== "string")
        fail(`${task.id}: missing expected text`);
      if (
        task.type === "terminal" &&
        !["navigate", "copy", "search"].includes(task.goal)
      )
        fail(`${task.id}: unknown terminal goal`);
      if (
        task.type === "portfolio" &&
        (!Array.isArray(task.rubric) || !task.rubric.length)
      )
        fail(`${task.id}: missing portfolio rubric`);
    }
    if (chapter.overview) {
      for (const key of [
        "purpose",
        "foundations",
        "practice",
        "application",
        "example",
        "note",
      ])
        if (typeof chapter.overview[key] !== "string" || !chapter.overview[key].trim())
          fail(`${chapter.id}: missing overview ${key}`);
      if (
        !Array.isArray(chapter.overview.related) ||
        chapter.overview.related.some((id) => !validId(id))
      )
        fail(`${chapter.id}: invalid related chapters`);
    }
    if (chapter.status === "planned" && !chapter.overview)
      fail(`${chapter.id}: planned chapter needs an overview`);
    if (chapter.status !== "planned" && !chapter.tasks.some((task) => task.required))
      fail(`${chapter.id}: chapter must have a required exercise`);
    if (chapter.workshop) validateWorkshop(chapter, sources, validId);
  }
  if (
    course.assessment &&
    (typeof course.assessment.description !== "string" ||
      typeof course.assessment.note !== "string" ||
      !Array.isArray(course.assessment.parts) ||
      !course.assessment.parts.length ||
      course.assessment.parts.some(
        (part) =>
          typeof part.title !== "string" ||
          !Number.isFinite(part.weight) ||
          part.weight < 0,
      ) ||
      course.assessment.parts.reduce((sum, part) => sum + part.weight, 0) !== 100)
  )
    fail("assessment weights must total 100");
  return course;
}
