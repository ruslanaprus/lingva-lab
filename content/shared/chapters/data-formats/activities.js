import { choice, exact, portfolio } from "../../builders.js";
import { activity, lesson } from "../../workshop.js";
import { serializeCsv } from "../../csv.js";
function assemble(task, c) {
  const reading = lesson(
    c.readingTitle || c.title,
    c.paragraphs,
    c.example,
    c.steps || [],
    c.sources || [],
  );
  if (c.diagram) reading.diagram = c.diagram;
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
    c.hint || c.explain,
  );
  if (Array.isArray(c.answer)) task.multiple = true;
  return assemble(task, c);
}
export function enter(c) {
  return assemble(
    exact(c.id, c.title, c.prompt, c.answer, c.explain, c.hint || c.explain, {
      ...(c.expectedRows ? { checker: "csv", expectedRows: c.expectedRows } : {}),
      ...(c.inspector ? { inspector: c.inspector } : {}),
    }),
    c,
  );
}
export function csv(c) {
  return enter({ ...c, answer: serializeCsv(c.expectedRows) });
}
export function practice(c) {
  return assemble(
    {
      ...portfolio(c.id, c.title, c.prompt, c.rubric),
      ...(c.submission ? { submission: c.submission } : {}),
    },
    c,
  );
}
