import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPath, LANGUAGES, TREASURES } from "../content/registry.js";
import { freshState, STORAGE_KEY } from "../src/persistence/state.js";
import { recordAttempt } from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

export async function checkSearchWorkshop(browser, base, output) {
  for (const code of ["de", "fr", "en"]) {
    const course = getPath(`${code}-foundations`);
    const chapter = course.chapters.find((c) => c.id === "information-search");
    const state = freshState();
    state.activePathId = course.id;
    const siteId = "information-search-site-scope",
      logId = "information-search-research-log";
    for (const task of chapter.tasks.filter(
      (t) => t.required && ![siteId, logId].includes(t.id),
    )) {
      const value =
        task.type === "portfolio" ? portfolioAnswer(task, code) : task.answer;
      recordAttempt(state.paths[course.id], task, value, evaluateTask(task, value));
    }
    const context = await browser.newContext({
      acceptDownloads: true,
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
    const download = async (selector, name) => {
      const [file] = await Promise.all([
        page.waitForEvent("download"),
        page.locator(selector).click(),
      ]);
      const path = `${output}/${name}`;
      await file.saveAs(path);
      return { name: file.suggestedFilename(), body: await readFile(path) };
    };
    try {
      await page.goto(`${base}/#lab/information-search`);
      assert.equal(await page.locator(".task-lesson").count(), 40);
      assert.equal(await page.locator(".workshop-stage").count(), 8);
      assert.match(
        await page.locator(".workshop-intro").textContent(),
        /175 ХВ \+ 26 ХВ/,
      );
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      const zip = await download(
        '.workshop-downloads [data-action="materials"]',
        `search-pack-${code}.zip`,
      );
      assert.equal(zip.body.readUInt32LE(0), 0x04034b50);
      assert.ok(zip.body.includes(Buffer.from(LANGUAGES[code].search.sample)));
      const template = await download(
        '[data-workshop-document="template"]',
        `search-template-${code}.txt`,
      );
      assert.match(template.body.toString(), /Питання й критерії/);
      const site = page.locator(`#task-${siteId}`);
      await site.locator('input[value="0"]').check();
      await site.locator("[data-check]").click();
      await site.locator(".feedback.failed").waitFor();
      await site.locator('input[value="2"]').check();
      await site.locator("[data-check]").click();
      await site.locator(".feedback.passed").waitFor();
      const log = page.locator(`#task-${logId}`),
        task = chapter.tasks.find((t) => t.id === logId);
      const answer = portfolioAnswer(task, code);
      for (const key of ["artifact", "method", "reflection"])
        await log.locator(`[data-portfolio="${key}"]`).fill(answer[key]);
      await log.locator('[data-portfolio="confirm"]').check();
      await log
        .locator('[data-portfolio="method"]')
        .fill(answer.method.replace("Картки джерел", "Пропущена частина"));
      await log.locator("[data-check]").click();
      await log.locator(".feedback.failed").waitFor();
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      await log.locator('[data-portfolio="method"]').fill(answer.method);
      await log.locator("[data-check]").click();
      await log.locator(".feedback.submitted").waitFor();
      await page.locator("[data-chapter-feedback]").waitFor();
      const own = await download(
        `[data-download-method="${logId}"]`,
        `search-own-${code}.txt`,
      );
      assert.equal(own.body.toString(), answer.method);
      assert.equal(own.name, `search-log-${code}.txt`);
      await page.locator('[data-treasure="provenance"]').click();
      await page
        .locator(`[name="treasure-provenance"][value="${TREASURES.provenance.answer}"]`)
        .check();
      await page.locator('[data-check-treasure="provenance"]').click();
      const xp = await page.locator("#xp-label").textContent();
      await page.locator('[data-check-treasure="provenance"]').click();
      assert.equal(await page.locator("#xp-label").textContent(), xp);
      await page.reload();
      assert.equal(
        await log.locator('[data-portfolio="method"]').inputValue(),
        answer.method,
      );
      await page.goto(`${base}/#portfolio`);
      const report = JSON.parse(
        (
          await download(
            '[data-action="report-json"][data-module="information-search"]',
            `search-report-${code}.json`,
          )
        ).body,
      );
      assert.equal(report.summary.complete, true);
      const choices = report.tasks.find((t) => t.id === siteId).record.attempts;
      assert.deepEqual(choices[0].selectedOptions, [
        {
          index: 0,
          number: 1,
          value: chapter.tasks.find((t) => t.id === siteId).options[0],
        },
      ]);
      const submissions = report.tasks.find((t) => t.id === logId).record.attempts;
      assert.equal(submissions[1].value.method, answer.method);
      assert.equal(submissions[1].status, "submitted");
      await page.goto(`${base}/#lab/information-search`);
      await page.locator(".workshop-files").first().locator("summary").first().click();
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
          `${code} search overflow at ${width}`,
        );
      }
      await page.screenshot({ path: `${output}/search-${code}-desktop.png` });
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  console.log(
    "PASS: three search workshops, downloads, alternative site queries, dossiers/retries, raw reports, completion/rewards and 15 responsive layouts.",
  );
}
