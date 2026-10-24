export const choice = (id, title, prompt, options, answer, explain, hint) => ({
  id,
  type: "choice",
  title,
  prompt,
  options,
  answer,
  explain,
  hint:
    hint ||
    "Порівняйте дію інструмента з дослідницькою метою. Не плутайте зручність із надійністю.",
});
export const exact = (id, title, prompt, answer, explain, hint, extra = {}) => ({
  id,
  type: "exact",
  title,
  prompt,
  answer,
  explain,
  hint,
  ...extra,
});
export const portfolio = (id, title, prompt, rubric) => ({
  id,
  type: "portfolio",
  title,
  prompt,
  rubric,
  hint: "Виконайте роботу у відповідному інструменті. Вкажіть назву артефакту, опишіть метод і обмеження. Зберігайте сам файл у власному портфоліо. Це подання для викладача, без автоматичної оцінки.",
});

export function defineChapter(definition) {
  return (material) => {
    const { tasks, ...metadata } = definition;
    return {
      required: true,
      ...metadata,
      revision: definition.revision ?? 1,
      tasks: (typeof tasks === "function" ? tasks(material) : tasks).map((task) => ({
        revision: 1,
        required: true,
        xp: task.type === "portfolio" ? 30 : 40,
        ...task,
      })),
    };
  };
}

// Explicit adaptation: the adapter returns the complete resulting chapter.
export const adaptChapter = (base, adapter) => (material) =>
  adapter(base(material), material);
