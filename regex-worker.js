self.onmessage = ({ data }) => {
  try {
    const { pattern, corpus, replacement, type } = data;
    if (
      typeof pattern !== "string" ||
      !pattern ||
      pattern.length > 300 ||
      typeof corpus !== "string" ||
      corpus.length > 20000
    )
      throw new Error("Шаблон має містити 1–300 символів; текст — до 20 000.");
    const regex = new RegExp(pattern, "gu");
    const matches = Array.from(corpus.matchAll(regex), (m) => ({
      text: m[0],
      index: m.index,
    }));
    if (matches.some((m) => m.text === ""))
      throw new Error(
        "Шаблон дає порожні збіги. Уточніть його, щоб виділяти мовні форми.",
      );
    const output =
      type === "replace"
        ? corpus.replace(
            regex,
            String(replacement ?? "")
              .replaceAll("\\t", "\t")
              .replaceAll("\\n", "\n"),
          )
        : null;
    self.postMessage({ matches, output });
  } catch (error) {
    self.postMessage({ error: "Помилка regex: " + error.message });
  }
};
