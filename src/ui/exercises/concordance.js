import { esc } from "../../shared/format.js";
import { searchConcordance, concordanceText } from "../../tools/concordance.js";
import { CONCORDANCE_POS } from "../../../content/shared/concordance-data.js";

const GENRES = {
  notice: "анонс",
  guide: "інструкція",
  interview: "інтерв’ю",
  forum: "студентське обговорення",
};
const MODES = {
  word: "Словоформа (word)",
  lemma: "Лема (lemma)",
  substring: "Частина слова",
};
const SORTS = {
  document: "За документом",
  left: "За лівим контекстом",
  right: "За правим контекстом",
};
const optionList = (items, current) =>
  Object.entries(items)
    .map(
      ([value, label]) =>
        `<option value="${esc(value)}" ${String(current) === value ? "selected" : ""}>${esc(label)}</option>`,
    )
    .join("");
const select = (label, name, items, current) =>
  `<label><span class="input-label">${label}</span><select name="${name}">${optionList(items, current)}</select></label>`;
const settingsText = (s, dataset) =>
  `${MODES[s.mode]}; «${s.query}»; регістр ${s.caseSensitive ? "враховано" : "не враховано"}; ${dataset.corpora[s.corpus].label}; жанр: ${GENRES[s.genre] || "усі"}; рік: ${s.year === "all" ? "усі" : s.year}; POS: ${s.pos}; вікно: ${s.window}; ${SORTS[s.sort]}`;
