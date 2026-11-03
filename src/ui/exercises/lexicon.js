import {
  blankEntry,
  newLexicon,
  readLexicon,
  serializeLexicon,
  addEntry,
  inspectLexicon,
  lexiconText,
  POS_TAGS,
  RELATIONS,
  ENTRY_LIMITS,
} from "../../tools/lexicon.js";
import { esc } from "../../shared/format.js";
import { download } from "../download.js";

const labels = {
  lemma: "Лема",
  definition: "Одне значення: своїми словами",
  example: "Приклад із контекстом",
  usage: "Позначка вживання (якщо потрібна)",
  source: "Джерело або навчальна картка",
  locator: "Локатор: стаття, значення, картка",
  group: "Група DEMO (необов’язково)",
  note: "Примітка, сумнів або наступна перевірка",
};
const options = (values, current) =>
  Object.entries(values)
    .map(
      ([value, label]) =>
        `<option value="${esc(value)}" ${value === current ? "selected" : ""}>${esc(value ? value + " – " + label : label)}</option>`,
    )
    .join("");

export function renderDictionaryBuilder(raw, language) {
  const restored = raw ? readLexicon(raw, language) : null;
  if (raw && !restored)
    return `<section class="lexicon-builder" data-lexicon-builder data-language="${esc(language)}"><h3>Майстерня власного словника</h3><p>Текст чернетки має іншу структуру або мову. Він збережений у полі даних нижче. Завантажте його перед створенням нової чернетки.</p><button type="button" class="button small" data-lexicon-action="raw">Завантажити наявний текст ↓</button><button type="button" class="button small" data-lexicon-action="reset">Створити нову чернетку</button></section>`;
  const d = restored || newLexicon(language);
  return `<section class="lexicon-builder" data-lexicon-builder data-language="${esc(language)}" data-next-id="${d.nextId}"><h3>Майстерня власного словника</h3><p>Один запис – одне значення. Заповнюйте форму; дані зберігаються у вашій чернетці. Додавання запису й перевірка структури не нараховують XP.</p><div class="lexicon-fields"><label><span class="input-label">Назва словника</span><input type="text" data-lexicon-meta="title" maxlength="100" value="${esc(d.title)}"></label><label><span class="input-label">Для кого й навіщо: аудиторія, мета, принцип відбору</span><textarea data-lexicon-meta="purpose" maxlength="200">${"\n"}${esc(d.purpose)}</textarea></label></div><div class="lexicon-entries">${d.entries
    .map(
      (e) =>
        `<fieldset class="lexicon-entry" data-lexicon-entry="${e.id}"><legend>${e.id} – окреме значення</legend><div class="lexicon-fields">${Object.entries(
          ENTRY_LIMITS,
        )
          .map(
            ([key, limit]) =>
              `<label><span class="input-label">${labels[key]}</span><input type="text" data-lexicon-field="${key}" maxlength="${limit}" value="${esc(e[key])}"></label>`,
          )
          .join(
            "",
          )}<label><span class="input-label">Частина мови: POS</span><select data-lexicon-field="pos">${options({ "": "оберіть частину мови", ...POS_TAGS }, e.pos)}</select></label><label><span class="input-label">Тип зв’язку</span><select data-lexicon-field="relation">${options(RELATIONS, e.relation)}</select></label><label><span class="input-label">Ціль зв’язку: ID іншого значення</span><select data-lexicon-field="target">${options({ "": "без цілі", ...Object.fromEntries(d.entries.filter((other) => other.id !== e.id).map((other) => [other.id, "значення словника"])), ...(e.target && !d.entries.some((other) => other.id === e.target) ? { [e.target]: "запис видалений, виправте зв’язок" } : {}) }, e.target)}</select></label></div><button type="button" class="hint-button" data-lexicon-action="remove" data-entry-id="${e.id}">Вилучити ${e.id}</button></fieldset>`,
    )
    .join(
      "",
    )}</div><div class="lexicon-actions"><button type="button" class="button small" data-lexicon-action="add" ${d.entries.length >= 8 ? "disabled" : ""}>Додати значення +</button><button type="button" class="button small" data-lexicon-action="sample">Додати навчальний приклад</button><button type="button" class="button small dark" data-lexicon-action="validate">Перевірити структуру</button><button type="button" class="button small" data-lexicon-action="import">Відкрити мій JSON ↑</button><input type="file" class="sr-only" data-lexicon-import accept="application/json,.json" aria-label="Відкрити файл мінісловника"><button type="button" class="button small" data-lexicon-action="json">Мій словник JSON ↓</button><button type="button" class="button small" data-lexicon-action="txt">Мій словник TXT ↓</button></div><p class="micro muted">Синонімію, точність тлумачень і надійність джерел оцінює викладач. JSON зберігає записи для продовження роботи, TXT – читабельний примірник. Незавершений словник можна завантажити як чернетку.</p><div data-lexicon-output role="status" aria-live="polite"></div></section>`;
}

