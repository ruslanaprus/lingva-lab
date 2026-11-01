import { trackStats, sectionStats, taskStatus } from "../../learning/progress.js";
import { esc } from "../../shared/format.js";
import { PATHS, LANGUAGES, chapterNumber } from "../../../content/registry.js";
import { countLabel } from "../../i18n/index.js";
export function createMapView(context = {}) {
  const { modules, nextModule, course, track, state, pathId, filter } = context;
  function renderMap() {
    const ms = modules(),
      next = nextModule(),
      stats = trackStats(course(), track());
    return `<div class="page">
 <section class="hero" aria-labelledby="hero-title">
   <div class="hero-copy"><p class="mono eyebrow">DIGITAL TOOLS FOR LINGUISTS</p><h1 id="hero-title">Мова –<br>це теж<br><span class="orange">дані.</span></h1><p class="hero-desc">Працюйте з текстами. Досліджуйте мовлення. Ставте інструментам правильні запитання.</p></div>
   <div class="hero-art">
     <div class="lexicon-header mono"><span>МОВА × ТЕХНОЛОГІЇ</span><span>1–${ms.length}</span></div>
     <svg class="lexicon-cloud" viewBox="0 0 480 350" role="img" aria-labelledby="lexicon-title lexicon-desc" focusable="false">
       <title id="lexicon-title">На перетині мови й цифрових інструментів</title>
       <desc id="lexicon-desc">Хмара термінів курсу: команди grep і git diff, кодування UTF-8 та Unicode, регулярні вирази Regex, формати TXT, CSV, JSON, WAV і TextGrid, корпус, лема, токен і фонетичні символи.</desc>
       <g aria-hidden="true">
         <text class="lexicon-code lexicon-accent" x="68" y="40" font-size="23" transform="rotate(-5 68 40)">UTF-8</text>
         <text class="lexicon-code lexicon-muted" x="179" y="40" font-size="18">&lt;text&gt;</text>
         <text class="lexicon-code lexicon-muted" x="310" y="40" font-size="16">U+0259</text>
         <text class="lexicon-bold" x="38" y="103" font-size="52">grep</text>
         <text class="lexicon-serif" x="181" y="101" font-size="49">корпус</text>
         <text class="lexicon-code" x="361" y="78" font-size="20">*.txt</text>
         <text class="lexicon-code lexicon-muted" x="377" y="106" font-size="15">NFC</text>
         <text class="lexicon-serif lexicon-accent" x="22" y="181" font-size="77">/ə/</text>
         <text class="lexicon-bold" x="131" y="177" font-size="66" letter-spacing="-3">Unicode</text>
         <text class="lexicon-code lexicon-muted" x="404" y="171" font-size="29">{ }</text>
         <text class="lexicon-code" x="26" y="236" font-size="24" transform="rotate(-6 26 236)">git diff</text>
         <text class="lexicon-bold lexicon-accent" x="164" y="252" font-size="78" letter-spacing="-3">Regex</text>
         <text class="lexicon-serif" x="401" y="251" font-size="80">é</text>
         <text class="lexicon-code lexicon-muted" x="45" y="289" font-size="23">.csv</text>
         <text x="132" y="291" font-size="32" letter-spacing="-1">TextGrid</text>
         <text class="lexicon-code" x="288" y="291" font-size="29">JSON</text>
         <text class="lexicon-code lexicon-muted" x="383" y="288" font-size="21" transform="rotate(5 383 288)">WAV</text>
         <text x="68" y="332" font-size="23">лема</text>
         <text class="lexicon-serif lexicon-accent" x="158" y="335" font-size="36">ß</text>
         <text class="lexicon-serif" x="210" y="334" font-size="34">œ</text>
         <text x="277" y="332" font-size="23">токен</text>
         <text class="lexicon-code lexicon-muted" x="375" y="330" font-size="17">POS</text>
       </g>
     </svg>
     <div class="lexicon-footer mono"><span>ТЕКСТ · КОД · ЗВУК</span><span>DE / FR / EN</span></div>
   </div>
 </section>
 <div class="language-bar"><p class="mono">1 / ВАША МОВА</p><div class="language-buttons">${Object.entries(
   PATHS,
 )
   .map(
     ([key, l]) =>
       `<button class="language-button ${state().activePathId === key ? "selected" : ""}" data-path="${key}" aria-pressed="${state().activePathId === key}"><b>${l.language.toUpperCase()}</b> ${LANGUAGES[l.language].name}${l.level === "foundations" ? "" : " · " + esc(l.title)}</button>`,
   )
   .join(
     "",
   )}</div><p class="micro muted">Український інтерфейс.<br>${Object.keys(PATHS).length} незалежні траєкторії.</p></div>
 <div class="section-heading"><h2>Маршрут дослідження<span class="orange">.</span></h2><p class="mono">${countLabel("chapter", ms.length)} · ${countLabel("task", stats.total)}<br>І СКАРБИ МІЖ РЯДКАМИ</p></div>
 <section class="continue-panel"><div class="continue-number">${chapterNumber(pathId(), next.id)}</div><div><div class="mono">${stats.done ? "ПРОДОВЖУЄМО ЕКСПЕДИЦІЮ" : "ПОЧНІТЬ З ОСНОВ"} / ${next.category}</div><h3>${next.title}</h3><p>${next.short} ${next.time} хв орієнтовно.</p></div><a class="button light" href="#lab/${next.id}">${stats.done ? "Продовжити" : "До лабораторії"} <span>↗</span></a></section>
 <p class="catalog-notice">У програмі ${countLabel("chapter", ms.length)}: ${stats.sectionTotal} із наявними вправами та ${stats.plannedTotal} з описами майбутніх тем. Прогрес і звіти стосуються наявної практики; описи можна читати вже зараз.</p>
 <div class="module-filters mono" role="group" aria-label="Фільтр розділів"><button class="filter ${filter() === "all" ? "active" : ""}" data-filter="all" aria-pressed="${filter() === "all"}">Усі / ${ms.length}</button><button class="filter ${filter() === "planned" ? "active" : ""}" data-filter="planned" aria-pressed="${filter() === "planned"}">Описи / ${stats.plannedTotal}</button><button class="filter ${filter() === "new" ? "active" : ""}" data-filter="new" aria-pressed="${filter() === "new"}">Попереду</button><button class="filter ${filter() === "progress" ? "active" : ""}" data-filter="progress" aria-pressed="${filter() === "progress"}">У процесі</button><button class="filter ${filter() === "complete" ? "active" : ""}" data-filter="complete" aria-pressed="${filter() === "complete"}">Завершені</button></div>
 <div class="module-grid">${ms
   .filter((m) => {
     const s = sectionStats(m, track());
     return (
       filter() === "all" ||
       (filter() === "planned" && m.status === "planned") ||
       (filter() === "new" &&
         m.status !== "planned" &&
         s.done === 0 &&
         s.attempts === 0) ||
       (filter() === "progress" && !s.complete && (s.done > 0 || s.attempts > 0)) ||
       (filter() === "complete" && s.complete)
     );
   })
   .map((m) => moduleCard(m))
   .join("")}</div>${
   !ms.some((m) => {
     const s = sectionStats(m, track());
     return (
       filter() === "all" ||
       (filter() === "planned" && m.status === "planned") ||
       (filter() === "new" &&
         m.status !== "planned" &&
         s.done === 0 &&
         s.attempts === 0) ||
       (filter() === "progress" && !s.complete && (s.done > 0 || s.attempts > 0)) ||
       (filter() === "complete" && s.complete)
     );
   })
     ? '<p class="no-results">Тут поки немає розділів. Продовжуйте свій маршрут.</p>'
     : ""
 }
 <section class="map-note"><h2>Не просто<br>натискати.<br><span class="orange">Розуміти.</span></h2><div><p>Кожен інструмент тут розв’язує реальну задачу лінгвіста: зберегти польовий запис, знайти словоформи, перевірити транскрипцію або дослідити помилку моделі.</p><p class="mono">ПРАКТИКА → ДОКАЗ → ПОРТФОЛІО</p><p>Спроби й виправлення – частина роботи. Накопичуйте досвід, відкривайте відзнаки та забирайте звіт після кожного розділу.</p></div></section>
 </div>`;
  }

  function moduleCard(m) {
    const s = sectionStats(m, track());
    return `<a class="module-card${m.status === "planned" ? " planned" : ""}" href="#lab/${m.id}" data-chapter-status="${m.status === "planned" ? "planned" : "practice"}"><div class="module-card-head mono"><span class="number">${chapterNumber(pathId(), m.id)} / <span class="${s.complete || s.done || s.attempts ? "card-state" : "category"}">${m.status === "planned" ? "ОПИС" : s.complete ? "ЗАВЕРШЕНО" : s.done || s.attempts ? "У ПРОЦЕСІ" : m.category}</span></span><span>${m.status === "planned" ? "ОПИС" : `${m.time} ХВ`}</span></div><h3>${m.title}</h3><p>${m.short}</p><div class="module-card-bottom">${m.status === "planned" ? '<span class="mono muted">ВПРАВИ ГОТУЮТЬСЯ</span>' : m.workshop ? `<div class="workshop-card-progress"><span class="mono">${s.requiredDone}/${s.requiredTotal} ОБОВ’ЯЗКОВИХ</span><progress value="${s.requiredDone}" max="${s.requiredTotal}" aria-label="Виконано ${s.requiredDone} з ${s.requiredTotal} обов’язкових завдань"></progress></div>` : `<div class="task-dots" aria-label="${s.requiredDone} із ${s.requiredTotal} обов’язкових завдань виконано">${m.tasks.map((t) => `<i class="${taskStatus(track().answers[t.id], t)}"></i>`).join("")}</div>`}<span class="card-arrow" aria-hidden="true">↗</span></div></a>`;
  }
  return { renderMap, moduleCard };
}
