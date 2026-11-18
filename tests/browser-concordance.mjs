import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPath, LANGUAGES, TREASURES } from "../content/registry.js";
import { freshState, STORAGE_KEY } from "../src/persistence/state.js";
import { recordAttempt } from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

export async function checkConcordanceWorkshop(browser, base, output) {
  for (const code of ["de", "fr", "en"]) {
    const m = LANGUAGES[code].concordance,
      course = getPath(`${code}-foundations`),
      chapter = course.chapters.find((c) => c.id === "concordance");
    const quiz = chapter.tasks.find((t) => t.id === "concordance-word-lemma"),
      exact = chapter.tasks.find((t) => t.id === "concordance-hits-documents"),
      study = chapter.tasks.find((t) => t.id === "concordance-usage-study");
    const state = freshState();
    state.activePathId = course.id;
    for (const task of chapter.tasks.filter(
      (t) => t.required && ![quiz.id, exact.id, study.id].includes(t.id),
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
      await page.goto(`${base}/#lab/concordance`);
      const panel = page.locator("[data-concordance]"),
        form = panel.locator("[data-concordance-form]");
      const run = async () => {
        await form.locator('button[type="submit"]').click();
      };
      const settings = async (values) => {
        for (const [key, value] of Object.entries(values)) {
          if (key === "query") await form.locator('[name="query"]').fill(value);
          else if (key === "caseSensitive")
            await form.locator('[name="caseSensitive"]').setChecked(value);
          else await form.locator(`[name="${key}"]`).selectOption(String(value));
        }
      };
      const reset = async () => panel.locator('[data-conc-action="reset"]').click();
      const answers = async () =>
        page.evaluate(
          ({ key, id }) => JSON.parse(localStorage.getItem(key)).paths[id].answers,
          { key: STORAGE_KEY, id: course.id },
        );
      assert.equal(await page.locator(".task-lesson").count(), 42);
      assert.match(
        await page.locator(".workshop-intro").textContent(),
        /163 ХВ \+ 42 ХВ/,
      );
      assert.equal(
        await panel.locator("[data-conc-count]").textContent(),
        String(m.expected.wordHits),
      );
      assert.equal(
        await panel.locator("[data-conc-doc-count]").textContent(),
        String(m.expected.wordDocuments),
      );
      assert.equal(await panel.locator("[data-conc-row]").count(), 5);
      const originalAnswers = await answers(),
        originalXP = await page.locator("#xp-label").textContent();
      await panel.locator(".concordance-ideas summary").click();
      await panel
        .locator('.concordance-ideas [data-concordance-preset="researchAudio"]')
        .click();
      await run();
      assert.equal(await panel.locator("[data-conc-count]").textContent(), "7");
      assert.equal(await form.locator('[name="corpus"]').inputValue(), "comparison");
      await reset();
      await panel.locator('[data-conc-action="next"]').click();
      assert.equal(
        await page.evaluate(() => document.activeElement.dataset.concAction),
        m.expected.wordHits > 10 ? "next" : "previous",
      );
      assert.match(await panel.locator("[data-conc-page]").textContent(), /Рядки 6–/);
      const allRows = await download(
        '[data-conc-action="export"]',
        `concordance-full-${code}.txt`,
      );
      assert.ok(allRows.body.toString().includes("C01:"));
      assert.ok(allRows.body.toString().includes("C11:"));
      await reset();
      await panel.locator("[data-conc-open]").first().click();
      assert.equal(await panel.locator(".concordance-detail mark").count(), 1);
      assert.ok(
        (await panel.locator(".concordance-source").textContent()).includes(
          m.documents.C01.text,
        ),
      );
      await panel.locator('[data-conc-action="close"]').click();
      assert.equal(await panel.locator(".concordance-detail").count(), 0);
      await settings({ caseSensitive: true });
      assert.match(
        await panel.locator("[data-conc-dirty]").textContent(),
        /Параметри змінено/,
      );
      assert.equal(
        await panel.locator("[data-conc-count]").textContent(),
        String(m.expected.wordHits),
      );
      const unapplied = await download(
        '[data-conc-action="export"]',
        `concordance-unapplied-${code}.txt`,
      );
      assert.ok(unapplied.body.toString().includes("регістр: не враховано"));
      await run();
      assert.equal(
        await panel.locator("[data-conc-count]").textContent(),
        String(m.expected.caseHits),
      );
      await settings({ caseSensitive: false, mode: "lemma", query: m.lemma });
      await run();
      assert.equal(
        await panel.locator("[data-conc-count]").textContent(),
        String(m.expected.lemmaHits),
      );
      const lemmaFile = await download(
        '[data-conc-action="export"]',
        `concordance-lemma-${code}.txt`,
      );
      assert.ok(lemmaFile.body.toString().includes("C09:"));
      assert.ok(lemmaFile.body.toString().includes("C10:"));
      await settings({ pos: "VERB" });
      await run();
      assert.equal(
        await panel.locator("[data-conc-count]").textContent(),
        String(m.expected.verbHits),
      );
      const verbFile = await download(
        '[data-conc-action="export"]',
        `concordance-verbs-${code}.txt`,
      );
      assert.ok(!verbFile.body.toString().includes("C10:"));
      await panel.locator(".concordance-catalog summary").click();
      await panel.locator('.concordance-catalog [data-conc-document="C10"]').click();
      assert.ok(
        (await panel.locator(".concordance-source").textContent()).includes(
          m.documents.C10.text,
        ),
      );
      await settings({ query: m.word, mode: "word", genre: "notice", year: "2024" });
      await run();
      assert.equal(await panel.locator("[data-conc-count]").textContent(), "0");
      assert.equal(await panel.locator("[data-conc-empty]").count(), 1);
      await reset();
      const beforeSort = await download(
        '[data-conc-action="export"]',
        `concordance-before-sort-${code}.txt`,
      );
      await settings({ window: 6, sort: "right" });
      await run();
      const afterSort = await download(
        '[data-conc-action="export"]',
        `concordance-after-sort-${code}.txt`,
      );
      const rowIds = (buffer) =>
        new Set([...buffer.toString().matchAll(/^C\d{2}:\d+ \|/gm)].map((m) => m[0]));
      assert.deepEqual(rowIds(beforeSort.body), rowIds(afterSort.body));
      await form.locator('[name="query"]').fill('<img src=x onerror="alert(1)">');
      await run();
      assert.match(
        await panel.locator(".concordance-error").textContent(),
        /Уведіть одне слово/,
      );
      assert.equal(await panel.locator("img").count(), 0);
      await reset();
      await page
        .locator("#task-concordance-metadata-filter [data-concordance-preset]")
        .click();
      await panel.locator('[data-conc-action="return"]').click();
      assert.equal(
        await page.evaluate(() => document.activeElement.dataset.task),
        "concordance-metadata-filter",
      );
      assert.equal(await form.locator('[name="mode"]').inputValue(), "lemma");
      assert.equal(await form.locator('[name="genre"]').inputValue(), "notice");
      assert.match(
        await panel.locator("[data-conc-dirty]").textContent(),
        /Параметри змінено/,
      );
      await run();
      assert.equal(
        await panel.locator("[data-conc-count]").textContent(),
        String(m.expected.filteredHits),
      );
      await page
        .locator("#task-concordance-research-pairs [data-concordance-preset]")
        .click();
      await run();
      assert.equal(await panel.locator("[data-conc-count]").textContent(), "11");
      await panel.locator('[data-conc-action="pin"]').click();
      // Changing the form does not replace either executed result or the pinned snapshot.
      await settings({ corpus: "peer" });
      assert.match(
        await panel.locator("[data-conc-corpus-description]").textContent(),
        /C19–C24/,
      );
      const stalePair = await download(
        '[data-conc-action="export-comparison"]',
        `concordance-stale-pair-${code}.txt`,
      );
      assert.ok(!stalePair.body.toString().includes("корпус: peer"));
      await run();
      assert.equal(await panel.locator("[data-conc-count]").textContent(), "9");
      const comparison = panel.locator("[data-conc-comparison]");
      assert.equal(await comparison.locator("article").count(), 2);
      assert.match(
        await comparison.locator("article").first().textContent(),
        /11 збігів у 5 документах/,
      );
      assert.match(
        await comparison.locator("article").last().textContent(),
        /9 збігів у 5 документах/,
      );
      const pairFile = await download(
        '[data-conc-action="export-comparison"]',
        `concordance-pair-${code}.txt`,
      );
      assert.equal(pairFile.name, `concordance-comparison-${code}-v2.txt`);
      const [partA, partB] = pairFile.body
        .toString()
        .split("Б / ОСТАННІЙ ВИКОНАНИЙ ПОШУК");
      assert.ok(partA.includes("корпус: office") && partA.includes("C18:"));
      assert.ok(!partA.includes("C24:"));
      assert.ok(partB.includes("корпус: peer") && partB.includes("C24:"));
      assert.ok(!partB.includes("C13:"));
      // A source from the pinned search remains readable after searching the other corpus.
      await comparison.locator('[data-conc-document="C13"]').first().click();
      assert.equal(
        await panel.locator(".concordance-source").textContent(),
        m.documents.C13.text,
      );
      await page
        .locator("#task-concordance-research-quoted-praise [data-concordance-preset]")
        .click();
      await run();
      assert.equal(await panel.locator("[data-conc-comparison] article").count(), 2);
      await panel.locator(".concordance-catalog summary").click();
      await panel.locator('.concordance-catalog [data-conc-document="C21"]').click();
      assert.ok(
        (await panel.locator(".concordance-source").textContent()).includes(
          m.research.quoted,
        ),
      );
      // Restore the original task's applied settings; the saved A survives page re-renders.
      await page
        .locator("#task-concordance-metadata-filter [data-concordance-preset]")
        .click();
      await run();
      assert.deepEqual(await answers(), originalAnswers);
      assert.equal(await page.locator("#xp-label").textContent(), originalXP);
      const zip = await download(
        '.workshop-downloads [data-action="materials"]',
        `concordance-pack-${code}.zip`,
      );
      assert.equal(zip.body.readUInt32LE(0), 0x04034b50);
      assert.ok(zip.body.includes(Buffer.from(m.documents.C01.text)));
      assert.ok(zip.body.includes(Buffer.from(m.documents.C24.text)));
      const template = await download(
        '[data-workshop-document="template"]',
        `concordance-template-${code}.txt`,
      );
      assert.ok(template.body.toString().includes("Хибні збіги й пропуски"));
      const exactCard = page.locator(`#task-${exact.id}`);
      await exactCard.locator("[data-answer]").fill("999");
      await exactCard.locator("[data-check]").click();
      await exactCard.locator(".feedback.failed").waitFor();
      assert.match(
        await panel.locator("[data-conc-comparison] article").first().textContent(),
        /11 збігів у 5 документах/,
      );
      // A shared page re-render retains the applied simulator settings in this tab.
      assert.equal(
        await panel.locator("[data-conc-count]").textContent(),
        String(m.expected.filteredHits),
      );
      await exactCard.locator("[data-answer]").fill(String(exact.answer));
      await exactCard.locator("[data-check]").click();
      await exactCard.locator(".feedback.passed").waitFor();
      const quizCard = page.locator(`#task-${quiz.id}`);
      await quizCard.locator('input[value="1"]').check();
      await quizCard.locator("[data-check]").click();
      await quizCard.locator(".feedback.failed").waitFor();
      await quizCard.locator(`input[value="${quiz.answer}"]`).check();
      await quizCard.locator("[data-check]").click();
      await quizCard.locator(".feedback.passed").waitFor();
      const card = page.locator(`#task-${study.id}`),
        value = portfolioAnswer(study, code);
      for (const key of ["artifact", "method", "reflection"])
        await card.locator(`[data-portfolio="${key}"]`).fill(value[key]);
      await card.locator('[data-portfolio="confirm"]').check();
      await card
        .locator('[data-portfolio="method"]')
        .fill(value.method.replace("Хибні збіги й пропуски", "Пропущений розділ"));
      await card.locator("[data-check]").click();
      await card.locator(".feedback.failed").waitFor();
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      await card.locator('[data-portfolio="method"]').fill(value.method);
      const own = await download(
        `[data-download-method="${study.id}"]`,
        `concordance-own-${code}.txt`,
      );
      assert.equal(own.body.toString(), value.method);
      assert.equal(own.name, `concordance-study-${code}.txt`);
      await card.locator("[data-check]").click();
      await card.locator(".feedback.submitted").waitFor();
      await page.locator("[data-chapter-feedback]").waitFor();
      await page.locator('[data-treasure="window"]').click();
      await page
        .locator(`[name="treasure-window"][value="${TREASURES.window.answer}"]`)
        .check();
      const xp = Number(
        (await page.locator("#xp-label").textContent()).replace(/\D/g, ""),
      );
      await page.locator('[data-check-treasure="window"]').click();
      await page.locator('[data-check-treasure="window"]').click();
      assert.equal(
        Number((await page.locator("#xp-label").textContent()).replace(/\D/g, "")),
        xp + 60,
      );
      await page.reload();
      assert.equal(await panel.locator("[data-conc-comparison]").count(), 0);
      assert.equal(
        await panel.locator("[data-conc-count]").textContent(),
        String(m.expected.wordHits),
      );
      assert.equal(
        await card.locator('[data-portfolio="method"]').inputValue(),
        value.method,
      );
      await page.goto(`${base}/#portfolio`);
      const report = JSON.parse(
        (
          await download(
            '[data-action="report-json"][data-module="concordance"]',
            `concordance-report-${code}.json`,
          )
        ).body,
      );
      assert.equal(report.summary.complete, true);
      assert.equal(
        report.tasks.find((t) => t.id === exact.id).record.attempts[0].value,
        "999",
      );
      assert.deepEqual(
        report.tasks.find((t) => t.id === quiz.id).record.attempts[0].selectedOptions,
        [{ index: 1, number: 2, value: quiz.options[1] }],
      );
      assert.ok(report.tasks.filter((t) => !t.required).every((t) => !t.record));
      assert.equal(
        await page
          .locator(".badge.unlocked")
          .filter({ hasText: "Дослідник контексту" })
          .count(),
        1,
      );
      await page.goto(`${base}/#lab/concordance`);
      await panel.locator(".concordance-catalog summary").click();
      await panel.locator('.concordance-catalog [data-conc-document="C04"]').click();
      await panel.locator(".concordance-history summary").click();
      await settings({ query: m.research.term, mode: "lemma", corpus: "office" });
      await run();
      await panel.locator('[data-conc-action="pin"]').click();
      await settings({ corpus: "peer" });
      await run();
      await page.locator(".toast.visible").waitFor({ state: "hidden" });
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${code}: concordance overflow at ${width}`,
        );
      }
      await panel.screenshot({ path: `${output}/concordance-${code}-desktop.png` });
      await page.setViewportSize({ width: 390, height: 1000 });
      await panel.screenshot({ path: `${output}/concordance-${code}-mobile.png` });
      await panel.locator('[data-conc-action="unpin"]').click();
      assert.equal(await panel.locator("[data-conc-comparison]").count(), 0);
      assert.equal(await panel.locator("[data-conc-count]").textContent(), "9");
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  console.log(
    "PASS: three concordance simulators, literal/lemma/case/POS/filter searches, stale settings, paging/sorting/context, safe exports, study/history/rewards/reports and 15 responsive layouts.",
  );
}
