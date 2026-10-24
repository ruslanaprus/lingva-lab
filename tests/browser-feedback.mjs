import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FEEDBACK_STORAGE_KEY } from "../feedback.js";

export async function checkChapterFeedback(page, go, output) {
  await go("lab/1");
  const xp = await page.locator("#xp-label").textContent();
  const panel = () => page.locator('[data-chapter-feedback="1"]');
  assert.equal(await panel().evaluate((el) => el.open), false);
  assert.ok(await page.locator('.lab-end a[href="#lab/2"]').isVisible());
  await panel().locator("summary").click();
  await panel().getByRole("button", { name: "Зберегти на пристрої", exact: true }).click();
  assert.match(await panel().locator("[data-feedback-status]").textContent(), /хоча б одну/);
  assert.equal(await page.locator("#xp-label").textContent(), xp);
  await panel().locator('[name="feedback-topic"][value="explanation"]').check();
  await panel().locator('[name="feedback-topic"][value="practice"]').check();
  await panel().locator('[name="feedback-task"]').selectOption("1-2");
  const comment = 'FEEDBACK_ONLY: Потрібен приклад і більше практики. </textarea><script>window.feedbackInjection=true</script>';
  await panel().locator('[name="feedback-comment"]').fill(comment);
  assert.equal(await panel().locator('[name="feedback-anonymous"]').isChecked(), true);
  await panel().getByRole("button", { name: "Зберегти на пристрої", exact: true }).click();
  assert.match(await panel().locator("[data-feedback-status]").textContent(), /на цьому пристрої/);
  assert.equal(await page.locator("#xp-label").textContent(), xp);

  const download = async (filename, action) => {
    const waiting = page.waitForEvent("download");
    await action();
    const path = `${output}/${filename}`;
    await (await waiting).saveAs(path);
    return readFile(path, "utf8");
  };
  const anonymous = await download("chapter-feedback-anonymous.txt", () =>
    panel().locator("[data-download-feedback]").click(),
  );
  assert.ok(anonymous.includes(comment));
  assert.ok(anonymous.includes("без імені та групи"));
  assert.ok(!anonymous.includes("Тестова студентка"));
  assert.ok(!anonymous.includes("ФЛ-11"));
  assert.ok(!anonymous.includes("Спроба"));
  assert.match(await panel().locator("[data-feedback-status]").textContent(), /ще не надісланий/);

  await panel().locator('[name="feedback-anonymous"]').uncheck();
  assert.match(await panel().locator("[data-feedback-identity]").textContent(), /Тестова студентка/);
  const named = await download("chapter-feedback-named.txt", () =>
    panel().locator("[data-download-feedback]").click(),
  );
  assert.ok(named.includes("Ім’я: Тестова студентка"));
  assert.ok(named.includes("Група: ФЛ-11"));
  await panel().locator('[name="feedback-anonymous"]').check();
  await panel().getByRole("button", { name: "Зберегти на пристрої", exact: true }).click();
  await page.reload();
  await panel().waitFor();
  assert.equal(await panel().evaluate((el) => el.open), false);
  await panel().locator("summary").click();
  assert.equal(await panel().locator('[name="feedback-comment"]').inputValue(), comment);
  assert.equal(await panel().locator('[name="feedback-task"]').inputValue(), "1-2");
  assert.equal(await panel().locator('[name="feedback-topic"]:checked').count(), 2);
  assert.equal(await panel().locator('[name="feedback-anonymous"]').isChecked(), true);
  assert.equal(await page.evaluate(() => window.feedbackInjection), undefined);

  // An ordinary task rerender preserves the open panel and its draft.
  await page.locator('[data-hint="1-1"]').click();
  assert.equal(await panel().evaluate((el) => el.open), true);
  assert.equal(await panel().locator('[name="feedback-comment"]').inputValue(), comment);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Open feedback form overflows at ${width}`);
    if (width === 390 || width === 1440)
      await panel().screenshot({ path: `${output}/feedback-${width}.png` });
  }

  await go("lab/2");
  await page.locator('[data-chapter-feedback="2"] summary').click();
  assert.equal(await page.locator('[name="feedback-comment"]').inputValue(), "");
  assert.equal(await page.locator('[name="feedback-anonymous"]').isChecked(), true);
  await page.locator("[data-close-feedback]").click();
  assert.equal(await page.locator('[data-chapter-feedback="2"]').evaluate((el) => el.open), false);
  assert.equal(await page.evaluate(() => document.activeElement.tagName), "SUMMARY");

  await page.locator("#profile-button").click();
  await page.locator('[name="language"][value="fr"]').check();
  await page.locator('#profile-form [type="submit"]').click();
  assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
  await page.locator("#profile-button").click();
  await page.locator('[name="language"][value="de"]').check();
  await page.locator('#profile-form [type="submit"]').click();
  await go("portfolio");
  const assessment = await download("feedback-assessment-report.json", () =>
    page.locator('[data-action="report-json"][data-module="1"]').click(),
  );
  const backup = await download("feedback-progress-backup.json", () =>
    page.locator('[data-action="backup"]').click(),
  );
  assert.ok(!assessment.includes("FEEDBACK_ONLY"));
  assert.ok(!backup.includes("FEEDBACK_ONLY"));
  const stored = await page.evaluate((key) => localStorage.getItem(key), FEEDBACK_STORAGE_KEY);
  assert.ok(stored.includes("FEEDBACK_ONLY"));
  assert.ok(!stored.includes("Тестова студентка"));
  assert.ok(!stored.includes("ФЛ-11"));
  assert.equal(await page.locator("#xp-label").textContent(), xp);
  console.log("PASS: optional completed-chapter feedback, named/anonymous exports, separate drafts/reports, reload, language isolation and five open-form layouts.");
}
