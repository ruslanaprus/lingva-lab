import workspace from "../chapters/workspace.js";
import academicDocuments from "../chapters/academic-documents.js";
import formats from "../chapters/data-formats.js";
import unicode from "../chapters/unicode.js";
import terminal from "../chapters/terminal-navigation.js";
import search from "../chapters/text-search.js";
import regexSearch from "../chapters/regex-search.js";
import regexCleanup from "../chapters/regex-cleanup.js";
import git from "../chapters/git-history.js";
import audio from "../chapters/digital-audio.js";
import praat from "../chapters/speech-annotation.js";
import speech from "../chapters/speech-technologies.js";
import nlp from "../chapters/nlp-ai.js";
import { descriptions } from "./chapters.js";

const retainedDescriptions = {
  "terminal-navigation": {
    purpose:
      "Орієнтуватися у файловій колекції та безпечно створювати робочі копії через командний рядок.",
    foundations:
      "Поточна папка, абсолютний і відносний шлях; навігація, створення папки, копіювання та переміщення.",
    practice:
      "Збережені симулятори навігації й копіювання, відносний шлях та лапки в іменах із пробілами.",
    application:
      "Створити власне дерево та журнал команд, за яким інша людина може повторити файлові дії.",
    example: () =>
      "Перед аналізом експедиційних текстів скопіювати джерела в робочу папку, зберігши незмінні оригінали.",
    note: "Цей наявний практикум розташовано після добору корпусу: тепер команди працюють із колекцією, призначення якої вже зрозуміле.",
    related: ["corpus-foundations", "text-search"],
  },
  "text-search": {
    purpose:
      "Знаходити фрагменти у власній колекції та правильно описувати одиниці підрахунку.",
    foundations:
      "Пошук у локальних текстах, рядок і слово, нульовий результат; відмінність від вебпошуку.",
    practice:
      "Збережені grep-пошук, підрахунок, конвеєр і тлумачення порожнього результату.",
    application:
      "Підготувати мініконкорданс із джерелами, контекстами та прозорим підрахунком.",
    example: () =>
      "Знайти всі листи зі звертанням і перевірити повне речення: кількість знайдених рядків не обов’язково дорівнює кількості вживань.",
    note: "Текстовий пошук залишився окремим практикумом між файловою навігацією й конкордансом через інтерфейс.",
    related: ["information-search", "terminal-navigation", "concordance"],
  },
  "regex-search": {
    purpose: "Описувати повторювані текстові форми та перевіряти помилкові збіги.",
    foundations:
      "Регулярний вираз, цільовий і негативний приклад, форма й мовна категорія, точність пошуку.",
    practice:
      "Збережені два інтерактивні пошуки, зіставлення форми й категорії та обчислення precision.",
    application:
      "Сформулювати питання й перевірити шаблон на п’яти позитивних та п’яти негативних прикладах.",
    example: (l) =>
      `Знайти потрібні форми «${l.lemma}» у текстовій колекції та вручну перевірити схожі рядки, які не належать до потрібного випадку.`,
    note: "Regex — інструмент текстового пошуку, а не автоматичний граматичний аналіз. Наявні вправи збережено після основ корпусної інтерпретації.",
    related: ["concordance", "corpus-patterns", "regex-cleanup"],
  },
  "regex-cleanup": {
    purpose: "Виконувати контрольовані заміни без втрати потрібного мовного матеріалу.",
    foundations: "Групи, заміна, жадібність і різниця між службовою міткою та даними.",
    practice:
      "Збережені видалення часових міток, використання груп і перевірка небезпечних узагальнень.",
    application:
      "Задокументувати десять рядків до/після очищення й пояснити один складний випадок.",
    example: () =>
      "Прибрати службові часові мітки з транскрипту, не стерши роки та числа в репліках. Зберегти початковий файл і перевірити результат.",
    note: "Сліпа масова заміна може пошкодити дані. Повноцінні мови програмування для цих вправ не потрібні.",
    related: ["regex-search", "workspace", "speech-annotation"],
  },
  "git-history": {
    purpose:
      "Показувати історію текстових рішень і повертатися до перевірених станів роботи.",
    foundations:
      "Система контролю версій, робоче дерево, індекс, коміт та історія; Git і хмарний документ виконують різні ролі.",
    practice:
      "Збережені редагування й коміт, знімок git add, читання diff та перевірка доступу.",
    application:
      "Зберегти три коміти з лінгвістичними рішеннями та пояснити одну зміну.",
    example: () =>
      "Редактори по-різному прочитали сумнівне слово. Історія транскрипції має показати попередній варіант і причину зміни, а не лише файл FINAL.",
    note: "Практикум розташовано після перекладацького процесу: зрозуміло, навіщо відстежувати терміни, сегменти й рішення. Усі наявні Git-завдання збережено.",
    related: ["academic-documents", "translation-workflow"],
  },
  "digital-audio": {
    purpose: "Готувати запис, придатний до слухання, вимірювання та передачі.",
    foundations:
      "Аудіоформат, PCM, частота дискретизації, бітність, канали, кліпінг і втрати.",
    practice:
      "Збережені вибір робочих копій, розрахунок обсягу, осцилограми та експорт.",
    application:
      "Зробити два контрольовані записи й пояснити, як умови впливають на придатність даних.",
    example: () =>
      "Для аналізу вимови зберегти якісне джерело, а для швидкого прослуховування підготувати окрему копію. Кліпінг не виправляється простим зменшенням гучності.",
    note: "Спільну тему «Цифровий звук і Praat» розділено на два наявні практикуми: спершу якість запису, потім анотація й вимірювання.",
    related: ["ipa-transcription", "speech-annotation", "speech-technologies"],
  },
  "speech-annotation": {
    purpose: "Зберігати узгоджену пару аудіо й анотації та робити відтворювані виміри.",
    foundations:
      "Осцилограма й спектрограма; часовий інтервал і тривалість; інтервальні та точкові рівні TextGrid.",
    practice:
      "Збережені синтетичний інтервал, мілісекунди, збереження TextGrid та розгляд меж.",
    application:
      "Повторно відкрити WAV і TextGrid, зіставити дві анотації й пояснити незгоду про межу.",
    example: () =>
      "Двоє анотаторів по-різному визначили початок слова. Потрібно прослухати фрагмент, перевірити сигнал і записати прийняту конвенцію, а не оголосити одну межу безумовною істиною.",
    note: "Наявні Praat-вправи та експортер TextGrid збережено. Практика зі справжнім мовленням виконується окремо від синтетичного тренажера.",
    related: ["digital-audio", "ipa-transcription", "speech-technologies"],
    sources: ["praat", "textgrid"],
  },
  "speech-technologies": {
    purpose:
      "Визначати, які фрагменти автоматичного транскрипту чи озвучення потребують перевірки людиною.",
    foundations:
      "STT і TTS; заміна, вставлення й пропуск; числова помилка та зміна змісту.",
    practice:
      "Збережені виправлення транскрипту, WER, експеримент TTS та розгляд помилок різних груп.",
    application:
      "Дослідити контрольовану зміну умов запису й перевірити озвучення на задокументованих складних прикладах.",
    example: () =>
      "Два транскрипти мають подібний WER, але один спотворив лише службові слова, а інший — прізвище, суму й заперечення. Їхня практична придатність різна.",
    note: "Наявні STT/TTS-завдання збережено; числовий рахунок не замінює оцінки наслідків помилок.",
    related: ["digital-audio", "speech-annotation", "localization"],
  },
  "nlp-ai": {
    title: "Як комп’ютер аналізує текст: основи NLP",
    purpose:
      "Читати автоматичний лінгвістичний аналіз та встановлювати його припущення.",
    foundations:
      "Слово й модельний токен; лема й словоформа; частиномовна позначка; неоднозначність.",
    practice:
      "Зіставити поділ скорочень і складних слів, перевірити межі речень, названі сутності та граматичні позначки на готових результатах.",
    application:
      "Перевірити анотований уривок, зіставити два аналізи та пояснити відмінності, важливі для дослідження.",
    example: (l) =>
      `У фрагменті «${l.ambiguous}» система вибрала один розбір. Лінгвіст має зіставити його з контекстом і перевірити, чи не зникла інша допустима інтерпретація.`,
    note: "Усі наявні NLP-вправи, перевірка модельного джерела та мініпроєкт збережені. Новий сусідній розділ окремо описує майбутню практику LLM. Аналіз планується на готових результатах або через графічні інструменти, без програмування.",
    related: ["concordance", "content-analysis", "large-language-models"],
  },
};

