import assert from "node:assert/strict";
import { PATHS, SOURCES, TREASURES, GLOSSARY } from "../content/registry.js";
import { validateCourse } from "../content/schema.js";
import { dictionaries } from "../src/i18n/index.js";

for (const path of Object.values(PATHS)) {
  validateCourse(path, SOURCES, TREASURES);
  for (const milestone of path.milestones ?? []) {
    assert.ok(milestone.chapterIds.length > 0, `${path.id}: empty milestone`);
    assert.ok(
      milestone.chapterIds.every((id) =>
        path.chapters.some((chapter) => chapter.id === id),
      ),
      `${path.id}: unknown milestone chapter`,
    );
  }
  console.log(
    `${path.id}: ${path.chapters.length} chapters, ${path.chapters.flatMap((chapter) => chapter.tasks).length} exercises`,
  );
}
for (const source of Object.values(SOURCES))
  assert.equal(new URL(source.url).protocol, "https:");
for (const [, definition, key] of GLOSSARY) {
  assert.ok(definition.trim());
  assert.ok(Object.hasOwn(SOURCES, key), `Unknown glossary source: ${key}`);
}
const keys = Object.keys(dictionaries.uk).sort();
for (const [locale, dictionary] of Object.entries(dictionaries)) {
  assert.deepEqual(
    Object.keys(dictionary).sort(),
    keys,
    `${locale}: missing translation keys`,
  );
  assert.ok(
    Object.values(dictionary).every(
      (value) => typeof value === "string" && value.trim(),
    ),
  );
}
console.log("Content references and interface dictionaries are valid.");
