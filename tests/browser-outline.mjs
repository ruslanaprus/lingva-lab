import assert from "node:assert/strict";
import { getPath } from "../content/registry.js";
import { freshState, STORAGE_KEY } from "../src/persistence/state.js";
import { recordAttempt } from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

export async function checkCourseOutline(browser, base, output) {
  for (const language of ["de", "fr", "en"]) {
    const course = getPath(`${language}-foundations`),
      state = freshState();
    state.activePathId = course.id;
    // Four completed chapters make it observable that Continue skips descriptions.
    for (const chapter of course.chapters.slice(0, 4))
      for (const task of chapter.tasks.filter((t) => t.required)) {
        const value =
          task.type === "portfolio" ? portfolioAnswer(task, language) : task.answer;
        recordAttempt(state.paths[course.id], task, value, evaluateTask(task, value));
      }
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(
      ({ state, key }) => {
        if (location.protocol.startsWith("http") && !localStorage.getItem(key))
          localStorage.setItem(key, JSON.stringify(state));
      },
      { state, key: STORAGE_KEY },
    );
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(base + "/#map");
      await page.locator(".module-card").first().waitFor();
      assert.equal(await page.locator(".module-card").count(), 32);
      assert.equal(await page.locator('[data-chapter-status="planned"]').count(), 18);
      assert.equal(
        await page.locator(".continue-panel a").getAttribute("href"),
        "#lab/information-search",
      );
      const xp = await page.locator("#xp-label").textContent();
      const before = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)).paths,
        STORAGE_KEY,
      );
      await page.locator('[data-filter="planned"]').click();
      assert.equal(await page.locator(".module-card").count(), 18);
      assert.equal(await page.locator(".module-card:not(.planned)").count(), 0);
      await page.locator('[data-filter="new"]').click();
      assert.equal(await page.locator(".module-card.planned").count(), 0);
      assert.equal(await page.locator(".module-card").count(), 10);
      for (const chapter of course.chapters.filter((c) => c.status === "planned")) {
        await page.goto(base + "/#lab/" + chapter.id);
        await page.locator(`[data-planned-chapter="${chapter.id}"]`).waitFor();
        assert.equal(await page.locator(".outline-stages h3").count(), 3);
        assert.equal(await page.locator(".task-card").count(), 0);
        assert.equal(
          await page
            .locator(
              '[data-action="report"], [data-action="materials"], [data-chapter-feedback]',
            )
            .count(),
          0,
        );
        assert.ok(
          (await page.locator(".outline-example").textContent()).includes(
            chapter.overview.example,
          ),
        );
        assert.equal(await page.locator("#xp-label").textContent(), xp);
        assert.equal(await page.locator("#progress-label").textContent(), "04 / 14");
      }
      await page.goto(base + "/#lab/data-formats");
      await page.locator("#task-data-formats-dictionary-json").waitFor();
      assert.ok((await page.locator(".theory-body").textContent()).includes("U+0022"));
      assert.ok(
        (
          await page.locator("#task-data-formats-dictionary-json").textContent()
        ).includes("НЕОБОВ’ЯЗКОВА ПРАКТИКА"),
      );
      await page.goto(base + "/#portfolio");
      assert.equal(await page.locator(".report-row").count(), 14);
      assert.equal(await page.locator('[data-module="spreadsheets"]').count(), 0);
      const after = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)).paths,
        STORAGE_KEY,
      );
      assert.deepEqual(after[course.id].answers, before[course.id].answers);
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const route of ["map", "lab/spreadsheets", "lab/digital-dictionaries"]) {
          await page.goto(base + "/#" + route);
          await page.locator("#main h1").waitFor();
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${language}: ${route} overflows at ${width}`,
          );
        }
        if (language === "fr" && [390, 1440].includes(width)) {
          await page.screenshot({
            path: output + `/outline-dictionary-${width}.png`,
            fullPage: true,
          });
          await page.goto(base + "/#map");
          await page.locator('[data-filter="all"]').click();
          await page.screenshot({
            path: output + `/outline-map-${width}.png`,
            fullPage: true,
          });
        }
      }
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  console.log(
    "PASS: 54 description pages across three paths, preserved answers, filters, Continue, report exclusion and 45 responsive layouts.",
  );
}
