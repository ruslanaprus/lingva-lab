// Development-only: export the actual course text for editorial review.
// node scripts/export-chapter-review.mjs de-foundations academic-documents > docs/chapter-two-review.md
import { getPath, SOURCES, TREASURES } from "../content/registry.js";
const [pathId, chapterId] = process.argv.slice(2);
const course = getPath(pathId),
  chapter = course.chapters.find((c) => c.id === chapterId);
if (!chapter) throw new Error("Unknown chapter");
const exampleFile =
  chapterId === "information-search"
    ? "search"
    : chapterId === "unicode"
      ? "typography"
      : chapterId === "data-formats"
        ? "formats"
        : "documents";
const reviewFile =
  chapterId === "information-search"
    ? "chapter-six-review.md"
    : chapterId === "unicode"
      ? "chapter-four-review.md"
      : chapterId === "data-formats"
        ? "chapter-three-review.md"
        : "chapter-two-review.md";
const lines = [
  `# ${chapter.title}: текст для перегляду`,
  "",
  `Згенеровано з матеріалів траєкторії ${course.title}. Українські пояснення спільні; мовні приклади тут – ${course.language}. Інші варіанти: content/tracks/fr/${exampleFile}.js та content/tracks/en/${exampleFile}.js.`,
  "",
  `Текст сайту редагується у \`content/shared/chapters/${chapter.id}.js\` та \`content/shared/chapters/${chapter.id}/\`. Зміни лише в цьому файлі для перегляду не змінюють текст на сайті.`,
  "",
  `Оновити після редагування: \`node scripts/export-chapter-review.mjs ${pathId} ${chapterId} > docs/${reviewFile}\`, потім Prettier.`,
  "",
  `${chapter.time} хв обов’язкової роботи; час є орієнтовною оцінкою, не перевіреною тривалістю для кожного студента.`,
  "",
  chapter.case,
  "",
  chapter.theory,
  "",
  chapter.workshop.guidance,
  "",
  "## План",
  "",
];
for (const stage of chapter.workshop.stages) {
  const tasks = chapter.tasks.filter((t) => t.stage === stage.id);
  lines.push(
    `- ${stage.title}: ${tasks.reduce((n, t) => n + t.minutes, 0)} хв${stage.optional ? "; додатково" : ""}.`,
  );
}
let previous;
for (const [i, task] of chapter.tasks.entries()) {
  if (task.stage !== previous) {
    const stage = chapter.workshop.stages.find((s) => s.id === task.stage);
    lines.push("", `## ${stage.title}`, "", stage.goal);
    previous = stage.id;
  }
  lines.push(
    "",
    `### ${i + 1}. ${task.title}`,
    "",
    `${task.minutes} хв · ${task.required ? "обов’язкова" : "додаткова"} · ${task.type === "portfolio" ? "прикладне завдання" : "коротка перевірка"}`,
    "",
    `**${task.lesson.title}**`,
    "",
    task.lesson.paragraphs.join("\n\n"),
  );
  if (task.lesson.example) lines.push("", "```text", task.lesson.example, "```");
  if (task.lesson.symbols)
    lines.push(
      "",
      "Символи для порівняння (на сайті збільшені):",
      "",
      ...task.lesson.symbols.map((symbol) => `- ${symbol.text}: ${symbol.label}`),
    );
  if (task.lesson.diagram === "encoding")
    lines.push(
      "",
      "Схема на сайті: символ é → кодова точка U+00E9 → байти UTF-8 C3 A9 → файл. Під час читання: байти → декодування → символ → гліф шрифту. Таблиця порівнює A, é та я у UTF-8 і UTF-16LE.",
    );
  if (task.lesson.steps.length)
    lines.push("", ...task.lesson.steps.map((s, n) => `${n + 1}. ${s}`));
  lines.push("", "**Завдання:** " + task.prompt);
  if (task.options)
    lines.push(
      "",
      ...task.options.map((v, n) => `${n + 1}. ${v}`),
      "",
      `**Ключ для редакторського перегляду:** ${task.multiple ? task.answer.map((n) => n + 1).join(", ") : task.answer + 1}. ${task.explain}`,
    );
  if (task.rubric) lines.push("", "Критерії:", "", ...task.rubric.map((r) => "- " + r));
}
lines.push("", "## Матеріали набору", "");
for (const file of [...chapter.workshop.files, ...chapter.workshop.documents])
  lines.push(`### ${file.name}`, "", "```text", file.content, "```", "");
if (chapter.treasure) {
  const treasure = TREASURES[chapter.treasure];
  lines.push(
    "",
    "## Прихована місія (додатково)",
    "",
    treasure.title,
    "",
    treasure.prompt,
    "",
    ...treasure.options.map((v, i) => `${i + 1}. ${v}`),
    "",
    `Ключ для перегляду: ${treasure.answer + 1}. ${treasure.explain}`,
  );
}
lines.push("", "## Джерела й довідка", "");
const sourceKeys = new Set([
  ...chapter.sources,
  ...chapter.tasks.flatMap((t) => t.lesson?.sources || []),
]);
for (const key of sourceKeys) {
  const source = SOURCES[key];
  lines.push(`- [${source.title}](${source.url}). ${source.note}`);
}
const output = lines.join("\n");
console.log(
  ["unicode", "information-search"].includes(chapterId)
    ? output.replaceAll("—", "–")
    : output,
);
