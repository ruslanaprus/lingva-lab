import { esc, pad, date, labels } from "../shared/format.js";
import { formatDuration } from "../features/activity.js";
import { formatAttemptValue, formatTaskValue } from "../learning/values.js";
function reportActivityHtml(activity) {
  if (!activity.tracked)
    return "<h2>Час у розділі</h2><p>Час ще не вимірювався. Для попередніх спроб тривалість невідома; її не відновлюємо з часових позначок подань.</p>";
  return `<h2>Час у розділі</h2>
    <table><tr><th>Усього на сторінці</th><td>${formatDuration(activity.pageMs)}</td></tr>
    <tr><th>Видима вкладка у фокусі</th><td>${formatDuration(activity.visibleMs)}</td></tr>
    <tr><th>Активний час</th><td>${formatDuration(activity.activeMs)}</td></tr>
    <tr><th>Без взаємодії у видимій вкладці</th><td>${formatDuration(activity.idleMs)}</td></tr>
    <tr><th>У фоні або поза фокусом</th><td>${formatDuration(activity.awayMs)}</td></tr>
    <tr><th>Відвідування розділу</th><td>${activity.visits}</td></tr>
    <tr><th>Початок обліку</th><td>${date(activity.firstVisitedAt)}</td></tr>
    <tr><th>Остання присутність</th><td>${date(activity.lastVisitedAt)}</td></tr></table>
    <p class="note">Активний час: вкладка видима, вікно у фокусі, від відкриття розділу або останньої взаємодії минуло не більше 2 хв. Клавіатура, натискання, прокручування колесом і дотики поновлюють активність. Після повернення до вкладки відлік поновлюється. Тривале читання без взаємодії потрапляє в загальний час, але після 2 хв не додає активного часу. Закритий браузер і час між відвідуваннями не враховуються. Це приблизні локальні вимірювання, а не доказ самостійної роботи.</p>`;
}
export function reportHtml(d) {
  return `<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Звіт ${pad(d.module.number)} — ${esc(d.student || "lingva.lab")}</title>
  <style>body{font:15px/1.65 Arial,sans-serif;max-width:960px;padding:35px;margin:auto;color:#171713;background:#faf9f3}h1,h2{line-height:1.15;letter-spacing:-.03em}h1{font-size:40px}h2{font-size:25px;border-top:1px solid;padding-top:20px}h3{font-size:17px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eae8dc;padding:15px;font-size:12px}small{color:#626256}.status{font-weight:bold;color:#b93b1b}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ccc;text-align:left;padding:8px}article{margin:30px 0}.attempt{border-left:2px solid #aaa;padding-left:15px;margin:20px 0}.note{padding:15px;background:#eae8dc}@media print{body{padding:0;font-size:11px;background:white}h1{font-size:28px}.attempt{break-inside:avoid}a{color:inherit}}</style>
  <body><p>LINGVA.LAB / DIGITAL TOOLS FOR LINGUISTS · ${esc(d.appVersion)}</p><p>Траєкторія: ${esc(d.path.title)} · редакція ${d.path.revision}</p><h1>${pad(d.module.number)} / ${esc(d.module.title)}</h1><p class="status">${esc(d.completion)}</p>
  <table><tr><th>Студент/ка</th><td>${esc(d.student || "Не вказано")}</td><th>Група</th><td>${esc(d.group || "Не вказано")}</td></tr>
  <tr><th>Мова</th><td>${esc(d.languageName)}</td><th>Створено</th><td>${date(d.generatedAt)}</td></tr>
  <tr><th>Обов’язкові завдання</th><td>${d.summary.requiredDone}/${d.summary.requiredTotal}</td><th>Усього завдань</th><td>${d.summary.total}</td></tr>
  <tr><th>Перевірено</th><td>${d.summary.passed}/${d.summary.gradedTotal}</td><th>Подано для викладача</th><td>${d.summary.submitted}/${d.summary.portfolioTotal}</td></tr>
  <tr><th>Спроби / помилки</th><td>${d.summary.attempts} / ${d.summary.errors}</td><th>Повторні подання</th><td>${d.tasks.reduce((n, t) => n + Math.max(0, (t.record?.attempts.length || 0) - 1), 0)}</td></tr></table>
  <p class="note">${esc(d.note)} Для PDF: Друк у браузері → Зберегти як PDF. Прикладні артефакти передаються разом зі звітом окремо. Номери варіантів починаються з 1; технічні індекси — з 0. Введений текст збережено без виправлення пробілів, регістру чи правопису.</p>
  ${reportActivityHtml(d.activity)}
  <h2>Мета та застосування</h2><p>${esc(d.module.outcome)}</p><p>${esc(d.module.case)}</p>
  ${d.tasks
    .map(
      (
        t,
      ) => `<article><h2>${esc(t.id)} / ${esc(t.title)}</h2><p class="status">${labels[t.status]}</p>${t.required === false ? "<p>Необов’язкова практика</p>" : ""}<p>${esc(t.prompt)}</p>
    ${t.rubric ? `<h3>Критерії ручного оцінювання</h3><ul>${t.rubric.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
    <p>Підказки: ${t.record?.hints || 0}. Спроби: ${t.record?.attempts.length || 0}. Помилки: ${t.record?.attempts.filter((a) => a.status === "failed").length || 0}. Повторні подання: ${Math.max(0, (t.record?.attempts.length || 0) - 1)}.</p>
    ${t.record?.attempts.map((a, i) => `<div class="attempt"><h3>Спроба ${i + 1} · ${date(a.at)} · ${labels[a.status]}</h3><p>Підказок на момент подання: ${a.hints}. Версія завдання: ${a.definition.revision}; версія перевірки: ${a.graderVersion}.</p>${a.definition.prompt.includes("\n\nПояснення до вправи\n") ? `<details><summary>Пояснення та матеріали цієї редакції</summary><pre><code>${esc(a.definition.prompt)}</code></pre></details>` : `<p>${esc(a.definition.prompt)}</p>`}<pre><code>${esc(formatAttemptValue(a.definition ?? t, a))}</code></pre><p>${esc(a.feedback)}</p></div>`).join("") || "<p>Спроб ще немає.</p>"}
    ${t.record?.draft !== null && t.record?.draft !== undefined ? `<details><summary>Поточна чернетка</summary><pre><code>${esc(formatTaskValue(t.record.definition, t.record.draft))}</code></pre></details>` : ""}
    ${t.record?.toolEvents.length ? `<h3>Журнал команд (${t.record.toolEvents.filter((e) => !e.ok).length} помилок)</h3>${t.record.toolEvents.map((e) => `<pre>${date(e.at)} · ${e.ok ? "Успіх" : "Помилка"}\n$ ${esc(e.input)}\n${esc(e.output)}</pre>`).join("")}` : ""}</article>`,
    )
    .join("")}
  ${d.treasure ? `<h2>Прихований виклик / ${esc(d.treasure.title)}</h2>${d.treasure.record?.attempts.map((a, i) => `<div class="attempt"><h3>Спроба ${i + 1} · ${date(a.at)} · ${labels[a.status]}</h3><pre><code>${esc(formatAttemptValue(a.definition, a))}</code></pre><p>${esc(a.feedback)}</p></div>`).join("") || "<p>Не подано.</p>"}` : ""}
  <h2>Джерела</h2><ul>${d.sources.map((s) => `<li><a href="${s.url}">${esc(s.title)}</a></li>`).join("")}</ul></body></html>`;
}
