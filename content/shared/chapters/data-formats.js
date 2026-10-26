import { defineChapter } from "../builders.js";
import { foundationTasks } from "./data-formats/foundations.js";
import { csvTasks } from "./data-formats/csv-practice.js";
import { structureTasks } from "./data-formats/structures.js";
import { applicationTasks, formatChallenges } from "./data-formats/application.js";
import { formatMaterials, formatStages } from "./data-formats/materials.js";

export default (l) => {
  const tasks = [
    ...foundationTasks(l),
    ...csvTasks(l),
    ...structureTasks(l),
    ...applicationTasks(l),
    ...formatChallenges(l),
  ];
  const materials = formatMaterials(l);
  return defineChapter({
    id: "data-formats",
    revision: 3,
    materials: "wordlist",
    title: "Що містить файл: формати, символи й кодування",
    short: "Від байтів і лапок до перевіреної передачі мовних даних.",
    category: "ОСНОВИ",
    mark: "{ }",
    time: tasks.filter((t) => t.required !== false).reduce((s, t) => s + t.minutes, 0),
    outcome:
      "Обирати придатний формат для тексту, запису, словника чи передачі дослідження; розрізняти символ, кодування та гліф; перевіряти значення після імпорту й експорту.",
    case: `Ви отримали словникову колекцію мовою ${l.native}, її українські пояснення та незрозумілі копії. Одні файли гарно виглядають, але не імпортуються; інші мають хибну назву або налаштування читання. Потрібно встановити, що в них збережено, і передати колезі перевірені дані з поясненням.`,
    theory:
      "Спочатку байти й програми, потім символи, ASCII, Unicode та UTF-8, далі пряма лапка U+0022, простий текст і поля таблиці. Лише після цих передумов виправляємо CSV та виконуємо справжній імпорт і повторне відкриття. JSON і XML читаємо як структури даних, без програмування. Потрібні навички розділів 1–2: знайти файл, зберегти копію та відкрити документ. Розділ 4 продовжить Unicode й типографіку, а розділ 5 – роботу з таблицями. Час включає читання, обдумування й дії поза сайтом; це орієнтир, а не гарантована тривалість.",
    terms: [
      "Байт",
      "ASCII",
      "Unicode",
      "Кодування",
      "UTF-8",
      "Кодова точка",
      "Гліф",
      "CSV",
      "JSON",
      "XML",
    ],
    sources: [
      "unicode-encodings",
      "unicode-punctuation",
      "csv",
      "json",
      "xml",
      "csv-import",
      "calc-import",
    ],
    treasure: "formats",
    treasureClue:
      "Серед архівних карток заховано ◇. Інколи найнадійніше рішення – визнати межу відновлення.",
    workshop: {
      title: "Файли, які інша людина зможе прочитати.",
      stages: formatStages,
      files: materials.files,
      exampleLabel: "Прочитати приклад паспорта форматів (інша колекція)",
      fallbackGuidance:
        "Тут показано декодований текст справжніх файлів набору. UTF-16LE-копія у ZIP має інші байти; перегляд не є імпортом у табличний редактор. Якщо програма недоступна, позначте свій результат як план.",
      guidance:
        "Читайте пояснення перед кожною вправою та перевіряйте один крок за раз. Завантажте ZIP і розпакуйте його у власну робочу папку. Дані вигадані й адаптовані до обраної мови. Основні пояснення є українською на сторінці; додаткові першоджерела переважно англійською. Для зовнішньої практики підійде Google Sheets, або LibreOffice Calc, або інший доступний вам редактор; програмування, платний обліковий запис і партнер не потрібні. Інструкції містить import-guide.txt. Сайт зберігає відповіді, а зовнішні файли залишаються у вашому портфоліо. Якщо редактор недоступний, подайте явно позначений план і поверніться до практики пізніше. Додатковий етап добровільний.",
      documents: [
        {
          id: "template",
          name: `format-audit-template-${l.code}.txt`,
          label: "Шаблон паспорта форматів",
          content: materials.template,
        },
        {
          id: "example",
          name: `format-audit-example-${l.code}.txt`,
          label: "Приклад паспорта (інший кейс)",
          content: materials.example,
        },
      ],
    },
    tasks,
  })(l);
};