function markedText(d, row) {
  if (!row) return esc(d.text);
  return (
    esc(d.text.slice(0, row.start)) +
    `<mark>${esc(d.text.slice(row.start, row.end))}</mark>` +
    esc(d.text.slice(row.end))
  );
}
function detail(entry) {
  const row = entry.result.rows.find((r) => r.id === entry.openRow);
  const doc = entry.dataset.documents.find(
    (d) => d.id === (row?.documentId || entry.openDocument),
  );
  if (!doc) return "";
  return `<section class="concordance-detail" aria-labelledby="concordance-source-title" tabindex="-1"><p class="mono orange">4 / ПОВНИЙ КОНТЕКСТ</p><h3 id="concordance-source-title">${esc(doc.id)} · ${esc(doc.title)}</h3><p class="micro">${esc(GENRES[doc.genre])} · ${doc.year} · ${esc(doc.source)} · тема: ${esc(doc.topic)} · ${esc(entry.dataset.language.toUpperCase())} · авторський приклад</p><p class="concordance-source" lang="${entry.dataset.language}">${markedText(doc, row)}</p>${row ? `<p class="micro">Збіг ${esc(row.id)} · форма в тексті: <b>${esc(row.form)}</b> · записана лема: ${esc(row.lemma ?? "не визначено")} · POS: ${esc(row.pos ?? "не визначено")}</p>` : ""}<p class="micro muted">Розмітка тут часткова й навчальна. У C10 є навмисна помилка POS: звіряйте позначку з функцією слова в реченні.</p><button type="button" class="button small" data-conc-action="close">Закрити контекст</button></section>`;
}
function results(entry) {
  const r = entry.result,
    start = entry.page * 5,
    page = r.rows.slice(start, start + 5),
    s = r.settings;
  return `<div data-conc-results><div class="concordance-results-head"><div><p class="mono orange">3 / КОНКОРДАНС · KWIC</p><h3>Збігів: <span data-conc-count>${r.hitCount}</span> · документів: <span data-conc-doc-count>${r.documentCount}</span></h3></div><button type="button" class="button small" data-conc-action="export">Усі результати TXT ↓</button></div><p class="micro concordance-applied" data-conc-applied>Виконаний пошук: ${esc(settingsText(s, entry.dataset))}. Переглянуто документів: ${r.searchedDocuments}; слів: ${r.searchedWords}.</p><div class="kwic-head mono" aria-hidden="true"><span>ЛІВИЙ КОНТЕКСТ</span><span>ЗБІГ</span><span>ПРАВИЙ КОНТЕКСТ</span></div>${
    r.rows.length
      ? `<ol class="kwic-list" aria-label="Конкордансні рядки" start="${start + 1}">${page
          .map((row) => {
            const d = entry.dataset.documents.find((d) => d.id === row.documentId);
            return `<li class="kwic-item" data-conc-row="${esc(row.id)}"><div class="kwic-line" lang="${entry.dataset.language}"><span class="kwic-left">${esc(row.left) || "∅"}</span><button type="button" class="kwic-hit" data-conc-open="${esc(row.id)}" aria-label="Розгорнути контекст ${esc(row.id)}: ${esc(row.form)}">${esc(row.form)}</button><span class="kwic-right">${esc(row.right) || "∅"}</span></div><p class="kwic-meta micro"><button type="button" data-conc-document="${d.id}">${d.id} · ${esc(d.title)}</button><span>${esc(GENRES[d.genre])} · ${d.year} · ${esc(d.source)} · ${esc(d.topic)}</span><span>lemma: ${esc(row.lemma ?? "?")} · POS: ${esc(row.pos ?? "?")}</span></p></li>`;
          })
          .join("")}</ol>`
      : '<p class="concordance-empty" data-conc-empty>Збігів немає. Перевірте корпус, фільтри, тип запиту, регістр і написання; нуль збігів ще не доводить, що явища немає в мові.</p>'
  }<div class="concordance-pager"><button type="button" class="button small" data-conc-action="previous" ${start === 0 ? "disabled" : ""}>← Попередні</button><span class="micro" data-conc-page>${r.hitCount ? `Рядки ${start + 1}–${Math.min(start + 5, r.hitCount)} з ${r.hitCount}` : "Рядків: 0"}</span><button type="button" class="button small" data-conc-action="next" ${start + 5 >= r.hitCount ? "disabled" : ""}>Наступні →</button></div>${detail(entry)}${comparison(entry)}</div>`;
}
function comparison(entry) {
  const note =
    '<p class="micro muted">Кількість слів тут – токени з літерами, без пунктуації та окремих чисел. Рівна кількість документів не означає рівного обсягу. Порівнюйте значення й функції у повних текстах; самі числа ще не показують, наскільки ці вживання типові для жанру.</p>';
  const card = (r, label) =>
    `<article><h4>${label}</h4><p class="micro">${esc(settingsText(r.settings, entry.dataset))}</p><p><b>${r.hitCount}</b> збігів у <b>${r.documentCount}</b> документах · переглянуто ${r.searchedDocuments} документів / ${r.searchedWords} слів</p><ul>${
      r.rows
        .slice(0, 3)
        .map(
          (row) =>
            `<li lang="${entry.dataset.language}">${esc(row.left)} <mark>${esc(row.form)}</mark> ${esc(row.right)} <button type="button" data-conc-document="${row.documentId}">${row.documentId} · відкрити текст</button></li>`,
        )
        .join("") || "<li>Немає збігів за цими умовами.</li>"
    }</ul><p class="micro">Тут показано до трьох рядків. Щоб зберегти всі результати обох пошуків, натисніть «Обидва пошуки TXT».</p></article>`;
  return `<section class="concordance-comparison" aria-label="Порівняння пошуків"><h3>Порівняйте два пошуки</h3><p>Збережіть виконаний пошук як А. Потім змініть корпус або один інший параметр і натисніть «Знайти»: результат Б з’явиться поруч. Збережений пошук А не змінюється, доки ви не заміните його поточним. Після перезавантаження сторінки порівняння зникне. Щоб зберегти результати, завантажте TXT.</p><button type="button" class="button small" data-conc-action="pin">${entry.pinned ? "Замінити А поточним пошуком" : "Зберегти виконаний пошук як А"}</button>${entry.pinned ? `<div class="concordance-compare-grid" data-conc-comparison>${card(entry.pinned, "А / Збережений пошук")}${card(entry.result, "Б / Останній виконаний пошук")}</div><div class="concordance-buttons"><button type="button" class="button small" data-conc-action="export-comparison">Обидва пошуки TXT ↓</button><button type="button" class="button small" data-conc-action="unpin">Очистити порівняння</button></div>` : ""}${note}</section>`;
}
function body(entry) {
  const d = entry.draft;
  return `<header><p class="mono orange">ВІД ЗАПИТУ ДО СВІДЧЕННЯ</p><h2>Лабораторія конкордансу</h2><p>Навчальна панель за принципами NoSketch Engine. Оберіть параметри, знайдіть рядки й натисніть виділене слово, щоб прочитати повний контекст.</p><p class="micro muted">${esc(entry.dataset.title)} · версія ${entry.dataset.version} · Авторських текстів: ${entry.dataset.documents.length}. Часткову розмітку додано вручну. Пошук у панелі не надсилає відповіді на вправи й не нараховує XP.</p></header><details class="concordance-ideas"><summary>Що можна дослідити в довших текстах?</summary><p>Порівняйте значення «${esc(entry.dataset.presets.researchBoth.query)}», контексти аудіозаписів або спосіб говорити про можливість і дозвіл. Кнопка заповнює параметри; після цього натисніть «Знайти». Для будь-якого іншого слова з текстів використайте режим «Словоформа»: усі слова доступні для буквального пошуку, але леми й POS задано лише для вибраних слів.</p><div class="concordance-buttons"><button type="button" class="button small" data-concordance-preset="researchBoth">Значення: ${esc(entry.dataset.presets.researchBoth.query)}</button><button type="button" class="button small" data-concordance-preset="researchAudio">Записи: ${esc(entry.dataset.presets.researchAudio.query)}</button><button type="button" class="button small" data-concordance-preset="researchModal">Можливість: ${esc(entry.dataset.presets.researchModal.query)}</button></div><p>Щоб порівняти жанри, оберіть А та Б: вони містять тексти на ті самі теми. У цих авторських текстах можна перевірити гіпотезу; висновок про реальне мовлення потребує іншого матеріалу.</p></details><ol class="concordance-route" aria-label="Як читати інтерфейс"><li><b>1</b> Оберіть корпус і запит</li><li><b>2</b> Перевірте параметри</li><li><b>3</b> Читайте KWIC</li><li><b>4</b> Розгорніть джерело</li></ol><form data-concordance-form><div class="concordance-fields">${select("1 / Корпус", "corpus", Object.fromEntries(Object.entries(entry.dataset.corpora).map(([id, c]) => [id, c.label])), d.corpus)}${select("Тип запиту", "mode", MODES, d.mode)}<label class="concordance-query"><span class="input-label">Слово для пошуку</span><input type="text" name="query" value="${esc(d.query)}" maxlength="80" required spellcheck="false" autocapitalize="off" autocomplete="off"></label></div><p class="micro" data-conc-corpus-description>${esc(entry.dataset.corpora[d.corpus].description)}</p><fieldset class="concordance-options"><legend>2 / Параметри й фільтри</legend><label class="concordance-case"><input type="checkbox" name="caseSensitive" ${d.caseSensitive ? "checked" : ""}> Враховувати регістр (Case)</label><div class="concordance-fields">${select("Жанр", "genre", { all: "Усі жанри", ...GENRES }, d.genre)}${select("Рік публікації", "year", { all: "Усі роки", 2024: "2024", 2025: "2025" }, d.year)}${select("Частина мови (POS)", "pos", { all: "Усі / без фільтра", ...Object.fromEntries(Object.entries(CONCORDANCE_POS).map(([k, v]) => [k, `${k} – ${v}`])) }, d.pos)}${select("Контекст: токенів ліворуч і праворуч", "window", { 1: "1", 3: "3", 6: "6" }, d.window)}${select("Сортування рядків", "sort", SORTS, d.sort)}</div></fieldset><div class="concordance-buttons"><button type="submit" class="button dark">Знайти</button><button type="button" class="button small" data-conc-action="reset">Початковий приклад</button>${entry.returnTask ? '<button type="button" class="button small" data-conc-action="return">Повернутися до вправи ↓</button>' : ""}</div><p class="micro" data-conc-dirty role="status">${entry.dirty ? "Параметри змінено. Натисніть «Знайти»; нижче ще показано попередній пошук." : "Результати відповідають останньому виконаному запиту. Для нового запиту натисніть «Знайти»."}</p><p class="concordance-error" role="alert">${esc(entry.error || "")}</p></form><div data-conc-output>${results(entry)}</div><details class="concordance-catalog"><summary>Тексти корпусу й довідка про розмітку</summary><p>Словоформа – конкретне написання слова в тексті. Лема – базова форма, записана в розмітці. NOUN – іменник, VERB – дієслово, PART – частка, ADJ – прикметник. Знак ? означає відсутню розмітку. Лема й POS доступні лише для позначених слів; у C10 є навчальна помилка POS. Для інших слів використовуйте словоформу. Пунктуація теж займає позицію токена у вікні контексту.</p><p>Для дослідження: C13–C18 – університетські інструкції, C19–C24 – студентські обговорення на ті самі шість тем. У полі «Корпус» можна обрати А, Б або обидві добірки. Розгорніть тексти й порівняйте адресата, мету та значення слова.</p><ul>${entry.dataset.documents.map((doc) => `<li><button type="button" data-conc-document="${doc.id}">${doc.id} · ${esc(doc.title)}</button> <span class="micro">${esc(GENRES[doc.genre])} · ${doc.year} · ${doc.source}</span></li>`).join("")}</ul></details><details class="concordance-history"><summary>Останні пошуки (${entry.history.length})</summary><ol>${entry.history.map((r) => `<li><p class="micro">${esc(settingsText(r.settings, entry.dataset))} · збігів: ${r.hitCount}, документів: ${r.documentCount}</p></li>`).join("")}</ol></details>`;
}
export function createConcordanceWorkbench({ download }) {
  const entries = new Map();
  const entryFor = (root) => entries.get(root?.dataset.concordance);
  const redraw = (root, entry) => {
    root.innerHTML = body(entry);
  };
  const readDraft = (form) => {
    const values = new FormData(form);
    return Object.fromEntries(
      ["query", "mode", "corpus", "genre", "year", "pos", "window", "sort"]
        .map((k) => [k, values.get(k)])
        .concat([["caseSensitive", form.elements.caseSensitive.checked]]),
    );
  };
  function render(dataset, key) {
    if (!dataset) return "";
    if (!entries.has(key) || entries.get(key).dataset.version !== dataset.version) {
      const result = searchConcordance(dataset);
      entries.set(key, {
        dataset,
        draft: { ...result.settings },
        result,
        history: [result],
        page: 0,
        dirty: false,
      });
    }
    return `<section id="concordance-simulator" class="concordance-workbench" data-concordance="${esc(key)}" tabindex="-1">${body(entries.get(key))}</section>`;
  }
  function input(target) {
    const form = target.closest("[data-concordance-form]");
    if (!form) return;
    const root = form.closest("[data-concordance]"),
      entry = entryFor(root);
    entry.draft = readDraft(form);
    entry.dirty = true;
    root.querySelector("[data-conc-corpus-description]").textContent =
      entry.dataset.corpora[entry.draft.corpus].description;
    root.querySelector("[data-conc-dirty]").textContent =
      "Параметри змінено. Натисніть «Знайти»; нижче ще показано попередній пошук.";
  }
  function submit(form) {
    if (!form.matches("[data-concordance-form]")) return false;
    const root = form.closest("[data-concordance]"),
      entry = entryFor(root);
    entry.draft = readDraft(form);
    try {
      entry.result = searchConcordance(entry.dataset, entry.draft);
      entry.draft = { ...entry.result.settings };
      entry.history = [entry.result, ...entry.history].slice(0, 5);
      entry.page = 0;
      entry.openRow = null;
      entry.openDocument = null;
      entry.dirty = false;
      entry.error = "";
    } catch (error) {
      entry.error = error.message;
      entry.dirty = true;
    }
    redraw(root, entry);
    if (!entry.error)
      root.querySelector("[data-conc-output]").setAttribute("tabindex", "-1");
    root
      .querySelector(entry.error ? '[name="query"]' : "[data-conc-output]")
      .focus({ preventScroll: true });
    return true;
  }
  function click(button) {
    const preset = button.dataset.concordancePreset;
    const root = preset
      ? document.querySelector("[data-concordance]")
      : button.closest("[data-concordance]");
    if (!root) return false;
    const entry = entryFor(root);
    if (preset) {
      if (!Object.hasOwn(entry.dataset.presets, preset)) return false;
      entry.draft = { ...entry.dataset.defaults, ...entry.dataset.presets[preset] };
      entry.dirty = true;
      entry.error = "";
      entry.returnTask = button.closest("[data-task]")?.dataset.task;
      redraw(root, entry);
      root.scrollIntoView({ block: "start", behavior: "instant" });
      root.querySelector('[name="query"]').focus({ preventScroll: true });
      return true;
    }
    if (button.dataset.concOpen || button.dataset.concDocument) {
      entry.openRow = button.dataset.concOpen || null;
      entry.openDocument = button.dataset.concDocument || null;
      const output = root.querySelector("[data-conc-output]");
      output.innerHTML = results(entry);
      const panel = root.querySelector(".concordance-detail");
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({ block: "nearest", behavior: "instant" });
      return true;
    }
    const action = button.dataset.concAction;
    if (!action) return false;
    if (action === "pin" || action === "unpin") {
      entry.pinned = action === "pin" ? entry.result : null;
      root.querySelector("[data-conc-output]").innerHTML = results(entry);
      root.querySelector('[data-conc-action="pin"]').focus({ preventScroll: true });
    }
    if (action === "export-comparison" && entry.pinned)
      download(
        `concordance-comparison-${entry.dataset.language}-v${entry.dataset.version}.txt`,
        `А / ЗБЕРЕЖЕНИЙ ПОШУК\n${concordanceText(entry.dataset, entry.pinned)}\nБ / ОСТАННІЙ ВИКОНАНИЙ ПОШУК\n${concordanceText(entry.dataset, entry.result)}`,
        "text/plain;charset=utf-8",
      );
    if (action === "export")
      download(
        `concordance-${entry.dataset.language}-v${entry.dataset.version}.txt`,
        concordanceText(entry.dataset, entry.result),
        "text/plain;charset=utf-8",
      );
    if (action === "return") {
      const task = document.querySelector(`[data-task="${entry.returnTask}"]`);
      task?.setAttribute("tabindex", "-1");
      task?.focus({ preventScroll: true });
      task?.scrollIntoView({ block: "start", behavior: "instant" });
    }
    if (action === "previous" || action === "next") {
      entry.page = Math.max(
        0,
        Math.min(
          Math.ceil(entry.result.rows.length / 5) - 1,
          entry.page + (action === "next" ? 1 : -1),
        ),
      );
      entry.openRow = null;
      entry.openDocument = null;
      root.querySelector("[data-conc-output]").innerHTML = results(entry);
      const sameButton = root.querySelector(`[data-conc-action="${action}"]`);
      const focusButton = sameButton.disabled
        ? root.querySelector(
            `[data-conc-action="${action === "next" ? "previous" : "next"}"]`,
          )
        : sameButton;
      focusButton.focus({ preventScroll: true });
    }
    if (action === "close") {
      const row = entry.openRow;
      entry.openRow = null;
      entry.openDocument = null;
      root.querySelector("[data-conc-output]").innerHTML = results(entry);
      const focus = row
        ? root.querySelector(`[data-conc-open="${row}"]`)
        : root.querySelector(".concordance-catalog summary");
      focus?.focus({ preventScroll: true });
    }
    if (action === "reset") {
      const result = searchConcordance(entry.dataset);
      Object.assign(entry, {
        draft: { ...result.settings },
        result,
        history: [result],
        pinned: null,
        page: 0,
        dirty: false,
        error: "",
        openRow: null,
        openDocument: null,
      });
      redraw(root, entry);
      root.querySelector('[name="query"]').focus({ preventScroll: true });
    }
    return true;
  }
  return { render, input, submit, click };
}
