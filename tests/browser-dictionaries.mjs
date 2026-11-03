import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPath, LANGUAGES, TREASURES } from "../content/registry.js";
import { freshState, STORAGE_KEY } from "../src/persistence/state.js";
import { recordAttempt } from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { portfolioAnswer } from "./helpers/answers.mjs";
import { lexiconFixture, fillLexicon } from "./helpers/lexicon.mjs";

export async function checkDictionaryWorkshop(browser, base, output) {
  for (const code of ["de", "fr", "en"]) {
    const course = getPath(`${code}-foundations`);
    const chapter = course.chapters.find((c) => c.id === "digital-dictionaries");
    const quiz = chapter.tasks.find(
      (t) => t.id === "digital-dictionaries-context-sense",
    );
    const typed = chapter.tasks.find((t) => t.type === "exact");
    const dossier = chapter.tasks.find(
      (t) => t.id === "digital-dictionaries-word-dossier",
    );
    const state = freshState();
    state.activePathId = course.id;
    for (const task of chapter.tasks.filter(
      (t) => t.required && ![quiz.id, typed.id, dossier.id].includes(t.id),
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
      await page.goto(`${base}/#lab/digital-dictionaries`);
      assert.equal(await page.locator(".task-lesson").count(), 51);
      assert.match(
        await page.locator(".workshop-intro").textContent(),
        /209 ХВ \+ 56 ХВ/,
      );
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      const zip = await download(
        '.workshop-downloads [data-action="materials"]',
        `dictionary-pack-${code}.zip`,
      );
      assert.equal(zip.body.readUInt32LE(0), 0x04034b50);
      assert.ok(zip.body.includes(Buffer.from(LANGUAGES[code].dictionaries.context)));
      const template = await download(
        '[data-workshop-document="template"]',
        `dictionary-template-${code}.txt`,
      );
      assert.match(template.body.toString(), /Джерела й локатори/);
      await page.locator('[data-term="Заголовне слово"]').click();
      await page.locator("#info-dialog[open]").waitFor();
      assert.match(
        await page.locator("#info-dialog").textContent(),
        /словникова стаття/,
      );
      await page.locator("#info-dialog [data-close]").click();
      const quizCard = page.locator(`#task-${quiz.id}`);
      await quizCard.locator('input[value="0"]').check();
      await quizCard.locator("[data-check]").click();
      await quizCard.locator(".feedback.failed").waitFor();
      await quizCard.locator(`input[value="${quiz.answer}"]`).check();
      await quizCard.locator("[data-check]").click();
      await quizCard.locator(".feedback.passed").waitFor();
      const typedCard = page.locator(`#task-${typed.id}`);
      const incorrect = `${LANGUAGES[code].dictionaries.form}?`;
      await typedCard.locator("[data-answer]").fill(incorrect);
      await typedCard.locator("[data-check]").click();
      await typedCard.locator(".feedback.failed").waitFor();
      await typedCard.locator("[data-answer]").fill(typed.answer);
      await typedCard.locator("[data-check]").click();
      await typedCard.locator(".feedback.passed").waitFor();
      const card = page.locator(`#task-${dossier.id}`),
        answer = portfolioAnswer(dossier, code);
      for (const key of ["artifact", "method", "reflection"])
        await card.locator(`[data-portfolio="${key}"]`).fill(answer[key]);
      await card.locator('[data-portfolio="confirm"]').check();
      await card
        .locator('[data-portfolio="method"]')
        .fill(answer.method.replace("Джерела й локатори", "Пропущена частина"));
      await card.locator("[data-check]").click();
      await card.locator(".feedback.failed").waitFor();
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      await card.locator('[data-portfolio="method"]').fill(answer.method);
      await card.locator("[data-check]").click();
      await card.locator(".feedback.submitted").waitFor();
      await page.locator("[data-chapter-feedback]").waitFor();
      const own = await download(
        `[data-download-method="${dossier.id}"]`,
        `dictionary-own-${code}.txt`,
      );
      assert.equal(own.body.toString(), answer.method);
      assert.equal(own.name, `dictionary-dossier-${code}.txt`);
      await page.locator('[data-treasure="lexicon"]').click();
      await page
        .locator(`[name="treasure-lexicon"][value="${TREASURES.lexicon.answer}"]`)
        .check();
      const xpBefore = Number(
        (await page.locator("#xp-label").textContent()).replace(/\D/g, ""),
      );
      await page.locator('[data-check-treasure="lexicon"]').click();
      const xp = await page.locator("#xp-label").textContent();
      assert.equal(Number(xp.replace(/\D/g, "")), xpBefore + 60);
      await page.locator('[data-check-treasure="lexicon"]').click();
      assert.equal(await page.locator("#xp-label").textContent(), xp);
      const projectTask = chapter.tasks.find((t) => t.editor === "dictionary");
      const project = page.locator(`#task-${projectTask.id}`);
      await project.locator("[data-check]").click();
      await project.locator(".feedback.failed").waitFor();
      const model = lexiconFixture(code);
      await fillLexicon(project, model);
      await page.reload();
      assert.equal(
        await project
          .locator('[data-lexicon-entry="S2"] [data-lexicon-field="lemma"]')
          .inputValue(),
        model.entries[1].lemma,
      );
      await project
        .locator('[data-lexicon-entry="S5"] [data-lexicon-action="remove"]')
        .click();
      await project.locator('[data-lexicon-action="validate"]').click();
      assert.match(
        await project.locator("[data-lexicon-output]").textContent(),
        /S4.*наявного ID/,
      );
      await project.locator('[data-lexicon-action="add"]').click();
      assert.equal(await project.locator('[data-lexicon-entry="S5"]').count(), 0);
      const replacement = project.locator('[data-lexicon-entry="S6"]');
      for (const [key, value] of Object.entries(model.entries[4])) {
        if (key === "id") continue;
        const input = replacement.locator(`[data-lexicon-field="${key}"]`);
        if (["pos", "relation", "target"].includes(key))
          await input.selectOption(value);
        else await input.fill(value);
      }
      await project
        .locator('[data-lexicon-entry="S4"] [data-lexicon-field="target"]')
        .selectOption("S6");
      await project.locator('[data-lexicon-action="validate"]').click();
      assert.match(
        await project.locator("[data-lexicon-output]").textContent(),
        /Структурні поля заповнено/,
      );
      const json = await download(
        '[data-lexicon-action="json"]',
        `my-dictionary-${code}.json`,
      );
      const dictionary = JSON.parse(json.body);
      assert.equal(dictionary.language, code);
      assert.equal(dictionary.entries[1].lemma, model.entries[1].lemma);
      assert.equal(dictionary.entries.at(-1).id, "S6");
      const methodBeforeImport = await project
        .locator('[data-portfolio="method"]')
        .inputValue();
      await project.locator("[data-lexicon-import]").setInputFiles({
        name: "other-language.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({ ...dictionary, language: code === "de" ? "fr" : "de" }),
        ),
      });
      await page.waitForFunction(() =>
        document
          .querySelector("[data-lexicon-output]")
          ?.textContent.includes("Наявна чернетка збережена"),
      );
      assert.equal(
        await project.locator('[data-portfolio="method"]').inputValue(),
        methodBeforeImport,
      );
      page.once("dialog", (dialog) => dialog.accept());
      await project.locator("[data-lexicon-import]").setInputFiles({
        name: "my-dictionary.json",
        mimeType: "application/json",
        buffer: json.body,
      });
      await page.waitForFunction(() =>
        document
          .querySelector("[data-lexicon-output]")
          ?.textContent.includes("Файл відкрито"),
      );
      assert.deepEqual(
        JSON.parse(await project.locator('[data-portfolio="method"]').inputValue()),
        dictionary,
      );
      const txt = await download(
        '[data-lexicon-action="txt"]',
        `my-dictionary-${code}.txt`,
      );
      assert.ok(txt.body.toString().includes(model.entries[1].definition));
      const projectAnswer = portfolioAnswer(projectTask, code);
      await project
        .locator('[data-portfolio="artifact"]')
        .fill("results/my-dictionary.json");
      await project
        .locator('[data-portfolio="reflection"]')
        .fill(projectAnswer.reflection);
      await project.locator('[data-portfolio="confirm"]').check();
      const xpBeforeProject = Number(
        (await page.locator("#xp-label").textContent()).replace(/\D/g, ""),
      );
      await project.locator("[data-check]").click();
      await project.locator(".feedback.submitted").waitFor();
      assert.equal(
        Number((await page.locator("#xp-label").textContent()).replace(/\D/g, "")),
        xpBeforeProject + 80,
      );
      await project.locator("[data-check]").click();
      assert.equal(
        Number((await page.locator("#xp-label").textContent()).replace(/\D/g, "")),
        xpBeforeProject + 80,
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
            '[data-action="report-json"][data-module="digital-dictionaries"]',
            `dictionary-report-${code}.json`,
          )
        ).body,
      );
      assert.equal(report.summary.complete, true);
      const projectRecord = report.tasks.find((t) => t.id === projectTask.id).record;
      assert.equal(projectRecord.attempts.at(-1).status, "submitted");
      assert.deepEqual(JSON.parse(projectRecord.draft.method), dictionary);
      assert.ok(
        (await page
          .locator(".badge.unlocked")
          .filter({ hasText: "Укладач мінісловника" })
          .count()) === 1,
      );
      const attempts = report.tasks.find((t) => t.id === quiz.id).record.attempts;
      assert.deepEqual(attempts[0].selectedOptions, [
        { index: 0, number: 1, value: quiz.options[0] },
      ]);
      assert.equal(
        report.tasks.find((t) => t.id === typed.id).record.attempts[0].value,
        incorrect,
      );
      assert.equal(
        report.tasks.find((t) => t.id === dossier.id).record.attempts[1].status,
        "submitted",
      );
      await page.goto(`${base}/#lab/digital-dictionaries`);
      assert.equal(await project.locator('[data-lexicon-entry="S6"]').count(), 1);
      await page.locator(".workshop-files").first().locator("summary").first().click();
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
          `${code} dictionary overflow at ${width}`,
        );
      }
      await page.screenshot({ path: `${output}/dictionary-${code}-desktop.png` });
      await project.locator("[data-lexicon-builder] h3").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${output}/dictionary-builder-${code}-desktop.png`,
      });
      await page.setViewportSize({ width: 390, height: 1000 });
      await project.locator("[data-lexicon-builder] h3").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${output}/dictionary-builder-${code}-mobile.png`,
      });
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  console.log(
    "PASS: three dictionary workshops and builders, draft reload, stable IDs/broken-link repair, JSON/TXT exports, submissions/milestones/XP, raw histories/reports and 15 responsive layouts.",
  );
}
