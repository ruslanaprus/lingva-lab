import { LANGUAGES } from "../../content/registry.js";
import { now } from "../shared/values.js";
import { splitCommand } from "./terminal.js";
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
      return result("Індекс порожній. Спочатку git add transcription.txt.", false);
    if (args[3].trim().length < 12)
      return result("Поясніть зміну в повідомленні (щонайменше 12 символів).", false);
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
