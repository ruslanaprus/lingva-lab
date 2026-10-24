import { SOURCES } from "../../../content/registry.js";
import { esc, pad } from "../../shared/format.js";
import { taskStatus } from "../../learning/progress.js";

export function renderLesson(lesson) {
  if (!lesson) return "";
  return `<section class="task-lesson" aria-label="Пояснення й опори"><p class="mono lesson-label">ПРОЧИТАЙТЕ → СПРОБУЙТЕ → ПЕРЕВІРТЕ</p><h3>${esc(lesson.title)}</h3>${lesson.paragraphs.map((text) => `<p>${esc(text)}</p>`).join("")}${lesson.example ? `<pre class="lesson-example"><code>${esc(lesson.example)}</code></pre>` : ""}${lesson.steps.length ? `<ol class="lesson-steps">${lesson.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol>` : ""}${lesson.sources.length ? `<p class="micro muted">Де перечитати докладніше:</p><ul class="lesson-sources">${lesson.sources.map((key) => `<li><a href="${SOURCES[key].url}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[key].title)} ↗</a> <span class="micro muted">${esc(SOURCES[key].note)}</span></li>`).join("")}</ul>` : ""}</section>`;
}

export function renderWorkshopIntro(chapter) {
  if (!chapter.workshop) return "";
  const optional = chapter.tasks
    .filter((task) => task.required === false)
    .reduce((sum, task) => sum + task.minutes, 0);
  return `<section class="workshop-intro" aria-labelledby="workshop-plan"><p class="mono orange">САМОСТІЙНА МАЙСТЕРНЯ / ${chapter.time} ХВ + ${optional} ХВ ЗА БАЖАННЯМ</p><h2 id="workshop-plan">Папка, яку можна передати.</h2><p>${esc(chapter.workshop.guidance)}</p><p class="micro muted">Час біля вправи включає читання та практику поза сайтом. Лічильник сторінки не вимірює роботу в інших програмах. Пауза не блокує наступну вправу.</p><ol class="workshop-plan">${chapter.workshop.stages
    .map((stage) => {
      const tasks = chapter.tasks.filter((task) => task.stage === stage.id);
      return `<li><a href="#task-${tasks[0].id}" data-scroll-task="${tasks[0].id}">${esc(stage.title)}</a><span class="mono">${tasks.reduce((sum, task) => sum + task.minutes, 0)} ХВ${stage.optional ? " · НЕОБОВ’ЯЗКОВО" : ""}</span></li>`;
    })
    .join(
      "",
    )}</ol><div class="workshop-downloads"><button class="button small dark" data-action="materials" data-module="${chapter.id}">Навчальний набір ZIP ↓</button>${chapter.workshop.documents.map((document) => `<button class="button small" data-workshop-document="${document.id}" data-module="${chapter.id}">${esc(document.label)} ↓</button>`).join("")}</div><details class="workshop-files"><summary>Переглянути файли набору (${chapter.workshop.files.length}) без завантаження</summary><p class="micro muted">Це той самий набір. Якщо розпакування недоступне, скопіюйте тексти у власний нотатник і явно позначте план файлових дій.</p>${chapter.workshop.files.map((file) => `<details><summary>${esc(file.name)}</summary><pre><code>${esc(file.content)}</code></pre></details>`).join("")}</details><details class="workshop-files"><summary>Прочитати повний приклад README (інша колекція)</summary><pre><code>${esc(chapter.workshop.documents.find((document) => document.id === "example").content)}</code></pre></details></section>`;
}

export function renderWorkshopNavigation(chapter, track) {
  return chapter.workshop.stages
    .map((stage, index) => {
      const tasks = chapter.tasks.filter((task) => task.stage === stage.id),
        done = tasks.filter((task) =>
          ["passed", "submitted"].includes(taskStatus(track.answers[task.id], task)),
        ).length;
      return `<a href="#task-${tasks[0].id}" data-scroll-task="${tasks[0].id}"><span class="mono">${pad(index + 1)}</span><span>${esc(stage.title)}<small>${done}/${tasks.length}${stage.optional ? " · за бажанням" : ""}</small></span></a>`;
    })
    .join("");
}

export function renderWorkshopTasks(chapter, renderTask) {
  let previous = null;
  return chapter.tasks
    .map((task, index) => {
      let heading = "";
      if (previous !== task.stage) {
        const stage = chapter.workshop.stages.find((stage) => stage.id === task.stage);
        heading = `<div class="workshop-stage"><p class="mono orange">ЕТАП ${pad(chapter.workshop.stages.indexOf(stage) + 1)}${stage.optional ? " / НЕОБОВ’ЯЗКОВО" : ""}</p><h2>${esc(stage.title)}</h2><p>${esc(stage.goal)}</p></div>`;
        previous = task.stage;
      }
      return heading + renderTask(task, index);
    })
    .join("");
}
