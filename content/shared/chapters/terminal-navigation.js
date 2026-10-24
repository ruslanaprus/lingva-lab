import { choice, exact, portfolio, defineChapter } from "../builders.js";
export default defineChapter({
  materials: "research",
  id: "terminal-navigation",
  title: "Командний рядок: навігація",
  short: "Знайти шлях до тексту.",
  category: "ТЕКСТОВІ ІНСТРУМЕНТИ",
  time: 90,
  mark: ">_",
  treasure: "archive",
  outcome:
    "Орієнтуватися в дереві каталогів, створювати папки й копії, відрізняти абсолютні та відносні шляхи.",
  case: "Архів із сотнями папок містить загублений текст XIX століття. Знайдіть його та підготуйте робочу копію, зберігши оригінал.",
  theory:
    "pwd показує поточний каталог; ls — його вміст; cd змінює каталог. Крапка означає поточний каталог, .. — батьківський. mkdir створює папку, cp копіює, mv переміщує або перейменовує. Симулятор використовує невеликий набір Unix-команд; на Windows відповідний досвід дає WSL або Git Bash. Він працює лише з навчальними файлами у браузері.",
  terms: ["Шлях", "Термінал"],
  sources: ["shell"],
  tasks: (l) => [
    {
      id: "terminal-navigation-archive-navigation",
      type: "terminal",
      goal: "navigate",
      title: "Експедиція в архів",
      prompt:
        "Від початкового /project знайдіть lost.txt у дереві original/archive/1893 та прочитайте його командою cat. ls і cd допоможуть дослідити шлях.",
      hint: "Почніть з ls. Можна рухатися по одному каталогу або використати шлях original/archive/1893.",
      explain:
        "Вміст каталогу і вміст файла — різні речі. Ви дійшли до документа й прочитали його.",
    },
    exact(
      "terminal-navigation-relative-path",
      "Відносний шлях",
      "Поточний каталог: /project/working. Вкажіть відносний шлях до /project/original/interview.txt.",
      "../original/interview.txt",
      ".. переходить на один рівень вище, після чого original — сусідня папка.",
      "Почніть із ../",
    ),
    {
      id: "terminal-navigation-copy-source",
      type: "terminal",
      goal: "copy",
      title: "Оригінал залишається в архіві",
      prompt:
        "У свіжому навчальному /project створіть папку results і скопіюйте original/interview.txt у results/interview.txt. Потрібна копія, а не переміщення.",
      hint: "mkdir results, потім cp original/interview.txt results/interview.txt.",
      explain: "Робоча копія створена; оригінал залишився на своєму місці.",
    },
    choice(
      "terminal-navigation-quoted-path",
      "Простір в імені",
      "Яка команда Unix перейде до папки Field notes як до одного аргументу?",
      ["cd Field notes", 'cd "Field notes"', "cd Field/notes"],
      1,
      "Лапки об’єднують слова в один аргумент. Шлях із / описує інше дерево.",
    ),
    portfolio(
      "terminal-navigation-portfolio",
      "Власне дерево корпусу",
      `На власному комп’ютері створіть папку ${l.root} командами mkdir; скопіюйте текст у working, перейменуйте копію через mv. Збережіть журнал pwd, ls, cd, mkdir, cp, mv та поясніть кожну дію.`,
      [
        "Є 6 команд із результатами та зрозумілими шляхами.",
        "Оригінал збережено окремо від робочої версії.",
        "Задокументовано ОС/оболонку й одну помилку з її виправленням.",
      ],
    ),
  ],
});
