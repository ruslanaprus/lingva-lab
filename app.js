import {
  LANGUAGES,
  getModules,
  GLOSSARY,
  SOURCES,
  TREASURES,
} from "./course.js";
import {
  STORAGE_KEY,
  freshState,
  now,
  answerRecord,
  taskStatus,
  sectionStats,
  trackStats,
  badges,
  evaluateTask,
  recordAttempt,
  unicodePoints,
  wer,
  createTerminal,
  runTerminal,
  createGit,
  runGit,
  validateBackup,
  formatTaskValue,
  exportTextGrid,
} from "./engine.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const pad = (n) => String(n).padStart(2, "0");
const labels = {
  new: "Не розпочато",
  passed: "Перевірено",
  failed: "Потрібна правка",
  submitted: "Подано · очікує перевірки",
};
const date = (value) => new Date(value).toLocaleString("uk-UA");
let state = freshState(),
  storageAvailable = true,
  toastTimer,
  saveTimer,
  pendingRoute = null,
  filter = "all",
  activeTreasure = null;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) state = validateBackup(JSON.parse(raw));
} catch (error) {
  storageAvailable = false;
  console.warn("Could not restore local progress:", error.message);
}
const language = () => state.activeLanguage || "de";
const track = () => state.tracks[language()];
const modules = () => getModules(language());
const moduleById = (id) => modules().find((m) => m.id === Number(id));
const taskById = (id) =>
  modules()
    .flatMap((m) => m.tasks)
    .find((t) => t.id === id);
const currentRoute = () => location.hash.slice(1) || "map";

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4500);
}
function save() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
    toast(
      "Не вдалося зберегти прогрес. Завантажте резервну копію в портфоліо.",
    );
  }
  updateHeader();
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 220);
}
window.addEventListener("pagehide", () => save());
function updateHeader() {
  const stats = state.activeLanguage
    ? trackStats(language(), track())
    : { xp: 0, sections: 0 };
  $("#language-label").textContent = state.activeLanguage
    ? `${language().toUpperCase()} / ${LANGUAGES[language()].native} ↗`
    : "ОБРАТИ МОВУ ↗";
  $("#xp-label").textContent = stats.xp + " XP";
  $("#progress-label").textContent = pad(stats.sections) + " / 12";
  $("#storage-label").textContent = storageAvailable
    ? "ЗБЕРІГАЄТЬСЯ НА ПРИСТРОЇ"
    : "ПРОГРЕС НЕ ЗБЕРІГАЄТЬСЯ";
  const next = nextModule();
  $('[data-nav="lab"]').href = "#lab/" + next.id;
}
function nextModule() {
  return (
    modules().find((m) => !sectionStats(m, track()).complete) || modules()[11]
  );
}
function showProfile(selected = state.activeLanguage) {
  const form = $("#profile-form");
  form.reset();
  if (selected) form.elements.language.value = selected;
  form.elements.student.value = state.student;
  form.elements.group.value = state.group;
  $("#profile-dialog").showModal();
}
$("#profile-button").addEventListener("click", () => showProfile());
$$("[data-close]").forEach((b) =>
  b.addEventListener("click", () => b.closest("dialog").close()),
);
$$("dialog").forEach((d) =>
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const rect = d.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      )
        d.close();
    }
  }),
);
$("#profile-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  state.activeLanguage = form.elements.language.value;
  state.student = form.elements.student.value.trim();
  state.group = form.elements.group.value.trim();
  save();
  $("#profile-dialog").close();
  if (pendingRoute) {
    const route = pendingRoute;
    pendingRoute = null;
    if (location.hash === "#" + route) render();
    else location.hash = route;
  } else render({ keepScroll: true });
  toast(
    `Траєкторія: ${LANGUAGES[language()].native}. Прогрес зберігається окремо.`,
  );
});
$("#help-button").addEventListener("click", () =>
  showInfo(
    "Як працює практикум",
    `<ol><li>Оберіть німецьку, французьку або англійську. Матеріали та прогрес кожної траєкторії незалежні.</li><li>У кожному розділі є 4 завдання з автоматичною перевіркою та 1 прикладна робота для викладача. Читайте теорію, досліджуйте тренажери й виправляйте помилки.</li><li>Кожна перевірка записує відповідь, час, результат і кількість підказок. Повторні подання зберігаються; попередній успіх залишається в історії.</li><li>За перше успішне завдання — 40 XP; за подання практичної роботи — 30 XP; за прихований виклик — 60 XP. Повторення не збільшує XP. XP не є оцінкою.</li><li>Розділ завершено після 4 успішних перевірок і подання прикладної роботи. Якість цієї роботи оцінює викладач.</li><li>Завантажте HTML-звіт і передайте його разом з артефактами. Для PDF відкрийте звіт і скористайтеся друком браузера → «Зберегти як PDF».</li><li>У портфоліо експортуйте резервну копію JSON. Прогрес локальний: інший браузер або пристрій потребує імпорту. Серверного кабінету викладача у цій версії немає.</li></ol><p class="micro muted">Навчальні приклади створено для цього практикуму; вони не є репрезентативним корпусом. Команди виконуються в симуляторах. Зовнішні STT, TTS і ШІ автоматично не викликаються.</p>`,
  ),
);
function showInfo(title, html) {
  $("#info-content").innerHTML =
    `<h2 id="info-title">${esc(title)}</h2>${html}`;
  $("#info-dialog").showModal();
}

