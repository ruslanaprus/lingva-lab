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
    { required: c.required !== false, revision: c.revision ?? 1 },
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
        "Зіставте обраний варіант із брифом, змістом обох речень і метаданими картки. Поширений переклад може стосуватися іншого значення.",
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
      c.hint ||
        "Поверніться до картки й перевірте, які саме одиниці потрібно порахувати або порівняти.",
      c.extra || {},
    ),
    c,
  );
}
export function practice(c) {
  return wrap(
    {
      ...portfolio(c.id, c.title, c.prompt, c.rubric),
      ...(c.submission ? { submission: c.submission } : {}),
    },
    c,
  );
}
