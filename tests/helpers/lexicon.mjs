import { LANGUAGES } from "../../content/registry.js";
import { newLexicon, addEntry, serializeLexicon } from "../../src/tools/lexicon.js";

export function lexiconFixture(language) {
  const d = LANGUAGES[language].dictionaries,
    x = d.lexical;
  let model = newLexicon(language);
  while (model.entries.length < 5) model = addEntry(model);
  model.title = "Навчальний мінісловник виставки";
  model.purpose =
    "Для першокурсників: пояснити вибрані значення й зберегти локатори. Режим: авторські навчальні картки, живого пошуку не виконано.";
  const definitions = [
    d.other,
    d.target,
    x.definition,
    x.definition,
    "Ширший клас транспортних засобів.",
  ];
  const lemmas = [d.headword, d.headword, x.noun, x.synonym, x.broader];
  model.entries.forEach((entry, i) =>
    Object.assign(entry, {
      lemma: lemmas[i],
      pos: "NOUN",
      definition: definitions[i],
      example: i === 0 ? d.otherContext : i === 1 ? d.context : x.example,
      source:
        "Авторські навчальні матеріали розділу 8; це не реальна словникова стаття.",
      locator: i < 2 ? `E1 / А${i + 1}` : "Вправа про синсети, навчальна схема DEMO-1",
    }),
  );
  Object.assign(model.entries[2], {
    relation: "synonym",
    target: "S4",
    group: "DEMO-1",
  });
  Object.assign(model.entries[3], {
    relation: "hypernym",
    target: "S5",
    group: "DEMO-1",
    usage: x.synonymNote.slice(0, 100),
  });
  return model;
}

export const lexiconMethod = (language) => serializeLexicon(lexiconFixture(language));

export async function fillLexicon(article, model) {
  await article.locator('[data-lexicon-meta="title"]').fill(model.title);
  await article.locator('[data-lexicon-meta="purpose"]').fill(model.purpose);
  while ((await article.locator("[data-lexicon-entry]").count()) < model.entries.length)
    await article.locator('[data-lexicon-action="add"]').click();
  for (const entry of model.entries) {
    const row = article.locator(`[data-lexicon-entry="${entry.id}"]`);
    for (const [key, value] of Object.entries(entry)) {
      if (key === "id") continue;
      const input = row.locator(`[data-lexicon-field="${key}"]`);
      if (["pos", "relation", "target"].includes(key)) await input.selectOption(value);
      else await input.fill(value);
    }
  }
}
