import { normalized } from "../shared/values.js";
import { wer } from "../tools/text.js";
import { validTaskValue } from "./values.js";
import { parseCsv } from "../tools/csv.js";
export function evaluateTask(task, value, regexResult) {
  const pass = (feedback) => ({
    status: "passed",
    feedback: feedback || task.explain,
  });
  const fail = (feedback) => ({ status: "failed", feedback });
  if (["choice", "unicode", "wave"].includes(task.type))
    return (
      task.multiple
        ? validTaskValue(task, value) &&
          Array.isArray(value) &&
          value.length === task.answer.length &&
          task.answer.every((index) => value.some((v) => Number(v) === index))
        : Number(value) === task.answer && value !== null && value !== ""
    )
      ? pass()
      : fail(
          "Перегляньте обраний варіант. " +
            (task.type === "choice"
              ? "Зіставте відповідь із теорією та дослідницькою метою."
              : "Скористайтеся спостереженням у тренажері."),
        );
  if (task.type === "exact") {
    if (task.checker === "csv") {
      try {
        const rows = parseCsv(value);
        const same =
          rows.length === task.expectedRows.length &&
          rows.every(
            (row, i) =>
              row.length === task.expectedRows[i].length &&
              row.every(
                (field, j) =>
                  field.replace(/\r\n/g, "\n") ===
                  task.expectedRows[i][j].replace(/\r\n/g, "\n"),
              ),
          );
        return same
          ? pass()
          : fail(
              "CSV прочитано, але кількість записів, полів або їхні значення відрізняються від умови. Пробіли є частиною значення; типографічні лапки не обрамлюють поле.",
            );
      } catch (error) {
        return fail(error.message);
      }
    }
    const ok = task.numeric
      ? String(value).trim() !== "" &&
        Number.isFinite(Number(String(value).replace(",", "."))) &&
        Math.abs(Number(String(value).replace(",", ".")) - Number(task.answer)) < 1e-6
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
    return Math.abs(Number(String(value?.start).replace(",", ".")) - 0.6) < 0.001 &&
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
    const documentTitle = task.submission?.title || "README";
    const minimumMethod = task.submission?.minimumMethodLength ?? 120;
    const minimumReflection = task.submission?.minimumReflectionLength ?? 100;
    if (
      !value ||
      String(value.artifact || "").trim().length < 5 ||
      String(value.method || "").trim().length < minimumMethod ||
      String(value.reflection || "").trim().length < minimumReflection ||
      !value.confirm
    )
      return fail(
        `Для подання вкажіть артефакт (від 5 символів), ${task.submission ? `повний текст документа «${documentTitle}»` : "метод і результати"} (від ${minimumMethod}), обмеження та висновок (від ${minimumReflection}), і підтвердьте самоперевірку.`,
      );
    if (task.submission?.sections) {
      const headings = value.method
        .normalize("NFC")
        .split(/\r?\n/u)
        .map((line) =>
          line
            .trim()
            .replace(/^(?:#{1,6}\s*|\d+[.)]\s*)/u, "")
            .replace(/:\s*$/u, "")
            .trim(),
        );
      const missing = task.submission.sections.filter(
        (section) => !headings.includes(section),
      );
      if (missing.length)
        return fail(
          `У документі «${documentTitle}» бракує заголовків зі шаблону: ${missing.join("; ")}. Додайте кожну частину окремим рядком і заповніть її фактами.`,
        );
      if (value.method.includes("[Замініть цей рядок"))
        return fail(
          `У документі «${documentTitle}» залишилися підказки шаблону. Замініть їх конкретною інформацією про вашу роботу.`,
        );
    }
    return {
      status: "submitted",
      feedback:
        "Подання збережено для звіту. Обсяг полів перевірено автоматично; якість роботи й наявність артефакту оцінює викладач. Збережіть і передайте сам артефакт разом зі звітом.",
    };
  }
  return fail("Невідомий тип завдання.");
}
