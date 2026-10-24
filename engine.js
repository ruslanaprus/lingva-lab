import { LANGUAGES, getModules, TREASURES } from "./course.js";
export const STORAGE_KEY = "lingva-lab:v1";
export const now = () => new Date().toISOString();
export const freshState = () => ({
  version: 1,
  activeLanguage: null,
  student: "",
  group: "",
  tracks: {
    de: { answers: {}, treasures: {} },
    fr: { answers: {}, treasures: {} },
    en: { answers: {}, treasures: {} },
  },
});
export const normalized = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ");
export function answerRecord(track, id) {
  return (track.answers[id] ??= {
    draft: null,
    attempts: [],
    hints: 0,
    hintOpened: false,
    toolEvents: [],
  });
}
export function taskStatus(record) {
  if (!record) return "new";
  if (record.attempts.some((a) => a.status === "passed")) return "passed";
  if (record.attempts.some((a) => a.status === "submitted")) return "submitted";
  return record.attempts.length ? "failed" : "new";
}
export function sectionStats(module, track) {
  const records = module.tasks.map((t) => track.answers[t.id]);
  return {
    done: records.filter((r) => ["passed", "submitted"].includes(taskStatus(r)))
      .length,
    passed: records.filter((r) => taskStatus(r) === "passed").length,
    submitted: records.filter((r) => taskStatus(r) === "submitted").length,
    attempts: records.reduce((n, r) => n + (r?.attempts.length || 0), 0),
    errors: records.reduce(
      (n, r) =>
        n + (r?.attempts.filter((a) => a.status === "failed").length || 0),
      0,
    ),
    complete: records.every((r) =>
      ["passed", "submitted"].includes(taskStatus(r)),
    ),
  };
}
export function trackStats(language, track) {
  const modules = getModules(language),
    records = Object.values(track.answers);
  const passed = modules
    .flatMap((m) => m.tasks)
    .filter((t) => taskStatus(track.answers[t.id]) === "passed").length;
  const submitted = modules
    .flatMap((m) => m.tasks)
    .filter((t) => taskStatus(track.answers[t.id]) === "submitted").length;
  let xp = 0;
  for (const m of modules)
    for (const t of m.tasks)
      if (["passed", "submitted"].includes(taskStatus(track.answers[t.id])))
        xp += t.xp;
  for (const [key, t] of Object.entries(TREASURES))
    if (track.treasures[key]?.attempts.some((a) => a.status === "passed"))
      xp += t.xp;
  return {
    xp,
    passed,
    submitted,
    done: passed + submitted,
    sections: modules.filter((m) => sectionStats(m, track).complete).length,
    attempts: records.reduce((n, r) => n + r.attempts.length, 0),
    errors: records.reduce(
      (n, r) => n + r.attempts.filter((a) => a.status === "failed").length,
      0,
    ),
    resubmissions: records.reduce(
      (n, r) => n + Math.max(0, r.attempts.length - 1),
      0,
    ),
    hints: records.reduce((n, r) => n + r.hints, 0),
    commandErrors: records.reduce(
      (n, r) => n + r.toolEvents.filter((e) => !e.ok).length,
      0,
    ),
  };
}
export function badges(language, track) {
  const s = trackStats(language, track);
  return [
    {
      name: "Перший доказ",
      mark: "↗",
      description: "Перше успішне завдання",
      unlocked: s.passed >= 1,
    },
    {
      name: "Архітектор даних",
      mark: "{ }",
      description: "Завершено розділи 1–3",
      unlocked: [1, 2, 3].every(
        (id) => sectionStats(getModules(language)[id - 1], track).complete,
      ),
    },
    {
      name: "Мисливець за формами",
      mark: ".*",
      description: "Завершено обидва розділи regex",
      unlocked: [6, 7].every(
        (id) => sectionStats(getModules(language)[id - 1], track).complete,
      ),
    },
    {
      name: "Відтворюване рішення",
      mark: "±",
      description: "Завершено розділ Git",
      unlocked: sectionStats(getModules(language)[7], track).complete,
    },
    {
      name: "Архівний детектив",
      mark: "◇",
      description: "Знайдено й розв’язано 3 приховані виклики",
      unlocked:
        Object.values(track.treasures).filter((t) =>
          t.attempts.some((a) => a.status === "passed"),
        ).length === 3,
    },
    {
      name: "Цифровий лінгвіст",
      mark: "∑",
      description: "Завершено всі 12 розділів",
      unlocked: s.sections === 12,
    },
  ];
}

