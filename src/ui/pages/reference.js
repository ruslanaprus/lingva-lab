import { GLOSSARY, SOURCES } from "../../../content/registry.js";
import { esc } from "../../shared/format.js";
import { $$, $ } from "../dom.js";
export function createReferenceView(context = {}) {
  function renderReference() {
    return `<div class="page"><div class="page-title"><div><p class="mono eyebrow">ТЕРМІНИ / МЕТОДИ / ПЕРШОДЖЕРЕЛА</p><h1>Розуміти,<br>що за <span class="orange">словом.</span></h1></div><p>Короткі означення — поруч. Докладні пояснення — у документації авторів інструментів і стандартів.</p></div><div class="reference-layout"><section><label class="sr-only" for="reference-search">Пошук терміна або означення</label><div class="reference-search"><input type="search" id="reference-search" placeholder="Знайти термін: Unicode, коміт, WER…" autocomplete="off"></div><div id="glossary-list">${GLOSSARY.map(([term, definition, key]) => `<article class="glossary-item" data-glossary="${esc((term + " " + definition).toLocaleLowerCase("uk"))}"><h2>${esc(term)}</h2><p>${esc(definition)}</p><a href="${SOURCES[key].url}" target="_blank" rel="noopener noreferrer">ПЕРШОДЖЕРЕЛО ↗</a></article>`).join("")}</div><p id="glossary-empty" class="no-results" hidden>Термін не знайдено. Спробуйте коротший запит.</p></section><aside class="reference-sources"><h2>Джерела для практики</h2>${Object.values(
      SOURCES,
    )
      .map(
        (s) =>
          `<article class="source-item"><a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p>${esc(s.note)}</p></article>`,
      )
      .join(
        "",
      )}<p class="local-notice">Навчальний маршрут складено за наданим документом «Digital Tools for Linguists Course outline» з урахуванням пізніших уточнень і лабораторних №1–3. Практичні тексти на сайті — авторські навчальні мініприклади, а не цитати з літературних корпусів.</p></aside></div></div>`;
  }

  function filterGlossary(query) {
    let visible = 0;
    $$("[data-glossary]").forEach((item) => {
      item.hidden = !item.dataset.glossary.includes(
        query.toLocaleLowerCase("uk").trim(),
      );
      if (!item.hidden) visible++;
    });
    $("#glossary-empty").hidden = visible > 0;
  }
  return { renderReference, filterGlossary };
}
