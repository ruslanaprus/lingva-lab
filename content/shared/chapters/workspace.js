import { defineChapter } from "../builders.js";
import { foundationActivities } from "./workspace/foundations.js";
import { organizationActivities } from "./workspace/organization.js";
import { readmeActivities } from "./workspace/readme.js";
import { advancedActivities } from "./workspace/challenges.js";
import { workspaceMaterials, workspaceStages } from "./workspace/materials.js";

export default (language) => {
  const tasks = [
    ...foundationActivities(language),
    ...organizationActivities(language),
    ...readmeActivities(language),
    ...advancedActivities(),
  ];
  const material = workspaceMaterials(language);
  return defineChapter({
    materials: "research",
    id: "workspace",
    revision: 2,
    title: "Робоче середовище дослідника",
    short: "Від чужої папки до зрозумілої передачі роботи.",
    category: "ОСНОВИ",
    mark: "./",
    time: tasks
      .filter((task) => task.required !== false)
      .reduce((sum, task) => sum + task.minutes, 0),
    outcome:
      "Знайти та впорядкувати матеріали, зберегти джерела, написати README і перевірити, чи інша людина може продовжити колекцію без усних пояснень.",
    case: `Ви успадкували вісім файлів із двома вигаданими письмовими відповідями мовою ${language.native}. Автор недоступний. Назви FINAL і FINAL2 не пояснюють, яка версія звірена, звідки взято текст і що робити далі. Ваш результат — впорядкована колекція, інвентар, README та запис перевірки передачі.`,
    theory:
      "Рухаємося від проблеми до самостійного рішення: спочатку розбираємо незрозумілий набір, потім засвоюємо базові поняття, працюємо з файлами, тренуємо кожну частину README та випробовуємо власну інструкцію. Вбудовані пояснення, приклади й підказки достатні для самостійної роботи. Джерела нижче — додаткове читання. Розділ можна пройти за дві сесії; збережіть чернетки та власні файли перед перервою. Час — орієнтир на читання, дії поза сайтом і написання, а не примусове очікування.",
    terms: [
      "Файл",
      "Папка",
      "Ярлик",
      "RAM",
      "Шлях",
      "Артефакт",
      "Метадані",
      "README",
      "Резервна копія",
    ],
    sources: ["organization", "readme", "downloads", "memory", "aliases"],
    workshop: {
      stages: workspaceStages,
      files: material.files,
      documents: [
        {
          id: "template",
          name: `readme-template-${language.code}.txt`,
          label: "Шаблон README",
          content: material.template,
        },
        {
          id: "example",
          name: `readme-example-${language.code}.txt`,
          label: "Приклад README",
          content: material.example,
        },
      ],
      guidance:
        "У кожній картці спочатку прочитайте пояснення й приклад, виконайте кроки та подайте відповідь. Підказка доступна без обмеження спроб. Для практичних робіт зберігайте артефакти у власній папці та вставляйте опис або текст у поля подання. Усі матеріали кейсу вигадані; нові дані, платні програми, хмарний обліковий запис і викладач для початку роботи не потрібні. Якщо файлові дії недоступні, явно позначте текстовий план дерева та дій. Обов’язкові вправи можна виконувати у власному темпі; додатковий етап не блокує звіт і відгук.",
    },
    tasks,
  })(language);
};