function render({ keepScroll = false } = {}) {
  const oldY = window.scrollY,
    route = currentRoute(),
    parts = route.split("/"),
    page = parts[0],
    main = $("#main");
  activeTreasure = null;
  $$("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === page);
    if (a.dataset.nav === page) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (page === "lab") {
    const m = moduleById(parts[1]);
    if (!m) {
      main.innerHTML = emptyPage(
        "Такого розділу немає",
        "Поверніться до карти, щоб обрати лабораторну.",
      );
    } else if (!state.activeLanguage) {
      main.innerHTML = gate();
      pendingRoute = route;
      if (!$("#profile-dialog").open) showProfile();
    } else main.innerHTML = renderLab(m);
  } else if (page === "portfolio") {
    main.innerHTML = state.activeLanguage ? renderPortfolio() : gate();
  } else if (page === "reference") {
    main.innerHTML = renderReference();
  } else {
    main.innerHTML = renderMap();
  }
  updateHeader();
  drawWaves();
  updateWer();
  if (keepScroll) window.scrollTo(0, oldY);
  else {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  document.title =
    page === "lab" && moduleById(parts[1])
      ? `${pad(parts[1])} / ${moduleById(parts[1]).title} — lingva.lab`
      : "lingva.lab — Цифрові інструменти для лінгвістів";
}
window.addEventListener("hashchange", () => render());
function emptyPage(title, text) {
  return `<div class="page empty"><h2>${esc(title)}</h2><p>${esc(text)}</p><a class="button dark" href="#map">Карта курсу ↗</a></div>`;
}
function gate() {
  return `<div class="page empty"><p class="mono orange">ТРИ МОВИ / ОДНА ДОСЛІДНИЦЬКА ЛОГІКА</p><h2>Спочатку — мова.</h2><p>Оберіть траєкторію: від неї залежать навчальні тексти, приклади та ваше портфоліо.</p><button class="button primary" data-action="profile">Обрати мову <span>↗</span></button></div>`;
}
function renderMap() {
  const ms = modules(),
    next = nextModule(),
    stats = trackStats(language(), track());
  return `<div class="page">
 <section class="hero" aria-labelledby="hero-title">
   <div class="hero-copy"><p class="mono eyebrow">DIGITAL TOOLS FOR LINGUISTS</p><h1 id="hero-title">Мова —<br>це теж<br><span class="orange">дані.</span></h1><p class="hero-desc">Працюйте з текстами. Досліджуйте мовлення. Ставте інструментам правильні запитання.</p></div>
   <div class="hero-art">
     <div class="lexicon-header mono"><span>МОВА × ТЕХНОЛОГІЇ</span><span>01—12</span></div>
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
 <div class="language-bar"><p class="mono">01 / ВАША МОВА</p><div class="language-buttons">${Object.entries(
   LANGUAGES,
 )
   .map(
     ([key, l]) =>
       `<button class="language-button ${state.activeLanguage === key ? "selected" : ""}" data-language="${key}" aria-pressed="${state.activeLanguage === key}"><b>${key.toUpperCase()}</b> ${l.name}</button>`,
   )
   .join(
     "",
   )}</div><p class="micro muted">Український інтерфейс.<br>Три незалежні траєкторії.</p></div>
 <div class="section-heading"><h2>Маршрут дослідження<span class="orange">.</span></h2><p class="mono">12 РОЗДІЛІВ · 60 ЗАВДАНЬ<br>І СКАРБИ МІЖ РЯДКАМИ</p></div>
 <section class="continue-panel"><div class="continue-number">${pad(next.id)}</div><div><div class="mono">${stats.done ? "ПРОДОВЖУЄМО ЕКСПЕДИЦІЮ" : "ПОЧНІТЬ З ОСНОВ"} / ${next.category}</div><h3>${next.title}</h3><p>${next.short} ${next.time} хв орієнтовно.</p></div><a class="button light" href="#lab/${next.id}">${stats.done ? "Продовжити" : "До лабораторії"} <span>↗</span></a></section>
 <div class="module-filters mono" role="group" aria-label="Фільтр розділів"><button class="filter ${filter === "all" ? "active" : ""}" data-filter="all" aria-pressed="${filter === "all"}">Усі / 12</button><button class="filter ${filter === "new" ? "active" : ""}" data-filter="new" aria-pressed="${filter === "new"}">Попереду</button><button class="filter ${filter === "progress" ? "active" : ""}" data-filter="progress" aria-pressed="${filter === "progress"}">У процесі</button><button class="filter ${filter === "complete" ? "active" : ""}" data-filter="complete" aria-pressed="${filter === "complete"}">Завершені</button></div>
 <div class="module-grid">${ms
   .filter((m) => {
     const s = sectionStats(m, track());
     return (
       filter === "all" ||
       (filter === "new" && s.done === 0 && s.attempts === 0) ||
       (filter === "progress" &&
         !s.complete &&
         (s.done > 0 || s.attempts > 0)) ||
       (filter === "complete" && s.complete)
     );
   })
   .map((m) => moduleCard(m))
   .join("")}</div>${
   !ms.some((m) => {
     const s = sectionStats(m, track());
     return (
       filter === "all" ||
       (filter === "new" && s.done === 0 && s.attempts === 0) ||
       (filter === "progress" &&
         !s.complete &&
         (s.done > 0 || s.attempts > 0)) ||
       (filter === "complete" && s.complete)
     );
   })
     ? '<p class="no-results">Тут поки немає розділів. Продовжуйте свій маршрут.</p>'
     : ""
 }
 <section class="map-note"><h2>Не просто<br>натискати.<br><span class="orange">Розуміти.</span></h2><div><p>Кожен інструмент тут розв’язує реальну задачу лінгвіста: зберегти польовий запис, знайти словоформи, перевірити транскрипцію або дослідити помилку моделі.</p><p class="mono">ПРАКТИКА → ДОКАЗ → ПОРТФОЛІО</p><p>Спроби й виправлення — частина роботи. Накопичуйте досвід, відкривайте відзнаки та забирайте звіт після кожного розділу.</p></div></section>
 </div>`;
}
function moduleCard(m) {
  const s = sectionStats(m, track());
  return `<a class="module-card" href="#lab/${m.id}"><div class="module-card-head mono"><span class="number">${pad(m.id)} / <span class="${s.complete || s.done || s.attempts ? "card-state" : "category"}">${s.complete ? "ЗАВЕРШЕНО" : s.done || s.attempts ? "У ПРОЦЕСІ" : m.category}</span></span><span>${m.time} ХВ</span></div><h3>${m.title}</h3><p>${m.short}</p><div class="module-card-bottom"><div class="task-dots" aria-label="${s.done} із 5 завдань виконано">${m.tasks.map((t) => `<i class="${taskStatus(track().answers[t.id])}"></i>`).join("")}</div><span class="card-arrow" aria-hidden="true">↗</span></div></a>`;
}

function renderLab(m) {
  const s = sectionStats(m, track());
  return `<div class="page"><div class="page-title"><div><p class="mono breadcrumb"><a href="#map">КАРТА КУРСУ</a> / РОЗДІЛ ${pad(m.id)} / ${LANGUAGES[language()].native}</p><h1>${m.title}<span class="orange">.</span></h1></div><p>${m.short}<br><span class="mono muted">${m.time} ХВ · 5 ЗАВДАНЬ · 190 XP</span></p></div>
 <div class="lab-layout"><aside class="lab-sidebar" aria-label="У цьому розділі"><p class="sidebar-title mono">ПОЛЬОВИЙ МАРШРУТ / ${pad(m.id)}</p><nav class="task-nav">${m.tasks.map((t, i) => `<a href="#task-${t.id}" data-scroll-task="${t.id}"><span class="mono">${pad(i + 1)} ${taskStatus(track().answers[t.id]) === "passed" ? "✓" : taskStatus(track().answers[t.id]) === "submitted" ? "↗" : "·"}</span>${t.title}</a>`).join("")}</nav><div class="sidebar-meter"><p class="mono"><span>ВИКОНАНО</span><span>${s.done} / 5</span></p><div class="meter"><i style="width:${s.done * 20}%"></i></div><p class="mono"><span>СПРОБИ ${s.attempts}</span><span>ПОМИЛКИ ${s.errors}</span></p></div><div class="sidebar-controls"><button class="button small dark" data-action="report" data-module="${m.id}">${s.complete ? "Звіт розділу" : "Чернетка звіту"} <span>↓</span></button><button class="button small" data-action="materials" data-module="${m.id}">Матеріали <span>↓</span></button></div><p class="sidebar-disclaimer">Звіт містить історію спроб. Прикладна робота очікує оцінювання викладачем.</p></aside>
 <div class="lab-content"><div class="lab-intro"><div><p class="mono">НАВІЩО ЦЕ ФІЛОЛОГУ</p><h2>Реальна задача</h2><p>${esc(m.case)}</p></div><div><p class="mono">ПІСЛЯ ЦЬОГО РОЗДІЛУ</p><h2>Що ви зможете</h2><p>${esc(m.outcome)}</p></div></div>
 <details class="theory" open><summary class="mono">ПЕРЕД ПОЧАТКОМ / ТЕОРІЯ ТА ДЖЕРЕЛА</summary><div class="theory-body">${esc(m.theory)}<div class="term-chips">${m.terms.map((t) => `<button class="term-chip" data-term="${esc(t)}">${esc(t)} ↗</button>`).join("")}</div><ul class="sources-list">${m.sources.map((key) => `<li><a href="${SOURCES[key].url}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[key].title)} ↗</a></li>`).join("")}</ul></div></details>
 ${m.treasure ? `<p class="treasure-clue mono">${m.treasure === "archive" ? "В архівах інколи трапляються листи з іншого століття." : m.treasure === "unicode" ? "Не всі двійники — той самий символ." : "Ідеальний результат може приховувати пропущене."} <button class="treasure-trigger" data-treasure="${m.treasure}" aria-label="Дослідити примітку: прихований виклик">◇</button></p><div id="treasure-slot"></div>` : ""}
 ${s.complete ? `<div class="section-complete"><p class="mono orange">МАРШРУТ РОЗДІЛУ ПРОЙДЕНО</p><h3>Є результат. Є історія.</h3><p>4 завдання перевірено автоматично; прикладну роботу подано для викладача. Завантажте звіт і передайте артефакти окремо.</p><button class="button small dark" data-action="report" data-module="${m.id}">Завантажити звіт ↓</button></div>` : ""}
 ${m.tasks.map((t, i) => renderTask(t, i)).join("")}<div class="lab-end"><div><p>Маленька вибірка. Чіткий метод.</p><p class="mono">СИЛЬНЕ ДОСЛІДЖЕННЯ ПОЧИНАЄТЬСЯ З ВІДТВОРЮВАНОСТІ.</p></div><a class="button" href="${m.id === 12 ? "#portfolio" : "#lab/" + (m.id + 1)}">${m.id === 12 ? "До портфоліо" : "Наступний розділ"} ↗</a></div></div></div></div>`;
}

function renderTask(t, index) {
  const r = track().answers[t.id],
    status = taskStatus(r),
    latest = r?.attempts.at(-1);
  return `<article class="task-card ${status}" id="task-${t.id}" data-task="${t.id}"><div class="task-top mono"><span>ЗАВДАННЯ ${pad(index + 1)} / ${t.type === "portfolio" ? "ПРИКЛАДНА РОБОТА" : "ДОСЛІДНИЦЬКА ПРАКТИКА"} · ${t.xp} XP</span><span class="task-status ${status}">${labels[status]}</span></div><h2>${esc(t.title)}</h2><p class="task-prompt">${esc(t.prompt)}</p><div class="task-input">${taskInput(t, r?.draft)}</div><div class="task-actions"><button class="button dark" data-check="${t.id}">${t.type === "portfolio" ? (status === "submitted" ? "Подати нову версію" : "Подати роботу") : status === "passed" ? "Перевірити ще раз" : "Перевірити відповідь"} <span>↗</span></button><button class="hint-button" data-hint="${t.id}" aria-expanded="${!!r?.hintOpened}">Підказка${r?.hints ? " · використано" : ""}</button></div>${r?.hintOpened ? `<div class="hint-content">${esc(t.hint)}</div>` : ""}${latest ? `<div class="feedback ${latest.status}" role="status"><b>${labels[latest.status]}.</b> ${esc(latest.feedback)}${status === "passed" && latest.status === "failed" ? "<p>Попередній успіх збережено; ця нова спроба потребує правки.</p>" : ""}</div>` : ""}<p class="attempt-meta mono">СПРОБИ ${r?.attempts.length || 0} · ПОМИЛКИ ${r?.attempts.filter((a) => a.status === "failed").length || 0} · ПОВТОРНІ ПОДАННЯ ${Math.max(0, (r?.attempts.length || 0) - 1)}${r?.toolEvents.length ? " · ПОМИЛКИ КОМАНД " + r.toolEvents.filter((e) => !e.ok).length : ""}</p>${r?.attempts.length ? `<details class="history"><summary>Історія відповідей (${r.attempts.length})</summary><ol>${r.attempts.map((a) => `<li>${date(a.at)} · ${labels[a.status]} · підказки ${a.hints}<pre>${esc(formatTaskValue(t, a.value))}</pre></li>`).join("")}</ol></details>` : ""}</article>`;
}
function optionsInput(t, value) {
  return `<fieldset class="options" style="border:0;padding:0;margin:0"><legend class="sr-only">${esc(t.title)}</legend>${t.options.map((option, i) => `<label class="option"><input type="radio" name="answer-${t.id}" value="${i}" ${value !== null && value !== undefined && String(value) === String(i) ? "checked" : ""}><span>${esc(option)}</span></label>`).join("")}</fieldset>`;
}
function taskInput(t, value) {
  const id = t.id,
    l = LANGUAGES[language()];
  if (t.type === "choice") return optionsInput(t, value);
  if (t.type === "unicode")
    return `<div class="tool"><div class="tool-head mono"><span>UNICODE / ІНСПЕКТОР КОДОВИХ ТОЧОК</span><span>NFC ↔ NFD</span></div><div class="tool-body"><div class="unicode-rows">${[
      l.accent,
      l.nfd,
    ]
      .map(
        (v) =>
          `<div class="unicode-row"><strong lang="${language()}">${esc(v)}</strong>${unicodePoints(
            v,
          )
            .map(
              (c) =>
                `<span class="point"><b>${esc(c.char)}</b>${c.point}</span>`,
            )
            .join(
              "",
            )}<span class="micro muted">${Array.from(v).length} код. точок</span></div>`,
      )
      .join(
        "",
      )}</div><p class="unicode-normalized">Після NFC: <b>${esc(l.accent.normalize("NFC"))}</b> = <b>${esc(l.nfd.normalize("NFC"))}</b>. Візуальна подібність сама по собі не доводить еквівалентність.</p></div></div><div style="margin-top:18px">${optionsInput(t, value)}</div>`;
  if (t.type === "exact")
    return `<label class="input-label" for="answer-${id}">${t.numeric ? "Числова відповідь" : "Ваша відповідь"}</label><${t.answer.length > 75 ? "textarea" : "input"} ${t.answer.length > 75 ? "" : 'type="text"'} id="answer-${id}" data-answer="${id}" class="${t.numeric ? "" : "code-input"}" maxlength="10000" ${t.numeric ? 'inputmode="decimal"' : ""} ${t.answer.length > 75 ? "" : `value="${esc(value || "")}"`} autocomplete="off" spellcheck="false">${t.answer.length > 75 ? esc(value || "") : ""}${t.answer.length > 75 ? "</textarea>" : ""}`;
  if (t.type === "json")
    return `<label class="input-label" for="answer-${id}">JSON-об’єкт</label><textarea id="answer-${id}" data-answer="${id}" class="code-input" spellcheck="false" maxlength="10000" placeholder="{ }">${esc(value || "")}</textarea>`;
  if (t.type === "regex" || t.type === "replace")
    return `<div class="tool"><div class="tool-head mono"><span>REGEX / JAVASCRIPT</span><span>ПРАПОРЦІ gu · МЕЖА 800 мс</span></div><div class="tool-body">${t.targets ? `<div class="target-list">Цільові форми: ${t.targets.map(esc).join(" · ")}</div>` : ""}<div class="regex-fields ${t.type === "regex" ? "single" : ""}"><label><span class="input-label">Шаблон (без / /)</span><input type="text" data-pattern="${id}" class="code-input" maxlength="300" value="${esc(value?.pattern || "")}" spellcheck="false" placeholder="Введіть регулярний вираз"></label>${t.type === "replace" ? `<label><span class="input-label">Заміна (може бути порожня)</span><input type="text" data-replacement="${id}" class="code-input" maxlength="1000" value="${esc(value?.replacement || "")}" spellcheck="false"></label>` : ""}</div><div class="tool-code" lang="${language()}" data-corpus="${id}">${esc(t.corpus)}</div><button class="button small" data-preview-regex="${id}" style="margin-top:14px">${t.type === "replace" ? "Показати заміну" : "Знайти збіги"} ↗</button><div class="tool-result" data-regex-output="${id}" role="status"></div></div></div>`;
  if (t.type === "terminal") {
    const draft = value?.machine
      ? value
      : { machine: createTerminal(language()), commands: [] };
    return `<div class="tool terminal"><div class="tool-head mono"><span>НАВЧАЛЬНИЙ ТЕРМІНАЛ / UNIX</span><span data-cwd="${id}">${esc(draft.machine.cwd)}</span></div><div class="terminal-log" data-terminal-log="${id}" role="log" aria-label="Вивід термінала">${renderCommandLog(track().answers[id]?.toolEvents || [], "Введіть help для списку команд. Файли існують лише в цьому симуляторі.")}</div><div class="terminal-input-row"><span aria-hidden="true">$</span><input type="text" data-command="${id}" aria-label="Команда термінала" autocomplete="off" spellcheck="false" maxlength="500" placeholder="ls"><button data-run-terminal="${id}" aria-label="Виконати команду">ENTER ↵</button></div></div>`;
  }
  if (t.type === "git") {
    const v = value?.history ? value : createGit(language());
    return `<div class="tool terminal"><div class="tool-head mono"><span>GIT / НАВЧАЛЬНИЙ РЕПОЗИТОРІЙ</span><span>transcription.txt</span></div><div class="git-editor"><label class="input-label" for="git-${id}">Робоче дерево — редагуйте цей текст</label><textarea id="git-${id}" data-git-text="${id}" maxlength="10000" spellcheck="false">${esc(v.text)}</textarea><p class="micro muted">Потрібний текст: <span lang="${language()}">${esc(t.expected)}</span></p></div><div class="terminal-log" data-terminal-log="${id}" role="log" aria-label="Вивід Git">${renderCommandLog(track().answers[id]?.toolEvents || [], "Репозиторій уже ініціалізовано. Почніть з git status.")}</div><div class="terminal-input-row"><span aria-hidden="true">$</span><input type="text" data-command="${id}" aria-label="Команда Git" maxlength="500" autocomplete="off" spellcheck="false" placeholder="git status"><button data-run-git="${id}" aria-label="Виконати команду Git">ENTER ↵</button></div></div>`;
  }
  if (t.type === "wave")
    return `<div class="tool"><div class="tool-head mono"><span>ОСЦИЛОГРАМИ / СИНТЕТИЧНИЙ СИГНАЛ</span><span>НАВЧАЛЬНА ВІЗУАЛІЗАЦІЯ</span></div><div class="tool-body"><div class="wave-pair"><div><canvas class="wave-canvas" data-wave="normal" aria-label="Осцилограма: плавні вершини">Плавні вершини сигналу</canvas><p class="wave-label">A / НОРМАЛЬНИЙ РІВЕНЬ</p></div><div><canvas class="wave-canvas" data-wave="clipped" aria-label="Осцилограма: обрізані пласкі вершини">Обрізані вершини сигналу</canvas><p class="wave-label">B / ПЕРЕВАНТАЖЕННЯ</p></div></div></div></div><div style="margin-top:18px">${optionsInput(t, value)}</div>`;
  if (t.type === "interval")
    return `<div class="tool"><div class="tool-head mono"><span>ЧАСОВА ШКАЛА / СИНТЕТИЧНИЙ СИГНАЛ</span><span>0.00 — 1.80 с</span></div><div class="tool-body"><canvas class="wave-canvas" data-wave="segments" aria-label="Три синтетичні сегменти на шкалі від 0 до 1.8 секунди">Сегмент B: 0.60–1.10 с</canvas><div class="signal-timeline"><span style="width:33.333%">A / 0–0.60</span><span class="segment-b" style="width:27.778%">B / 0.60–1.10</span><span style="flex:1">C / 1.10–1.80</span></div><div class="audio-controls"><audio controls preload="metadata" src="assets/training-signal.wav" aria-label="Прослухати синтетичний навчальний сигнал"></audio><a class="button small" href="assets/training-signal.wav" download>WAV ↓</a></div><p class="micro muted">Це синтетичні тони, не запис природного мовлення. Використовуються лише для тренування часових вимірів.</p><div class="interval-fields"><label><span class="input-label">Початок, с</span><input type="text" inputmode="decimal" data-interval="start" value="${esc(value?.start || "")}" aria-label="Початок інтервалу, секунди"></label><label><span class="input-label">Кінець, с</span><input type="text" inputmode="decimal" data-interval="end" value="${esc(value?.end || "")}" aria-label="Кінець інтервалу, секунди"></label><label><span class="input-label">Мітка</span><input type="text" data-interval="label" value="${esc(value?.label || "")}" maxlength="30" aria-label="Мітка інтервалу"></label></div><button class="button small" data-export-grid="${id}" style="margin-top:15px">TextGrid із ваших меж ↓</button></div></div>`;
  if (t.type === "wer")
    return `<div class="tool"><div class="tool-head mono"><span>STT / КАЛЬКУЛЯТОР ПОМИЛОК</span><span>WER = (S + D + I) / N</span></div><div class="tool-body"><div class="wer-pair"><div><p class="input-label">Еталон</p><p class="tool-code" lang="${language()}">${esc(t.reference)}</p></div><label><span class="input-label">Гіпотеза — редагуйте</span><textarea data-answer="${id}" data-wer="${id}" lang="${language()}" maxlength="5000" spellcheck="false">${esc(value ?? t.hypothesis)}</textarea></label></div><div data-wer-result="${id}" aria-live="polite"></div></div></div>`;
  if (t.type === "portfolio")
    return `<div class="portfolio-rubric"><p class="mono">КРИТЕРІЇ ДЛЯ ВИКЛАДАЧА</p><ul>${t.rubric.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div><div class="portfolio-fields"><label><span class="input-label">Артефакт: назва файла / шлях / посилання (від 5 символів)</span><input type="text" data-portfolio="artifact" value="${esc(value?.artifact || "")}" maxlength="1000" placeholder="Назва збереженого файла; передайте його викладачеві окремо"></label><label><span class="input-label">Метод, інструмент і результати (від 120 символів)</span><textarea data-portfolio="method" maxlength="15000" placeholder="Що ви зробили? Які дані, команди, вимірювання або джерела використали?">${esc(value?.method || "")}</textarea></label><label><span class="input-label">Обмеження та висновок (від 100 символів)</span><textarea data-portfolio="reflection" maxlength="15000" placeholder="Що лишається непевним? Що не спрацювало? Як інший дослідник перевірить результат?">${esc(value?.reflection || "")}</textarea></label><label class="confirm-label"><input type="checkbox" data-portfolio="confirm" ${value?.confirm ? "checked" : ""}><span>Я перевірив/ла роботу за критеріями. Зберігаю артефакти окремо та передам їх разом зі звітом. Розумію, що подання очікує оцінювання викладачем.</span></label></div>`;
  return "";
}

function renderCommandLog(events, empty) {
  return events.length
    ? events
        .map(
          (e) =>
            `<div class="command">$ ${esc(e.input)}</div><div class="${e.ok ? "" : "terminal-error"}">${esc(e.output)}</div>`,
        )
        .join("")
    : esc(empty);
}
function readValue(t) {
  const root = $(`[data-task="${t.id}"]`),
    r = track().answers[t.id];
  if (["choice", "unicode", "wave"].includes(t.type))
    return $(`input[name="answer-${t.id}"]:checked`, root)?.value ?? null;
  if (["exact", "json", "wer"].includes(t.type))
    return $("[data-answer]", root).value;
  if (["regex", "replace"].includes(t.type))
    return {
      pattern: $("[data-pattern]", root).value,
      replacement: $("[data-replacement]", root)?.value || "",
    };
  if (t.type === "terminal")
    return r?.draft?.machine
      ? r.draft
      : { machine: createTerminal(language()), commands: [] };
  if (t.type === "git") {
    const v = r?.draft?.history ? r.draft : createGit(language());
    v.text = $("[data-git-text]", root).value;
    return v;
  }
  if (t.type === "interval")
    return Object.fromEntries(
      $$("[data-interval]", root).map((input) => [
        input.dataset.interval,
        input.value,
      ]),
    );
  if (t.type === "portfolio")
    return Object.fromEntries(
      $$("[data-portfolio]", root).map((input) => [
        input.dataset.portfolio,
        input.type === "checkbox" ? input.checked : input.value,
      ]),
    );
}
$("#main").addEventListener("input", (e) => {
  const article = e.target.closest("[data-task]");
  if (article) {
    const t = taskById(article.dataset.task);
    if (!t) return;
    answerRecord(track(), t.id).draft = readValue(t);
    scheduleSave();
    if (t.type === "wer") updateWer();
  }
  if (e.target.id === "reference-search") filterGlossary(e.target.value);
});
$("#main").addEventListener("change", (e) => {
  const article = e.target.closest("[data-task]");
  if (article) {
    const t = taskById(article.dataset.task);
    if (t) {
      answerRecord(track(), t.id).draft = readValue(t);
      scheduleSave();
    }
  }
});
$("#main").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches("[data-command]")) {
    e.preventDefault();
    executeCommand(e.target.dataset.command);
  }
});

