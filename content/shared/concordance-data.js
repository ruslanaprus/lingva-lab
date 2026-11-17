// Shared teaching-data preparation: no page, storage or answer-checker dependencies.
export const CONCORDANCE_CHOICES = {
  mode: ["word", "lemma", "substring"],
  corpus: ["all", "notices2025"],
  genre: ["all", "notice", "guide", "interview"],
  year: ["all", "2024", "2025"],
  pos: ["all", "NOUN", "VERB", "PART", "ADV", "ADJ"],
  sort: ["document", "left", "right"],
};
export const CONCORDANCE_POS = {
  NOUN: "іменник",
  VERB: "дієслово",
  PART: "частка",
  ADV: "прислівник",
  ADJ: "прикметник",
};
export function tokenizeConcordance(text) {
  return [...text.matchAll(/[\p{L}\p{M}]+(?:['’ʼ-][\p{L}\p{M}]+)*|\d+|[^\s]/gu)].map(
    (m, i) => ({
      id: i + 1,
      form: m[0],
      start: m.index,
      end: m.index + m[0].length,
      lemma: null,
      pos: null,
    }),
  );
}
export function prepareConcordance(material) {
  const genres = [
    "notice",
    "notice",
    "guide",
    "interview",
    "notice",
    "guide",
    "notice",
    "interview",
    "guide",
    "notice",
    "interview",
    "notice",
  ];
  const titles = [
    "Оголошення бібліотеки",
    "Запрошення клубу",
    "Інструкція до форми",
    "Розмова про старий анонс",
    "Торішнє оголошення",
    "Пояснення службового терміна",
    "Прохання організаторів",
    "Інтерв’ю з іншим значенням",
    "Підсумок консультації",
    "Повідомлення координаторки",
    "Два вживання в одній розмові",
    "Прохання іншими словами",
  ];
  const documents = Object.entries(material.documents).map(([id, d]) => {
    const index = Number(id.slice(1)) - 1,
      tokens = tokenizeConcordance(d.text);
    const used = new Set();
    for (const a of d.annotations) {
      const token = tokens.filter((t) => t.form === a.form)[(a.occurrence ?? 1) - 1];
      if (!token || used.has(token.id))
        throw new Error(`Invalid concordance annotation: ${id}/${a.form}`);
      used.add(token.id);
      token.lemma = a.lemma;
      token.pos = a.pos;
    }
    return {
      id,
      title: titles[index],
      genre: genres[index],
      year: ["C05", "C08"].includes(id) ? "2024" : "2025",
      source: `S${(index % 3) + 1}`,
      text: d.text,
      tokens,
    };
  });
  return {
    id: `concordance-${material.code}`,
    version: 1,
    language: material.code,
    title: `Навчальний корпус / ${material.name}`,
    documents,
    defaults: {
      query: material.word,
      mode: "word",
      caseSensitive: false,
      corpus: "all",
      genre: "all",
      year: "all",
      pos: "all",
      window: 3,
      sort: "document",
    },
    presets: {
      initial: { query: material.word, mode: "word" },
      fragment: { query: material.fragment, mode: "substring" },
      exact: { query: material.word, mode: "word" },
      case: { query: material.word, mode: "word", caseSensitive: true },
      lemma: { query: material.lemma, mode: "lemma" },
      filtered: { query: material.lemma, mode: "lemma", genre: "notice", year: "2025" },
      pos: { query: material.lemma, mode: "lemma", pos: "VERB" },
      narrow: { query: material.word, mode: "word", window: 1 },
      empty: {
        query: material.word,
        mode: "word",
        genre: "notice",
        year: "2024",
        pos: "VERB",
      },
    },
  };
}
export function validateConcordance(data) {
  if (
    !data ||
    typeof data.id !== "string" ||
    !/^[a-z][a-z0-9-]+$/.test(data.id) ||
    !Number.isSafeInteger(data.version) ||
    data.version < 1 ||
    !["de", "fr", "en"].includes(data.language) ||
    typeof data.title !== "string" ||
    !Array.isArray(data.documents) ||
    !data.documents.length ||
    data.documents.length > 30
  )
    throw new Error("Invalid concordance dataset");
  const ids = new Set();
  for (const d of data.documents) {
    if (
      !/^C\d{2}$/.test(d.id) ||
      ids.has(d.id) ||
      !["notice", "guide", "interview"].includes(d.genre) ||
      !/^\d{4}$/.test(d.year) ||
      typeof d.title !== "string" ||
      typeof d.source !== "string" ||
      typeof d.text !== "string" ||
      !d.text.length ||
      d.text.length > 5000 ||
      !Array.isArray(d.tokens) ||
      !d.tokens.length ||
      d.tokens.length > 500
    )
      throw new Error("Invalid concordance document");
    ids.add(d.id);
    const expected = tokenizeConcordance(d.text);
    if (expected.length !== d.tokens.length)
      throw new Error("Invalid concordance token count");
    d.tokens.forEach((t, i) => {
      if (
        t.id !== i + 1 ||
        t.form !== expected[i].form ||
        t.start !== expected[i].start ||
        t.end !== expected[i].end ||
        (t.lemma !== null &&
          (typeof t.lemma !== "string" || !t.lemma.length || t.lemma.length > 80)) ||
        (t.pos !== null && !Object.hasOwn(CONCORDANCE_POS, t.pos))
      )
        throw new Error("Invalid concordance token");
    });
  }
  if (
    !data.defaults ||
    typeof data.defaults.query !== "string" ||
    !data.presets ||
    !Object.keys(data.presets).length
  )
    throw new Error("Missing concordance defaults");
  for (const settings of [
    data.defaults,
    ...Object.values(data.presets).map((p) => ({ ...data.defaults, ...p })),
  ]) {
    for (const [key, values] of Object.entries(CONCORDANCE_CHOICES))
      if (!values.includes(settings[key]))
        throw new Error("Invalid concordance search setting");
    if (
      typeof settings.query !== "string" ||
      !settings.query.trim() ||
      !/^[\p{L}\p{M}\p{N}'’ʼ-]+$/u.test(settings.query.trim().normalize("NFC")) ||
      settings.query.length > 80 ||
      typeof settings.caseSensitive !== "boolean" ||
      ![1, 3, 6].includes(settings.window)
    )
      throw new Error("Invalid concordance search defaults");
  }
  return data;
}