export function evaluateTask(task, value, regexResult) {
  const pass = (feedback) => ({
    status: "passed",
    feedback: feedback || task.explain,
  });
  const fail = (feedback) => ({ status: "failed", feedback });
  if (["choice", "unicode", "wave"].includes(task.type))
    return Number(value) === task.answer && value !== null && value !== ""
      ? pass()
      : fail(
          "Перегляньте обраний варіант. " +
            (task.type === "choice"
              ? "Зіставте відповідь із теорією та дослідницькою метою."
              : "Скористайтеся спостереженням у тренажері."),
        );
  if (task.type === "exact") {
    const ok = task.numeric
      ? String(value).trim() !== "" &&
        Number.isFinite(Number(String(value).replace(",", "."))) &&
        Math.abs(
          Number(String(value).replace(",", ".")) - Number(task.answer),
        ) < 1e-6
      : normalized(value) === normalized(task.answer);
    return ok
      ? pass()
      : fail(
          "Відповідь поки не відповідає умовам. Перевірте символи, порядок, одиниці вимірювання та інструкцію.",
        );
  }
  if (task.type === "json") {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
        return fail("Потрібен JSON-об’єкт, не масив чи окреме значення.");
      return Object.keys(parsed).length === Object.keys(task.expected).length &&
        Object.entries(task.expected).every(([k, v]) => parsed[k] === v)
        ? pass()
        : fail(
            "JSON синтаксично коректний, але ключі або значення не відповідають умові.",
          );
    } catch {
      return fail(
        "Не вдалося прочитати JSON. Перевірте подвійні лапки, коми та дужки.",
      );
    }
  }
  if (task.type === "regex" || task.type === "replace") {
    if (regexResult?.error) return fail(regexResult.error);
    if (!regexResult) return fail("Спочатку виконайте пошук або заміну.");
    if (task.type === "replace")
      return regexResult.output === task.expected
        ? pass()
        : fail(
            "Результат відрізняється від потрібного: перевірте збереження кодів мовців, пробілів і рядків.",
          );
    return JSON.stringify(regexResult.matches.map((m) => m.text)) ===
      JSON.stringify(task.targets)
      ? pass()
      : fail(
          `Отримано ${regexResult.matches.length} збігів. Порівняйте повні форми з цільовими: потрібні всі цілі й жодного зайвого збігу.`,
        );
  }
  if (task.type === "terminal") {
    if (!value?.machine) return fail("Виконайте команди у терміналі.");
    const { machine, commands = [] } = value;
    const ok =
      task.goal === "navigate"
        ? commands.some(
            (c) =>
              c.ok &&
              c.action === "cat" &&
              c.target === "/project/original/archive/1893/lost.txt",
          )
        : task.goal === "copy"
          ? machine.files["/project/results/interview.txt"] ===
              machine.files["/project/original/interview.txt"] &&
            machine.dirs.includes("/project/results") &&
            machine.files["/project/original/interview.txt"] !== undefined
          : commands.some(
              (c) =>
                c.ok &&
                c.action === "grep" &&
                c.target === "/project/corpus.txt" &&
                c.pattern === machine.word,
            );
    return ok
      ? pass()
      : fail(
          "Мета ще не виконана. Перевірте поточний каталог, назви й результат команди.",
        );
  }
  if (task.type === "git")
    return value?.history?.some(
      (c) => c.text === task.expected && c.message.trim().length >= 12,
    ) && value.logViewed
      ? pass()
      : fail(
          "Потрібен коміт правильного тексту зі змістовним повідомленням та перегляд git log. Перевірте, що після редагування виконано git add.",
        );
  if (task.type === "interval")
    return Math.abs(Number(String(value?.start).replace(",", ".")) - 0.6) <
      0.001 &&
      Math.abs(Number(String(value?.end).replace(",", ".")) - 1.1) < 0.001 &&
      String(value?.label).trim() === "B"
      ? pass()
      : fail(
          "Перевірте початок 0.60, кінець 1.10 та мітку B; не плутайте секунди й мілісекунди.",
        );
  if (task.type === "wer")
    return wer(task.reference, value).rate === 0
      ? pass()
      : fail(
          "Гіпотеза ще відрізняється від еталона. Перевірте пропуски, заміни й додані слова.",
        );
  if (task.type === "portfolio") {
    if (
      !value ||
      String(value.artifact || "").trim().length < 5 ||
      String(value.method || "").trim().length < 120 ||
      String(value.reflection || "").trim().length < 100 ||
      !value.confirm
    )
      return fail(
        "Для подання вкажіть артефакт (від 5 символів), метод і результати (від 120), обмеження та висновок (від 100), і підтвердьте самоперевірку.",
      );
    return {
      status: "submitted",
      feedback:
        "Подання збережено для звіту. Обсяг полів перевірено автоматично; якість роботи й наявність артефакту оцінює викладач. Збережіть і передайте сам артефакт разом зі звітом.",
    };
  }
  return fail("Невідомий тип завдання.");
}

