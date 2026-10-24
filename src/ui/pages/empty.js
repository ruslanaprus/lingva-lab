import { esc } from "../../shared/format.js";
export function createEmptyView(context = {}) {
  function emptyPage(title, text) {
    return `<div class="page empty"><h2>${esc(title)}</h2><p>${esc(text)}</p><a class="button dark" href="#map">Карта курсу ↗</a></div>`;
  }

  function gate() {
    return `<div class="page empty"><p class="mono orange">НАВЧАЛЬНІ ТРАЄКТОРІЇ / СПІЛЬНІ ІНСТРУМЕНТИ</p><h2>Спочатку — мова.</h2><p>Оберіть траєкторію: від неї залежать навчальні тексти, приклади та ваше портфоліо.</p><button class="button primary" data-action="profile">Обрати мову <span>↗</span></button></div>`;
  }
  return { emptyPage, gate };
}
