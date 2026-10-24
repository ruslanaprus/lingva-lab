import { sectionStats, taskStatus } from "../../learning/progress.js";
import { pad, esc } from "../../shared/format.js";
import {
  chapterNumber,
  LANGUAGES,
  SOURCES,
  nextChapter,
} from "../../../content/registry.js";
import { formatDuration } from "../../features/activity.js";
import { t } from "../../i18n/index.js";
export function createChapterView(context = {}) {
  const { track, pathId, language, renderTask, renderChapterFeedback } = context;
  function renderLab(m) {
    const s = sectionStats(m, track());
    return `<div class="page"><div class="page-title"><div><p class="mono breadcrumb"><a href="#map">КАРТА КУРСУ</a> / РОЗДІЛ ${pad(chapterNumber(pathId(), m.id))} / ${LANGUAGES[language()].native}</p><h1>${m.title}<span class="orange">.</span></h1></div><p>${m.short}<br><span class="mono muted">${m.time} ХВ · ${s.total} ЗАВДАНЬ · ${m.tasks.reduce((sum, task) => sum + task.xp, 0)} XP</span></p></div>
 <div class="lab-layout"><aside class="lab-sidebar" aria-label="У цьому розділі"><p class="sidebar-title mono">ПОЛЬОВИЙ МАРШРУТ / ${pad(chapterNumber(pathId(), m.id))}</p><nav class="task-nav">${m.tasks.map((t, i) => `<a href="#task-${t.id}" data-scroll-task="${t.id}"><span class="mono">${pad(i + 1)} ${taskStatus(track().answers[t.id], t) === "passed" ? "✓" : taskStatus(track().answers[t.id], t) === "submitted" ? "↗" : "·"}</span>${t.title}</a>`).join("")}</nav><div class="sidebar-meter"><p class="mono"><span>ВИКОНАНО</span><span>${s.requiredDone} / ${s.requiredTotal}</span></p><div class="meter"><i style="width:${s.requiredTotal ? (s.requiredDone / s.requiredTotal) * 100 : 0}%"></i></div><p class="mono"><span>СПРОБИ ${s.attempts}</span><span>ПОМИЛКИ ${s.errors}</span></p></div><p class="mono activity-meter">АКТИВНИЙ ЧАС <span id="activity-time">${formatDuration(track().activity[m.id]?.activeMs ?? 0)}</span></p><div class="sidebar-controls"><button class="button small dark" data-action="report" data-module="${m.id}">${s.complete ? t("report.chapter") : t("report.draft")} <span>↓</span></button><button class="button small" data-action="materials" data-module="${m.id}">Матеріали <span>↓</span></button></div><p class="sidebar-disclaimer">Зберігаємо подані відповіді та час у цьому розділі. Активний час зупиняється у фоні, поза фокусом або після 2 хв без взаємодії. Читання без взаємодії довше 2 хв рахується лише в загальному часі. Прикладну роботу оцінює викладач.</p></aside>
 <div class="lab-content"><div class="lab-intro"><div><p class="mono">НАВІЩО ЦЕ ФІЛОЛОГУ</p><h2>Реальна задача</h2><p>${esc(m.case)}</p></div><div><p class="mono">ПІСЛЯ ЦЬОГО РОЗДІЛУ</p><h2>Що ви зможете</h2><p>${esc(m.outcome)}</p></div></div>
 <details class="theory" open><summary class="mono">ПЕРЕД ПОЧАТКОМ / ТЕОРІЯ ТА ДЖЕРЕЛА</summary><div class="theory-body">${esc(m.theory)}<div class="term-chips">${m.terms.map((t) => `<button class="term-chip" data-term="${esc(t)}">${esc(t)} ↗</button>`).join("")}</div><ul class="sources-list">${m.sources.map((key) => `<li><a href="${SOURCES[key].url}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[key].title)} ↗</a></li>`).join("")}</ul></div></details>
 ${m.treasure ? `<p class="treasure-clue mono">${m.treasure === "archive" ? "В архівах інколи трапляються листи з іншого століття." : m.treasure === "unicode" ? "Не всі двійники — той самий символ." : "Ідеальний результат може приховувати пропущене."} <button class="treasure-trigger" data-treasure="${m.treasure}" aria-label="Дослідити примітку: прихований виклик">◇</button></p><div id="treasure-slot"></div>` : ""}
 ${s.complete ? `<div class="section-complete"><p class="mono orange">МАРШРУТ РОЗДІЛУ ПРОЙДЕНО</p><h3>Є результат. Є історія.</h3><p>${s.passed} завдань перевірено автоматично; ${s.submitted} прикладних робіт подано для викладача. Обов’язкові завдання завершено. Завантажте звіт і передайте артефакти окремо.</p><button class="button small dark" data-action="report" data-module="${m.id}">${t("report.download")} ↓</button></div>` : ""}
 ${m.tasks.map((t, i) => renderTask(t, i)).join("")}${s.complete ? renderChapterFeedback(m) : ""}<div class="lab-end"><div><p>Маленька вибірка. Чіткий метод.</p><p class="mono">СИЛЬНЕ ДОСЛІДЖЕННЯ ПОЧИНАЄТЬСЯ З ВІДТВОРЮВАНОСТІ.</p></div><a class="button" href="${!nextChapter(pathId(), m.id) ? "#portfolio" : "#lab/" + nextChapter(pathId(), m.id).id}">${!nextChapter(pathId(), m.id) ? t("navigation.portfolio") : t("navigation.nextChapter")} ↗</a></div></div></div></div>`;
  }
  return { renderLab };
}
