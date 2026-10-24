import {
  LANGUAGES,
  PATHS,
  getPath,
  getChapter,
  getExercise,
  GLOSSARY,
  SOURCES,
} from "../content/registry.js";
import {
  freshState,
  STORAGE_KEY,
  loadProgress,
  validateBackup,
} from "./persistence/state.js";
import {
  answerRecord,
  sectionStats,
  trackStats,
  badges,
  recordAttempt,
  recordTreasureAttempt,
} from "./learning/progress.js";
import { checkAnswer } from "./learning/check-answer.js";

import { createTerminal, runTerminal } from "./tools/terminal.js";
import { createGit, runGit } from "./tools/git.js";
import { exportTextGrid } from "./tools/audio.js";
import { now } from "./shared/values.js";

import { PageActivityClock, formatDuration } from "./features/activity.js";
import {
  FEEDBACK_STORAGE_KEY,
  freshFeedbackStore,
  validateFeedbackStore,
  feedbackModule,
  createChapterFeedback,
  chapterFeedbackText,
} from "./features/feedback-model.js";
import { t, setInterfaceLocale } from "./i18n/index.js";

import { $, $$ } from "./ui/dom.js";
import { esc, pad } from "./shared/format.js";
import { download } from "./ui/download.js";
import { runRegex } from "./tools/regex.js";
import { renderRegexResult } from "./ui/exercises/regex.js";
import { updateWer } from "./ui/exercises/wer.js";
import { drawWaves } from "./ui/exercises/audio.js";
import { signalWav } from "./tools/audio.js";
import { reportHtml } from "./reports/html.js";
import { createReportData } from "./reports/data.js";
import { createMapView } from "./ui/pages/map.js";
import { createChapterView } from "./ui/pages/chapter.js";
import { createPortfolioView } from "./ui/pages/portfolio.js";
import { createReferenceView } from "./ui/pages/reference.js";
import { createEmptyView } from "./ui/pages/empty.js";
import { createExerciseView } from "./ui/exercises/render.js";
import { createFeedbackView } from "./ui/pages/feedback.js";
let state = freshState(),
  progressWritable = true,
  recoveryCopy = null,
  storageAvailable = true,
  toastTimer,
  saveTimer,
  pendingRoute = null,
  filter = "all",
  activeTreasure = null;
try {
  const restored = loadProgress(localStorage);
  state = restored.state;
  progressWritable = restored.writable;
  recoveryCopy = restored.recovery;
  storageAvailable = restored.writable;
} catch (error) {
  storageAvailable = false;
  progressWritable = false;
  console.warn("Could not restore local progress:", error.message);
}
setInterfaceLocale(state.interfaceLocale);
document.documentElement.lang = state.interfaceLocale;
for (const element of document.querySelectorAll("[data-i18n]"))
  element.textContent = t(element.dataset.i18n);
const pathId = () => state.activePathId || Object.keys(PATHS)[0];
const course = () => getPath(pathId());
const language = () => course().language;
const track = () => state.paths[pathId()];
const modules = () => course().chapters;
const moduleById = (id) => getChapter(pathId(), id);
const taskById = (id) => getExercise(pathId(), id);
const currentRoute = () => location.hash.slice(1) || "map";
const activityClock = new PageActivityClock();
let feedbackStore = freshFeedbackStore(),
  feedbackSaveTimer,
  feedbackDirty = false,
  feedbackStorageAvailable = true,
  feedbackOpenKey = null;
try {
  const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
  if (raw) feedbackStore = validateFeedbackStore(JSON.parse(raw));
} catch {
  feedbackStorageAvailable = false;
}

function persistFeedback() {
  clearTimeout(feedbackSaveTimer);
  if (!feedbackDirty) return;
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbackStore));
    feedbackDirty = false;
    feedbackStorageAvailable = true;
  } catch {
    feedbackStorageAvailable = false;
  }
}
window.addEventListener("pagehide", persistFeedback);
document.addEventListener("visibilitychange", persistFeedback);

