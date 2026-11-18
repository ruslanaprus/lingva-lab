import { choice, exact, portfolio } from "../../builders.js";
import { activity, lesson } from "../../workshop.js";
function wrap(task, c) {
  const reading = lesson(
    c.title,
    c.paragraphs,
    c.example,
    c.steps || [],
    c.sources || [],
  );
  if (c.preset) reading.concordancePreset = c.preset;
  return activity(task, c.stage, c.minutes ?? 3, reading, {
    required: c.required !== false,
  });
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
        "Перевірте тип запиту, фільтри й повний контекст. Знайдене слово ще не означає, що приклад відповідає питанню.",
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
      "Приберіть зайві фільтри, виконайте заданий пошук і перевірте загальний лічильник або ID документа.",
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
