import { esc } from "../../shared/format.js";
import { parseCsv } from "../../tools/csv.js";
import { encodeText } from "../../tools/encoding.js";
const hex = (bytes) =>
  Array.from(bytes, (byte) => byte.toString(16).toUpperCase().padStart(2, "0")).join(
    " ",
  );

export function renderEncodingDiagram() {
  return `<figure class="encoding-diagram"><figcaption>Один символ — кілька способів записати його байтами</figcaption><ol class="encoding-flow"><li>Символ <b>é</b></li><li>Unicode <b>U+00E9</b></li><li>UTF-8 <b>C3 A9</b></li><li>Байти у файлі</li></ol><p>Під час відкриття програма декодує байти за вибраним кодуванням. Шрифт малює гліф отриманого символу.</p><div class="formats-table-wrap"><table><caption>Кодові точки та байти: це різні позначення</caption><thead><tr><th>Символ</th><th>Unicode</th><th>ASCII?</th><th>UTF-8</th><th>UTF-16LE без BOM</th></tr></thead><tbody>${["A", "é", "я"].map((char) => `<tr><td>${char}</td><td>U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}</td><td>${char.codePointAt(0) < 128 ? "Так" : "Ні"}</td><td>${hex(encodeText(char))}</td><td>${hex(encodeText(char, "utf16le").slice(2))}</td></tr>`).join("")}</tbody></table></div><p class="micro muted">Hex — шістнадцятковий запис байтів; учити таблицю напам’ять не потрібно. BOM — початкова мітка, яка може підказувати кодування файла.</p></figure>`;
}

export function renderCharacterInspection(value) {
  const chars = Array.from(value),
    shown = chars.slice(0, 32);
  return `<p>Кодових точок: ${chars.length}. Байтів UTF-8: ${encodeText(value).length}. ${chars.length > 32 ? "Нижче лише перші 32 символи." : ""}</p><div class="formats-table-wrap"><table><caption>Введені символи без автоматичної заміни</caption><thead><tr><th>Символ</th><th>Кодова точка</th><th>ASCII?</th><th>Байти UTF-8</th></tr></thead><tbody>${shown.map((char) => `<tr><td>${esc(char === " " ? "␠ (пробіл)" : char === "\n" ? "↵ (перенос)" : char === "\t" ? "⇥ (табуляція)" : char)}</td><td>U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}</td><td>${char.codePointAt(0) < 128 ? "Так" : "Ні"}</td><td>${hex(encodeText(char))}</td></tr>`).join("")}</tbody></table></div><p class="micro muted">Показано кодові точки, а не кількість видимих гліфів. Складені знаки докладніше розглянемо в розділі 4. Перегляд не подає відповідь і не додає спроб.</p>`;
}

export function renderCsvPreview(value) {
  try {
    const rows = parseCsv(value);
    if (!rows.length)
      return "<p>Спочатку введіть CSV. Перегляд не є поданням відповіді.</p>";
    return `<p>Записів: ${rows.length}. Полів у кожному: ${rows.map((row) => row.length).join(", ")}. Роздільник — кома.</p><div class="formats-table-wrap"><table><caption>Прочитані значення; лапки обрамлення не є частиною поля</caption><tbody>${rows.map((row, i) => `<tr><th scope="row">Запис ${i + 1}</th>${row.map((field) => `<td><code>${esc(field === "" ? "(порожнє поле)" : field)}</code></td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="micro muted">Пробіли та переноси всередині поля збережені. Структурно прочитаний CSV може мати неправильні значення: натисніть «Перевірити відповідь» для подання.</p>`;
  } catch (error) {
    return `<p>${esc(error.message)}</p><p class="micro muted">Це перегляд, без оцінки та нової спроби.</p>`;
  }
}