$("#main").addEventListener("click", async (e) => {
  const b = e.target.closest("button,a");
  if (!b) return;
  if (b.dataset.language) {
    showProfile(b.dataset.language);
    return;
  }
  if (b.dataset.filter) {
    filter = b.dataset.filter;
    render({ keepScroll: true });
    return;
  }
  if (b.dataset.scrollTask) {
    e.preventDefault();
    $("#task-" + b.dataset.scrollTask)?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    $$(".task-nav a").forEach((a) => a.classList.toggle("active", a === b));
    return;
  }
  if (b.dataset.term) {
    const term = GLOSSARY.find((t) => t[0] === b.dataset.term);
    if (term)
      showInfo(
        term[0],
        `<p>${esc(term[1])}</p><p><a href="${SOURCES[term[2]].url}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[term[2]].title)} ↗</a></p>`,
      );
    return;
  }
  if (b.dataset.hint) {
    const t = taskById(b.dataset.hint),
      r = answerRecord(track(), t.id);
    if (!r.hintOpened) {
      r.hints++;
      r.hintOpened = true;
    } else r.hintOpened = false;
    save();
    render({ keepScroll: true });
    return;
  }
  if (b.dataset.check) {
    await checkTask(b.dataset.check, b);
    return;
  }
  if (b.dataset.previewRegex) {
    b.disabled = true;
    const t = taskById(b.dataset.previewRegex),
      value = readValue(t),
      result = await runRegex(t, value);
    b.disabled = false;
    renderRegexResult(t, result);
    return;
  }
  if (b.dataset.runTerminal || b.dataset.runGit) {
    executeCommand(b.dataset.runTerminal || b.dataset.runGit);
    return;
  }
  if (b.dataset.treasure) {
    activeTreasure = b.dataset.treasure;
    $("#treasure-slot").innerHTML = renderTreasure(activeTreasure);
    return;
  }
  if (b.dataset.checkTreasure) {
    checkTreasure(b.dataset.checkTreasure);
    return;
  }
  if (b.dataset.exportGrid) {
    const t = taskById(b.dataset.exportGrid),
      v = readValue(t),
      start = Number(String(v.start).replace(",", ".")),
      end = Number(String(v.end).replace(",", "."));
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start <= 0 ||
      end <= start ||
      end >= 1.8 ||
      !v.label.trim()
    ) {
      toast("Укажіть 0 < початок < кінець < 1.80 та непорожню мітку.");
      return;
    }
    download(
      "training-segments.TextGrid",
      exportTextGrid(start, end, v.label),
      "text/plain;charset=utf-8",
    );
    return;
  }
  switch (b.dataset.action) {
    case "profile":
      showProfile();
      break;
    case "report":
      generateReport(Number(b.dataset.module));
      break;
    case "report-json":
      generateReport(Number(b.dataset.module), "json");
      break;
    case "materials":
      downloadMaterials(Number(b.dataset.module));
      break;
    case "backup":
      save();
      download(
        `lingva-lab-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(state, null, 2),
        "application/json",
      );
      toast(
        "Резервну копію завантажено. Вона містить ваші відповіді та історію.",
      );
      break;
    case "import":
      $("#backup-input").click();
      break;
  }
});

async function checkTask(id, button) {
  const t = taskById(id),
    value = readValue(t),
    langAtStart = language();
  button.disabled = true;
  let regexResult;
  if (["regex", "replace"].includes(t.type))
    regexResult = await runRegex(t, value);
  if (language() !== langAtStart) return;
  const result = evaluateTask(t, value, regexResult),
    previousBadges = badges(language(), track()).filter(
      (b) => b.unlocked,
    ).length,
    { newXP } = recordAttempt(track(), t, value, result);
  save();
  render({ keepScroll: true });
  if (regexResult) renderRegexResult(t, regexResult);
  const currentButton = $(`[data-check="${id}"]`);
  currentButton?.focus({ preventScroll: true });
  if (newXP)
    toast(
      `+${newXP} XP · ${result.status === "submitted" ? "Подання збережено для викладача" : "Результат перевірено"}${badges(language(), track()).filter((b) => b.unlocked).length > previousBadges ? " · Відкрито відзнаку!" : ""}`,
    );
  else if (result.status === "failed")
    toast("Спробу збережено. Перевірте пояснення під завданням.");
  else toast("Нову спробу збережено. XP за це завдання вже нараховано.");
}
function runRegex(t, value) {
  return new Promise((resolve) => {
    let worker;
    try {
      worker = new Worker(new URL("./regex-worker.js", import.meta.url));
    } catch {
      resolve({
        error:
          "Не вдалося запустити Worker. Відкрийте практикум через локальний HTTP-сервер.",
      });
      return;
    }
    const timeout = setTimeout(() => {
      worker.terminate();
      resolve({
        error:
          "Обчислення перевищило 800 мс. Спростіть повтори та вкладені групи.",
      });
    }, 800);
    worker.onmessage = ({ data }) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(data);
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      worker.terminate();
      resolve({ error: "Не вдалося виконати регулярний вираз." });
    };
    worker.postMessage({ ...value, corpus: t.corpus, type: t.type });
  });
}
function renderRegexResult(t, result) {
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
    html +=
      esc(t.corpus.slice(position, m.index)) +
      "<mark>" +
      esc(m.text) +
      "</mark>";
    position = m.index + m.text.length;
  }
  html += esc(t.corpus.slice(position));
  corpus.innerHTML = html;
  output.textContent = `Знайдено ${result.matches.length} збігів: ${result.matches.map((m) => m.text).join(" · ") || "—"}`;
}
function executeCommand(id) {
  const t = taskById(id),
    input = $(`[data-command="${id}"]`),
    command = input.value.trim();
  if (!command) return;
  const r = answerRecord(track(), id);
  let output, ok;
  if (t.type === "git") {
    const value = readValue(t),
      result = runGit(value, command);
    r.draft = result.state;
    output = result.output;
    ok = result.ok;
  } else {
    const value = readValue(t),
      result = runTerminal(value.machine, command);
    r.draft = {
      machine: result.machine,
      commands: [
        ...value.commands,
        {
          input: command,
          ok: result.ok,
          action: result.action,
          target: result.target || null,
          pattern: result.pattern || null,
        },
      ],
    };
    output = result.output;
    ok = result.ok;
    const cwd = $(`[data-cwd="${id}"]`);
    cwd.textContent = result.machine.cwd;
  }
  r.toolEvents.push({ at: now(), input: command, output, ok });
  const log = $(`[data-terminal-log="${id}"]`);
  log.innerHTML = renderCommandLog(r.toolEvents, "");
  log.scrollTop = log.scrollHeight;
  input.value = "";
  input.focus();
  save();
  const meta = $(`[data-task="${id}"] .attempt-meta`);
  meta.textContent = `СПРОБИ ${r.attempts.length} · ПОМИЛКИ ${r.attempts.filter((a) => a.status === "failed").length} · ПОВТОРНІ ПОДАННЯ ${Math.max(0, r.attempts.length - 1)} · ПОМИЛКИ КОМАНД ${r.toolEvents.filter((e) => !e.ok).length}`;
  if (
    t.type === "terminal" &&
    t.goal === "navigate" &&
    ok &&
    output.includes("[1893]")
  )
    toast(
      "Ви знайшли лист! Примітка ◇ над завданнями відкриває архівний виклик.",
    );
}
function updateWer() {
  const input = $("[data-wer]");
  if (!input) return;
  const t = taskById(input.dataset.wer),
    result = wer(t.reference, input.value);
  $(`[data-wer-result="${t.id}"]`).innerHTML =
    `<div class="wer-readout"><strong>${result.rate === null ? "—" : (result.rate * 100).toFixed(1)}<small>%</small></strong><span class="mono">S ${result.S} · D ${result.D} · I ${result.I} · N ${result.N}</span></div><div class="alignment">${result.alignment.map((a) => `<span class="${a.type === "=" ? "" : "error"}" title="${a.type === "S" ? "Заміна" : a.type === "D" ? "Пропуск" : a.type === "I" ? "Вставка" : "Збіг"}">${esc(a.reference)}${a.type === "=" ? "" : " → " + esc(a.hypothesis)}</span>`).join("")}</div><p class="micro muted" style="margin-top:12px">Пробільна токенізація; нижній регістр, NFC, без крайової пунктуації. Це навчальне правило; воно не є універсальним для всіх мов.</p>`;
}
function drawWaves() {
  $$("[data-wave]").forEach((canvas) => {
    const rect = canvas.getBoundingClientRect(),
      ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    const w = rect.width,
      h = rect.height;
    ctx.strokeStyle = "#bdbbae";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.strokeStyle = canvas.dataset.wave === "clipped" ? "#e94720" : "#34362e";
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      let sample =
        Math.sin(x * 0.29) * (0.45 + 0.45 * Math.sin(x * 0.021) ** 2);
      if (canvas.dataset.wave === "clipped")
        sample = Math.max(-0.7, Math.min(0.7, sample * 2));
      if (canvas.dataset.wave === "segments") {
        const time = (x / w) * 1.8;
        sample = signalSample(time);
      }
      const y = h / 2 - sample * h * 0.4;
      if (!x) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (canvas.dataset.wave === "segments") {
      ctx.strokeStyle = "#e94720";
      ctx.setLineDash([3, 3]);
      for (const t of [0.6, 1.1]) {
        ctx.beginPath();
        ctx.moveTo((t / 1.8) * w, 0);
        ctx.lineTo((t / 1.8) * w, h);
        ctx.stroke();
      }
    }
  });
}
function signalSample(t) {
  const segment = t < 0.6 ? 0 : t < 1.1 ? 1 : 2,
    starts = [0, 0.6, 1.1],
    ends = [0.6, 1.1, 1.8],
    edge = Math.min(
      1,
      (t - starts[segment]) / 0.04,
      (ends[segment] - t) / 0.04,
    );
  return (
    0.65 *
    Math.max(0, edge) *
    Math.sin(2 * Math.PI * [180, 260, 340][segment] * t)
  );
}
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(drawWaves, 120);
});

function renderTreasure(key) {
  const t = TREASURES[key],
    r = track().treasures[key],
    latest = r?.attempts.at(-1);
  return `<section class="treasure-panel"><p class="mono orange">ПРИХОВАНИЙ ВИКЛИК / +60 XP ОДИН РАЗ</p><h3>${t.title}</h3><p>${esc(t.prompt)}</p><div style="margin-top:18px">${t.options.map((o, i) => `<label class="option"><input type="radio" name="treasure-${key}" value="${i}" ${String(latest?.value) === String(i) ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}</div><button class="button light" data-check-treasure="${key}" style="margin-top:18px">Перевірити знахідку ↗</button>${latest ? `<div class="feedback ${latest.status}">${esc(latest.feedback)}</div><p class="micro muted">Спроби: ${r.attempts.length}; помилки: ${r.attempts.filter((a) => a.status === "failed").length}. Історія входить до звіту розділу.</p>` : ""}</section>`;
}
function checkTreasure(key) {
  const input = $(`input[name="treasure-${key}"]:checked`);
  if (!input) {
    toast("Оберіть відповідь на прихований виклик.");
    return;
  }
  const t = TREASURES[key],
    r = (track().treasures[key] ??= { attempts: [] }),
    wasPassed = r.attempts.some((a) => a.status === "passed"),
    pass = Number(input.value) === t.answer;
  r.attempts.push({
    at: now(),
    value: input.value,
    status: pass ? "passed" : "failed",
    feedback: pass
      ? t.explain
      : "Поверніться до означень: тут є методологічна пастка.",
    hints: 0,
  });
  save();
  $("#treasure-slot").innerHTML = renderTreasure(key);
  if (pass && !wasPassed) toast("+60 XP · Прихований виклик розв’язано!");
}

function renderPortfolio() {
  const s = trackStats(language(), track());
  return `<div class="page"><div class="page-title"><div><p class="mono eyebrow">${LANGUAGES[language()].native} / ${esc(state.student || "ВАШ ДОСЛІДНИЦЬКИЙ ЩОДЕННИК")}</p><h1>Робота залишає<br><span class="orange">слід.</span></h1></div><p>Ваші результати, історія рішень і матеріали для викладача.</p></div><div class="stats-grid"><div class="stat-block"><strong>${s.xp}<span class="orange">.</span></strong><span class="mono">XP / ДОСЛІДНИЦЬКИЙ ДОСВІД</span></div><div class="stat-block"><strong>${pad(s.sections)}<small> / 12</small></strong><span class="mono">РОЗДІЛІВ ЗАВЕРШЕНО</span></div><div class="stat-block"><strong>${s.passed}<small> / 48</small></strong><span class="mono">АВТОМАТИЧНО ПЕРЕВІРЕНО</span></div><div class="stat-block"><strong>${s.submitted}<small> / 12</small></strong><span class="mono">РОБІТ ДЛЯ ВИКЛАДАЧА</span></div></div><p class="local-notice mono">СПРОБИ ${s.attempts} · ПОМИЛКИ ПЕРЕВІРКИ ${s.errors} · ПОМИЛКИ КОМАНД ${s.commandErrors} · ПОВТОРНІ ПОДАННЯ ${s.resubmissions} · ПІДКАЗКИ ${s.hints}</p>
 <div class="portfolio-grid"><section><h2>Звіти розділів</h2><p class="micro muted" style="margin-bottom:20px">HTML-звіт містить відповіді й історію. Для PDF відкрийте його та оберіть «Друк → Зберегти як PDF». JSON — структуровані дані одного розділу.</p>${modules()
   .map((m) => {
     const ms = sectionStats(m, track());
     return `<div class="report-row"><div><h3><span class="orange">${pad(m.id)} /</span> ${m.title}</h3><p class="mono">${ms.done}/5 · ${ms.complete ? "ЗАВЕРШЕНО · РОБОТА ОЧІКУЄ ОЦІНЮВАННЯ" : ms.attempts ? "У ПРОЦЕСІ · ЧЕРНЕТКА" : "ЩЕ НЕ РОЗПОЧАТО"}</p></div><div class="report-actions"><button class="button small" data-action="report" data-module="${m.id}">HTML ↓</button><button class="button small" data-action="report-json" data-module="${m.id}">JSON ↓</button></div></div>`;
   })
   .join(
     "",
   )}</section><aside><h2>Відзнаки за роботу</h2><div class="badge-grid">${badges(
   language(),
   track(),
 )
   .map(
     (b) =>
       `<div class="badge ${b.unlocked ? "unlocked" : ""}"><span aria-hidden="true">${b.mark}</span><h3>${b.name}</h3><p>${b.description}</p><p class="mono">${b.unlocked ? "ВІДКРИТО" : "ЩЕ ПОПЕРЕДУ"}</p></div>`,
   )
   .join(
     "",
   )}</div><div class="backup-panel"><h3>Збережіть свій маршрут.</h3><p>Усі три траєкторії, відповіді, чернетки та історія — в одному файлі. Імпорт замінить локальний прогрес; перед цим ви зможете завантажити поточну копію.</p><div class="backup-actions"><button class="button small dark" data-action="backup">Резервна копія ↓</button><button class="button small" data-action="import">Імпорт ↑</button><input type="file" id="backup-input" accept="application/json,.json" class="sr-only" aria-label="Файл резервної копії"></div></div><div class="assessment"><h3>Оцінювання курсу</h3><p>Пропозиція з наданого outline. XP позначає прогрес і не переводиться автоматично в оцінку.</p><div class="assessment-lines"><div class="assessment-line"><b>30%</b> Практичне портфоліо</div><div class="assessment-line"><b>20%</b> Підсумкова цифрова грамотність</div><div class="assessment-line"><b>50%</b> Мале цифрове дослідження</div></div><p class="micro muted" style="margin-top:16px">Окремий підсумковий тест 20% поки не реалізовано; його зміст і відбір портфоліо затверджує викладач. Автоперевірки тут — формувальна практика.</p></div><p class="local-notice">Дані зберігаються у localStorage цього браузера. Вони можуть зникнути після очищення даних сайту. Звіти не підписані сервером; викладач перевіряє артефакти та самостійність роботи.</p></aside></div></div>`;
}

function renderReference() {
  return `<div class="page"><div class="page-title"><div><p class="mono eyebrow">ТЕРМІНИ / МЕТОДИ / ПЕРШОДЖЕРЕЛА</p><h1>Розуміти,<br>що за <span class="orange">словом.</span></h1></div><p>Короткі означення — поруч. Докладні пояснення — у документації авторів інструментів і стандартів.</p></div><div class="reference-layout"><section><label class="sr-only" for="reference-search">Пошук терміна або означення</label><div class="reference-search"><input type="search" id="reference-search" placeholder="Знайти термін: Unicode, коміт, WER…" autocomplete="off"></div><div id="glossary-list">${GLOSSARY.map(([term, definition, key]) => `<article class="glossary-item" data-glossary="${esc((term + " " + definition).toLocaleLowerCase("uk"))}"><h2>${esc(term)}</h2><p>${esc(definition)}</p><a href="${SOURCES[key].url}" target="_blank" rel="noopener noreferrer">ПЕРШОДЖЕРЕЛО ↗</a></article>`).join("")}</div><p id="glossary-empty" class="no-results" hidden>Термін не знайдено. Спробуйте коротший запит.</p></section><aside class="reference-sources"><h2>Джерела для практики</h2>${Object.values(
    SOURCES,
  )
    .map(
      (s) =>
        `<article class="source-item"><a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p>${esc(s.note)}</p></article>`,
    )
    .join(
      "",
    )}<p class="local-notice">Навчальний маршрут складено за наданим документом «Digital Tools for Linguists Course outline» з урахуванням пізніших уточнень і лабораторних №1–3. Практичні тексти на сайті — авторські навчальні мініприклади, а не цитати з літературних корпусів.</p></aside></div></div>`;
}
function filterGlossary(query) {
  let visible = 0;
  $$("[data-glossary]").forEach((item) => {
    item.hidden = !item.dataset.glossary.includes(
      query.toLocaleLowerCase("uk").trim(),
    );
    if (!item.hidden) visible++;
  });
  $("#glossary-empty").hidden = visible > 0;
}

function download(filename, content, type = "text/plain;charset=utf-8") {
  const blob =
      content instanceof Blob ? content : new Blob([content], { type }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function reportData(id) {
  const m = moduleById(id),
    ms = sectionStats(m, track());
  return {
    application: "lingva.lab",
    version: 1,
    generatedAt: now(),
    language: language(),
    languageName: LANGUAGES[language()].name,
    student: state.student,
    group: state.group,
    module: { id: m.id, title: m.title, outcome: m.outcome, case: m.case },
    summary: ms,
    completion: ms.complete
      ? "Практику розділу пройдено; прикладна робота очікує оцінювання"
      : "Незавершена чернетка",
    tasks: m.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      prompt: t.prompt,
      rubric: t.rubric || null,
      status: taskStatus(track().answers[t.id]),
      record: track().answers[t.id] || null,
    })),
    treasure: m.treasure
      ? {
          title: TREASURES[m.treasure].title,
          record: track().treasures[m.treasure] || null,
        }
      : null,
    sources: m.sources.map((key) => SOURCES[key]),
    note: "Локальний навчальний звіт. Автоматичні результати й наявність артефактів не засвідчені сервером; потребують перевірки викладачем.",
  };
}
function generateReport(id, format = "html") {
  save();
  const data = reportData(id),
    name = `lingva-lab_${language()}_${pad(id)}_${data.summary.complete ? "report" : "draft"}`;
  if (format === "json")
    download(name + ".json", JSON.stringify(data, null, 2), "application/json");
  else download(name + ".html", reportHtml(data), "text/html;charset=utf-8");
  toast(
    data.summary.complete
      ? "Звіт завантажено. Прикладну роботу оцінює викладач."
      : "Чернетку звіту завантажено. Розділ ще не завершено.",
  );
}
function reportHtml(d) {
  return `<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Звіт ${pad(d.module.id)} — ${esc(d.student || "lingva.lab")}</title><style>body{font:15px/1.65 Arial,sans-serif;max-width:960px;padding:35px;margin:auto;color:#171713;background:#faf9f3}h1,h2{line-height:1.15;letter-spacing:-.03em}h1{font-size:40px}h2{font-size:25px;border-top:1px solid;padding-top:20px}h3{font-size:17px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eae8dc;padding:15px;font-size:12px}small{color:#626256}.status{font-weight:bold;color:#b93b1b}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ccc;text-align:left;padding:8px}article{margin:30px 0}.attempt{border-left:2px solid #aaa;padding-left:15px;margin:20px 0}.note{padding:15px;background:#eae8dc}@media print{body{padding:0;font-size:11px;background:white}h1{font-size:28px}.attempt{break-inside:avoid}a{color:inherit}}</style><body><p>LINGVA.LAB / DIGITAL TOOLS FOR LINGUISTS</p><h1>${pad(d.module.id)} / ${esc(d.module.title)}</h1><p class="status">${esc(d.completion)}</p><table><tr><th>Студент/ка</th><td>${esc(d.student || "Не вказано")}</td><th>Група</th><td>${esc(d.group || "Не вказано")}</td></tr><tr><th>Мова</th><td>${esc(d.languageName)}</td><th>Створено</th><td>${date(d.generatedAt)}</td></tr><tr><th>Перевірено</th><td>${d.summary.passed}/4</td><th>Подано для викладача</th><td>${d.summary.submitted}/1</td></tr><tr><th>Спроби / помилки</th><td>${d.summary.attempts} / ${d.summary.errors}</td><th>Повторні подання</th><td>${d.tasks.reduce((n, t) => n + Math.max(0, (t.record?.attempts.length || 0) - 1), 0)}</td></tr></table><p class="note">${esc(d.note)} Для PDF: Друк у браузері → Зберегти як PDF. Прикладні артефакти передаються разом зі звітом окремо.</p><h2>Мета та застосування</h2><p>${esc(d.module.outcome)}</p><p>${esc(d.module.case)}</p>${d.tasks.map((t) => `<article><h2>${esc(t.id)} / ${esc(t.title)}</h2><p class="status">${labels[t.status]}</p><p>${esc(t.prompt)}</p>${t.rubric ? `<h3>Критерії ручного оцінювання</h3><ul>${t.rubric.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}<p>Підказки: ${t.record?.hints || 0}. Спроби: ${t.record?.attempts.length || 0}. Помилки: ${t.record?.attempts.filter((a) => a.status === "failed").length || 0}. Повторні подання: ${Math.max(0, (t.record?.attempts.length || 0) - 1)}.</p>${t.record?.attempts.map((a, i) => `<div class="attempt"><h3>Спроба ${i + 1} · ${date(a.at)} · ${labels[a.status]}</h3><p>Підказок на момент подання: ${a.hints}.</p><pre>${esc(formatReportValue(t, a.value))}</pre><p>${esc(a.feedback)}</p></div>`).join("") || "<p>Спроб ще немає.</p>"}${t.record?.draft !== null && t.record?.draft !== undefined ? `<details><summary>Поточна чернетка</summary><pre>${esc(formatReportValue(t, t.record.draft))}</pre></details>` : ""}${t.record?.toolEvents.length ? `<h3>Журнал команд (${t.record.toolEvents.filter((e) => !e.ok).length} помилок)</h3>${t.record.toolEvents.map((e) => `<pre>${date(e.at)} · ${e.ok ? "Успіх" : "Помилка"}\n$ ${esc(e.input)}\n${esc(e.output)}</pre>`).join("")}` : ""}</article>`).join("")}${d.treasure ? `<h2>Прихований виклик / ${esc(d.treasure.title)}</h2>${d.treasure.record?.attempts.map((a, i) => `<p>Спроба ${i + 1}, ${date(a.at)}: варіант ${Number(a.value) + 1}; ${labels[a.status]}. ${esc(a.feedback)}</p>`).join("") || "<p>Не подано.</p>"}` : ""}<h2>Джерела</h2><ul>${d.sources.map((s) => `<li><a href="${s.url}">${esc(s.title)}</a></li>`).join("")}</ul></body></html>`;
}
function formatReportValue(t, value) {
  const task = taskById(t.id);
  if (task?.options && value !== null && value !== undefined)
    return `${Number(value) + 1}. ${task.options[Number(value)] ?? "Невідомий варіант"}`;
  return formatTaskValue(task, value);
}
function downloadMaterials(id) {
  const l = LANGUAGES[language()],
    m = moduleById(id);
  let content, name;
  if (id === 3) {
    name = "academic-text.txt";
    content = l.academic + "\n\n" + l.special;
  } else if (id === 2) {
    name = "wordlist.csv";
    content = `form,lemma,pos\n${l.forms[0]},${l.lemma},NOUN\n${l.forms[1]},${l.lemma},NOUN\n`;
  } else if ([6, 7].includes(id)) {
    name = "regex-corpus.txt";
    content = l.regexCorpus + "\n" + l.variantCorpus + "\n\n" + l.transcript;
  } else if (id === 10) {
    download(
      "training-signal.wav",
      new Blob([signalWav()], { type: "audio/wav" }),
    );
    toast(
      "WAV завантажено. TextGrid експортується з тренажера після введення меж.",
    );
    return;
  } else if (id === 11) {
    name = "stt-comparison.txt";
    content = `REFERENCE:\n${l.reference}\n\nHYPOTHESIS:\n${l.hypothesis}\n\nTTS TEST:\n${l.tts}`;
  } else {
    name = "research-materials.txt";
    content = `${l.sample}\n\n${l.sentence}\n\n${l.ambiguous}`;
  }
  download(
    `lab-${pad(id)}-${language()}-${name}`,
    `LINGVA.LAB / ${m.title}\nМова: ${l.native}\nНавчальні авторські приклади; не природний корпус.\n\n${content}\n\nЗавдання для портфоліо:\n${m.tasks[4].prompt}\n\nКритерії:\n${m.tasks[4].rubric.join("\n")}\n`,
  );
}
function signalWav() {
  const rate = 16000,
    length = Math.round(rate * 1.8),
    buffer = new ArrayBuffer(44 + length * 2),
    v = new DataView(buffer);
  const text = (offset, s) =>
    [...s].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++)
    v.setInt16(44 + i * 2, Math.round(signalSample(i / rate) * 32767), true);
  return buffer;
}

document.addEventListener("change", async (e) => {
  if (e.target.id !== "backup-input") return;
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    toast("Резервна копія завелика: межа 8 МБ.");
    return;
  }
  try {
    const imported = validateBackup(JSON.parse(await file.text()));
    showInfo(
      "Відновити маршрут?",
      `<p>Файл містить прогрес для ${esc(imported.student || "студента без імені")}. Поточний прогрес у цьому браузері буде замінено.</p><div class="backup-actions"><button class="button small" id="pre-import-backup">Зберегти поточну копію ↓</button><button class="button small primary" id="confirm-import">Замінити й відновити ↑</button></div>`,
    );
    $("#pre-import-backup").onclick = () =>
      download(
        "lingva-lab-before-import.json",
        JSON.stringify(state, null, 2),
        "application/json",
      );
    $("#confirm-import").onclick = () => {
      state = imported;
      save();
      $("#info-dialog").close();
      render();
      toast("Резервну копію відновлено.");
    };
  } catch (error) {
    toast("Не вдалося імпортувати: " + error.message);
  }
  e.target.value = "";
});

render();
