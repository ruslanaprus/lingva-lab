// Shared teaching-data preparation: no page, storage or answer-checker dependencies.
export const CONCORDANCE_CHOICES = {
  mode: ["word", "lemma", "substring"],
  corpus: ["training", "notices2025", "comparison", "office", "peer", "all"],
  genre: ["all", "notice", "guide", "interview", "forum"],
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
  const documents = Object.entries(material.documents)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, d]) => {
      const tokens = tokenizeConcordance(d.text);
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
        title: d.title,
        genre: d.genre,
        year: d.year,
        source: d.source,
        collection: d.collection,
        topic: d.topic,
        text: d.text,
        tokens,
      };
    });
  return {
    id: `concordance-${material.code}`,
    version: 2,
    language: material.code,
    title: `Навчальний корпус / ${material.name}`,
    documents,
    corpora: {
      training: {
        label: "Перші кроки: 12 коротких текстів",
        description: "C01–C12: приклади для опанування пошуку, фільтрів і контексту.",
        documentIds: documents
          .filter((d) => d.collection === "training")
          .map((d) => d.id),
      },
      notices2025: {
        label: "Перші кроки: анонси 2025 року",
        description: "Анонси 2025 року лише з початкового набору C01–C12.",
        documentIds: documents
          .filter(
            (d) =>
              d.collection === "training" && d.genre === "notice" && d.year === "2025",
          )
          .map((d) => d.id),
      },
      comparison: {
        label: "Дослідження: обидві добірки",
        description:
          "C13–C24: шість тем, кожна в університетській інструкції та студентському обговоренні. Теми в добірках ті самі, але довжина текстів різна.",
        documentIds: documents
          .filter((d) => d.collection !== "training")
          .map((d) => d.id),
      },
      office: {
        label: "А / Університетські інструкції",
        description:
          "C13–C18: шість авторських інструкцій. Адресат – учасники університетських занять; мета – пояснити правила й умови.",
        documentIds: documents
          .filter((d) => d.collection === "office")
          .map((d) => d.id),
      },
      peer: {
        label: "Б / Студентські обговорення",
        description:
          "C19–C24: шість авторських дописів на ті самі теми. Адресат – інші студенти; мета – обговорити досвід, сумнів або запитання.",
        documentIds: documents.filter((d) => d.collection === "peer").map((d) => d.id),
      },
      all: {
        label: "Усі тексти: навчання й дослідження",
        description:
          "Усі документи разом. Для жанрового порівняння обирайте А та Б окремо, щоб не додати короткі тренувальні приклади.",
        documentIds: documents.map((d) => d.id),
      },
    },
    defaults: {
      query: material.word,
      mode: "word",
      caseSensitive: false,
      corpus: "training",
      genre: "all",
      year: "all",
      pos: "all",
      window: 3,
      sort: "document",
    },
    presets: {
      researchOffice: {
        query: material.research.term,
        mode: "lemma",
        corpus: "office",
        window: 6,
      },
      researchPeer: {
        query: material.research.term,
        mode: "lemma",
        corpus: "peer",
        window: 6,
      },
      researchBoth: {
        query: material.research.term,
        mode: "lemma",
        corpus: "comparison",
        window: 6,
      },
      researchAudio: {
        query: material.research.audio,
        mode: "lemma",
        corpus: "comparison",
        window: 6,
      },
      researchModal: {
        query: material.research.modal,
        mode: "word",
        corpus: "comparison",
        window: 6,
      },
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
      !["notice", "guide", "interview", "forum"].includes(d.genre) ||
      !/^\d{4}$/.test(d.year) ||
      typeof d.title !== "string" ||
      typeof d.source !== "string" ||
      !["training", "office", "peer"].includes(d.collection) ||
      typeof d.topic !== "string" ||
      !d.topic.trim() ||
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
    !data.corpora ||
    Object.keys(data.corpora).length !== CONCORDANCE_CHOICES.corpus.length
  )
    throw new Error("Invalid concordance corpora");
  for (const id of CONCORDANCE_CHOICES.corpus) {
    const corpus = data.corpora[id];
    if (
      !corpus ||
      typeof corpus.label !== "string" ||
      !corpus.label.trim() ||
      typeof corpus.description !== "string" ||
      !Array.isArray(corpus.documentIds) ||
      !corpus.documentIds.length ||
      new Set(corpus.documentIds).size !== corpus.documentIds.length ||
      corpus.documentIds.some((id) => !ids.has(id))
    )
      throw new Error("Invalid concordance corpus membership");
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