function readForm(article) {
  const root = article.querySelector("[data-lexicon-builder]");
  const d = newLexicon(root.dataset.language);
  d.nextId = Number(root.dataset.nextId);
  for (const input of root.querySelectorAll("[data-lexicon-meta]"))
    d[input.dataset.lexiconMeta] = input.value;
  d.entries = [...root.querySelectorAll("[data-lexicon-entry]")].map((row) => {
    const e = blankEntry(row.dataset.lexiconEntry);
    for (const input of row.querySelectorAll("[data-lexicon-field]"))
      e[input.dataset.lexiconField] = input.value;
    return e;
  });
  return d;
}

export function syncDictionaryBuilder(article) {
  const root = article.querySelector("[data-lexicon-builder][data-next-id]");
  if (!root) return;
  try {
    article.querySelector('[data-portfolio="method"]').value = serializeLexicon(
      readForm(article),
    );
  } catch (error) {
    root.querySelector("[data-lexicon-output]").textContent =
      error.message + " Попередня збережена чернетка залишилася в полі даних.";
  }
}

export function dictionaryBuilderAction(button, article, material) {
  const action = button.dataset.lexiconAction;
  if (!action || !article) return false;
  const root = article.querySelector("[data-lexicon-builder]"),
    method = article.querySelector('[data-portfolio="method"]');
  if (action === "import") {
    root.querySelector("[data-lexicon-import]").click();
    return true;
  }
  if (action === "raw") {
    download(`dictionary-recovery-${material.code}.txt`, method.value);
    return true;
  }
  let d;
  if (action === "reset") {
    if (
      !confirm(
        "Замінити поточну чернетку новим словником? Спочатку завантажте наявний текст, якщо він потрібен. Історія подань залишиться у звіті.",
      )
    )
      return true;
    d = newLexicon(material.code);
  } else d = readForm(article);
  const output = () => article.querySelector("[data-lexicon-output]");
  try {
    if (action === "validate" || action === "json" || action === "txt") {
      method.value = serializeLexicon(d);
      method.dispatchEvent(new Event("input", { bubbles: true }));
      const issues = inspectLexicon(d);
      output().innerHTML = issues.length
        ? `<p>Структуру ще потрібно доповнити:</p><ul>${issues.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`
        : "<p>Структурні поля заповнено. Перевірте зміст, джерела та відношення за критеріями викладача.</p>";
      if (action !== "validate")
        download(
          `my-dictionary-${material.code}.${action}`,
          action === "json" ? method.value : lexiconText(d),
          action === "json" ? "application/json" : "text/plain;charset=utf-8",
        );
      return true;
    }
    if (action === "add" || action === "sample") {
      d = addEntry(d);
      if (action === "sample") {
        const x = material.dictionaries.lexical,
          e = d.entries.at(-1);
        Object.assign(e, {
          lemma: x.noun,
          pos: "NOUN",
          definition: x.definition,
          example: x.example,
          source: "Авторська навчальна картка розділу 8, не реальна словникова стаття",
          locator: "Вправа «Синсет – група конкретних значень», DEMO-1",
          note: "Навчальний приклад. Реальну статтю ще потрібно перевірити.",
        });
      }
    }
    if (action === "remove")
      d.entries = d.entries.filter((e) => e.id !== button.dataset.entryId);
    method.value = serializeLexicon(d);
    root.outerHTML = renderDictionaryBuilder(method.value, material.code);
    method.dispatchEvent(new Event("input", { bubbles: true }));
    const replacement = article.querySelector("[data-lexicon-builder]");
    const focus =
      action === "add" || action === "sample"
        ? replacement.querySelector("[data-lexicon-entry]:last-child input")
        : replacement.querySelector("[data-lexicon-action=add]");
    focus?.focus({ preventScroll: true });
  } catch (error) {
    if (output()) output().textContent = error.message;
  }
  return true;
}

export async function importDictionaryFile(input, article, language) {
  const file = input.files?.[0];
  if (!file || !article) return;
  const show = (message) => {
    const target = article.querySelector("[data-lexicon-output]");
    if (target) target.textContent = message;
  };
  try {
    if (file.size > 60000)
      throw new Error("Файл завеликий для мінісловника цієї майстерні.");
    const model = readLexicon((await file.text()).replace(/^\uFEFF/u, ""), language);
    if (!article.isConnected) return;
    if (!model)
      throw new Error(
        "Потрібен файл lingva-lexicon версії 1 для поточної мови. Наявна чернетка збережена.",
      );
    if (
      !confirm(
        "Замінити поточну чернетку словником із файла? За потреби спочатку збережіть її через JSON або TXT.",
      )
    )
      return;
    const method = article.querySelector('[data-portfolio="method"]');
    method.value = serializeLexicon(model);
    article.querySelector("[data-lexicon-builder]").outerHTML = renderDictionaryBuilder(
      method.value,
      language,
    );
    method.dispatchEvent(new Event("input", { bubbles: true }));
    show(
      "Файл відкрито й збережено в чернетці. Перевірте структуру та зміст перед поданням.",
    );
  } catch (error) {
    show(error.message);
  } finally {
    input.value = "";
  }
}
