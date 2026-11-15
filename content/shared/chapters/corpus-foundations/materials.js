import { serializeCsv } from "../../csv.js";
import { SOURCES } from "../../../sources.js";

export const CORPUS_SECTIONS = [
  "Питання й межі",
  "Будова й склад",
  "Перевірка на текстах",
  "Висновок і обмеження",
];
export const INVENTORY_COLUMNS = [
  "text_id",
  "file",
  "group",
  "source_id",
  "published",
  "language",
  "origin",
  "duplicate_of",
];
export const corpusStages = [
  {
    id: "purpose",
    title: "Від питання до корпусу",
    goal: "Визначити, для якого питання потрібні тексти та які межі матиме добірка.",
  },
  {
    id: "types",
    title: "Які бувають корпуси",
    goal: "Розрізнити спосіб створення мовлення, зв’язок текстів і походження авторів.",
  },
  {
    id: "architecture",
    title: "Текст, файл і метадані",
    goal: "Побудувати зв’язок між окремим текстом, його файлом, групою та джерелом.",
  },
  {
    id: "selection",
    title: "Відібрати порівнювані тексти",
    goal: "Застосувати правила до кандидатів, перевірити дублікати й склад двох груп.",
  },
  {
    id: "quality",
    title: "Перевірити, що може спотворити результат",
    goal: "Виявити нерівні обсяги, надмірне очищення та зміну складу корпусу.",
  },
  {
    id: "application",
    title: "Зібрати й випробувати мінікорпус",
    goal: "Створити простий корпус і відповісти на невелике питання з посиланнями на тексти.",
  },
  {
    id: "advanced",
    title: "Додаткові корпусні розслідування",
    goal: "Перенести принципи добору на кілька категорій, усне мовлення або термінологію.",
    optional: true,
  },
];

export function corpusRecords(l) {
  const records = [
    {
      id: "T01",
      title: "Бібліотека: вступна зустріч",
      group: "service",
      sourceId: "S1",
      published: "2025-04-02",
      origin: "original",
      duplicateOf: "",
    },
    {
      id: "T02",
      title: "Медіаслужба: доступне відео",
      group: "service",
      sourceId: "S2",
      published: "2025-04-08",
      origin: "original",
      duplicateOf: "",
    },
    {
      id: "T03",
      title: "Навчальна служба: читання з екрана",
      group: "service",
      sourceId: "S3",
      published: "2025-04-12",
      origin: "original",
      duplicateOf: "",
    },
    {
      id: "T04",
      title: "Кіноклуб: відкритий вечір",
      group: "club",
      sourceId: "C1",
      published: "2025-04-03",
      origin: "original",
      duplicateOf: "",
    },
    {
      id: "T05",
      title: "Розмовний клуб: мовний обмін",
      group: "club",
      sourceId: "C2",
      published: "2025-04-09",
      origin: "original",
      duplicateOf: "",
    },
    {
      id: "T06",
      title: "Читацький клуб: озвучення тексту",
      group: "club",
      sourceId: "C3",
      published: "2025-04-15",
      origin: "original",
      duplicateOf: "",
    },
    {
      id: "T07",
      title: "Передрук оголошення бібліотеки",
      group: "service",
      sourceId: "S1",
      published: "2025-04-02",
      origin: "original",
      duplicateOf: "T01",
    },
    {
      id: "T08",
      title: "Старе оголошення медіаслужби",
      group: "service",
      sourceId: "S2",
      published: "2022-04-08",
      origin: "original",
      duplicateOf: "",
    },
    {
      id: "T09",
      title: "Клубний анонс без дати",
      group: "club",
      sourceId: "C4",
      published: "unknown",
      origin: "original",
      duplicateOf: "",
    },
    {
      id: "T10",
      title: "Переклад анонсу з української",
      group: "service",
      sourceId: "S4",
      published: "2025-04-16",
      origin: "translated",
      duplicateOf: "",
    },
    {
      id: "T11",
      title: "Рецепт із клубного архіву",
      group: "club",
      sourceId: "C2",
      published: "2025-04-18",
      origin: "original",
      duplicateOf: "",
    },
    {
      id: "T12",
      title: "Театральний клуб: субтитрована сцена",
      group: "club",
      sourceId: "C4",
      published: "2025-04-20",
      origin: "original",
      duplicateOf: "",
    },
  ];
  return records.map((record) => {
    const text = l.corpus.texts[record.duplicateOf || record.id];
    if (typeof text !== "string" || !text.trim())
      throw new Error("Missing corpus text: " + l.code + "/" + record.id);
    return { ...record, text, file: `texts/${record.id}.txt`, language: l.code };
  });
}

export const inventoryRows = (records) => [
  INVENTORY_COLUMNS,
  ...records.map((r) => [
    r.id,
    r.file,
    r.group,
    r.sourceId,
    r.published,
    r.language,
    r.origin,
    r.duplicateOf,
  ]),
];
export const recordText = (r) =>
  `${r.id} | ${r.title}\nГрупа: ${r.group}; джерело: ${r.sourceId}; дата публікації: ${r.published}; мова: ${r.language}; походження: ${r.origin}; дублікат: ${r.duplicateOf || "не позначено"}\n${r.text}`;