function checkpointActivity({
  syncRoute = false,
  interacted = false,
  leaving = false,
} = {}) {
  let key = activityClock.key;
  if (leaving) key = null;
  else if (syncRoute) {
    const [page, id] = currentRoute().split("/");
    key =
      state.activePathId && page === "lab" && moduleById(id) && $(".lab-layout")
        ? `${pathId()}/${id}`
        : null;
  }
  const sample = activityClock.sample({
    key,
    visible: document.visibilityState === "visible",
    focused: document.hasFocus(),
    interacted,
  });
  const at = now();
  if (sample.key) {
    const [lang, id] = sample.key.split("/");
    const record = state.paths[lang].activity[id];
    if (record) {
      record.pageMs += sample.pageMs;
      record.visibleMs += sample.visibleMs;
      record.activeMs += sample.activeMs;
      record.lastVisitedAt = new Date(
        Math.max(Date.parse(record.lastVisitedAt), Date.parse(at)),
      ).toISOString();
    }
  }
  if (sample.enteredKey) {
    const [lang, id] = sample.enteredKey.split("/");
    const record = (state.paths[lang].activity[id] ??= {
      firstVisitedAt: at,
      lastVisitedAt: at,
      visits: 0,
      pageMs: 0,
      visibleMs: 0,
      activeMs: 0,
    });
    record.visits++;
    record.lastVisitedAt = new Date(
      Math.max(Date.parse(record.lastVisitedAt), Date.parse(at)),
    ).toISOString();
  }
  const display = $("#activity-time");
  if (display && activityClock.key) {
    const [lang, id] = activityClock.key.split("/");
    display.textContent = formatDuration(state.paths[lang].activity[id]?.activeMs ?? 0);
  }
}

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4500);
}
function save() {
  clearTimeout(saveTimer);
  checkpointActivity();
  try {
    if (!progressWritable) throw new Error("Existing unreadable progress is protected");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
    toast("Не вдалося зберегти прогрес. Завантажте резервну копію в портфоліо.");
  }
  updateHeader();
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 220);
}
window.addEventListener("pagehide", () => {
  checkpointActivity({ leaving: true });
  save();
});
window.addEventListener("pageshow", () => checkpointActivity({ syncRoute: true }));
document.addEventListener("visibilitychange", save);
window.addEventListener("focus", save);
window.addEventListener("blur", save);
for (const event of [
  "pointerdown",
  "keydown",
  "input",
  "wheel",
  "touchstart",
  "touchmove",
])
  document.addEventListener(
    event,
    (e) => {
      if (e.isTrusted) checkpointActivity({ interacted: true });
    },
    { capture: true, passive: true },
  );
setInterval(() => {
  if (activityClock.key) save();
}, 10_000);
function updateHeader() {
  const stats = state.activePathId
    ? trackStats(course(), track())
    : { xp: 0, sections: 0 };
  $("#language-label").textContent = state.activePathId
    ? `${language().toUpperCase()} / ${LANGUAGES[language()].native}${course().level === "foundations" ? "" : " · " + t("level." + course().level)} ↗`
    : t("profile.choosePath") + " ↗";
  $("#xp-label").textContent = stats.xp + " XP";
  $("#progress-label").textContent =
    pad(stats.sections) + " / " + course().chapters.length;
  $("#storage-label").textContent = storageAvailable
    ? t("storage.saved")
    : t("storage.unavailable");
  const next = nextModule();
  $('[data-nav="lab"]').href = "#lab/" + next.id;
}
function nextModule() {
  return modules().find((m) => !sectionStats(m, track()).complete) || modules().at(-1);
}
function showProfile(selected = state.activePathId) {
  const form = $("#profile-form");
  form.reset();
  $(".language-choices", form).innerHTML = Object.values(PATHS)
    .map(
      (path) =>
        '<label><input type="radio" name="path" required value="' +
        path.id +
        '"><span><b>' +
        path.language.toUpperCase() +
        "</b> " +
        esc(path.title) +
        "</span></label>",
    )
    .join("");
  if (selected) form.elements.path.value = selected;
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
  state.activePathId = form.elements.path.value;
  state.student = form.elements.student.value.trim();
  state.group = form.elements.group.value.trim();
  save();
  $("#profile-dialog").close();
  if (pendingRoute) {
    const requested = pendingRoute;
    const route =
      requested.startsWith("lab/") && !moduleById(requested.split("/")[1])
        ? "lab/" + modules()[0].id
        : requested;
    pendingRoute = null;
    if (location.hash === "#" + route) render();
    else location.hash = route;
  } else {
    const [page, chapterId] = currentRoute().split("/");
    if (page === "lab" && !moduleById(chapterId))
      location.hash = "lab/" + modules()[0].id;
    else render({ keepScroll: true });
  }
  toast(`Траєкторія: ${course().title}. Прогрес зберігається окремо.`);
});
$("#help-button").addEventListener("click", () =>
  showInfo(
    "Як працює практикум",
    `<ol><li>Оберіть німецьку, французьку або англійську. Матеріали та прогрес кожної траєкторії незалежні.</li><li>У розділах є автоматично перевірювані завдання та прикладні роботи для викладача. Необов’язкові вправи позначені окремо. Читайте теорію, досліджуйте тренажери й виправляйте помилки.</li><li>Кожна перевірка зберігає введений текст без виправлень або номери й тексти обраних варіантів, час подання, результат і кількість підказок. Звіт також показує час у розділі; активний час враховує видиму вкладку у фокусі та паузу після 2 хв без взаємодії. Повторні подання зберігаються; попередній успіх залишається в історії.</li><li>За перше успішне завдання — 40 XP; за подання практичної роботи — 30 XP; за прихований виклик — 60 XP. Повторення не збільшує XP. XP не є оцінкою.</li><li>Розділ завершено після виконання всіх його обов’язкових завдань. Якість цієї роботи оцінює викладач.</li><li>Завантажте HTML-звіт і передайте його разом з артефактами. Для PDF відкрийте звіт і скористайтеся друком браузера → «Зберегти як PDF».</li><li>У портфоліо експортуйте резервну копію JSON. Прогрес локальний: інший браузер або пристрій потребує імпорту. Серверного кабінету викладача у цій версії немає.</li></ol><p class="micro muted">Навчальні приклади створено для цього практикуму; вони не є репрезентативним корпусом. Команди виконуються в симуляторах. Зовнішні STT, TTS і ШІ автоматично не викликаються.</p>`,
  ),
);
function showInfo(title, html) {
  $("#info-content").innerHTML = `<h2 id="info-title">${esc(title)}</h2>${html}`;
  $("#info-dialog").showModal();
}

