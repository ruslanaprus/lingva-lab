import { t as translate } from "../../i18n/index.js";
import { taskStatus } from "../../learning/progress.js";
import { pad, labels, esc, date } from "../../shared/format.js";
import { formatAttemptValue } from "../../learning/values.js";
import { LANGUAGES, TREASURES } from "../../../content/registry.js";
import { unicodePoints } from "../../tools/text.js";
import { createTerminal } from "../../tools/terminal.js";
import { createGit } from "../../tools/git.js";
import { renderLesson } from "./workshop.js";
import { renderTypographyInput } from "./typography.js";
export function createExerciseView(context = {}) {
  const { track, language } = context;
  function renderTask(t, index) {
    const r = track().answers[t.id],
      status = taskStatus(r, t),
      latest = r?.attempts.at(-1);
    return `<article class="task-card ${status}" id="task-${t.id}" data-task="${t.id}"><div class="task-top mono"><span>ЗАВДАННЯ ${pad(index + 1)} / ${t.type === "portfolio" ? "ПРИКЛАДНА РОБОТА" : "ДОСЛІДНИЦЬКА ПРАКТИКА"} · ${t.xp} XP${t.minutes ? ` · ${t.minutes} ХВ ІЗ ЧИТАННЯМ І ПРАКТИКОЮ` : ""}</span><span class="task-status ${status}">${labels[status]}</span></div><h2>${esc(t.title)}</h2>${t.required === false ? '<p class="mono muted">НЕОБОВ’ЯЗКОВА ПРАКТИКА</p>' : ""}${r && r.definition.revision !== t.revision ? '<p class="local-notice">Завдання оновлено. Попередні спроби збережено в історії; для поточної версії потрібне нове виконання.</p>' : ""}${renderLesson(t.lesson)}<p class="task-prompt">${t.lesson ? "<b>Ваше завдання.</b> " : ""}${esc(t.prompt)}</p><div class="task-input">${taskInput(t, r?.definition.revision === t.revision ? r.draft : null)}</div>${t.submission?.downloadName ? `<button class="button small" data-download-method="${t.id}" style="margin-top:16px">Завантажити мій ${esc(t.submission.downloadName)} ↓</button>` : ""}<div class="task-actions"><button class="button dark" data-check="${t.id}">${t.type === "portfolio" ? (status === "submitted" ? translate("task.resubmit") : translate("task.submit")) : status === "passed" ? translate("task.checkAgain") : translate("task.checkAnswer")} <span>↗</span></button><button class="hint-button" data-hint="${t.id}" aria-expanded="${!!r?.hintOpened}">${translate("task.hint")}${r?.hints ? " · використано" : ""}</button></div>${r?.hintOpened ? `<div class="hint-content">${esc(t.hint)}</div>` : ""}${latest ? `<div class="feedback ${latest.status}" role="status"><b>${labels[latest.status]}.</b> ${esc(latest.feedback)}${status === "passed" && latest.status === "failed" ? "<p>Попередній успіх збережено; ця нова спроба потребує правки.</p>" : ""}</div>` : ""}<p class="attempt-meta mono">СПРОБИ ${r?.attempts.length || 0} · ПОМИЛКИ ${r?.attempts.filter((a) => a.status === "failed").length || 0} · ПОВТОРНІ ПОДАННЯ ${Math.max(0, (r?.attempts.length || 0) - 1)}${r?.toolEvents.length ? " · ПОМИЛКИ КОМАНД " + r.toolEvents.filter((e) => !e.ok).length : ""}</p>${r?.attempts.length ? `<details class="history"><summary>Історія відповідей (${r.attempts.length})</summary><ol>${r.attempts.map((a) => `<li>${date(a.at)} · ${labels[a.status]} · версія ${a.definition.revision} · підказки ${a.hints}<pre><code>${esc(formatAttemptValue(a.definition ?? t, a))}</code></pre></li>`).join("")}</ol></details>` : ""}</article>`;
  }

  function optionsInput(t, value) {
    const selected =
      t.multiple && Array.isArray(value) ? value.map(String) : [String(value)];
    return `<fieldset class="options" style="border:0;padding:0;margin:0"><legend class="sr-only">${esc(t.title)}</legend>${t.multiple ? '<p class="micro muted">Оберіть усі відповідні варіанти.</p>' : ""}${t.options.map((option, i) => `<label class="option"><input type="${t.multiple ? "checkbox" : "radio"}" name="answer-${t.id}" value="${i}" ${selected.includes(String(i)) ? "checked" : ""}><span><span class="option-number mono">${i + 1}.</span> ${esc(option)}</span></label>`).join("")}</fieldset>`;
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
              .map((c) => `<span class="point"><b>${esc(c.char)}</b>${c.point}</span>`)
              .join(
                "",
              )}<span class="micro muted">${Array.from(v).length} код. точок</span></div>`,
        )
        .join(
          "",
        )}</div><p class="unicode-normalized">Після NFC: <b>${esc(l.accent.normalize("NFC"))}</b> = <b>${esc(l.nfd.normalize("NFC"))}</b>. Візуальна подібність сама по собі не доводить еквівалентність.</p></div></div><div style="margin-top:18px">${optionsInput(t, value)}</div>`;
    // HTML removes the first newline in a textarea; a sentinel preserves raw drafts.
    if (t.type === "exact" && t.inspector === "typography")
      return renderTypographyInput(t, value);
    if (t.type === "exact" && (t.checker === "csv" || t.inspector === "characters"))
      return `<label class="input-label" for="answer-${id}">${t.checker === "csv" ? "Ваш CSV (роздільник — кома)" : "Інспектор символів – поле для введення"}</label><textarea id="answer-${id}" data-answer="${id}" class="code-input" maxlength="10000" spellcheck="false" autocorrect="off" autocapitalize="off">${"\n"}${esc(value || "")}</textarea><button class="button small" ${t.checker === "csv" ? `data-csv-preview="${id}"` : `data-inspect-characters="${id}"`}>${t.checker === "csv" ? "Розібрати CSV без подання" : "Показати символи й байти"} ↗</button><div class="formats-preview" data-format-output="${id}" role="status" aria-live="polite"></div>`;
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
      return `<div class="portfolio-rubric"><p class="mono">КРИТЕРІЇ ДЛЯ ВИКЛАДАЧА</p><ul>${t.rubric.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div><div class="portfolio-fields"><label><span class="input-label">Артефакт: назва файла / шлях / посилання (від 5 символів)</span><input type="text" data-portfolio="artifact" value="${esc(value?.artifact || "")}" maxlength="1000" placeholder="Назва збереженого файла; передайте його викладачеві окремо"></label><label><span class="input-label">${esc(t.submission?.methodLabel || "Метод, інструмент і результати (від 120 символів)")}</span><textarea data-portfolio="method" maxlength="15000" placeholder="${esc(t.submission ? t.submission.methodPlaceholder || "Вставте повний текст README з усіма частинами шаблону." : "Що ви зробили? Які дані, команди, вимірювання або джерела використали?")}">${esc(value?.method || "")}</textarea></label><label><span class="input-label">${esc(t.submission?.reflectionLabel || "Обмеження та висновок (від 100 символів)")}</span><textarea data-portfolio="reflection" maxlength="15000" placeholder="Що лишається непевним? Що не спрацювало? Як інший дослідник перевірить результат?">${esc(value?.reflection || "")}</textarea></label><label class="confirm-label"><input type="checkbox" data-portfolio="confirm" ${value?.confirm ? "checked" : ""}><span>Я перевірив/ла роботу за критеріями. Зберігаю артефакти окремо та передам їх разом зі звітом. Розумію, що подання очікує оцінювання викладачем.</span></label></div>`;
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

  function renderTreasure(key) {
    const t = TREASURES[key],
      r = track().treasures[key],
      latest = r?.attempts.at(-1);
    return `<section class="treasure-panel"><p class="mono orange">ПРИХОВАНИЙ ВИКЛИК / +60 XP ОДИН РАЗ</p><h3>${t.title}</h3><p>${esc(t.prompt)}</p><div style="margin-top:18px">${t.options.map((o, i) => `<label class="option"><input type="radio" name="treasure-${key}" value="${i}" ${String(latest?.value) === String(i) ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}</div><button class="button light" data-check-treasure="${key}" style="margin-top:18px">Перевірити знахідку ↗</button>${latest ? `<div class="feedback ${latest.status}">${esc(latest.feedback)}</div><p class="micro muted">Спроби: ${r.attempts.length}; помилки: ${r.attempts.filter((a) => a.status === "failed").length}. Історія входить до звіту розділу.</p>` : ""}</section>`;
  }
  return { renderTask, optionsInput, taskInput, renderCommandLog, renderTreasure };
}
