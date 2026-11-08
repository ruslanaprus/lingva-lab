import { esc } from "../../shared/format.js";

export function renderAlignmentInput(task, value) {
  const select = (side, label, segments) =>
    `<label class="input-label" for="alignment-${side}-${task.id}">${label}<select id="alignment-${side}-${task.id}" data-alignment-${side}="${task.id}">${segments.map((s) => `<option value="${esc(s.id)}">${esc(s.id)}</option>`).join("")}</select></label>`;
  return `<div class="alignment-tool"><p>Інспектор пар – перегляд без подання відповіді.</p><div class="alignment-fields">${select("source", "Вихідний сегмент", task.alignment.sources)}${select("target", "Український сегмент", task.alignment.targets)}</div><button type="button" class="button small" data-alignment-preview="${task.id}">Порівняти пару</button><div data-alignment-output="${task.id}" role="status" aria-live="polite"></div><label class="input-label" for="answer-${task.id}">Ваша відповідь – ID українського сегмента</label><input id="answer-${task.id}" data-answer="${task.id}" class="code-input" value="${esc(value || "")}" maxlength="10000" spellcheck="false" autocapitalize="off" autocomplete="off"></div>`;
}

export function renderAlignmentPreview(data, sourceId, targetId) {
  const source = data.sources.find((s) => s.id === sourceId);
  const target = data.targets.find((s) => s.id === targetId);
  if (!source || !target) return "<p>Оберіть обидва сегменти зі списків.</p>";
  const segment = (s) =>
    `<div><b>${esc(s.id)}</b><pre class="code-input">${esc(s.text)}</pre></div>`;
  return `<p>${esc(data.document)} (${esc(data.sourceLanguage)} → ${esc(data.targetLanguage)})</p><div class="alignment-fields">${segment(source)}${segment(target)}</div><details><summary>Показати всі сусідні сегменти</summary>${[...data.sources, ...data.targets].map(segment).join("")}</details><p class="micro muted">Порівняйте зміст, заперечення та умови. Перегляд не перевіряє правильність, не змінює введеної відповіді й не додає спроб або XP.</p>`;
}
