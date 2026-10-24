import { object, text, onlyKeys, pick, indexValue } from "../shared/values.js";
export const attemptKeys = [
  "at",
  "value",
  "status",
  "feedback",
  "hints",
  "selectedOptions",
];

export const selectionKeys = ["index", "number", "value"];

export const eventKeys = ["at", "input", "output", "ok"];

export const commandKeys = ["input", "ok", "action", "target", "pattern"];

export const commitKeys = ["text", "message", "at"];

export const machineKeys = ["cwd", "dirs", "word", "files"];

export const valueKeys = {
  regex: ["pattern", "replacement"],
  replace: ["pattern", "replacement"],
  portfolio: ["artifact", "method", "reflection", "confirm"],
  interval: ["start", "end", "label"],
  git: ["text", "staged", "history", "logViewed", "commands"],
  terminal: ["machine", "commands"],
};

export const validCommand = (c) =>
  onlyKeys(c, commandKeys) &&
  text(c.input, 1000) &&
  typeof c.ok === "boolean" &&
  text(c.action, 100) &&
  (c.target == null || text(c.target, 1000)) &&
  (c.pattern == null || text(c.pattern, 1000));

export const validCommit = (c) =>
  onlyKeys(c, commitKeys) &&
  text(c.text, 10000) &&
  text(c.message, 500) &&
  text(c.at, 40);

export function validTaskValue(task, value) {
  if (value === null) return true;
  if (["choice", "unicode", "wave"].includes(task.type))
    return task.multiple
      ? Array.isArray(value) &&
          value.length <= task.options.length &&
          value.every((v) => indexValue(v, task.options.length)) &&
          new Set(value.map(Number)).size === value.length
      : indexValue(value, task.options.length);
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
    Object.entries(m.files).every(([p, v]) => text(p, 1000) && text(v, 50000)) &&
    Array.isArray(value.commands) &&
    value.commands.length <= 10000 &&
    value.commands.every(validCommand)
  );
}

export function copyTaskValue(task, value) {
  if (value === null || typeof value !== "object") return value;
  if (task.multiple && Array.isArray(value)) return [...value];
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

export function formatTaskValue(task, value) {
  if (value === null || value === undefined) return "—";
  if (!task || !validTaskValue(task, value)) return "Некоректні дані відповіді";
  if (task.options) return formatSelections(selectionDetails(task, value));
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

export function selectionDetails(task, value) {
  if (!task?.options || value === null || value === undefined) return [];
  const values = task.multiple && Array.isArray(value) ? value : [value];
  return values
    .filter((v) => indexValue(v, task.options.length))
    .map((v) => ({
      index: Number(v),
      number: Number(v) + 1,
      value: task.options[Number(v)],
    }));
}

export function formatSelections(selections) {
  return selections.length
    ? selections
        .map((s) => `Варіант №${s.number} (індекс ${s.index}): ${s.value}`)
        .join("\n")
    : "Жодного варіанта не обрано";
}

export function formatAttemptValue(task, attempt) {
  task = attempt?.definition ?? task;
  if (!task || !validSelections(task, attempt)) return "Некоректні дані відповіді";
  return task.options
    ? formatSelections(attempt.selectedOptions ?? selectionDetails(task, attempt.value))
    : formatTaskValue(task, attempt.value);
}

export function validSelections(task, attempt) {
  if (attempt.selectedOptions === undefined) return true;
  if (!task.options || !Array.isArray(attempt.selectedOptions)) return false;
  const expected = selectionDetails(task, attempt.value);
  return (
    attempt.selectedOptions.length === expected.length &&
    attempt.selectedOptions.every(
      (s, i) =>
        onlyKeys(s, selectionKeys) &&
        s.index === expected[i].index &&
        s.number === s.index + 1 &&
        text(s.value, 10000),
    )
  );
}
