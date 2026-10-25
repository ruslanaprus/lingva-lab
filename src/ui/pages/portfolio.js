import { trackStats, sectionStats, badges } from "../../learning/progress.js";
import { LANGUAGES, chapterNumber } from "../../../content/registry.js";
import { esc, pad } from "../../shared/format.js";
export function createPortfolioView(context = {}) {
  const { course, track, language, state, modules, pathId } = context;
  function renderPortfolio() {
    const s = trackStats(course(), track());
    return `<div class="page"><div class="page-title"><div><p class="mono eyebrow">${LANGUAGES[language()].native} / ${esc(state().student || "ВАШ ДОСЛІДНИЦЬКИЙ ЩОДЕННИК")}</p><h1>Робота залишає<br><span class="orange">слід.</span></h1></div><p>Ваші результати, історія рішень і матеріали для викладача.</p></div><div class="stats-grid"><div class="stat-block"><strong>${s.xp}<span class="orange">.</span></strong><span class="mono">XP / ДОСЛІДНИЦЬКИЙ ДОСВІД</span></div><div class="stat-block"><strong>${pad(s.sections)}<small> / ${s.sectionTotal}</small></strong><span class="mono">РОЗДІЛІВ ЗАВЕРШЕНО</span></div><div class="stat-block"><strong>${s.passed}<small> / ${s.gradedTotal}</small></strong><span class="mono">АВТОМАТИЧНО ПЕРЕВІРЕНО</span></div><div class="stat-block"><strong>${s.submitted}<small> / ${s.portfolioTotal}</small></strong><span class="mono">РОБІТ ДЛЯ ВИКЛАДАЧА</span></div></div><p class="local-notice mono">СПРОБИ ${s.attempts} · ПОМИЛКИ ПЕРЕВІРКИ ${s.errors} · ПОМИЛКИ КОМАНД ${s.commandErrors} · ПОВТОРНІ ПОДАННЯ ${s.resubmissions} · ПІДКАЗКИ ${s.hints}</p>
 <div class="portfolio-grid"><section><h2>Звіти розділів</h2><p class="micro muted" style="margin-bottom:20px">HTML-звіт містить введені відповіді, номери й тексти обраних варіантів, історію та час у розділі. Для PDF відкрийте його та оберіть «Друк → Зберегти як PDF». JSON — структуровані дані одного розділу.</p>${modules()
   .filter((m) => m.status !== "planned")
   .map((m) => {
     const ms = sectionStats(m, track());
     return `<div class="report-row"><div><h3><span class="orange">${pad(chapterNumber(pathId(), m.id))} /</span> ${m.title}</h3><p class="mono">${ms.requiredDone}/${ms.requiredTotal} · ${ms.complete ? "ЗАВЕРШЕНО · РОБОТА ОЧІКУЄ ОЦІНЮВАННЯ" : ms.attempts ? "У ПРОЦЕСІ · ЧЕРНЕТКА" : "ЩЕ НЕ РОЗПОЧАТО"}</p></div><div class="report-actions"><button class="button small" data-action="report" data-module="${m.id}">HTML ↓</button><button class="button small" data-action="report-json" data-module="${m.id}">JSON ↓</button></div></div>`;
   })
   .join(
     "",
   )}</section><aside><h2>Відзнаки за роботу</h2><div class="badge-grid">${badges(
   course(),
   track(),
 )
   .map(
     (b) =>
       `<div class="badge ${b.unlocked ? "unlocked" : ""}"><span aria-hidden="true">${b.mark}</span><h3>${b.name}</h3><p>${b.description}</p><p class="mono">${b.unlocked ? "ВІДКРИТО" : "ЩЕ ПОПЕРЕДУ"}</p></div>`,
   )
   .join(
     "",
   )}</div><div class="backup-panel"><h3>Збережіть свій маршрут.</h3><p>Усі навчальні траєкторії, відповіді, чернетки та історія — в одному файлі. Імпорт замінить локальний прогрес; перед цим ви зможете завантажити поточну копію.</p><div class="backup-actions"><button class="button small dark" data-action="backup">Резервна копія ↓</button><button class="button small" data-action="import">Імпорт ↑</button><input type="file" id="backup-input" accept="application/json,.json" class="sr-only" aria-label="Файл резервної копії"></div></div>${
   course().assessment
     ? `<div class="assessment"><h3>Оцінювання курсу</h3><p>${esc(course().assessment.description)}</p><div class="assessment-lines">${course()
         .assessment.parts.map(
           (part) =>
             `<div class="assessment-line"><b>${part.weight}%</b> ${esc(part.title)}</div>`,
         )
         .join(
           "",
         )}</div><p class="micro muted" style="margin-top:16px">${esc(course().assessment.note)}</p></div>`
     : ""
 }<p class="local-notice">Дані зберігаються у localStorage цього браузера. Вони можуть зникнути після очищення даних сайту. Звіти не підписані сервером; викладач перевіряє артефакти та самостійність роботи.</p></aside></div></div>`;
  }
  return { renderPortfolio };
}
