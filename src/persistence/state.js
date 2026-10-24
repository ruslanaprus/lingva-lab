import { PATHS, LANGUAGES } from "../../content/registry.js";
import { EXERCISE_TYPES, validId } from "../../content/schema.js";
import { STORAGE_SCHEMA_VERSION } from "../version.js";
import { object, text, onlyKeys, pick } from "../shared/values.js";
import {
  validTaskValue,
  copyTaskValue,
  validSelections,
  attemptKeys,
  eventKeys,
} from "../learning/values.js";

export const STORAGE_KEY = "lingva-lab:v2";
export const LEGACY_STORAGE_KEY = "lingva-lab:v1";
export const pathSnapshot = (course) => ({
  id: course.id,
  language: course.language,
  title: course.title,
  revision: course.revision,
});
export const freshPathState = (course) => ({
  path: pathSnapshot(course),
  answers: {},
  treasures: {},
  activity: {},
});
export const freshState = () => ({
  schemaVersion: STORAGE_SCHEMA_VERSION,
  interfaceLocale: "uk",
  activePathId: null,
  student: "",
  group: "",
  paths: Object.fromEntries(
    Object.values(PATHS).map((course) => [course.id, freshPathState(course)]),
  ),
});
const positive = (value) => Number.isSafeInteger(value) && value > 0;
const validDate = (value) => text(value, 40) && Number.isFinite(Date.parse(value));
const snapshotKeys = [
  "id",
  "chapterId",
  "revision",
  "type",
  "title",
  "prompt",
  "xp",
  "options",
  "multiple",
];
const activityKeys = [
  "firstVisitedAt",
  "lastVisitedAt",
  "visits",
  "pageMs",
  "visibleMs",
  "activeMs",
];

export function validSnapshot(snapshot) {
  if (
    !onlyKeys(snapshot, snapshotKeys) ||
    !validId(snapshot.id) ||
    !(snapshot.chapterId === null || validId(snapshot.chapterId)) ||
    !positive(snapshot.revision) ||
    !EXERCISE_TYPES.includes(snapshot.type) ||
    !text(snapshot.title, 2000) ||
    !text(snapshot.prompt, 20000) ||
    !Number.isSafeInteger(snapshot.xp) ||
    snapshot.xp < 0
  )
    return false;
  if (["choice", "unicode", "wave"].includes(snapshot.type))
    return (
      Array.isArray(snapshot.options) &&
      snapshot.options.length <= 1000 &&
      snapshot.options.length > 0 &&
      snapshot.options.every((value) => text(value, 10000)) &&
      typeof snapshot.multiple === "boolean"
    );
  return snapshot.options === undefined && snapshot.multiple === undefined;
}
const copySnapshot = (snapshot) => ({
  ...pick(snapshot, snapshotKeys),
  ...(snapshot.options ? { options: [...snapshot.options] } : {}),
});

function validAttempt(attempt, id) {
  return (
    onlyKeys(attempt, [...attemptKeys, "definition", "graderVersion"]) &&
    validSnapshot(attempt.definition) &&
    attempt.definition.id === id &&
    positive(attempt.graderVersion) &&
    validDate(attempt.at) &&
    ["passed", "failed", "submitted"].includes(attempt.status) &&
    text(attempt.feedback, 5000) &&
    Number.isSafeInteger(attempt.hints) &&
    attempt.hints >= 0 &&
    validTaskValue(attempt.definition, attempt.value) &&
    validSelections(attempt.definition, attempt)
  );
}
const copyAttempt = (attempt) => ({
  ...pick(attempt, [...attemptKeys, "graderVersion"]),
  definition: copySnapshot(attempt.definition),
  value: copyTaskValue(attempt.definition, attempt.value),
  ...(attempt.selectedOptions
    ? { selectedOptions: attempt.selectedOptions.map((option) => ({ ...option })) }
    : {}),
});

// Each future schema transition gets a pure, explicit migration here and an
// immutable input fixture. Product releases never change schema numbers implicitly.
export const STORAGE_MIGRATIONS = Object.freeze({});
export function migrateBackup(input) {
  if (!object(input) || !positive(input.schemaVersion))
    throw new Error(
      "Це не резервна копія lingva.lab формату 2. Тестовий формат 1 не підтримується цією версією.",
    );
  let data = structuredClone(input);
  while (data.schemaVersion < STORAGE_SCHEMA_VERSION) {
    const migrate = STORAGE_MIGRATIONS[data.schemaVersion];
    if (!migrate) throw new Error("Для цього формату резервної копії немає міграції.");
    const previous = data.schemaVersion;
    data = migrate(data);
    if (data.schemaVersion !== previous + 1)
      throw new Error("Некоректна міграція резервної копії.");
  }
  return data;
}

