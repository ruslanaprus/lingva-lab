import { choice, portfolio } from "../../builders.js";
import { activity, lesson } from "../../workshop.js";

function wrap(task, c) {
  return activity(
    task,
    c.stage,
    c.minutes,
    lesson(
      c.readingTitle || c.title,
      c.paragraphs,
      c.example,
      c.steps || [],
      c.sources || [],
    ),
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
        c.hint ||
          "Зіставте вимогу дослідження з тим, що справді засвідчує джерело. Поверніться до пояснення перед вправою.",
      ),
      ...(Array.isArray(c.answer) ? { multiple: true } : {}),
    },
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
