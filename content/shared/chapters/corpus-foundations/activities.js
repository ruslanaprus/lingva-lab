import { choice, exact, portfolio } from "../../builders.js";
import { activity, lesson } from "../../workshop.js";

function wrap(task, c) {
  return activity(
    task,
    c.stage,
    c.minutes ?? 3,
    lesson(c.title, c.paragraphs, c.example, c.steps || [], c.sources || []),
    { required: c.required !== false },
  );
}
export const ask = (c) =>
  wrap(
    {
      ...choice(
        c.id,
        c.title,
        c.prompt,
        c.options,
        c.answer,
        c.explain,
        "Зіставте рішення з питанням і правилами добору. Однакова кількість файлів ще не означає порівнянності матеріалу.",
      ),
      ...(Array.isArray(c.answer) ? { multiple: true } : {}),
    },
    c,
  );
export const enter = (c) =>
  wrap(
    exact(
      c.id,
      c.title,
      c.prompt,
      c.answer,
      c.explain,
      c.hint ||
        "Знайдіть потрібні відомості в прикладі. Перевірте, чи рахуєте файли, окремі тексти або джерела.",
      c.extra || {},
    ),
    c,
  );
export const practice = (c) =>
  wrap(
    {
      ...portfolio(c.id, c.title, c.prompt, c.rubric),
      ...(c.submission ? { submission: c.submission } : {}),
    },
    c,
  );
