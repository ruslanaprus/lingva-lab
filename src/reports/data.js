import { LANGUAGES, SOURCES, TREASURES } from "../../content/registry.js";
import { sectionStats, taskStatus } from "../learning/progress.js";
import { selectionDetails } from "../learning/values.js";
import { now } from "../shared/values.js";
import { activitySummary } from "../features/activity.js";
import { APP_VERSION, REPORT_SCHEMA_VERSION } from "../version.js";

function reportRecord(task, record) {
  if (!record) return null;
  return structuredClone({
    ...record,
    attempts: record.attempts.map((attempt) => ({
      ...attempt,
      ...(attempt.definition.options
        ? {
            selectedOptions:
              attempt.selectedOptions ??
              selectionDetails(attempt.definition, attempt.value),
          }
        : {}),
    })),
  });
}
export function createReportData({ state, course, track, chapterId }) {
  const chapter = course.chapters.find((chapter) => chapter.id === chapterId);
  if (!chapter) throw new Error("Unknown chapter for report");
  const summary = sectionStats(chapter, track);
  const taskRow = (task, retired = false) => ({
    id: task.id,
    title: task.title,
    type: task.type,
    revision: task.revision,
    options: task.options ?? null,
    multiple: !!task.multiple,
    prompt: task.prompt,
    rubric: task.rubric ?? null,
    required: task.required !== false,
    status: retired ? "retired" : taskStatus(track.answers[task.id], task),
    retired,
    record: reportRecord(task, track.answers[task.id]),
  });
  const currentIds = new Set(chapter.tasks.map((task) => task.id));
  const retired = Object.values(track.answers).filter(
    (record) =>
      record.definition.chapterId === chapter.id &&
      !currentIds.has(record.definition.id),
  );
  return {
    application: "lingva.lab",
    appVersion: APP_VERSION,
    reportSchemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: now(),
    interfaceLocale: state.interfaceLocale,
    path: {
      id: course.id,
      title: course.title,
      level: course.level,
      revision: course.revision,
    },
    language: course.language,
    languageName: LANGUAGES[course.language].name,
    student: state.student,
    group: state.group,
    module: {
      id: chapter.id,
      number: course.chapters.indexOf(chapter) + 1,
      title: chapter.title,
      outcome: chapter.outcome,
      case: chapter.case,
    },
    summary,
    activity: activitySummary(track.activity[chapter.id]),
    completion: summary.complete
      ? "Практику розділу пройдено; прикладні роботи очікують оцінювання"
      : "Незавершена чернетка",
    tasks: [
      ...chapter.tasks.map((task) => taskRow(task)),
      ...retired.map((record) => taskRow(record.definition, true)),
    ],
    treasure: chapter.treasure
      ? {
          title: TREASURES[chapter.treasure].title,
          options: TREASURES[chapter.treasure].options,
          record: reportRecord(
            TREASURES[chapter.treasure],
            track.treasures[chapter.treasure],
          ),
        }
      : null,
    sources: chapter.sources.map((key) => SOURCES[key]),
    note: "Локальний навчальний звіт. Автоматичні результати й наявність артефактів не засвідчені сервером; потребують перевірки викладачем. Час є приблизним показником активності у браузері та не доводить самостійність роботи.",
  };
}
