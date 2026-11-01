import { defineChapter } from "../builders.js";
import { foundations } from "./information-search/foundations.js";
import { queries } from "./information-search/queries.js";
import { datesAndLanguage, provenance } from "./information-search/provenance.js";
import { media } from "./information-search/media.js";
import { discovery } from "./information-search/discovery.js";
import { application, challenges } from "./information-search/application.js";
import { searchMaterials, searchStages } from "./information-search/materials.js";

export default (l) => {
  const tasks = [
    ...foundations(l),
    ...queries(l),
    ...datesAndLanguage(l),
    ...provenance(l),
    ...media(l),
    ...discovery(l),
    ...application(l),
    ...challenges(l),
  ];
  const materials = searchMaterials(l);
  return defineChapter({
    id: "information-search",
    revision: 3,
    materials: "academic",
    title: "Пошук інформації: від запиту до перевірного джерела",
    short: "Знайти потрібний матеріал і залишити зрозумілий маршрут до доказів.",
    category: "ДЖЕРЕЛА",
    mark: "⌕",
    time: tasks
      .filter((t) => t.required !== false)
      .reduce((sum, t) => sum + t.minutes, 0),
    outcome:
      "Формулювати пошукове питання, застосовувати оператори й фільтри, знаходити тексти, записи, транскрипти, архіви та набори мовних даних; перевіряти походження й метадані та передавати пояснений журнал пошуку.",
    case: `Дослідницька група готує матеріали (мова: ${l.search.languageLabel}): публічні рекомендації для академічного письма й задокументовані записи для подальшого аналізу. Попередник залишив загальні посилання, передрук замість оригіналу та дату завантаження замість року запису. Ваше завдання – відновити маршрут до конкретних джерел і пояснити, що можна з них дізнатися.`,
    theory:
      "Тут ми спираємося на папки, README і робочі копії з розділу 1, чітку документацію з розділу 2, UTF-8 і CSV з розділу 3 та точні знаки з розділу 4. Розділ 5 про таблиці не є обов’язковою передумовою: у наборі є текстовий шаблон і заголовки CSV, а принцип полів ви вже опанували. Спершу сформулюйте питання та ключові поняття, потім перейдіть до запитів, дат і мов, походження, модальностей і відкриття наборів. Завершується робота досьє, придатним для бібліографії, корпусу, перекладу, аналізу дискурсу та звуку. Програмування, SQL і видобування великих даних тут не потрібні. Зазначений час охоплює читання та зовнішню практику; це орієнтир, а не виміряна тривалість для кожного студента. Роботу можна розділити на дві сесії.",
    terms: [
      "Пошуковий запит",
      "Пошуковий оператор",
      "Сніпет",
      "Метадані",
      "Походження джерела",
      "Локатор",
      "Паспорт набору даних",
      "OCR",
    ],
    sources: [
      "google-search",
      "search-language-uk",
      "search-archive-uk",
      "search-dataset-google",
      "search-dataset-entry",
      "search-hf-cards",
      "search-hf",
      "search-kaggle-docs",
      "search-kaggle",
      "search-vlo",
      "search-vlo-help",
      "search-bas",
      l.search.textSource,
      l.search.speechSource,
      l.search.archiveSource,
    ],
    treasure: "provenance",
    treasureClue:
      "Серед пошукових знаків заховано ◇. Позначка «оновлено» може стосуватися сторінки, а не голосу, який ви досліджуєте.",
    workshop: {
      title: "Пошукова експедиція: знайти, перевірити, передати",
      guidance:
        "Пояснень перед кожною вправою достатньо, щоб почати; посилання дають змогу заглибитися в тему українською та іншими мовами. Якщо ви раніше не користувалися пошуком, відкрийте README набору: там є покроковий початок. Короткі перевірки спираються на умову завдання й вигадані картки, а не на поточний рейтинг Google. Практичні завдання виконуйте в окремій вкладці та записуйте в журнал. Якщо немає акаунта чи доступу до мережі, скористайтеся повними картками S1–S8, позначте навчальний режим і запишіть як ви плануєте робити реальні перевірки. Сайт автоматично не перевіряє ні пошукових дій, ні якості джерел; статус «подано» потребує оцінювання викладачем. Для завершення розділу необхідно виконати усі обов’язкові вправи; три виклики й секретна місія добровільні. За помилки або відкриття матеріалів XP не віднімаються; за повторне правильне подання тієї самої вправи XP не нараховуються вдруге.",
      fallbackGuidance:
        "Якщо ZIP недоступний, скопіюйте ці матеріали в простий текстовий редактор. S1–S8 – вигадані навчальні картки; вони не підтверджують ні живого пошуку, ні перегляду сканів, ні прослуховування аудіо. Власні зовнішні перевірки документуйте окремо.",
      exampleLabel: "Прочитати приклад для іншого пошукового кейсу",
      stages: searchStages,
      files: materials.files,
      documents: [
        {
          id: "template",
          name: `search-log-template-${l.code}.txt`,
          label: "Шаблон пошукового досьє",
          content: materials.template,
        },
        {
          id: "example",
          name: `search-log-example-${l.code}.txt`,
          label: "Приклад архівної нотатки з позначеними прогалинами",
          content: materials.example,
        },
      ],
    },
    tasks,
  })(l);
};