export const brief = (l) =>
  `Мовна траєкторія: ${l.corpus.name}. Питання: як сформульовано прохання до учасників у навчальних анонсах університетських служб і студентських клубів?\nРамка добору: 12 карток T01–T12 цього набору. Беремо оригінальні писемні анонси подій 2025 року мовою траєкторії. Рецепти, переклади, передруки та записи без підтвердженої дати не включаємо.\nПлан: 6 різних анонсів, по 3 у групах service і club, щонайменше 3 різні source_id у кожній групі. Серед кількох придатних клубних текстів оберіть будь-які три й поясніть правило вибору. Не добирайте їх за наявністю потрібного слова.\nОдиниця добору – один повний анонс. Одиниця спостереження – вислів із проханням у його реченні. Це різні речі. Відсутність прохання теж є результатом.\nУсі тексти, джерела S1–S4/C1–C4, дати й установи вигадані для навчання. Матеріали можна копіювати та змінювати для виконання вправ. Вони не є спостереженнями за реальною університетською комунікацією.\nЗа бажанням можна згодом повторити роботу на справжніх джерелах: тоді потрібно перевірити умови використання, походження, дати та межі добору. Для обов’язкових вправ цього не потрібно.`;
export function corpusMaterials(l, sources) {
  const records = corpusRecords(l);
  const template = CORPUS_SECTIONS.map(
    (s) => `${s}\n[Замініть цей рядок власними даними.]`,
  ).join("\n\n");
  return {
    template,
    example:
      "ІНШИЙ ВИПАДОК: МУЗЕЙНІ ПІДПИСИ\nПитання: як позначають невідому дату створення експоната? Порівнюю підписи двох залів одного музею. Один підпис – одна одиниця добору. Беру всі доступні підписи обраних залів за одну дату, а не лише ті, де є слово «невідомо».\nТри підписи зберігаю в окремих TXT; у таблиці є ID, зал, назва експоната та дата фіксації. Пошук дав один збіг. Читаю решту підписів: там ужито «близько» й діапазон років. Отже, один пошуковий запит не охопив усіх способів вираження невпевненості.\nВисновок стосується лише цих підписів, а не всіх музеїв. Це авторський приклад побудови корпусу, а не дані справжнього музею.",
    files: [
      {
        name: "start.txt",
        content:
          "ПОЧАТОК РОБОТИ\n1. Прочитайте brief.txt і картки нижче. Завантажте ZIP або скопіюйте окремі файли.\n2. Створіть папки originals і corpus. Початкові тексти збережіть у originals, відібрані копії – у corpus.\n3. Для TXT підійде Блокнот, TextEdit або інший текстовий редактор. На Mac у TextEdit оберіть Формат → Зробити звичайним текстом; зберігайте у UTF-8. Після збереження відкрийте файл знову й перевірте діакритику.\n4. Один анонс – один TXT. Якщо працюєте з одним файлом, позначте межі рядками [T01], [T02] тощо; не включайте ці позначки в мовний підрахунок.\n5. metadata.csv відкрийте в Calc/Excel із UTF-8 і комою як роздільником або перегляньте в текстовому редакторі. CSV зберігає відомості про тексти, а не замінює їх.\n6. Ctrl+F / Cmd+F шукає в поточному відкритому файлі. Для кількох файлів відкривайте їх по черзі та ведіть невелику таблицю збігів. Програмування й AntConc тут не потрібні.\n7. Основний результат – відібрані тексти, таблиця їхнього складу й невелика перевірка мовного питання.",
      },
      { name: "brief.txt", content: brief(l) },
      { name: "catalogue.txt", content: records.map(recordText).join("\n\n") },
      ...records.map((r) => ({ name: r.file, content: r.text + "\n" })),
      { name: "metadata.csv", content: serializeCsv(inventoryRows(records)) },
      {
        name: "selection-template.csv",
        content: serializeCsv([
          ["text_id", "decision", "reason"],
          ...records.map((r) => [r.id, "", ""]),
        ]),
      },
      {
        name: "observations-template.csv",
        content: serializeCsv([["text_id", "group", "expression", "context", "note"]]),
      },
      {
        name: "update-card.txt",
        content:
          "ОНОВЛЕННЯ\nУ цьому сценарії v1 містить T01–T06 за 2025 рік, а T12 залишався в резерві. Тепер розглядаємо додавання T12 до аналізу. Його можна додати до нової версії з перевіркою складу груп або використати замість іншого тексту за оголошеним правилом. Не домішуйте новий текст до старого результату мовчки. Щоб перевірити результат, повторіть пошук на тих самих ID; для нової вибірки явно назвіть її новий склад.",
      },
      {
        name: "resources.txt",
        content: sources
          .map(
            (key) => `${SOURCES[key].title}\n${SOURCES[key].url}\n${SOURCES[key].note}`,
          )
          .join("\n\n"),
      },
    ],
  };
}
