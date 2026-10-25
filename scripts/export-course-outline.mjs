// node scripts/export-course-outline.mjs de-foundations > docs/course-outline.md
import { getPath, SOURCES, practiceChapters } from "../content/registry.js";
const course = getPath(process.argv[2] || "de-foundations");
const lines = [
  "# Програма практикуму: теми та їхнє застосування",
  "",
  `У маршруті ${course.title} — ${course.chapters.length} розділи: ${practiceChapters(course).length} із наявними вправами й ${course.chapters.filter((c) => c.status === "planned").length} з описами майбутніх тем. Нових завдань до описів не додано.`,
  "",
  "Перші два розділи збережено без змін. До запропонованих 26 тем додано окремі наявні практикуми командного рядка, пошуку в колекції, regex, Git; цифровий звук і Praat залишилися двома послідовними практикумами. Це дає 32 розділи. Позиція не є частиною ID вправи.",
  "",
  "Описи не впливають на завершення, XP, звіти та відзнаки. Додавання вправ згодом потребуватиме окремого перегляду навантаження. Наявне JSON-завдання збережено як добровільне; у базовому плані JSON/XML читаємо й розпізнаємо, а не вивчаємо формальний синтаксис.",
  "",
  "Мовні приклади нижче — німецький варіант; французький та англійський маршрути мають власні словникові, перекладні й фонетичні приклади. Усі пояснення українською.",
  "",
  "Оновити: `node scripts/export-course-outline.mjs de-foundations > docs/course-outline.md`, потім Prettier. Джерело описів — `content/shared/outline/`; порядок задають маніфести маршрутів.",
  "",
];
for (const [i, chapter] of course.chapters.entries()) {
  lines.push(
    `## ${i + 1}. ${chapter.title}`,
    "",
    `ID: \`${chapter.id}\` · ${chapter.status === "planned" ? "опис, вправи готуються" : `вправи доступні (${chapter.tasks.length})`}`,
    "",
  );
  if (!chapter.overview) {
    lines.push(chapter.outcome, "", chapter.case, "");
    continue;
  }
  for (const [key, label] of [
    ["purpose", "Практичне призначення"],
    ["foundations", "Основи"],
    ["practice", "Практика"],
    ["application", "Застосування"],
    ["example", "Приклад для лінгвіста"],
    ["note", "Межі та зв’язки"],
  ])
    lines.push(`**${label}.** ${chapter.overview[key]}`, "");
  if (chapter.sources.length)
    lines.push(
      "Джерела: " +
        chapter.sources
          .map((key) => `[${SOURCES[key].title}](${SOURCES[key].url})`)
          .join(", ") +
        ".",
      "",
    );
}
console.log(lines.join("\n"));
