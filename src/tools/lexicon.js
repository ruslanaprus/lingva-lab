import { onlyKeys, text } from "../shared/values.js";

export const POS_TAGS = {
  ADP: "прийменник або післяйменник",
  AUX: "допоміжне дієслово",
  CCONJ: "сурядний сполучник",
  DET: "детермінатив",
  INTJ: "вигук",
  NOUN: "іменник",
  PROPN: "власна назва",
  VERB: "дієслово",
  ADJ: "прикметник",
  ADV: "прислівник",
  NUM: "числівник",
  PART: "частка",
  PRON: "займенник",
  SCONJ: "підрядний сполучник",
  PUNCT: "розділовий знак",
  SYM: "символ",
  X: "інше – поясніть у примітці",
};
export const RELATIONS = {
  "": "без зв’язку",
  synonym: "синонімічне значення",
  antonym: "протилежне значення",
  hypernym: "ширше поняття",
  hyponym: "конкретніший різновид",
  related: "тематичний зв’язок",
};
export const ENTRY_LIMITS = {
  lemma: 80,
  definition: 160,
  example: 180,
  usage: 100,
  source: 180,
  locator: 100,
  group: 32,
  note: 150,
};
const keys = ["id", "pos", "relation", "target", ...Object.keys(ENTRY_LIMITS)];
const identifier = (s) => typeof s === "string" && /^S[1-9]\d{0,3}$/u.test(s);

export function blankEntry(id) {
  return {
    id,
    pos: "",
    relation: "",
    target: "",
    ...Object.fromEntries(Object.keys(ENTRY_LIMITS).map((k) => [k, ""])),
  };
}

export function newLexicon(language) {
  if (!["de", "fr", "en"].includes(language))
    throw new Error("Невідома мова словника.");
  return {
    format: "lingva-lexicon",
    version: 1,
    language,
    title: "",
    purpose: "",
    nextId: 2,
    entries: [blankEntry("S1")],
  };
}

// Strict bounded parsing: a restored portfolio method is untrusted text.
export function readLexicon(raw, language) {
  if (typeof raw !== "string" || raw.length > 15000) return null;
  try {
    const d = JSON.parse(raw);
    if (
      !onlyKeys(d, [
        "format",
        "version",
        "language",
        "title",
        "purpose",
        "nextId",
        "entries",
      ]) ||
      d.format !== "lingva-lexicon" ||
      d.version !== 1 ||
      d.language !== language ||
      !["de", "fr", "en"].includes(d.language) ||
      !text(d.title, 100) ||
      !text(d.purpose, 200) ||
      !Number.isSafeInteger(d.nextId) ||
      d.nextId < 1 ||
      d.nextId > 9999 ||
      !Array.isArray(d.entries) ||
      d.entries.length > 8
    )
      return null;
    const ids = new Set();
    for (const e of d.entries) {
      if (
        !onlyKeys(e, keys) ||
        !identifier(e.id) ||
        ids.has(e.id) ||
        Number(e.id.slice(1)) >= d.nextId ||
        !["", ...Object.keys(POS_TAGS)].includes(e.pos) ||
        !Object.hasOwn(RELATIONS, e.relation) ||
        !(e.target === "" || identifier(e.target)) ||
        Object.entries(ENTRY_LIMITS).some(([k, limit]) => !text(e[k], limit))
      )
        return null;
      ids.add(e.id);
    }
    return d;
  } catch {
    return null;
  }
}

export function serializeLexicon(d) {
  const raw = JSON.stringify(d, null, 2);
  if (!readLexicon(raw, d.language))
    throw new Error("Чернетка перевищує межі або має невідому структуру.");
  return raw;
}

export function addEntry(d) {
  if (d.entries.length >= 8 || d.nextId >= 9999)
    throw new Error("У цій майстерні можна мати до 8 значень.");
  const result = structuredClone(d);
  result.entries.push(blankEntry(`S${result.nextId++}`));
  return result;
}

export function inspectLexicon(d) {
  const issues = [];
  if (!d.title.trim() || !d.purpose.trim())
    issues.push("Додайте назву, аудиторію та мету словника.");
  if (d.entries.length < 5) issues.push("Для проєкту потрібно 5–8 записів значень.");
  const ids = new Set(d.entries.map((e) => e.id));
  for (const e of d.entries) {
    const missing = [
      "lemma",
      "pos",
      "definition",
      "example",
      "source",
      "locator",
    ].filter((k) => !e[k].trim());
    if (missing.length)
      issues.push(
        `${e.id}: заповніть лему, POS, тлумачення, приклад, джерело й локатор.`,
      );
    if (e.pos === "X" && !e.note.trim())
      issues.push(`${e.id}: поясніть вибір X у примітці й зазначте межу аналізу.`);
    if (e.relation && (!ids.has(e.target) || e.target === e.id))
      issues.push(`${e.id}: зв’язок має вести до іншого наявного ID.`);
    if (!e.relation && e.target)
      issues.push(`${e.id}: оберіть тип зв’язку або приберіть ціль.`);
    if (
      e.group &&
      d.entries.some(
        (other) => other.id !== e.id && other.group === e.group && other.pos !== e.pos,
      )
    )
      issues.push(`${e.id}: у навчальній групі DEMO використовуйте одну частину мови.`);
  }
  if (!d.entries.some((e) => e.relation && ids.has(e.target) && e.target !== e.id))
    issues.push("Додайте один обґрунтований зв’язок між конкретними значеннями.");
  const repeated = d.entries.some((e, i) =>
    d.entries.some(
      (other, j) =>
        j < i &&
        e.lemma.trim().normalize("NFC") === other.lemma.trim().normalize("NFC") &&
        e.definition.trim() !== other.definition.trim(),
    ),
  );
  if (!repeated)
    issues.push("Розділіть хоча б два різні значення одного написання на окремі ID.");
  return [...new Set(issues)];
}

export function lexiconText(d) {
  return [
    `${d.title || "Чернетка мінісловника"}\nМова: ${d.language}\nМета й аудиторія: ${d.purpose}\nЛокальні ID та групи DEMO не є офіційними синсетами.`,
    ...d.entries.map(
      (e) =>
        `${e.id} | ${e.lemma}\nPOS: ${e.pos}\nЗначення: ${e.definition}\nПриклад: ${e.example}\nВживання: ${e.usage}\nДжерело: ${e.source}\nЛокатор: ${e.locator}\nГрупа DEMO: ${e.group}\nЗв’язок: ${RELATIONS[e.relation]}${e.target ? " → " + e.target : ""}\nПримітка: ${e.note}`,
    ),
  ].join("\n\n");
}
