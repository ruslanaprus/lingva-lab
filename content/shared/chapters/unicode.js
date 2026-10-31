import { defineChapter } from "../builders.js";
import { inputActivities } from "./unicode/foundations.js";
import { normalizationActivities } from "./unicode/normalization.js";
import { typographyActivities } from "./unicode/typography.js";
import { ipaActivities } from "./unicode/ipa.js";
import { applicationActivities, typographyChallenges } from "./unicode/application.js";
import { typographyMaterials, typographyStages } from "./unicode/materials.js";

export default (l) => {
  const tasks = [
    ...inputActivities(l),
    ...normalizationActivities(l),
    ...typographyActivities(l),
    ...ipaActivities(l),
    ...applicationActivities(l),
    ...typographyChallenges(l),
  ];
  const materials = typographyMaterials(l);
  return defineChapter({
    id: "unicode",
    revision: 3,
    materials: "academic",
    title: "Багатомовне введення й типографіка",
    short: "Зберегти написання, значення й можливість пошуку після редагування.",
    category: "ОСНОВИ",
    mark: "ə́",
    time: tasks
      .filter((t) => t.required !== false)
      .reduce((sum, t) => sum + t.minutes, 0),
    outcome:
      "Готувати багатомовний текст із надійними символами, діакритикою, пунктуацією та IPA; перевіряти NFC/NFD, обмін і пошук; передавати типографічну пам’ятку з поясненими правилами.",
    case: `Редакція готує пам’ятку з українськими поясненнями та прикладами ${l.native}. Після спільного редагування зникли пошукові збіги, змінилися лапки й пробіли, IPA став схожим на звичайні літери. Треба встановити причини, відновити робочу копію й залишити колезі правила перевірки.`,
    theory:
      "Потрібні навички розділів 1–3: оригінал і робоча копія, README/журнал, кодова точка, UTF-8 і повторне відкриття. Спочатку вивчаємо мову меню, розкладку й правопис. Далі тренуємо введення, розпізнаємо літери-двійники та невидимі знаки, порівнюємо NFC/NFD, застосовуємо бриф до типографіки й вводимо IPA. Наприкінці – обмін файлами, виправлення тексту та власна пам’ятка. IPA тут відтворюємо за готовою конвенцією; слухове й акустичне дослідження буде далі. Час включає читання та зовнішню практику й не є доведеною тривалістю для кожного студента. Роботу у майстерні можна поділити на дві сесії.",
    terms: [
      "Unicode",
      "Кодова точка",
      "Гліф",
      "Діакритичний знак",
      "Розкладка",
      "NFC",
      "NFD",
      "Нерозривний пробіл",
      "IPA",
    ],
    sources: [
      "windows-input-uk",
      "office-language-uk",
      "mac-accents-uk",
      "diacritics-uk",
      "nbsp-uk",
      "ipa-uk",
      "unicode-normalization",
      "unicode-norm-faq",
      "unicode-segmentation",
      "unicode-fonts",
      "ipa",
      "ipa-fonts",
      "keyman-ipa",
      "charis",
    ],
    treasure: "unicode",
    treasureClue:
      "Між схожими назвами заховано ◇. Літера-двійник може пройти перевірку шрифту й усе одно лишитися іншим символом.",
    workshop: {
      title: "Текст, який придатний до редагування та передачі.",
      stages: typographyStages,
      files: materials.files,
      exampleLabel: "Прочитати приклад пам’ятки для іншого кейсу",
      fallbackGuidance:
        "Це справжній декодований текст навчального набору. Його можна скопіювати в редактор без ZIP. Перегляд сайту не означає виконання зовнішнього імпорту, експорту або налаштування ОС.",
      guidance:
        "Читайте пояснення перед вправою й перевіряйте одну зміну за раз. ZIP містить 7 UTF-8-файлів: бриф, інструкції, підозрілі рядки та контрольний CSV. Дані вигадані й адаптовані до траєкторії. Основні пояснення українською; джерела є українською й англійською. Новий інспектор показує NFC/NFD та коди, кнопки знаків вставляють символ у позиції курсора. Перегляд не додає спроб і XP. Для зовнішньої практики підійде текстовий редактор, для CSV – табличний. Сайт не змінює налаштувань ОС, не викликає STT/TTS і не перевіряє зовнішні файли. Без інструмента використайте описану альтернативу або позначте план виконання. Обов’язкові вправи визначають завершення розділу; кабінет редактора й секретна місія добровільні.",
      documents: [
        {
          id: "template",
          name: `typography-guide-template-${l.code}.txt`,
          label: "Шаблон типографічної пам’ятки",
          content: materials.template,
        },
        {
          id: "example",
          name: `typography-guide-example-${l.code}.txt`,
          label: "Приклад пам’ятки (інший кейс)",
          content: materials.example,
        },
      ],
    },
    tasks,
  })(l);
};
