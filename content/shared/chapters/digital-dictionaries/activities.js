import { choice, exact, portfolio } from "../../builders.js";
import { activity, lesson } from "../../workshop.js";

function wrap(task, c) {
  return activity(
    task,
    c.stage,
    c.minutes,
    lesson(c.title, c.paragraphs, c.example, c.steps || [], c.sources || []),
    {
      required: c.required !== false,
      revision: c.revision ?? 1,
      ...(c.xp ? { xp: c.xp } : {}),
    },
  );
}

export function ask(c) {
  return wrap(
    {
      ...choice(
        c.id,
        c.title,
        c.prompt,
        c.options,
        c.answer,
        c.explain,
        "Знайдіть у картці конкретну позначку або контекст. Перевірте, до якого слова чи значення вона належить.",
      ),
      ...(Array.isArray(c.answer) ? { multiple: true } : {}),
    },
    c,
  );
}

export function enter(c) {
  return wrap(
    exact(
      c.id,
      c.title,
      c.prompt,
      c.answer,
      c.explain,
      "Скопіюйте лише заголовне слово з картки, зберігаючи його написання. Не додавайте множину, номер або переклад.",
    ),
    c,
  );
}

export function practice(c) {
  return wrap(
    {
      ...portfolio(c.id, c.title, c.prompt, c.rubric),
      ...(c.editor ? { editor: c.editor, dictionaryLanguage: c.language } : {}),
      ...(c.submission ? { submission: c.submission } : {}),
    },
    c,
  );
}
