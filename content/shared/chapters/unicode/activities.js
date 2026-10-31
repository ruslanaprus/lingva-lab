import { choice, exact, portfolio } from "../../builders.js";
import { activity, lesson } from "../../workshop.js";

function wrap(task, c) {
  const reading = lesson(
    c.readingTitle || c.title,
    c.paragraphs,
    c.example,
    c.steps || [],
    c.sources || [],
  );
  if (c.symbols) reading.symbols = c.symbols;
  return activity(task, c.stage, c.minutes, reading, {
    required: c.required !== false,
    revision: c.revision || 1,
    ...(c.xp ? { xp: c.xp } : {}),
  });
}
export function ask(c) {
  const task = choice(
    c.id,
    c.title,
    c.prompt,
    c.options,
    c.answer,
    c.explain,
    c.hint || "Поверніться до прикладу й порівняйте причину та наслідок.",
  );
  if (Array.isArray(c.answer)) task.multiple = true;
  return wrap({ ...task, ...(c.type ? { type: c.type } : {}) }, c);
}
export function enter(c) {
  return wrap(
    exact(
      c.id,
      c.title,
      c.prompt,
      c.answer,
      c.explain,
      c.hint || "Введіть задані символи й звірте кодові точки перед поданням завдання.",
      {
        ...(c.precise === false
          ? {}
          : { checker: "unicode", normalization: c.normalization || "NFC" }),
        inspector: "typography",
        palette: c.palette || [],
        ...(c.probe ? { probe: c.probe } : {}),
      },
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