function render({ keepScroll = false } = {}) {
  const oldY = window.scrollY,
    route = currentRoute(),
    parts = route.split("/"),
    page = parts[0],
    main = $("#main");
  if (feedbackOpenKey !== `${pathId()}/${parts[1]}` || page !== "lab")
    feedbackOpenKey = null;
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
    } else if (!state.activePathId) {
      main.innerHTML = gate();
      pendingRoute = route;
      if (!$("#profile-dialog").open) showProfile();
    } else main.innerHTML = renderLab(m);
  } else if (page === "portfolio") {
    main.innerHTML = state.activePathId ? renderPortfolio() : gate();
  } else if (page === "reference") {
    main.innerHTML = renderReference();
  } else {
    main.innerHTML = renderMap();
  }
  if (recoveryCopy)
    main.insertAdjacentHTML(
      "afterbegin",
      '<div class="storage-warning">Знайдено дані іншого або непрочитаного формату. Оригінал збережено. <button class="button small" data-action="recover-progress">Завантажити оригінал ↓</button></div>',
    );
  updateHeader();
  checkpointActivity({ syncRoute: true });
  drawWaves();
  updateWer(taskById);
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

function readFeedbackForm(form) {
  return {
    topics: $$('[name="feedback-topic"]:checked', form).map((input) => input.value),
    taskId: form.elements["feedback-task"].value || null,
    comment: form.elements["feedback-comment"].value,
    anonymous: form.elements["feedback-anonymous"].checked,
  };
}
function rememberFeedback(form) {
  const id = form.dataset.feedbackForm;
  if (!feedbackModule(state, pathId(), id)) return;
  const draft = readFeedbackForm(form);
  feedbackStore.paths[pathId()][id] = draft;
  feedbackDirty = true;
  clearTimeout(feedbackSaveTimer);
  feedbackSaveTimer = setTimeout(persistFeedback, 220);
  $("[data-feedback-identity]", form).textContent = feedbackIdentityNote(
    draft.anonymous,
  );
  $("[data-feedback-status]", form).textContent = "";
}
function handleChapterFeedback(form, downloadFile = false) {
  const status = $("[data-feedback-status]", form);
  try {
    const id = form.dataset.feedbackForm;
    const draft = readFeedbackForm(form);
    const feedback = createChapterFeedback(state, pathId(), id, draft);
    feedbackStore.paths[pathId()][id] = draft;
    feedbackDirty = true;
    persistFeedback();
    if (downloadFile) {
      download(
        `lingva-lab-feedback_${pathId()}_${id}.txt`,
        chapterFeedbackText(feedback),
      );
      status.textContent =
        "Файл завантажено. Він ще не надісланий викладачеві: передайте його окремо зручним для вас способом.";
    } else
      status.textContent = feedbackStorageAvailable
        ? "Відгук збережено на цьому пристрої. Щоб поділитися, завантажте його окремим файлом."
        : "Не вдалося зберегти чернетку у браузері. Скористайтеся завантаженням відгуку.";
  } catch (error) {
    status.textContent = error.message;
  }
}
$("#main").addEventListener(
  "toggle",
  (e) => {
    if (!e.target.matches("[data-chapter-feedback]")) return;
    const key = `${pathId()}/${e.target.dataset.chapterFeedback}`;
    if (e.target.open) feedbackOpenKey = key;
    else if (feedbackOpenKey === key) feedbackOpenKey = null;
  },
  true,
);
for (const event of ["input", "change"])
  $("#main").addEventListener(event, (e) => {
    const form = e.target.closest("[data-feedback-form]");
    if (form) rememberFeedback(form);
  });
