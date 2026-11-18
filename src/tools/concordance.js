import {
  validateConcordance,
  CONCORDANCE_CHOICES as SEARCH_CHOICES,
} from "../../content/shared/concordance-data.js";

export { SEARCH_CHOICES };
export function searchSettings(defaults, options = {}) {
  const settings = {
    ...defaults,
    ...Object.fromEntries(
      Object.keys(defaults)
        .filter((k) => Object.hasOwn(options, k))
        .map((k) => [k, options[k]]),
    ),
  };
  for (const [key, choices] of Object.entries(SEARCH_CHOICES))
    if (!choices.includes(settings[key]))
      throw new Error("Оберіть доступні параметри пошуку.");
  if (typeof settings.query !== "string" || settings.query.length > 80)
    throw new Error("Запит має містити від 1 до 80 символів.");
  settings.query = settings.query.trim().normalize("NFC");
  if (!settings.query || !/^[\p{L}\p{M}\p{N}'’ʼ-]+$/u.test(settings.query))
    throw new Error(
      "Уведіть одне слово або частину слова. У цій панелі запит є буквальним, без зірочок чи інших шаблонів.",
    );
  if (
    typeof settings.caseSensitive !== "boolean" ||
    ![1, 3, 6].includes(Number(settings.window))
  )
    throw new Error("Перевірте регістр і ширину контексту.");
  settings.window = Number(settings.window);
  return settings;
}
export function searchConcordance(dataset, options = {}) {
  validateConcordance(dataset);
  const settings = searchSettings(dataset.defaults, options);
  const normalize = (value) =>
    settings.caseSensitive
      ? value.normalize("NFC")
      : value.normalize("NFC").toLocaleLowerCase(dataset.language);
  const query = normalize(settings.query),
    rows = [];
  const documents = dataset.documents.filter(
    (d) =>
      dataset.corpora[settings.corpus].documentIds.includes(d.id) &&
      (settings.genre === "all" || d.genre === settings.genre) &&
      (settings.year === "all" || d.year === settings.year),
  );
  for (const document of documents)
    for (const [index, token] of document.tokens.entries()) {
      if (settings.pos !== "all" && token.pos !== settings.pos) continue;
      const value = settings.mode === "lemma" ? token.lemma : token.form;
      if (value === null) continue;
      const target = normalize(value);
      if (!(settings.mode === "substring" ? target.includes(query) : target === query))
        continue;
      const leftTokens = document.tokens.slice(
          Math.max(0, index - settings.window),
          index,
        ),
        rightTokens = document.tokens.slice(index + 1, index + 1 + settings.window);
      const left = leftTokens.length
        ? document.text.slice(leftTokens[0].start, token.start).trim()
        : "";
      const right = rightTokens.length
        ? document.text.slice(token.end, rightTokens.at(-1).end).trim()
        : "";
      rows.push({
        id: `${document.id}:${token.id}`,
        documentId: document.id,
        tokenId: token.id,
        form: token.form,
        lemma: token.lemma,
        pos: token.pos,
        left,
        right,
        start: token.start,
        end: token.end,
        leftSort: leftTokens
          .toReversed()
          .map((t) => t.form)
          .join(" "),
        rightSort: rightTokens.map((t) => t.form).join(" "),
      });
    }
  rows.sort((a, b) => {
    if (settings.sort !== "document") {
      const field = settings.sort === "left" ? "leftSort" : "rightSort";
      const compared = a[field].localeCompare(b[field], dataset.language, {
        sensitivity: "base",
      });
      if (compared) return compared;
    }
    return a.documentId.localeCompare(b.documentId) || a.tokenId - b.tokenId;
  });
  return {
    datasetId: dataset.id,
    version: dataset.version,
    settings,
    rows,
    hitCount: rows.length,
    documentCount: new Set(rows.map((r) => r.documentId)).size,
    searchedDocuments: documents.length,
    searchedWords: documents.reduce(
      (n, d) => n + d.tokens.filter((t) => /\p{L}/u.test(t.form)).length,
      0,
    ),
  };
}
export function concordanceText(dataset, result) {
  const s = result.settings;
  return `${dataset.title}\nНабір: ${result.datasetId}; версія: ${result.version}\nАвторські навчальні тексти й часткова ручна розмітка.\nЗапит: ${s.query}\nТип: ${s.mode}; регістр: ${s.caseSensitive ? "враховано" : "не враховано"}; корпус: ${s.corpus} (${dataset.corpora[s.corpus].label})\nЖанр: ${s.genre}; рік: ${s.year}; POS: ${s.pos}; контекст: ${s.window}; порядок: ${s.sort}\nПереглянуто документів: ${result.searchedDocuments}; збігів: ${result.hitCount}; документів зі збігами: ${result.documentCount}\nСлів у добірці: ${result.searchedWords} (токени з літерами; без пунктуації та окремих чисел).\nЕкспортовано всі результати поточного пошуку.\n\n${result.rows
    .map((r) => {
      const d = dataset.documents.find((d) => d.id === r.documentId);
      return `${r.id} | ${d.genre} | ${d.year} | ${d.source} | ${d.topic}\n${r.left} [${r.form}] ${r.right}\nЛема: ${r.lemma ?? "не визначено"}; POS: ${r.pos ?? "не визначено"}\nПовний контекст: ${d.text}`;
    })
    .join("\n\n")}\n`;
}
