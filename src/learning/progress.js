import { getPath, getExercise, TREASURES } from "../../content/registry.js";
import { now } from "../shared/values.js";
import { selectionDetails } from "./values.js";
import { GRADER_VERSION } from "../version.js";

export function exerciseSnapshot(task) {
  return {
    id: task.id,
    chapterId: task.chapterId ?? null,
    revision: task.revision ?? 1,
    type: task.type,
    title: task.title,
    prompt: task.prompt,
    xp: task.xp ?? 0,
    ...(task.options ? { options: [...task.options], multiple: !!task.multiple } : {}),
  };
}
export function answerRecord(track, exercise) {
  const task =
    typeof exercise === "string" ? getExercise(track.path.id, exercise) : exercise;
  if (!task) throw new Error("Unknown exercise");
  const record = (track.answers[task.id] ??= {
    definition: exerciseSnapshot(task),
    draft: null,
    attempts: [],
    hints: 0,
    hintOpened: false,
    toolEvents: [],
  });
  if (
    record.definition.revision !== task.revision ||
    record.definition.type !== task.type
  ) {
    record.draft = null;
    record.definition = exerciseSnapshot(task);
  }
  return record;
}
export function taskStatus(record, task) {
  if (!record) return "new";
  const attempts = task
    ? record.attempts.filter((attempt) => attempt.definition.revision === task.revision)
    : record.attempts;
  if (attempts.some((attempt) => attempt.status === "passed")) return "passed";
  if (attempts.some((attempt) => attempt.status === "submitted")) return "submitted";
  return attempts.length ? "failed" : "new";
}
export function sectionStats(chapter, track) {
  const rows = chapter.tasks.map((task) => ({
    task,
    record: track.answers[task.id],
    status: taskStatus(track.answers[task.id], task),
  }));
  const done = (row) => ["passed", "submitted"].includes(row.status);
  const required = rows.filter((row) => row.task.required !== false);
  return {
    total: rows.length,
    requiredTotal: required.length,
    requiredDone: required.filter(done).length,
    done: rows.filter(done).length,
    passed: rows.filter((row) => row.status === "passed").length,
    submitted: rows.filter((row) => row.status === "submitted").length,
    gradedTotal: rows.filter((row) => row.task.type !== "portfolio").length,
    portfolioTotal: rows.filter((row) => row.task.type === "portfolio").length,
    attempts: rows.reduce((n, row) => n + (row.record?.attempts.length ?? 0), 0),
    errors: rows.reduce(
      (n, row) =>
        n + (row.record?.attempts.filter((a) => a.status === "failed").length ?? 0),
      0,
    ),
    complete: required.length > 0 && required.every(done),
  };
}
export function trackStats(path, track) {
  const course = typeof path === "string" ? getPath(path) : path;
  const tasks = course.chapters.flatMap((chapter) => chapter.tasks);
  const records = Object.values(track.answers);
  const requiredChapters = course.chapters.filter(
    (chapter) => chapter.required !== false,
  );
  const earned = (record) =>
    record.attempts.find((a) => ["passed", "submitted"].includes(a.status))?.definition
      .xp ?? 0;
  return {
    xp: [...records, ...Object.values(track.treasures)].reduce(
      (n, record) => n + earned(record),
      0,
    ),
    passed: tasks.filter(
      (task) => taskStatus(track.answers[task.id], task) === "passed",
    ).length,
    submitted: tasks.filter(
      (task) => taskStatus(track.answers[task.id], task) === "submitted",
    ).length,
    done: tasks.filter((task) =>
      ["passed", "submitted"].includes(taskStatus(track.answers[task.id], task)),
    ).length,
    total: tasks.length,
    gradedTotal: tasks.filter((task) => task.type !== "portfolio").length,
    portfolioTotal: tasks.filter((task) => task.type === "portfolio").length,
    sections: course.chapters.filter((chapter) => sectionStats(chapter, track).complete)
      .length,
    sectionTotal: course.chapters.length,
    complete:
      requiredChapters.length > 0 &&
      requiredChapters.every((chapter) => sectionStats(chapter, track).complete),
    attempts: records.reduce((n, r) => n + r.attempts.length, 0),
    errors: records.reduce(
      (n, r) => n + r.attempts.filter((a) => a.status === "failed").length,
      0,
    ),
    resubmissions: records.reduce((n, r) => n + Math.max(0, r.attempts.length - 1), 0),
    hints: records.reduce((n, r) => n + r.hints, 0),
    commandErrors: records.reduce(
      (n, r) => n + r.toolEvents.filter((e) => !e.ok).length,
      0,
    ),
  };
}
export function badges(path, track) {
  const course = typeof path === "string" ? getPath(path) : path;
  const stats = trackStats(course, track);
  const completeGroup = (ids) => {
    const chapters = course.chapters.filter((chapter) => ids.includes(chapter.id));
    return (
      chapters.length > 0 &&
      chapters.every((chapter) => sectionStats(chapter, track).complete)
    );
  };
  const challenges = [
    ...new Set(course.chapters.map((chapter) => chapter.treasure).filter(Boolean)),
  ];
  const definitions = [
    {
      name: "Перший доказ",
      mark: "↗",
      description: "Перше успішне завдання",
      unlocked: stats.passed > 0,
    },
    ...(course.milestones ?? []).map((milestone) => ({
      ...milestone,
      unlocked: completeGroup(milestone.chapterIds),
    })),
    {
      name: "Архівний детектив",
      mark: "◇",
      description: `Розв’язано всі додаткові виклики маршруту (${challenges.length})`,
      unlocked:
        challenges.length > 0 &&
        challenges.every((id) =>
          track.treasures[id]?.attempts.some((a) => a.status === "passed"),
        ),
    },
    {
      name: "Цифровий лінгвіст",
      mark: "∑",
      description: "Завершено всі обов’язкові розділи",
      unlocked: stats.complete,
    },
  ];
  return definitions;
}
export function recordAttempt(track, task, value, result) {
  const record = answerRecord(track, task);
  const earnedBefore = record.attempts.some((a) =>
    ["passed", "submitted"].includes(a.status),
  );
  record.draft = structuredClone(value);
  record.attempts.push({
    at: now(),
    value: structuredClone(value),
    status: result.status,
    feedback: result.feedback,
    hints: record.hints,
    definition: exerciseSnapshot(task),
    graderVersion: GRADER_VERSION,
    ...(task.options ? { selectedOptions: selectionDetails(task, value) } : {}),
  });
  return {
    record,
    newXP:
      !earnedBefore && ["passed", "submitted"].includes(result.status) ? task.xp : 0,
  };
}

export function recordTreasureAttempt(track, key, value, chapterId) {
  const task = {
    ...TREASURES[key],
    id: key,
    type: "choice",
    revision: TREASURES[key].revision ?? 1,
    chapterId,
  };
  const record = (track.treasures[key] ??= {
    definition: exerciseSnapshot(task),
    attempts: [],
  });
  const pass = Number(value) === task.answer;
  const earnedBefore = record.attempts.some((a) => a.status === "passed");
  record.attempts.push({
    at: now(),
    value,
    status: pass ? "passed" : "failed",
    feedback: pass
      ? task.explain
      : "Поверніться до означень: тут є методологічна пастка.",
    hints: 0,
    definition: exerciseSnapshot(task),
    graderVersion: GRADER_VERSION,
    selectedOptions: selectionDetails(task, value),
  });
  return { pass, newXP: pass && !earnedBefore ? task.xp : 0 };
}
