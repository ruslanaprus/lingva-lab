import { choice, exact, portfolio } from "../../builders.js";
import { activity, lesson } from "../../workshop.js";

function wrap(task, c) {
  return activity(
    task,
    c.stage,
    c.minutes,
    lesson(c.title, c.paragraphs, c.example, c.steps || [], [
      ...new Set(c.sources || []),
    ]),
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
        c.hint ||
          "Зіставте визначення, галузь і правила проєкту. Збіг написання або частотність ще не встановлюють тотожності понять.",
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
        "Поверніться до картки та перевірте одиницю обліку, ID й умови. Для CSV важливі значення прочитаних полів.",
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