export function recordAttempt(track, task, value, result) {
  const r = answerRecord(track, task.id);
  const before = taskStatus(r);
  r.draft = structuredClone(value);
  r.attempts.push({
    at: now(),
    value: structuredClone(value),
    status: result.status,
    feedback: result.feedback,
    hints: r.hints,
  });
  return {
    record: r,
    newXP:
      !["passed", "submitted"].includes(before) &&
      ["passed", "submitted"].includes(taskStatus(r))
        ? task.xp
        : 0,
  };
}

export function unicodePoints(text) {
  return Array.from(text).map((c) => ({
    char: c,
    point: "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"),
  }));
}
export function tokenize(text) {
  return normalized(text)
    .toLocaleLowerCase()
    .split(/\s+/u)
    .map((w) => w.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ""))
    .filter(Boolean);
}
export function wer(reference, hypothesis) {
  const a = tokenize(reference),
    b = tokenize(hypothesis),
    dp = Array.from({ length: a.length + 1 }, () =>
      Array(b.length + 1).fill(0),
    );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  let i = a.length,
    j = b.length,
    S = 0,
    D = 0,
    I = 0;
  const alignment = [];
  while (i || j) {
    if (i && j && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      alignment.unshift({ type: "=", reference: a[--i], hypothesis: b[--j] });
    } else if (i && j && dp[i][j] === dp[i - 1][j - 1] + 1) {
      S++;
      alignment.unshift({ type: "S", reference: a[--i], hypothesis: b[--j] });
    } else if (i && dp[i][j] === dp[i - 1][j] + 1) {
      D++;
      alignment.unshift({ type: "D", reference: a[--i], hypothesis: "∅" });
    } else {
      I++;
      alignment.unshift({ type: "I", reference: "∅", hypothesis: b[--j] });
    }
  }
  return {
    S,
    D,
    I,
    N: a.length,
    rate: a.length ? (S + D + I) / a.length : null,
    alignment,
  };
}

