import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPath, LANGUAGES, TREASURES } from "../content/registry.js";
import { freshState, STORAGE_KEY } from "../src/persistence/state.js";
import { recordAttempt } from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

export async function checkBilingualWorkshop(browser, base, output) {
  for (const code of ["de", "fr", "en"]) {
    const course = getPath(`${code}-foundations`),
      chapter = course.chapters[8];
    const quiz = chapter.tasks.find((t) => t.id === "bilingual-contexts-mission");
    const typed = chapter.tasks.find((t) => t.inspector === "alignment");
    const dossier = chapter.tasks.find(
      (t) => t.id === "bilingual-contexts-decision-dossier",
    );
    const state = freshState();
    state.activePathId = course.id;
    for (const task of chapter.tasks.filter(
      (t) => t.required && ![quiz.id, typed.id, dossier.id].includes(t.id),
    )) {
      const answer =
        task.type === "portfolio" ? portfolioAnswer(task, code) : task.answer;
      recordAttempt(state.paths[course.id], task, answer, evaluateTask(task, answer));
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
      await page.goto(`${base}/#lab/bilingual-contexts`);
      assert.equal(await page.locator(".task-lesson").count(), 40);
      assert.match(
        await page.locator(".workshop-intro").textContent(),
        /162 ХВ \+ 28 ХВ/,
      );
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      const zip = await download(
        '.workshop-downloads [data-action="materials"]',
        `bilingual-pack-${code}.zip`,
      );
      assert.equal(zip.body.readUInt32LE(0), 0x04034b50);
      assert.ok(zip.body.includes(Buffer.from(LANGUAGES[code].bilingual.main)));
      const template = await download(
        '[data-workshop-document="template"]',
        `bilingual-template-${code}.txt`,
      );
      assert.match(template.body.toString(), /Перевірка контексту та вирівнювання/);
      const quizCard = page.locator(`#task-${quiz.id}`);
      await quizCard.locator('input[value="0"]').check();
      await quizCard.locator("[data-check]").click();
      await quizCard.locator(".feedback.failed").waitFor();
      await quizCard.locator(`input[value="${quiz.answer}"]`).check();
      await quizCard.locator("[data-check]").click();
      await quizCard.locator(".feedback.passed").waitFor();
      const pair = page.locator(`#task-${typed.id}`);
      await pair.locator("[data-answer]").fill(" T1 ");
      const xp = await page.locator("#xp-label").textContent();
      const attemptsBefore = await page.evaluate(
        ({ key, path, id }) =>
          JSON.parse(localStorage.getItem(key)).paths[path].answers[id]?.attempts
            .length || 0,
        { key: STORAGE_KEY, path: course.id, id: typed.id },
      );
      await pair.locator("[data-alignment-preview]").click();
      assert.ok(
        (await pair.locator("[data-alignment-output]").textContent()).includes(
          LANGUAGES[code].bilingual.negative,
        ),
      );
      await pair.locator("[data-alignment-target]").selectOption("T2");
      await pair.locator("[data-alignment-preview]").click();
      assert.ok(
        (await pair.locator("[data-alignment-output]").textContent()).includes(
          LANGUAGES[code].bilingual.negativeUk,
        ),
      );
      assert.equal(await pair.locator("[data-answer]").inputValue(), " T1 ");
      assert.equal(await page.locator("#xp-label").textContent(), xp);
      assert.equal(
        await page.evaluate(
          ({ key, path, id }) =>
            JSON.parse(localStorage.getItem(key)).paths[path].answers[id]?.attempts
              .length || 0,
          { key: STORAGE_KEY, path: course.id, id: typed.id },
        ),
        attemptsBefore,
      );
      await pair.locator("[data-check]").click();
      await pair.locator(".feedback.failed").waitFor();
      await pair.locator("[data-answer]").fill("T2");
      await pair.locator("[data-check]").click();
      await pair.locator(".feedback.passed").waitFor();
      const card = page.locator(`#task-${dossier.id}`),
        answer = portfolioAnswer(dossier, code);
      for (const key of ["artifact", "method", "reflection"])
        await card.locator(`[data-portfolio="${key}"]`).fill(answer[key]);
      await card.locator('[data-portfolio="confirm"]').check();
      await card
        .locator('[data-portfolio="method"]')
        .fill(
          answer.method.replace(
            "Перевірка контексту та вирівнювання",
            "Пропущений розділ",
          ),
        );
      await card.locator("[data-check]").click();
      await card.locator(".feedback.failed").waitFor();
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      await card.locator('[data-portfolio="method"]').fill(answer.method);
      const own = await download(
        `[data-download-method="${dossier.id}"]`,
        `bilingual-own-${code}.txt`,
      );
      assert.equal(own.body.toString(), answer.method);
      assert.equal(own.name, `bilingual-decision-${code}.txt`);
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      await card.locator("[data-check]").click();
      await card.locator(".feedback.submitted").waitFor();
      await page.locator("[data-chapter-feedback]").waitFor();
      await page.locator('[data-treasure="witness"]').click();
      await page
        .locator(`[name="treasure-witness"][value="${TREASURES.witness.answer}"]`)
        .check();
      const beforeTreasure = Number(
        (await page.locator("#xp-label").textContent()).replace(/\D/g, ""),
      );
      await page.locator('[data-check-treasure="witness"]').click();
      assert.equal(
        Number((await page.locator("#xp-label").textContent()).replace(/\D/g, "")),
        beforeTreasure + 60,
      );
      await page.locator('[data-check-treasure="witness"]').click();
      assert.equal(
        Number((await page.locator("#xp-label").textContent()).replace(/\D/g, "")),
        beforeTreasure + 60,
      );
      await page.reload();
      assert.equal(
        await card.locator('[data-portfolio="method"]').inputValue(),
        answer.method,
      );
      await page.goto(`${base}/#portfolio`);
      const report = JSON.parse(
        (
          await download(
            '[data-action="report-json"][data-module="bilingual-contexts"]',
            `bilingual-report-${code}.json`,
          )
        ).body,
      );
      assert.equal(report.summary.complete, true);
      const first = report.tasks.find((t) => t.id === quiz.id).record.attempts[0];
      assert.deepEqual(first.selectedOptions, [
        { index: 0, number: 1, value: quiz.options[0] },
      ]);
      const wrong = report.tasks.find((t) => t.id === typed.id).record.attempts[0];
      assert.equal(wrong.value, " T1 ");
      assert.ok(wrong.definition.prompt.includes(LANGUAGES[code].bilingual.negative));
      assert.equal(
        report.tasks.find((t) => t.id === dossier.id).record.attempts.at(-1).status,
        "submitted",
      );
      assert.ok(report.tasks.filter((t) => !t.required).every((t) => !t.record));
      assert.equal(
        await page
          .locator(".badge.unlocked")
          .filter({ hasText: "Дослідник контекстів" })
          .count(),
        1,
      );
      await page.goto(`${base}/#lab/bilingual-contexts`);
      await pair.locator("[data-alignment-preview]").click();
      await pair.locator("[data-alignment-output] summary").click();
      await page.locator(".workshop-files").first().locator("summary").first().click();
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${code}: chapter nine overflows at ${width}`,
        );
      }
      await pair.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/bilingual-${code}-desktop.png` });
      await page.setViewportSize({ width: 390, height: 1000 });
      await pair.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/bilingual-${code}-mobile.png` });
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  console.log(
    "PASS: three bilingual workshops, ungraded alignment comparison, raw mistakes, dossier/downloads, optional completion, rewards, reports and 15 responsive layouts.",
  );
}
