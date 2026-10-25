import { esc, pad } from "../../shared/format.js";
import {
  getPath,
  chapterNumber,
  nextChapter,
  SOURCES,
  LANGUAGES,
} from "../../../content/registry.js";

export function renderChapterOverview(chapter, pathId) {
  const overview = chapter.overview;
  if (!overview) return "";
  const related = overview.related
    .map((id) => getPath(pathId).chapters.find((item) => item.id === id))
    .filter(Boolean);
  return `<section class="chapter-overview" aria-label="Опис і план теми">
    <p class="mono orange">${chapter.status === "planned" ? "ПЛАН РОЗДІЛУ" : "ТЕМА ТА ПЛАН РОЗШИРЕННЯ"}</p>
    <h2>Практичне призначення</h2><p>${esc(overview.purpose)}</p>
    <div class="outline-stages">${[
      ["Основи", overview.foundations],
      ["Практика", overview.practice],
      ["Застосування", overview.application],
    ]
      .map(([title, body]) => `<div><h3>${title}</h3><p>${esc(body)}</p></div>`)
      .join("")}</div>
    <div class="outline-example"><h3>Де це знадобиться лінгвісту</h3><p>${esc(overview.example)}</p></div>
    <p class="outline-note">${esc(overview.note)}</p>
    ${related.length ? `<nav class="outline-related" aria-label="Пов’язані теми"><p class="mono">ПОВ’ЯЗАНІ ТЕМИ ТА ПРАКТИКУМИ</p>${related.map((item) => `<a href="#lab/${item.id}">${pad(chapterNumber(pathId, item.id))} / ${esc(item.title)} ↗</a>`).join("")}</nav>` : ""}
  </section>`;
}

export function renderPlannedChapter(chapter, pathId) {
  const path = getPath(pathId),
    next = nextChapter(pathId, chapter.id);
  return `<div class="page outline-page">
    <div class="page-title"><div><p class="mono breadcrumb"><a href="#map">КАРТА КУРСУ</a> / РОЗДІЛ ${pad(chapterNumber(pathId, chapter.id))} / ${esc(LANGUAGES[path.language].native)}</p><h1>${esc(chapter.title)}<span class="orange">.</span></h1></div><p>${esc(chapter.short)}</p></div>
    <p class="local-notice" data-planned-chapter="${chapter.id}"><b>Опис доступний. Вправи готуються.</b> Тут можна ознайомитися з темою та її застосуванням. Оцінюваних завдань у цьому розділі ще немає; він не впливає на XP, завершення практикумів, звіти й відзнаки.</p>
    ${renderChapterOverview(chapter, pathId)}
    ${chapter.sources.length ? `<section class="outline-sources"><h2>Джерела для знайомства з темою</h2><ul>${chapter.sources.map((key) => `<li><a href="${SOURCES[key].url}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[key].title)} ↗</a><p>${esc(SOURCES[key].note)}</p></li>`).join("")}</ul></section>` : ""}
    <div class="lab-end"><a class="button" href="#map">До карти курсу ↗</a><a class="button dark" href="${next ? `#lab/${next.id}` : "#portfolio"}">${next ? "Наступний розділ" : "До портфоліо"} ↗</a></div>
  </div>`;
}
