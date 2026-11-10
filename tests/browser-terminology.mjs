import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPath, LANGUAGES, TREASURES } from "../content/registry.js";
import { freshState, STORAGE_KEY } from "../src/persistence/state.js";
import { recordAttempt } from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

export async function checkTerminologyWorkshop(browser, base, output) {
  for (const code of ["de", "fr", "en"]) {
    const course = getPath(`${code}-foundations`),
      chapter = course.chapters.find((c) => c.id === "terminology");
    const quiz = chapter.tasks.find((t) => t.id === "terminology-hidden-measure");
    const csv = chapter.tasks.find((t) => t.id === "terminology-variant-csv");
    const dossier = chapter.tasks.find((t) => t.id === "terminology-glossary-dossier");
    const state = freshState();
    state.activePathId = course.id;
    for (const task of chapter.tasks.filter(
      (t) => t.required && ![quiz.id, csv.id, dossier.id].includes(t.id),
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
      await page.goto(`${base}/#lab/terminology`);
      assert.equal(await page.locator(".task-lesson").count(), 42);
      assert.match(
        await page.locator(".workshop-intro").textContent(),
        /180 ХВ \+ 36 ХВ/,
      );
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      const zip = await download(
        '.workshop-downloads [data-action="materials"]',
        `terminology-pack-${code}.zip`,
      );
      assert.equal(zip.body.readUInt32LE(0), 0x04034b50);
      assert.ok(
        zip.body.includes(Buffer.from(LANGUAGES[code].terminology.candidateText)),
      );
      assert.ok(zip.body.includes(Buffer.from(`glossary-template-${code}.csv`)));
      const template = await download(
        '[data-workshop-document="template"]',
        `terminology-template-${code}.txt`,
      );
      assert.match(template.body.toString(), /Спірний відповідник і рішення/);
      await page.locator('[data-term="Поняття"]').click();
      await page.locator("#info-dialog[open]").waitFor();
      assert.match(await page.locator("#info-dialog").textContent(), /Одиниця знання/);
      await page.locator("#info-dialog [data-close]").click();
      const quizCard = page.locator(`#task-${quiz.id}`);
      await quizCard.locator('input[value="0"]').check();
      await quizCard.locator("[data-check]").click();
      await quizCard.locator(".feedback.failed").waitFor();
      await quizCard.locator(`input[value="${quiz.answer}"]`).check();
      await quizCard.locator("[data-check]").click();
      await quizCard.locator(".feedback.passed").waitFor();
      const csvCard = page.locator(`#task-${csv.id}`),
        wrong = csv.answer.replaceAll("C08", "C09").replaceAll("\r\n", "\n");
      await csvCard.locator("[data-answer]").fill(wrong);
      assert.equal(await csvCard.locator("[data-answer]").inputValue(), wrong);
      const xpBeforePreview = await page.locator("#xp-label").textContent();
      const attemptsBefore = await page.evaluate(
        ({ key, path, id }) =>
          JSON.parse(localStorage.getItem(key)).paths[path].answers[id]?.attempts
            .length || 0,
        { key: STORAGE_KEY, path: course.id, id: csv.id },
      );
      await csvCard.locator("[data-csv-preview]").click();
      assert.ok(
        (await csvCard.locator("[data-format-output]").textContent()).includes("C09"),
      );
      assert.equal(await page.locator("#xp-label").textContent(), xpBeforePreview);
      assert.equal(
        await page.evaluate(
          ({ key, path, id }) =>
            JSON.parse(localStorage.getItem(key)).paths[path].answers[id]?.attempts
              .length || 0,
          { key: STORAGE_KEY, path: course.id, id: csv.id },
        ),
        attemptsBefore,
      );
      await csvCard.locator("[data-check]").click();
      await csvCard.locator(".feedback.failed").waitFor();
      const equivalent = csv.expectedRows
        .map((row) =>
          row.map((field) => '"' + field.replaceAll('"', '""') + '"').join(","),
        )
        .join("\n");
      await csvCard.locator("[data-answer]").fill(equivalent);
      await csvCard.locator("[data-check]").click();
      await csvCard.locator(".feedback.passed").waitFor();
      const card = page.locator(`#task-${dossier.id}`),
        answer = portfolioAnswer(dossier, code);
      for (const key of ["artifact", "method", "reflection"])
        await card.locator(`[data-portfolio="${key}"]`).fill(answer[key]);
      await card.locator('[data-portfolio="confirm"]').check();
      await card
        .locator('[data-portfolio="method"]')
        .fill(
          answer.method.replace("Спірний відповідник і рішення", "Пропущений розділ"),
        );
      await card.locator("[data-check]").click();
      await card.locator(".feedback.failed").waitFor();
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      await card.locator('[data-portfolio="method"]').fill(answer.method);
      const own = await download(
        `[data-download-method="${dossier.id}"]`,
        `terminology-own-${code}.txt`,
      );
      assert.equal(own.body.toString(), answer.method);
      assert.equal(own.name, `terminology-dossier-${code}.txt`);
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      await card.locator("[data-check]").click();
      await card.locator(".feedback.submitted").waitFor();
      await page.locator("[data-chapter-feedback]").waitFor();
      await page.locator('[data-treasure="boundary"]').click();
      await page
        .locator(`[name="treasure-boundary"][value="${TREASURES.boundary.answer}"]`)
        .check();
      const xp = Number(
        (await page.locator("#xp-label").textContent()).replace(/\D/g, ""),
      );
      await page.locator('[data-check-treasure="boundary"]').click();
      assert.equal(
        Number((await page.locator("#xp-label").textContent()).replace(/\D/g, "")),
        xp + 60,
      );
      await page.locator('[data-check-treasure="boundary"]').click();
      assert.equal(
        Number((await page.locator("#xp-label").textContent()).replace(/\D/g, "")),
        xp + 60,
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
            '[data-action="report-json"][data-module="terminology"]',
            `terminology-report-${code}.json`,
          )
        ).body,
      );
      assert.equal(report.summary.complete, true);
      assert.deepEqual(
        report.tasks.find((t) => t.id === quiz.id).record.attempts[0].selectedOptions,
        [{ index: 0, number: 1, value: quiz.options[0] }],
      );
      const history = report.tasks.find((t) => t.id === csv.id).record.attempts;
      assert.equal(history[0].value, wrong);
      assert.equal(history[1].value, equivalent);
      assert.equal(
        report.tasks.find((t) => t.id === dossier.id).record.attempts.at(-1).status,
        "submitted",
      );
      assert.ok(report.tasks.filter((t) => !t.required).every((t) => !t.record));
      assert.equal(
        await page
          .locator(".badge.unlocked")
          .filter({ hasText: "Редактор термінології" })
          .count(),
        1,
      );
      await page.goto(`${base}/#lab/terminology`);
      await csvCard.locator("[data-csv-preview]").click();
      await page.locator(".workshop-files").first().locator("summary").first().click();
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${code}: terminology overflow at ${width}`,
        );
      }
      await csvCard.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/terminology-${code}-desktop.png` });
      await page.setViewportSize({ width: 390, height: 1000 });
      await csvCard.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/terminology-${code}-mobile.png` });
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  console.log(
    "PASS: three terminology workshops, CSV quoting/preview, concept IDs, draft reload, glossary dossiers/downloads, raw histories, optional completion, feedback/rewards/reports and 15 responsive layouts.",
  );
}
