import { LANGUAGES } from "../../content/registry.js";
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

export const splitCommand = (command) =>
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
    if (s.dirs.includes(path) || path in s.files) return error("Шлях уже існує.");
    if (!s.dirs.includes(path.slice(0, path.lastIndexOf("/"))))
      return error("Батьківського каталогу немає.");
    s.dirs.push(path);
    return ok("Створено " + path);
  }
  if (action === "cat" || action === "head") {
    if (args.length !== 1 || !(path in s.files)) return error("Файл не знайдено.");
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
    const lines = s.files[target].split("\n").filter((line) => line.includes(args[0]));
    return ok(count ? String(lines.length) : lines.join("\n") || "(збігів немає)", {
      target,
      pattern: args[0],
    });
  }
  if (action === "wc") {
    if (args[0] !== "-l" || args.length !== 2)
      return error("Підтримується wc -l файл.");
    const target = resolvePath(s.cwd, args[1]);
    if (!(target in s.files)) return error("Файл не знайдено.");
    return ok(String((s.files[target].match(/\n/g) || []).length) + " " + args[1], {
      target,
    });
  }
  return error("Команду не підтримано. Введіть help.");
}