export function validateBackup(input) {
  const data = migrateBackup(input);
  const fail = () => {
    throw new Error("Це не сумісна резервна копія lingva.lab формату 2.");
  };
  if (
    !onlyKeys(data, [
      "schemaVersion",
      "interfaceLocale",
      "activePathId",
      "student",
      "group",
      "paths",
    ]) ||
    data.schemaVersion !== STORAGE_SCHEMA_VERSION ||
    data.interfaceLocale !== "uk" ||
    !(data.activePathId === null || validId(data.activePathId)) ||
    !text(data.student, 100) ||
    !text(data.group, 40) ||
    !object(data.paths) ||
    Object.keys(data.paths).length > 100 ||
    (data.activePathId !== null && !Object.hasOwn(data.paths, data.activePathId))
  )
    fail();
  const clean = freshState();
  clean.interfaceLocale = data.interfaceLocale;
  clean.activePathId = Object.hasOwn(PATHS, data.activePathId)
    ? data.activePathId
    : null;
  clean.student = data.student;
  clean.group = data.group;
  for (const [pathId, track] of Object.entries(data.paths)) {
    if (
      !validId(pathId) ||
      !onlyKeys(track, ["path", "answers", "treasures", "activity"]) ||
      !onlyKeys(track.path, ["id", "language", "title", "revision"]) ||
      track.path.id !== pathId ||
      !Object.hasOwn(LANGUAGES, track.path.language) ||
      !positive(track.path.revision) ||
      !text(track.path.title, 2000) ||
      !object(track.answers) ||
      Object.keys(track.answers).length > 10000 ||
      !object(track.treasures) ||
      Object.keys(track.treasures).length > 1000 ||
      !object(track.activity)
    )
      fail();
    if (Object.hasOwn(PATHS, pathId) && PATHS[pathId].language !== track.path.language)
      fail();
    const output = {
      path: pick(track.path, ["id", "language", "title", "revision"]),
      answers: {},
      treasures: {},
      activity: {},
    };
    for (const [id, record] of Object.entries(track.answers)) {
      if (
        !validId(id) ||
        !onlyKeys(record, [
          "definition",
          "draft",
          "attempts",
          "hints",
          "hintOpened",
          "toolEvents",
        ]) ||
        !validSnapshot(record.definition) ||
        record.definition.id !== id ||
        !validTaskValue(record.definition, record.draft) ||
        !Array.isArray(record.attempts) ||
        record.attempts.length > 5000 ||
        !record.attempts.every((attempt) => validAttempt(attempt, id)) ||
        !Number.isSafeInteger(record.hints) ||
        record.hints < 0 ||
        typeof record.hintOpened !== "boolean" ||
        !Array.isArray(record.toolEvents) ||
        record.toolEvents.length > 10000 ||
        !record.toolEvents.every(
          (event) =>
            onlyKeys(event, eventKeys) &&
            validDate(event.at) &&
            text(event.input, 1000) &&
            text(event.output, 50000) &&
            typeof event.ok === "boolean",
        )
      )
        fail();
      output.answers[id] = {
        definition: copySnapshot(record.definition),
        draft: copyTaskValue(record.definition, record.draft),
        attempts: record.attempts.map(copyAttempt),
        hints: record.hints,
        hintOpened: record.hintOpened,
        toolEvents: record.toolEvents.map((event) => pick(event, eventKeys)),
      };
    }
    for (const [id, record] of Object.entries(track.treasures)) {
      if (
        !validId(id) ||
        !onlyKeys(record, ["definition", "attempts"]) ||
        !validSnapshot(record.definition) ||
        record.definition.id !== id ||
        !Array.isArray(record.attempts) ||
        record.attempts.length > 5000 ||
        !record.attempts.every((attempt) => validAttempt(attempt, id))
      )
        fail();
      output.treasures[id] = {
        definition: copySnapshot(record.definition),
        attempts: record.attempts.map(copyAttempt),
      };
    }
    for (const [id, timing] of Object.entries(track.activity)) {
      if (
        !validId(id) ||
        !onlyKeys(timing, activityKeys) ||
        !validDate(timing.firstVisitedAt) ||
        !validDate(timing.lastVisitedAt) ||
        Date.parse(timing.lastVisitedAt) < Date.parse(timing.firstVisitedAt) ||
        !positive(timing.visits) ||
        ![timing.pageMs, timing.visibleMs, timing.activeMs].every(
          (value) => Number.isSafeInteger(value) && value >= 0,
        ) ||
        timing.activeMs > timing.visibleMs ||
        timing.visibleMs > timing.pageMs
      )
        fail();
      output.activity[id] = pick(timing, activityKeys);
    }
    clean.paths[pathId] = output;
  }
  return clean;
}

export function loadProgress(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw)
    return {
      state: freshState(),
      recovery: storage.getItem(LEGACY_STORAGE_KEY),
      writable: true,
    };
  try {
    return { state: validateBackup(JSON.parse(raw)), recovery: null, writable: true };
  } catch (error) {
    return {
      state: freshState(),
      recovery: raw,
      writable: false,
      error: error.message,
    };
  }
}
