import { $ } from "../dom.js";
import { esc } from "../../shared/format.js";
export function renderRegexResult(t, result) {
  const output = $(`[data-regex-output="${t.id}"]`),
    corpus = $(`[data-corpus="${t.id}"]`);
  if (!output) return;
  if (result.error) {
    output.textContent = result.error;
    corpus.textContent = t.corpus;
    return;
  }
  if (t.type === "replace") {
    output.textContent = "РЕЗУЛЬТАТ ЗАМІНИ:\n" + result.output;
    return;
  }
  let html = "",
    position = 0;
  for (const m of result.matches) {
    html += esc(t.corpus.slice(position, m.index)) + "<mark>" + esc(m.text) + "</mark>";
    position = m.index + m.text.length;
  }
  html += esc(t.corpus.slice(position));
  corpus.innerHTML = html;
  output.textContent = `Знайдено ${result.matches.length} збігів: ${result.matches.map((m) => m.text).join(" · ") || "—"}`;
}
