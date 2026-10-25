import { defineChapter } from "../builders.js";
import { documentFoundations } from "./academic-documents/foundations.js";
import { documentCollaboration } from "./academic-documents/collaboration.js";
import {
  documentApplication,
  documentChallenges,
} from "./academic-documents/application.js";
import { documentMaterials, documentStages } from "./academic-documents/materials.js";

export default (l) => {
  const tasks = [
    ...documentFoundations(l),
    ...documentCollaboration(l),
    ...documentApplication(l),
    ...documentChallenges(l),
  ];
  const materials = documentMaterials(l);
  return defineChapter({
    id: "academic-documents",
    title: "Академічний документ і співпраця",
    short: "Від неохайної чернетки до спільного академічного матеріалу.",
    category: "ОСНОВИ",
    mark: "¶",
    time: tasks
      .filter((task) => task.required !== false)
      .reduce((sum, task) => sum + task.minutes, 0),
    outcome:
      "Відновити структуру документа, перекласти й узгодити блоки, з повагою рецензувати та передати перевірені DOCX/PDF разом із журналом рішень і внеску.",
    case: `Редакція готує матеріал до семінару мовою ${l.native}. Є українські блоки A/B/C, переклад вступу, неохайна чернетка й суперечливі редакторські пропозиції. Потрібні один узгоджений текст, видимий внесок і зрозумілий випуск. Ви можете працювати в парі або самостійно, послідовно виконуючи ролі автора й рецензента.`,
    theory:
      "Спочатку розбираємо проблему, потім тренуємо по одному інструменту, далі перекладаємо й рецензуємо та лише після цього збираємо велике портфоліо. Стилі задають структуру, справжні об’єкти підтримують редагування, а бриф і журнал допомагають співпраці. Потрібні навички першого розділу: знайти, зберегти, відкрити файл і працювати з копією. Програмування, Git і попереднє знання Unicode не потрібні. Час включає читання, переклад, верстку й перевірку поза сайтом; це орієнтир, щоб коректно спланувати свою роботу. Можна розділити роботу на дві сесії й зберегти чернетки.",
    terms: [
      "Стиль заголовка",
      "Абзац",
      "Автоматичний зміст",
      "Зноска",
      "Колонтитул",
      "Бриф",
      "Термінобаза",
      "Відстежувана зміна",
      "Журнал внеску",
    ],
    sources: [
      "docs",
      "word-headings",
      "word-contents",
      "word-footnotes",
      "docs-suggestions",
      "word-changes",
      "docs-sharing",
      "docs-history",
      "writer-changes",
    ],
    treasure: "editorial",
    treasureClue:
      "На полях редактор залишив ◇. Кажуть, за охайною сторінкою іноді ховається незавершене рішення.",
    workshop: {
      title: "Документ, який можна редагувати разом.",
      exampleLabel: "Прочитати приклад редакторського журналу (інший кейс)",
      fallbackGuidance:
        "Це той самий набір. Можна скопіювати тексти без ZIP у доступний редактор. Якщо працюєте лише з планом, позначте це; план не підтверджує практичне створення документа.",
      stages: documentStages,
      files: materials.files,
      documents: [
        {
          id: "template",
          name: `editorial-log-template-${l.code}.txt`,
          label: "Шаблон журналу редакції",
          content: materials.template,
        },
        {
          id: "example",
          name: `editorial-log-example-${l.code}.txt`,
          label: "Приклад журналу (інший кейс)",
          content: materials.example,
        },
      ],
      guidance:
        "Читайте пояснення перед вправою, тестуйте певну дію в робочій копії й перевіряйте себе за прикладом та критеріями. Основні пояснення подано українською мовою на сторінці; посилання ведуть до джерел додаткової інформації, іноді англійською. Файл editor-guide.txt підказує, де шукати інструменти Word, Docs і Writer. Основна практика виконується в текстовому редакторі, сайт зберігає відповіді та журнал. Партнер і платна підписка не обов’язкові. Описаний сценарій використовує фіктивні пропозиції R01–R03. Немає доступу до редактора — подайте позначений план і поверніться до практики пізніше. Додатковий етап і приховане завдання добровільні.",
    },
    tasks,
  })(l);
};
