import { freshFeedbackDraft, FEEDBACK_TOPICS } from "../../features/feedback-model.js";
import { esc } from "../../shared/format.js";
export function createFeedbackView(context = {}) {
  const { feedbackStore, pathId, feedbackOpenKey, feedbackStorageAvailable, state } =
    context;
  function renderChapterFeedback(module) {
    const draft = feedbackStore().paths[pathId()][module.id] ?? freshFeedbackDraft();
    return `<details class="chapter-feedback" data-chapter-feedback="${module.id}" ${feedbackOpenKey() === `${pathId()}/${module.id}` ? "open" : ""}>
    <summary><span>Є ідея, як покращити цей розділ?</span><span class="micro muted">Залишити відгук · необов’язково</span></summary>
    <div class="chapter-feedback-body">
      <p>Розкажіть, чого бракувало для навчання. Можливо, варто уточнити інструкцію, додати приклад або більше вправ? Відгук не впливає на оцінку, XP чи доступ до наступного розділу.</p>
      <form data-feedback-form="${module.id}" novalidate>
        <fieldset class="feedback-topics"><legend>Що хотіли б покращити? <span class="muted">Можна обрати кілька пунктів або написати свою ідею нижче.</span></legend>
          ${Object.entries(FEEDBACK_TOPICS)
            .map(
              ([key, label]) =>
                `<label class="confirm-label"><input type="checkbox" name="feedback-topic" value="${key}" ${draft.topics.includes(key) ? "checked" : ""}><span>${esc(label)}</span></label>`,
            )
            .join("")}
        </fieldset>
        <label><span class="input-label">До чого стосується відгук? (необов’язково)</span><select name="feedback-task"><option value="">Увесь розділ</option>${module.tasks.map((task, i) => `<option value="${task.id}" ${draft.taskId === task.id ? "selected" : ""}>${i + 1}. ${esc(task.title)}</option>`).join("")}</select></label>
        <label><span class="input-label">Ваша пропозиція (необов’язково, до 4000 символів)</span><textarea name="feedback-comment" maxlength="4000" rows="5" placeholder="Наприклад: у завданні ${Math.min(2, module.tasks.length)} було незрозуміло, як почати. Допоміг би короткий розібраний приклад. А ще хотілося б більше вправ на цю тему.">${esc(draft.comment)}</textarea></label>
        <div><label class="confirm-label"><input type="checkbox" name="feedback-anonymous" ${draft.anonymous ? "checked" : ""}><span>Анонімно — не додавати ім’я та групу</span></label>
          <p class="micro muted feedback-identity" data-feedback-identity>${esc(feedbackIdentityNote(draft.anonymous))}</p></div>
        <p class="micro muted">Зараз відгук зберігається на цьому пристрої. Щоб поділитися ним, завантажте окремий файл і передайте викладачеві. Відгук не додається до навчального звіту чи резервної копії прогресу.</p>
        <div class="chapter-feedback-actions"><button type="submit" class="button small">Зберегти на пристрої</button><button type="button" class="button small" data-download-feedback="${module.id}">Завантажити відгук (.txt) ↓</button><button type="button" class="hint-button" data-close-feedback>Згорнути</button></div>
        <p class="micro feedback-save-status" data-feedback-status role="status">${feedbackStorageAvailable() ? "" : "Не вдалося зберегти чернетку у браузері. Ви можете завантажити відгук окремим файлом."}</p>
      </form>
    </div>
  </details>`;
  }

  function feedbackIdentityNote(anonymous) {
    return anonymous
      ? "Ім’я, група, відповіді, час роботи й дати подань у файл не потрапляють. Якщо хочете лишитися без імені, не вказуйте особисті дані у тексті й передайте файл через канал, що не розкриває авторство."
      : `До файлу буде додано ім’я: ${state().student || "не вказано"}; група: ${state().group || "не вказано"}. Відповіді й час роботи не додаються.`;
  }
  return { renderChapterFeedback, feedbackIdentityNote };
}