$("#main").addEventListener("submit", (e) => {
  if (!e.target.matches("[data-feedback-form]")) return;
  e.preventDefault();
  handleChapterFeedback(e.target);
});

function readValue(t) {
  const root = $(`[data-task="${t.id}"]`),
    r =
      track().answers[t.id]?.definition.revision === t.revision
        ? track().answers[t.id]
        : null;
  if (["choice", "unicode", "wave"].includes(t.type))
    return t.multiple
      ? $$(`input[name="answer-${t.id}"]:checked`, root).map((input) => input.value)
      : ($(`input[name="answer-${t.id}"]:checked`, root)?.value ?? null);
  if (["exact", "json", "wer"].includes(t.type)) return $("[data-answer]", root).value;
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
      $$("[data-interval]", root).map((input) => [input.dataset.interval, input.value]),
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
    if (t.type === "wer") updateWer(taskById);
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
  if (b.hasAttribute("data-download-feedback")) {
    handleChapterFeedback(b.closest("[data-feedback-form]"), true);
    return;
  }
  if (b.hasAttribute("data-close-feedback")) {
    const panel = b.closest("[data-chapter-feedback]");
    panel.open = false;
    $("summary", panel).focus({ preventScroll: true });
    return;
  }
  if (b.dataset.path) {
    showProfile(b.dataset.path);
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
      pathAtStart = pathId(),
      stateAtStart = state,
      result = await runRegex(t, value);
    b.disabled = false;
    if (pathId() !== pathAtStart || state !== stateAtStart) return;
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
    case "recover-progress":
      download("lingva-lab-original-progress.json", recoveryCopy, "application/json");
      break;
    case "profile":
      showProfile();
      break;
    case "report":
      generateReport(b.dataset.module);
      break;
    case "report-json":
      generateReport(b.dataset.module, "json");
      break;
    case "materials":
      downloadMaterials(b.dataset.module);
      break;
    case "backup":
      save();
      download(
        `lingva-lab-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(state, null, 2),
        "application/json",
      );
      toast("Резервну копію завантажено. Вона містить ваші відповіді та історію.");
      break;
    case "import":
      $("#backup-input").click();
      break;
  }
});

async function checkTask(id, button) {
  const t = taskById(id),
    value = readValue(t),
    pathAtStart = pathId(),
    stateAtStart = state;
  button.disabled = true;
  const result = await checkAnswer(t, value);
  if (pathId() !== pathAtStart || state !== stateAtStart) return;
  const previousBadges = badges(course(), track()).filter((b) => b.unlocked).length,
    { newXP } = recordAttempt(track(), t, value, result);
  save();
  render({ keepScroll: true });
  if (result.toolResult) renderRegexResult(t, result.toolResult);
  const currentButton = $(`[data-check="${id}"]`);
  currentButton?.focus({ preventScroll: true });
  if (newXP)
    toast(
      `+${newXP} XP · ${result.status === "submitted" ? "Подання збережено для викладача" : "Результат перевірено"}${badges(course(), track()).filter((b) => b.unlocked).length > previousBadges ? " · Відкрито відзнаку!" : ""}`,
    );
  else if (result.status === "failed")
    toast("Спробу збережено. Перевірте пояснення під завданням.");
  else toast("Нову спробу збережено. XP за це завдання вже нараховано.");
}

function executeCommand(id) {
  const t = taskById(id),
    input = $(`[data-command="${id}"]`),
    command = input.value;
  if (!command.trim()) return;
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
  if (t.type === "terminal" && t.goal === "navigate" && ok && output.includes("[1893]"))
    toast("Ви знайшли лист! Примітка ◇ над завданнями відкриває архівний виклик.");
}

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(drawWaves, 120);
});

function checkTreasure(key) {
  const input = $(`input[name="treasure-${key}"]:checked`);
  if (!input) {
    toast("Оберіть відповідь на прихований виклик.");
    return;
  }
  const chapter = modules().find((chapter) => chapter.treasure === key);
  const { pass, newXP } = recordTreasureAttempt(
    track(),
    key,
    input.value,
    chapter?.id ?? null,
  );
  save();
  $("#treasure-slot").innerHTML = renderTreasure(key);
  if (pass && newXP) toast(`+${newXP} XP · Прихований виклик розв’язано!`);
}

function generateReport(id, format = "html") {
  save();
  const data = createReportData({
      state,
      course: course(),
      track: track(),
      chapterId: id,
    }),
    name = `lingva-lab_${pathId()}_${id}_${data.summary.complete ? "report" : "draft"}`;
  if (format === "json")
    download(name + ".json", JSON.stringify(data, null, 2), "application/json");
  else download(name + ".html", reportHtml(data), "text/html;charset=utf-8");
  toast(
    data.summary.complete
      ? "Звіт завантажено. Прикладну роботу оцінює викладач."
      : "Чернетку звіту завантажено. Розділ ще не завершено.",
  );
}

function downloadMaterials(id) {
  const l = LANGUAGES[language()],
    m = moduleById(id);
  let content, name;
  if (m.materials === "academic") {
    name = "academic-text.txt";
    content = l.academic + "\n\n" + l.special;
  } else if (m.materials === "wordlist") {
    name = "wordlist.csv";
    content = `form,lemma,pos\n${l.forms[0]},${l.lemma},NOUN\n${l.forms[1]},${l.lemma},NOUN\n`;
  } else if (m.materials === "regex") {
    name = "regex-corpus.txt";
    content = l.regexCorpus + "\n" + l.variantCorpus + "\n\n" + l.transcript;
  } else if (m.materials === "audio") {
    download("training-signal.wav", new Blob([signalWav()], { type: "audio/wav" }));
    toast("WAV завантажено. TextGrid експортується з тренажера після введення меж.");
    return;
  } else if (m.materials === "speech") {
    name = "stt-comparison.txt";
    content = `REFERENCE:\n${l.reference}\n\nHYPOTHESIS:\n${l.hypothesis}\n\nTTS TEST:\n${l.tts}`;
  } else {
    name = "research-materials.txt";
    content = `${l.sample}\n\n${l.sentence}\n\n${l.ambiguous}`;
  }
  download(
    `lab-${id}-${language()}-${name}`,
    `LINGVA.LAB / ${m.title}\nМова: ${l.native}\nНавчальні авторські приклади; не природний корпус.\n\n${content}\n\nЗавдання для портфоліо:\n${m.tasks
      .filter((task) => task.type === "portfolio")
      .map((task) => task.prompt)
      .join("\n\n")}\n\nКритерії:\n${m.tasks
      .filter((task) => task.type === "portfolio")
      .flatMap((task) => task.rubric)
      .join("\n")}\n`,
  );
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
      checkpointActivity({ leaving: true });
      state = imported;
      progressWritable = true;
      recoveryCopy = null;
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

const { renderTask, renderCommandLog, renderTreasure } = createExerciseView({
  track,
  language,
});
const { renderChapterFeedback, feedbackIdentityNote } = createFeedbackView({
  feedbackStore: () => feedbackStore,
  pathId,
  feedbackOpenKey: () => feedbackOpenKey,
  feedbackStorageAvailable: () => feedbackStorageAvailable,
  state: () => state,
});
const { renderMap } = createMapView({
  modules,
  nextModule,
  course,
  track,
  state: () => state,
  pathId,
  filter: () => filter,
});
const { renderLab } = createChapterView({
  track,
  pathId,
  language,
  renderTask,
  renderChapterFeedback,
});
const { renderPortfolio } = createPortfolioView({
  course,
  track,
  language,
  state: () => state,
  modules,
  pathId,
});
const { renderReference, filterGlossary } = createReferenceView();
const { emptyPage, gate } = createEmptyView();
render();
