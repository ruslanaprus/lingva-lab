import de from "./tracks/de/language.js";
import fr from "./tracks/fr/language.js";
import en from "./tracks/en/language.js";
import german from "./tracks/de/foundations.js";
import french from "./tracks/fr/foundations.js";
import english from "./tracks/en/foundations.js";
import { SOURCES } from "./sources.js";
import { TREASURES } from "./challenges.js";
import { validateCourse } from "./schema.js";
export { SOURCES } from "./sources.js";
export { TREASURES } from "./challenges.js";
export { GLOSSARY } from "./glossary.js";

export const LANGUAGES = { de, fr, en };

export function buildPath(manifest, material) {
  if (!material || material.code !== manifest.language)
    throw new Error("Path and language material must agree");
  const independentMaterial = structuredClone(material);
  const course = {
    ...manifest,
    chapters: manifest.chapters.map((entry) => {
      const chapter =
        typeof entry === "function"
          ? entry(independentMaterial)
          : structuredClone(entry);
      return {
        required: true,
        ...chapter,
        tasks: chapter.tasks.map((task) => ({
          required: true,
          revision: 1,
          ...task,
          chapterId: chapter.id,
        })),
      };
    }),
  };
  return validateCourse(course, SOURCES, TREASURES);
}

export const PATHS = Object.fromEntries(
  [german, french, english].map((manifest) => [
    manifest.id,
    buildPath(manifest, LANGUAGES[manifest.language]),
  ]),
);
export const getPath = (id) => {
  if (!Object.hasOwn(PATHS, id)) throw new Error(`Unknown learning path: ${id}`);
  return PATHS[id];
};
export const getChapters = (id) => getPath(id).chapters;
export const getPathTasks = (id) => getChapters(id).flatMap((chapter) => chapter.tasks);
export const getChapter = (pathId, chapterId) =>
  getChapters(pathId).find((chapter) => chapter.id === chapterId);
export const getExercise = (pathId, exerciseId) =>
  getPathTasks(pathId).find((task) => task.id === exerciseId);
export const chapterNumber = (pathId, chapterId) =>
  getChapters(pathId).findIndex((chapter) => chapter.id === chapterId) + 1;
export const nextChapter = (pathId, chapterId) => {
  const chapters = getChapters(pathId),
    index = chapters.findIndex((chapter) => chapter.id === chapterId);
  return index < 0 ? null : (chapters[index + 1] ?? null);
};
export const foundationPathId = (language) =>
  Object.values(PATHS).find(
    (path) => path.language === language && path.level === "foundations",
  )?.id;
