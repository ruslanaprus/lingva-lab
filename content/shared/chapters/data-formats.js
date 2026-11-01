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
    revision: 4,
    materials: "wordlist",
    title: "Що містить файл: формати, символи й кодування",
    short: "Від байтів і лапок до перевіреної передачі мовних даних.",
    category: "ОСНОВИ",
    mark: "{ }",
    time: tasks.filter((t) => t.required !== false).reduce((s, t) => s + t.minutes, 0),
    outcome:
      "Обирати придатний формат для тексту, запису, словника чи передачі дослідження; розрізняти символ, кодування та гліф; перевіряти значення після імпорту й експорту.",
    case: `Ви отримали колекцію словникових записів (мова: ${l.name.toLowerCase()}), українські пояснення й кілька копій, призначення яких незрозуміле. Одні файли мають гарний вигляд, але не імпортуються; інші неправильно названо або відкрито з невідповідними параметрами. Ваше завдання – з’ясувати, що в них збережено, перевірити дані й підготувати пояснення для колеги, який продовжить роботу.`,
    theory:
      "Тут ми спираємося на навички розділів 1–2: знайти файл, зберегти копію й відкрити документ. Спершу з’ясуємо, як програми читають байти, а потім перейдемо до символів, кодових точок та інспектора. Далі опрацюємо ASCII, Unicode, запис у UTF-8, кодові одиниці й основи IPA. Після цього навчимося розпізнавати пряму лапку U+0022, простий текст і поля таблиці. Ці поняття знадобляться, щоб виправити CSV, імпортувати його й перевірити після повторного відкриття. JSON і XML читаємо як структури даних на прикладах Anki, LanguageTool і TEI; програмування тут не потрібне. У розділі 4 продовжимо роботу з Unicode й типографікою, а в розділі 5 – з таблицями. Зазначений час охоплює читання, обдумування й роботу в інших програмах; це орієнтир, а не гарантована тривалість для кожного студента.",
    terms: [
      "Байт",
      "ASCII",
      "Unicode",
      "Кодування",
      "UTF-8",
      "Кодова точка",
      "Кодова одиниця",
      "Гліф",
      "IPA",
      "CSV",
      "JSON",
      "XML",
    ],
    sources: [
      "ascii-uk",
      "code-point-uk",
      "unicode-code-points",
      "utf8-standard",
      "ipa",
      "anki-import",
      "languagetool-json",
      "tei-dictionaries",
      "elan-eaf",
      "elan-media",
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
      title: "Файли, які інша людина зможе прочитати",
      stages: formatStages,
      files: materials.files,
      exampleLabel: "Прочитати приклад паспорта форматів (інша колекція)",
      fallbackGuidance:
        "Тут можна прочитати декодований текст файлів набору. UTF-16LE-копія в ZIP має інші байти, хоча містить ті самі слова. Перегляд на сайті не є імпортом у табличний редактор. Якщо програма недоступна, чітко позначте заплановані, але ще не виконані дії.",
      guidance:
        "Читайте пояснення перед кожною вправою й перевіряйте один крок за раз. Завантажте ZIP-архів і розпакуйте його у власну робочу папку. Дані вигадані й адаптовані до обраної мови. Основні пояснення на сторінці українською, а додаткові першоджерела – переважно англійською. Для практики підійдуть Google Sheets, LibreOffice Calc або інший доступний табличний редактор. Програмування, платний обліковий запис і партнер не потрібні; покрокові інструкції є у файлі import-guide.txt. Сайт зберігає ваші відповіді, а створені в інших програмах файли залишаються у вашому портфоліо. Якщо редактор недоступний, позначте роботу як план і поверніться до практики пізніше. Наприкінці ви підготуєте паспорт форматів – пояснення, як відкрити й перевірити матеріали. Додатковий етап добровільний.",
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
