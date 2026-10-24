import { esc } from "../../shared/format.js";
import { $ } from "../dom.js";
import { wer } from "../../tools/text.js";
export function updateWer(taskById) {
  const input = $("[data-wer]");
  if (!input) return;
  const t = taskById(input.dataset.wer),
    result = wer(t.reference, input.value);
  $(`[data-wer-result="${t.id}"]`).innerHTML =
    `<div class="wer-readout"><strong>${result.rate === null ? "—" : (result.rate * 100).toFixed(1)}<small>%</small></strong><span class="mono">S ${result.S} · D ${result.D} · I ${result.I} · N ${result.N}</span></div><div class="alignment">${result.alignment.map((a) => `<span class="${a.type === "=" ? "" : "error"}" title="${a.type === "S" ? "Заміна" : a.type === "D" ? "Пропуск" : a.type === "I" ? "Вставка" : "Збіг"}">${esc(a.reference)}${a.type === "=" ? "" : " → " + esc(a.hypothesis)}</span>`).join("")}</div><p class="micro muted" style="margin-top:12px">Пробільна токенізація; нижній регістр, NFC, без крайової пунктуації. Це навчальне правило; воно не є універсальним для всіх мов.</p>`;
}
