// Content helpers: no page, storage or answer-checking dependencies.
export const activity = (task, stage, minutes, lesson, extra = {}) => ({
  ...task,
  stage,
  minutes,
  lesson,
  ...extra,
});

export const lesson = (title, paragraphs, example, steps = [], sources = []) => ({
  title,
  paragraphs,
  ...(example ? { example } : {}),
  steps,
  sources,
});