export function createTerminal(language) {
  const l = LANGUAGES[language];
  return {
    cwd: "/project",
    dirs: [
      "/project",
      "/project/original",
      "/project/original/archive",
      "/project/original/archive/1893",
      "/project/working",
      "/project/Field notes",
    ],
    word: l.word,
    files: {
      "/project/README.txt":
        "Навчальний архів. Оригінали — в original/. Загублений лист — глибше в archive/.",
      "/project/original/interview.txt": l.sample,
      "/project/original/archive/1893/lost.txt": `[1893] ${l.sentence}\n◇ Архівна знахідка: важливо зберігати непевні прочитання.`,
      "/project/corpus.txt": `${l.word} ${l.word}\n${l.sample}\n${l.word}\n`,
    },
  };
}
const splitCommand = (command) =>
  command
    .match(/"[^"]*"|'[^']*'|[^\s]+/g)
    ?.map((v) => v.replace(/^(["'])(.*)\1$/s, "$2")) || [];
export function resolvePath(cwd, path = ".") {
  const parts = (path.startsWith("/") ? path : cwd + "/" + path).split("/");
  const result = [];
  for (const p of parts)
    if (p === "..") result.pop();
    else if (p && p !== ".") result.push(p);
  return "/" + result.join("/");
}
export function runTerminal(machine, command) {
  const s = structuredClone(machine),
    args = splitCommand(command),
    action = args.shift();
  const error = (message) => ({
    machine: s,
    output: message,
    ok: false,
    action,
  });
  const ok = (output, extra = {}) => ({
    machine: s,
    output,
    ok: true,
    action,
    ...extra,
  });
  if (!action) return error("Введіть команду.");
  if (command.includes("|"))
    return error(
      "Цей симулятор виконує одну команду за раз. Конвеєр досліджується в окремому завданні.",
    );
  if (action === "help")
    return ok(
      'Підтримуються: pwd, ls [шлях], cd шлях, cat файл, head файл, mkdir папка, cp джерело призначення, mv джерело призначення, grep [-c] "текст" файл, wc -l файл. Це навчальний Unix-симулятор.',
    );
  if (action === "pwd")
    return args.length ? error("pwd не очікує аргументів.") : ok(s.cwd);
  if (action === "ls") {
    if (args.length > 1) return error("ls приймає один шлях.");
    const path = resolvePath(s.cwd, args[0]);
    if (!s.dirs.includes(path)) return error("Каталог не знайдено: " + path);
    const names = [
      ...s.dirs.filter((p) => p !== path).map((p) => p + "/"),
      ...Object.keys(s.files),
    ]
      .filter(
        (p) =>
          p.startsWith(path + "/") &&
          !p
            .slice(path.length + 1)
            .replace(/\/$/, "")
            .includes("/"),
      )
      .map((p) => p.slice(path.length + 1));
    return ok(names.sort().join("\n") || "(порожньо)");
  }
  const path = resolvePath(s.cwd, args[0]);
  if (action === "cd") {
    if (args.length !== 1 || !s.dirs.includes(path))
      return error("Каталог не знайдено. Використайте ls для перевірки.");
    s.cwd = path;
    return ok(s.cwd);
  }
  if (action === "mkdir") {
    if (args.length !== 1) return error("Вкажіть одну назву папки.");
    if (s.dirs.includes(path) || path in s.files)
      return error("Шлях уже існує.");
    if (!s.dirs.includes(path.slice(0, path.lastIndexOf("/"))))
      return error("Батьківського каталогу немає.");
    s.dirs.push(path);
    return ok("Створено " + path);
  }
  if (action === "cat" || action === "head") {
    if (args.length !== 1 || !(path in s.files))
      return error("Файл не знайдено.");
    return ok(
      action === "head"
        ? s.files[path].split("\n").slice(0, 10).join("\n")
        : s.files[path],
      { target: path },
    );
  }
  if (action === "cp" || action === "mv") {
    if (args.length !== 2 || !(path in s.files))
      return error("Потрібні наявний файл-джерело та шлях призначення.");
    let target = resolvePath(s.cwd, args[1]);
    if (s.dirs.includes(target)) target += "/" + path.split("/").at(-1);
    if (!s.dirs.includes(target.slice(0, target.lastIndexOf("/"))))
      return error("Каталогу призначення немає.");
    if (target === path) return error("Джерело і призначення збігаються.");
    s.files[target] = s.files[path];
    if (action === "mv") delete s.files[path];
    return ok(`${action === "cp" ? "Скопійовано" : "Переміщено"} ${target}`, {
      target,
    });
  }
  if (action === "grep") {
    const count = args[0] === "-c";
    if (count) args.shift();
    if (args.length !== 2) return error('Використайте grep [-c] "текст" файл.');
    const target = resolvePath(s.cwd, args[1]);
    if (!(target in s.files)) return error("Файл не знайдено.");
    const lines = s.files[target]
      .split("\n")
      .filter((line) => line.includes(args[0]));
    return ok(
      count ? String(lines.length) : lines.join("\n") || "(збігів немає)",
      { target, pattern: args[0] },
    );
  }
  if (action === "wc") {
    if (args[0] !== "-l" || args.length !== 2)
      return error("Підтримується wc -l файл.");
    const target = resolvePath(s.cwd, args[1]);
    if (!(target in s.files)) return error("Файл не знайдено.");
    return ok(
      String((s.files[target].match(/\n/g) || []).length) + " " + args[1],
      { target },
    );
  }
  return error("Команду не підтримано. Введіть help.");
}

export function createGit(language) {
  return {
    text: LANGUAGES[language].sentence.replace(/\.$/, "") + " [перевірити]",
    staged: null,
    history: [],
    logViewed: false,
    commands: [],
  };
}
export function runGit(state, command) {
  const s = structuredClone(state),
    args = splitCommand(command);
  const result = (output, ok = true) => ({ state: s, output, ok });
  if (args[0] !== "git") return result("Команди починаються з git.", false);
  const sub = args[1];
  if (sub === "status")
    return result(
      s.staged === s.text
        ? "Changes to be committed: transcription.txt"
        : s.history.at(-1)?.text === s.text
          ? "Working tree clean"
          : "Modified: transcription.txt" +
            (s.staged !== null ? " (є попередній індекс)" : ""),
    );
  if (sub === "add" && args[2] === "transcription.txt" && args.length === 3) {
    s.staged = s.text;
    return result("Поточний вміст додано до індексу.");
  }
  if (sub === "commit" && args[2] === "-m" && args.length === 4) {
    if (s.staged === null)
      return result(
        "Індекс порожній. Спочатку git add transcription.txt.",
        false,
      );
    if (args[3].trim().length < 12)
      return result(
        "Поясніть зміну в повідомленні (щонайменше 12 символів).",
        false,
      );
    if (s.history.at(-1)?.text === s.staged)
      return result("Підготовлений вміст не змінився.", false);
    s.history.push({ text: s.staged, message: args[3], at: now() });
    s.staged = null;
    s.logViewed = false;
    return result(`Збережено коміт ${s.history.length}: ${args[3]}`);
  }
  if (sub === "log") {
    s.logViewed = true;
    return result(
      s.history
        .map((c, i) => `commit ${i + 1}\n${c.message}\n${c.text}`)
        .reverse()
        .join("\n\n") || "Комітів ще немає.",
    );
  }
  if (sub === "diff")
    return result(
      `- ${s.staged ?? s.history.at(-1)?.text ?? "(початкова версія)"}\n+ ${s.text}`,
    );
  return result(
    'Підтримуються git status, git add transcription.txt, git commit -m "пояснення", git log, git diff.',
    false,
  );
}

const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value, max = 50000) =>
  typeof value === "string" && value.length <= max;
const onlyKeys = (value, keys) =>
  object(value) && Object.keys(value).every((key) => keys.includes(key));
const pick = (value, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => Object.hasOwn(value, key))
      .map((key) => [key, value[key]]),
  );
const indexValue = (value, count) =>
  (typeof value === "number" ||
    (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value))) &&
  Number.isSafeInteger(Number(value)) &&
  Number(value) >= 0 &&
  Number(value) < count;
const attemptKeys = ["at", "value", "status", "feedback", "hints"];
const eventKeys = ["at", "input", "output", "ok"];
const commandKeys = ["input", "ok", "action", "target", "pattern"];
const commitKeys = ["text", "message", "at"];
const machineKeys = ["cwd", "dirs", "word", "files"];
const valueKeys = {
  regex: ["pattern", "replacement"],
  replace: ["pattern", "replacement"],
  portfolio: ["artifact", "method", "reflection", "confirm"],
  interval: ["start", "end", "label"],
  git: ["text", "staged", "history", "logViewed", "commands"],
  terminal: ["machine", "commands"],
};
const validAttempt = (a) =>
  onlyKeys(a, attemptKeys) &&
  ["passed", "failed", "submitted"].includes(a.status) &&
  text(a.at, 40) &&
  !Number.isNaN(Date.parse(a.at)) &&
  text(a.feedback, 5000) &&
  Number.isSafeInteger(a.hints) &&
  a.hints >= 0;
const validCommand = (c) =>
  onlyKeys(c, commandKeys) &&
  text(c.input, 1000) &&
  typeof c.ok === "boolean" &&
  text(c.action, 100) &&
  (c.target == null || text(c.target, 1000)) &&
  (c.pattern == null || text(c.pattern, 1000));
const validCommit = (c) =>
  onlyKeys(c, commitKeys) &&
  text(c.text, 10000) &&
  text(c.message, 500) &&
  text(c.at, 40);
function validTaskValue(task, value) {
  if (value === null) return true;
  if (["choice", "unicode", "wave"].includes(task.type))
    return indexValue(value, task.options.length);
  if (["exact", "json", "wer"].includes(task.type)) return text(value, 10000);
  const keys = valueKeys[task.type];
  if (!keys || !onlyKeys(value, keys)) return false;
  if (["regex", "replace"].includes(task.type))
    return (
      text(value.pattern, 300) &&
      (value.replacement === undefined || text(value.replacement, 1000))
    );
  if (task.type === "portfolio")
    return (
      text(value.artifact, 1000) &&
      text(value.method, 15000) &&
      text(value.reflection, 15000) &&
      typeof value.confirm === "boolean"
    );
  if (task.type === "interval")
    return ["start", "end", "label"].every((key) => text(value[key], 100));
  if (task.type === "git")
    return (
      text(value.text, 10000) &&
      (value.staged === null || text(value.staged, 10000)) &&
      typeof value.logViewed === "boolean" &&
      Array.isArray(value.history) &&
      value.history.length <= 5000 &&
      value.history.every(validCommit) &&
      // Current simulator exports this unused field as an empty array; older imports may omit it.
      (value.commands === undefined ||
        (Array.isArray(value.commands) && value.commands.length === 0))
    );
  const m = value.machine;
  return (
    onlyKeys(m, machineKeys) &&
    text(m.cwd, 1000) &&
    text(m.word, 100) &&
    Array.isArray(m.dirs) &&
    m.dirs.length <= 1000 &&
    m.dirs.every((p) => text(p, 1000)) &&
    object(m.files) &&
    Object.keys(m.files).length <= 1000 &&
    Object.entries(m.files).every(
      ([p, v]) => text(p, 1000) && text(v, 50000),
    ) &&
    Array.isArray(value.commands) &&
    value.commands.length <= 10000 &&
    value.commands.every(validCommand)
  );
}
function copyTaskValue(task, value) {
  if (value === null || typeof value !== "object") return value;
  const clean = pick(value, valueKeys[task.type]);
  if (task.type === "git") {
    clean.history = value.history.map((c) => pick(c, commitKeys));
    if (value.commands !== undefined) clean.commands = [];
  }
  if (task.type === "terminal") {
    clean.machine = {
      cwd: value.machine.cwd,
      word: value.machine.word,
      dirs: [...value.machine.dirs],
      files: Object.fromEntries(Object.entries(value.machine.files)),
    };
    clean.commands = value.commands.map((c) => pick(c, commandKeys));
  }
  return clean;
}

// Use the course's type and the same shape checks as import, never data-supplied discriminators.
export function formatTaskValue(task, value) {
  if (value === null || value === undefined) return "—";
  if (!task || !validTaskValue(task, value)) return "Некоректні дані відповіді";
  if (typeof value !== "object") return String(value);
  if (task.type === "terminal")
    return value.commands
      .map((c) => "$ " + c.input + (c.ok ? "" : " [помилка]"))
      .join("\n");
  if (task.type === "git")
    return `Робочий текст: ${value.text}\nІндекс: ${value.staged ?? "порожній"}\nКоміти:\n${value.history.map((c) => c.message + "\n" + c.text).join("\n")}`;
  const labels = {
    artifact: "Артефакт",
    method: "Метод і результати",
    reflection: "Обмеження та висновок",
    confirm: "Самоперевірка",
    pattern: "Шаблон",
    replacement: "Заміна",
    start: "Початок",
    end: "Кінець",
    label: "Мітка",
  };
  return valueKeys[task.type]
    .filter((key) => Object.hasOwn(value, key))
    .map(
      (key) =>
        `${labels[key]}: ${typeof value[key] === "boolean" ? (value[key] ? "так" : "ні") : value[key]}`,
    )
    .join("\n\n");
}

export function validateBackup(data) {
  const fail = () => {
    throw new Error("Це не сумісна резервна копія lingva.lab версії 1.");
  };
  if (
    !onlyKeys(data, [
      "version",
      "activeLanguage",
      "student",
      "group",
      "tracks",
    ]) ||
    data.version !== 1 ||
    !["de", "fr", "en", null].includes(data.activeLanguage) ||
    typeof data.student !== "string" ||
    data.student.length > 100 ||
    typeof data.group !== "string" ||
    data.group.length > 40 ||
    !onlyKeys(data.tracks, Object.keys(LANGUAGES))
  )
    fail();
  const clean = freshState();
  clean.activeLanguage = data.activeLanguage;
  clean.student = data.student;
  clean.group = data.group;
  const copyAttempt = (a, task) => ({
    ...pick(a, attemptKeys),
    value: task ? copyTaskValue(task, a.value) : a.value,
  });
  for (const lang of Object.keys(LANGUAGES)) {
    const track = data.tracks[lang];
    if (
      !onlyKeys(track, ["answers", "treasures"]) ||
      !object(track.answers) ||
      !object(track.treasures)
    )
      fail();
    const tasks = getModules(lang).flatMap((m) => m.tasks);
    for (const [id, r] of Object.entries(track.answers)) {
      const t = tasks.find((t) => t.id === id);
      if (
        !t ||
        !onlyKeys(r, [
          "draft",
          "attempts",
          "hints",
          "hintOpened",
          "toolEvents",
        ]) ||
        !Array.isArray(r.attempts) ||
        r.attempts.length > 5000 ||
        !r.attempts.every(
          (a) => validAttempt(a) && validTaskValue(t, a.value),
        ) ||
        !validTaskValue(t, r.draft) ||
        typeof r.hintOpened !== "boolean" ||
        !Number.isSafeInteger(r.hints) ||
        r.hints < 0 ||
        !Array.isArray(r.toolEvents) ||
        r.toolEvents.length > 10000 ||
        !r.toolEvents.every(
          (e) =>
            onlyKeys(e, eventKeys) &&
            text(e.at, 40) &&
            text(e.input, 1000) &&
            text(e.output, 50000) &&
            typeof e.ok === "boolean",
        )
      )
        fail();
      // Re-evaluate ordinary answers. Regex is rechecked in its isolated worker on next submission.
      for (const a of r.attempts)
        if (
          a.status !== "failed" &&
          !["regex", "replace", "terminal", "git"].includes(t.type) &&
          evaluateTask(t, a.value).status !== a.status
        )
          fail();
      clean.tracks[lang].answers[id] = {
        draft: copyTaskValue(t, r.draft),
        attempts: r.attempts.map((a) => copyAttempt(a, t)),
        hints: r.hints,
        hintOpened: r.hintOpened,
        toolEvents: r.toolEvents.map((e) => pick(e, eventKeys)),
      };
    }
    for (const [key, r] of Object.entries(track.treasures)) {
      if (
        !Object.hasOwn(TREASURES, key) ||
        !onlyKeys(r, ["attempts"]) ||
        !Array.isArray(r.attempts) ||
        r.attempts.length > 5000 ||
        !r.attempts.every(
          (a) =>
            validAttempt(a) &&
            indexValue(a.value, TREASURES[key].options.length),
        )
      )
        fail();
      clean.tracks[lang].treasures[key] = {
        attempts: r.attempts.map((a) => copyAttempt(a)),
      };
    }
  }
  return clean;
}

export function exportTextGrid(start, end, label) {
  return `File type = "ooTextFile"\nObject class = "TextGrid"\n\nxmin = 0\nxmax = 1.8\ntiers? <exists>\nsize = 1\nitem []:\n    item [1]:\n        class = "IntervalTier"\n        name = "segments"\n        xmin = 0\n        xmax = 1.8\n        intervals: size = 3\n        intervals [1]:\n            xmin = 0\n            xmax = ${start}\n            text = ""\n        intervals [2]:\n            xmin = ${start}\n            xmax = ${end}\n            text = "${String(label).replaceAll('"', '""')}"\n        intervals [3]:\n            xmin = ${end}\n            xmax = 1.8\n            text = ""\n`;
}
