// Plain-text context for historical attempts and exported reports.
export function lessonText(lesson) {
  if (!lesson) return "";
  return [
    lesson.title,
    ...lesson.paragraphs,
    ...(lesson.symbols || []).map((symbol) => `${symbol.text}: ${symbol.label}`),
    lesson.example,
    ...lesson.steps.map((step, index) => `${index + 1}. ${step}`),
  ]
    .filter(Boolean)
    .join("\n\n");
}
