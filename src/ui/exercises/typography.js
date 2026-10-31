import { esc } from "../../shared/format.js";
import { unicodePoints } from "../../tools/text.js";
import { inspectTypography } from "../../tools/unicode.js";

const invisible = new Map([
  [" ", "звичайний пробіл"],
  ["\u00A0", "нерозривний пробіл"],
  ["\u202F", "вузький нерозривний пробіл"],
  ["\u200B", "пробіл нульової ширини"],
  ["\u00AD", "м’який перенос"],
  ["\n", "перенос LF"],
  ["\r", "повернення CR"],
  ["\t", "табуляція"],
]);
const pointLabel = (symbol) =>
  unicodePoints(symbol)
    .map((p) => p.point)
    .join(" + ");
const symbolLabel = (symbol) =>
  invisible.get(symbol) || (/^\p{M}/u.test(symbol) ? "комбінований знак" : symbol);
const visibleSymbol = (symbol) =>
  invisible.has(symbol) ? "␠" : /^\p{M}/u.test(symbol) ? "◌" + symbol : symbol;

export function renderTypographyInput(task, value) {
  return `<div class="typography-tool"><label class="input-label" for="answer-${task.id}">Інспектор типографіки – ваше поле введення</label><textarea id="answer-${task.id}" data-answer="${task.id}" class="code-input" maxlength="10000" spellcheck="false" autocorrect="off" autocapitalize="off">${"\n"}${esc(value || "")}</textarea>${task.palette?.length ? `<div class="symbol-keyboard" role="group" aria-label="Мала панель символів для цієї вправи">${task.palette.map((symbol, i) => `<button type="button" class="symbol-key" data-insert-symbol="${task.id}" data-symbol-index="${i}" aria-label="Вставити ${esc(symbolLabel(symbol))}, ${pointLabel(symbol)}"><span aria-hidden="true">${esc(visibleSymbol(symbol))}</span><small>${esc(symbolLabel(symbol))}</small><small>${pointLabel(symbol)}</small></button>`).join("")}</div><p class="micro muted">Це мала навчальна панель, не повна клавіатура IPA. Кнопка вставляє знак у позиції курсора; пунктирне коло не вставляється.</p>` : ""}<button type="button" class="button small" data-typography-preview="${task.id}">Порівняти NFC/NFD ↗</button><div class="typography-preview" data-typography-output="${task.id}" role="status" aria-live="polite"></div></div>`;
}

export function renderTypographyPreview(value, probe = "") {
  const info = inspectTypography(value, probe);
  const short = (text) => Array.from(text).slice(0, 240).join("");
  const rows = unicodePoints(value).slice(0, 160);
  return `<p>Кодових точок: ${info.points}. NFC: ${info.nfcPoints}; NFD: ${info.nfdPoints}. NFC ${info.changedByNFC ? "змінила послідовність" : "не змінила послідовність"}.</p><div class="normalization-copies">${[
    ["Початковий рядок", info.raw],
    ["NFC", info.nfc],
    ["NFD", info.nfd],
  ]
    .map(
      ([label, text]) =>
        `<div><b>${label}</b><pre class="code-input">${esc(short(text))}</pre></div>`,
    )
    .join(
      "",
    )}</div>${info.points > 240 ? "<p>У рядкових зразках показано перші 240 кодових точок.</p>" : ""}${probe ? `<p>Навчальна проба: <code>${esc(probe)}</code>. Буквальних збігів до NFC: <b>${info.rawMatches}</b>; після NFC тексту й проби: <b>${info.nfcMatches}</b>. Пошук чутливий до регістру, без перекриття, за підрядком; це не підрахунок слів або лем.</p>` : ""}<div class="formats-table-wrap"><table><caption>Коди початкового введення${info.points > 160 ? " – перші 160 кодових точок" : ""}</caption><thead><tr><th>Позиція</th><th>Знак / позначка</th><th>Код</th><th>Пояснення</th></tr></thead><tbody>${rows.map(({ char, point }, i) => `<tr><td>${i + 1}</td><td><span class="typography-glyph">${esc(visibleSymbol(char))}</span></td><td>${point}</td><td>${esc(invisible.get(char) || (/^\p{M}/u.test(char) ? "Комбінований знак; коло лише для показу" : "Текстовий символ"))}</td></tr>`).join("")}</tbody></table></div><p class="micro muted">␠ у таблиці – лише видима позначка; потрібний вид пробілу визначайте за кодом. Графемні кластери й байти тут не рахуються. Перегляд не замінює введення, не подає відповіді й не додає спроб або XP.</p>`;
}