function withOverview(base, description) {
  return (l) => {
    const chapter = base(l);
    const { title, short, category, sources, example, ...overview } = description;
    const result = {
      ...chapter,
      ...(title ? { title } : {}),
      ...(short ? { short } : {}),
      ...(category ? { category } : {}),
      sources: [...new Set([...chapter.sources, ...(sources || [])])],
      overview: { ...overview, example: example(l) },
    };
    return result;
  };
}

const existing = {
  workspace,
  "academic-documents": academicDocuments,
  "data-formats": formats,
  unicode,
  "terminal-navigation": terminal,
  "text-search": search,
  "regex-search": regexSearch,
  "regex-cleanup": regexCleanup,
  "git-history": git,
  "digital-audio": audio,
  "speech-annotation": praat,
  "speech-technologies": speech,
  "nlp-ai": nlp,
};

export const chapterCatalog = { ...existing };
for (const [id, description] of Object.entries({
  ...descriptions,
  ...retainedDescriptions,
})) {
  if (existing[id]) chapterCatalog[id] = withOverview(existing[id], description);
  else
    chapterCatalog[id] = (l) => ({
      id,
      revision: 1,
      status: "planned",
      required: false,
      tasks: [],
      time: 0,
      title: description.title,
      short: description.short,
      category: description.category,
      mark: "↗",
      outcome: description.purpose,
      case: description.example(l),
      theory: description.note,
      terms: [],
      sources:
        id === "digital-dictionaries"
          ? [l.outline.dictionarySource]
          : description.sources,
      overview: {
        purpose: description.purpose,
        foundations: description.foundations,
        practice: description.practice,
        application: description.application,
        example: description.example(l),
        note: description.note,
        related: description.related,
      },
    });
}
