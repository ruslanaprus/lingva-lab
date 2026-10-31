import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPath, LANGUAGES } from "../content/registry.js";
import { freshState, STORAGE_KEY } from "../src/persistence/state.js";
import { recordAttempt } from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { typographyMaterials } from "../content/shared/chapters/unicode/materials.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

export async function checkTypographyWorkshop(browser, base, output) {
  for (const code of ["de", "fr", "en"]) {
    const course = getPath(`${code}-foundations`),
      chapter = course.chapters[3],
      language = LANGUAGES[code],
      state = freshState();
    state.activePathId = course.id;
    const ids = [
      "language-settings",
      "enter-nfd",
      "nonbreaking-space",
      "ipa-panel",
      "editorial-quotes",
      "repair-notice",
      "typography-guide",
    ].map((s) => `unicode-${s}`);
    for (const task of chapter.tasks.filter((t) => t.required && !ids.includes(t.id))) {
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
    page.on("pageerror", (e) => errors.push(e.message));
    const saved = () =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
    const waitDraft = (id, value) =>
      page.waitForFunction(
        ({ key, path, id, value }) =>
          JSON.parse(localStorage.getItem(key))?.paths[path].answers[id]?.draft ===
          value,
        { key: STORAGE_KEY, path: course.id, id, value },
      );
    const article = (id) => page.locator(`#task-unicode-${id}`);
    const submit = async (id, status = "passed") => {
      await article(id).locator("[data-check]").click();
      await article(id).locator(`.feedback.${status}`).waitFor();
    };
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
      await page.goto(`${base}/#lab/unicode`);
      assert.equal(await page.locator(".task-lesson").count(), 39);
      assert.equal(await page.locator(".workshop-stage").count(), 9);
      assert.match(
        await page.locator(".workshop-intro").textContent(),
        /167 ХВ \+ 23 ХВ/,
      );
      const pack = await download(
        '.workshop-downloads [data-action="materials"]',
        `typography-${code}.zip`,
      );
      assert.equal(pack.name, `unicode-case-${code}.zip`);
      assert.ok(pack.body.includes(Buffer.from(language.nfd)));
      const template = await download(
        '[data-workshop-document="template"]',
        `typography-template-${code}.txt`,
      );
      assert.match(template.body.toString(), /Нормалізація й пошук/);
      const panel = article("ipa-panel"),
        input = panel.locator("[data-answer]");
      const xp = await page.locator("#xp-label").textContent();
      await input.fill("[s]");
      await input.evaluate((el) => el.setSelectionRange(1, 2));
      await panel
        .getByRole("button", { name: "Вставити ʃ, U+0283", exact: true })
        .click();
      assert.equal(await input.inputValue(), "[ʃ]");
      await panel.locator("[data-typography-preview]").click();
      assert.match(
        await panel.locator("[data-typography-output]").textContent(),
        /U\+0283/,
      );
      await waitDraft("unicode-ipa-panel", "[ʃ]");
      assert.equal(
        (await saved()).paths[course.id].answers["unicode-ipa-panel"].attempts.length,
        0,
      );
      assert.equal(await page.locator("#xp-label").textContent(), xp);
      await input.fill("\n[ʃ]");
      await waitDraft("unicode-ipa-panel", "\n[ʃ]");
      await page.reload();
      assert.equal(await input.inputValue(), "\n[ʃ]");
      await input.fill("x".repeat(10000));
      await input.evaluate((el) => el.setSelectionRange(10000, 10000));
      await panel
        .getByRole("button", { name: "Вставити ʃ, U+0283", exact: true })
        .click();
      assert.equal((await input.inputValue()).length, 10000);
      await input.fill("[ʃ]");
      await submit("ipa-panel");
      const nfd = article("enter-nfd"),
        nfdInput = nfd.locator("[data-answer]");
      await nfdInput.fill(language.accent);
      await submit("enter-nfd", "failed");
      await nfdInput.fill(language.nfd.replace(language.typography.combining, ""));
      const position = language.nfd.indexOf(language.typography.combining);
      await nfdInput.evaluate((el, p) => el.setSelectionRange(p, p), position);
      await nfd.locator("[data-insert-symbol]").first().click();
      assert.equal(await nfdInput.inputValue(), language.nfd);
      await nfdInput.fill(`${language.accent} ${language.nfd}`);
      await nfd.locator("[data-typography-preview]").click();
      assert.match(
        await nfd.locator("[data-typography-output]").textContent(),
        /до NFC: 1; після NFC тексту й проби: 2/,
      );
      await nfdInput.fill(language.nfd);
      await submit("enter-nfd");
      const space = article("nonbreaking-space"),
        spaceInput = space.locator("[data-answer]");
      await spaceInput.fill("12 s");
      await submit("nonbreaking-space", "failed");
      await spaceInput.fill("12s");
      await spaceInput.evaluate((el) => el.setSelectionRange(2, 2));
      await space.locator('[data-symbol-index="0"]').click();
      assert.equal(await spaceInput.inputValue(), "12\u00A0s");
      await space.locator("[data-typography-preview]").click();
      assert.match(
        await space.locator("[data-typography-output]").textContent(),
        /U\+00A0/,
      );
      await submit("nonbreaking-space");
      const settings = article("language-settings");
      await settings.locator('input[value="0"]').check();
      await submit("language-settings", "failed");
      for (const i of [1, 2]) await settings.locator(`input[value="${i}"]`).check();
      await submit("language-settings");
      const quotes = article("editorial-quotes");
      if (code === "fr") {
        await quotes
          .locator("[data-answer]")
          .fill(language.typography.quoteText.replaceAll("\u202F", " "));
        await submit("editorial-quotes", "failed");
      }
      await quotes.locator("[data-answer]").fill(language.typography.quoteText);
      await submit("editorial-quotes");
      const repair = article("repair-notice"),
        materials = typographyMaterials(language);
      await repair.locator("[data-answer]").fill(materials.broken);
      await submit("repair-notice", "failed");
      await repair.locator("[data-answer]").fill(materials.repaired);
      await submit("repair-notice");
      const guideTask = chapter.tasks.find((t) => t.id === "unicode-typography-guide"),
        guide = article("typography-guide"),
        answer = portfolioAnswer(guideTask, code);
      for (const key of ["artifact", "method", "reflection"])
        await guide.locator(`[data-portfolio="${key}"]`).fill(answer[key]);
      await guide.locator('[data-portfolio="confirm"]').check();
      await submit("typography-guide", "submitted");
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 1);
      assert.equal(
        await page.locator("[data-chapter-feedback]").evaluate((el) => el.open),
        false,
      );
      const own = await download(
        '[data-download-method="unicode-typography-guide"]',
        `typography-own-${code}.txt`,
      );
      assert.equal(own.body.toString(), answer.method);
      assert.equal(own.name, `typography-guide-${code}.txt`);
      await page.locator('[data-treasure="unicode"]').click();
      await page.locator('[name="treasure-unicode"][value="1"]').check();
      await page.locator('[data-check-treasure="unicode"]').click();
      const treasureXP = await page.locator("#xp-label").textContent();
      await page.locator('[data-check-treasure="unicode"]').click();
      assert.equal(await page.locator("#xp-label").textContent(), treasureXP);
      await page.reload();
      const data = await saved(),
        record = data.paths[course.id].answers["unicode-nonbreaking-space"];
      assert.equal(record.attempts[0].value, "12 s");
      assert.equal(record.attempts[1].value, "12\u00A0s");
      assert.deepEqual(
        data.paths[course.id].answers["unicode-language-settings"].attempts[0]
          .selectedOptions,
        [
          {
            index: 0,
            number: 1,
            value: chapter.tasks.find((t) => t.id === "unicode-language-settings")
              .options[0],
          },
        ],
      );
      assert.ok(
        chapter.tasks
          .filter((t) => !t.required)
          .every((t) => !data.paths[course.id].answers[t.id]),
      );
      await page.goto(`${base}/#portfolio`);
      const report = JSON.parse(
        (
          await download(
            '[data-action="report-json"][data-module="unicode"]',
            `typography-report-${code}.json`,
          )
        ).body,
      );
      assert.equal(report.summary.complete, true);
      assert.equal(
        report.tasks.find((t) => t.id === "unicode-nonbreaking-space").record
          .attempts[0].value,
        "12 s",
      );
      assert.equal(
        report.tasks.find((t) => t.id === "unicode-typography-guide").record.attempts[0]
          .status,
        "submitted",
      );
      await page.goto(`${base}/#lab/unicode`);
      await input.fill('<img src=x onerror="alert(1)">');
      await panel.locator("[data-typography-preview]").click();
      assert.equal(await panel.locator("[data-typography-output] img").count(), 0);
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
          `${code} typography overflow at ${width}`,
        );
      }
      await input.fill("[ʃ]");
      await panel.locator("[data-typography-preview]").click();
      await panel.screenshot({ path: `${output}/typography-${code}-inspector.png` });
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  console.log(
    "PASS: three typography workshops, character insertion, NFC/NFD search, precise whitespace, raw histories/reports, completion, rewards and 15 responsive layouts.",
  );
}
