import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPath, LANGUAGES } from "../content/registry.js";
import { freshState, STORAGE_KEY } from "../src/persistence/state.js";
import { recordAttempt } from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

export async function checkFormatWorkshop(browser, base, output) {
  // Cover each language's actual file download and semantic CSV entry.
  for (const code of ["de", "fr", "en"]) {
    const course = getPath(`${code}-foundations`),
      chapter = course.chapters[2],
      state = freshState();
    state.activePathId = course.id;
    const final = chapter.tasks.find((t) => t.id === "data-formats-portfolio"),
      csv = chapter.tasks.find((t) => t.id === "data-formats-csv-quoted-field"),
      inspector = chapter.tasks.find(
        (t) => t.id === "data-formats-straight-quote-input",
      );
    for (const task of chapter.tasks.filter(
      (t) => t.required && ![final.id, csv.id].includes(t.id) && !t.inspector,
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
    page.on("pageerror", (e) => errors.push(e.message));
    const saved = () =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
    const waitForDraft = (id, value) =>
      page.waitForFunction(
        ({ key, pathId, id, value }) =>
          JSON.parse(localStorage.getItem(key))?.paths[pathId]?.answers[id]?.draft ===
          value,
        { key: STORAGE_KEY, pathId: course.id, id, value },
      );
    const download = async (selector, name) => {
      const [file] = await Promise.all([
        page.waitForEvent("download"),
        page.locator(selector).click(),
      ]);
      await file.saveAs(`${output}/${name}`);
      return {
        name: file.suggestedFilename(),
        body: await readFile(`${output}/${name}`),
      };
    };
    try {
      await page.goto(`${base}/#lab/data-formats`);
      await page.locator(".workshop-intro").waitFor();
      assert.equal(await page.locator(".task-lesson").count(), 46);
      assert.equal(await page.locator(".workshop-stage").count(), 9);
      assert.match(
        await page.locator(".workshop-intro").textContent(),
        /172 ХВ \+ 23 ХВ/,
      );
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
      const pack = await download(
        ".workshop-downloads [data-action=materials]",
        `formats-${code}.zip`,
      );
      assert.equal(pack.name, `data-formats-case-${code}.zip`);
      assert.ok(pack.body.includes(Buffer.from(LANGUAGES[code].formats.records[0][1])));
      // Actual archive bytes, not just the inline decoded preview.
      assert.ok(pack.body.includes(Buffer.from([255, 254, 48, 0, 48, 0, 49, 0])));
      assert.match(
        (
          await download(
            "[data-workshop-document=template]",
            `formats-template-${code}.txt`,
          )
        ).body.toString(),
        /Імпорт та експорт/,
      );
      const pointTask = chapter.tasks.find(
          (t) => t.id === "data-formats-inspect-letter",
        ),
        point = page.locator(`#task-${pointTask.id}`);
      await point.locator("[data-answer]").fill("А");
      await point.locator("[data-inspect-characters]").click();
      await waitForDraft(pointTask.id, "А");
      assert.match(
        await point.locator("[data-format-output]").textContent(),
        /U\+0410/,
      );
      assert.equal(
        (await saved()).paths[course.id].answers[pointTask.id].attempts.length,
        0,
      );
      await point.locator("[data-check]").click();
      await point.locator(".feedback.failed").waitFor();
      await point.locator("[data-answer]").fill("A");
      await point.locator("[data-inspect-characters]").click();
      assert.match(
        await point.locator("[data-format-output]").textContent(),
        /U\+0041/,
      );
      await point.locator("[data-check]").click();
      await point.locator(".feedback.passed").waitFor();
      const spaceMark = page
        .locator("#task-data-formats-character-parts .symbol-glyph")
        .filter({ hasText: "␠" });
      assert.ok(
        await spaceMark.evaluate(
          (el) => parseFloat(getComputedStyle(el).fontSize) >= 32,
        ),
      );
      const symbols = page.locator(`#task-${inspector.id}`);
      await symbols.locator("[data-answer]").fill(inspector.answer);
      await symbols.locator("[data-inspect-characters]").click();
      assert.match(
        await symbols.locator("[data-format-output]").textContent(),
        /U\+0022/,
      );
      await waitForDraft(inspector.id, inspector.answer);
      assert.equal(
        (await saved()).paths[course.id].answers[inspector.id].attempts.length,
        0,
      );
      await symbols.locator("[data-check]").click();
      await symbols.locator(".feedback.passed").waitFor();
      const article = page.locator(`#task-${csv.id}`),
        word = LANGUAGES[code].word;
      const bad = `\n  ${word},“мова, система знаків”  \n`,
        good = `"${word}","мова, система знаків"`;
      await article.locator("[data-answer]").fill(bad);
      await article.locator("[data-csv-preview]").click();
      assert.match(
        await article.locator("[data-format-output]").textContent(),
        /Полів у кожному: 1, 3/,
      );
      await waitForDraft(csv.id, bad);
      assert.equal((await saved()).paths[course.id].answers[csv.id].attempts.length, 0);
      await article.locator("[data-check]").click();
      await article.locator(".feedback.failed").waitFor();
      await article.locator("[data-hint]").click();
      await page.reload();
      assert.equal(await article.locator("[data-answer]").inputValue(), bad);
      await article.locator("[data-answer]").fill(good);
      await article.locator("[data-csv-preview]").click();
      assert.match(
        await article.locator("[data-format-output]").textContent(),
        /Полів у кожному: 2/,
      );
      await article.locator("[data-check]").click();
      await article.locator(".feedback.passed").waitFor();
      const audit = page.locator(`#task-${final.id}`),
        answer = portfolioAnswer(final, code);
      for (const key of ["artifact", "method", "reflection"])
        await audit.locator(`[data-portfolio=${key}]`).fill(answer[key]);
      await audit.locator("[data-portfolio=confirm]").check();
      await audit.locator("[data-check]").click();
      await audit.locator(".feedback.submitted").waitFor();
      assert.equal(await page.locator("[data-chapter-feedback]").count(), 1);
      assert.equal(
        await page.locator("[data-chapter-feedback]").evaluate((el) => el.open),
        false,
      );
      const own = await download(
        `[data-download-method="${final.id}"]`,
        `formats-own-${code}.txt`,
      );
      assert.equal(own.name, "format-audit.txt");
      assert.equal(own.body.toString(), answer.method);
      await page.reload();
      const data = await saved(),
        record = data.paths[course.id].answers[csv.id];
      assert.equal(record.attempts[0].value, bad);
      assert.equal(record.attempts[1].value, good);
      assert.ok(
        chapter.tasks
          .filter((t) => !t.required)
          .every((t) => !data.paths[course.id].answers[t.id]),
      );
      await page.goto(`${base}/#portfolio`);
      const report = JSON.parse(
        (
          await download(
            '[data-action="report-json"][data-module="data-formats"]',
            `formats-report-${code}.json`,
          )
        ).body.toString(),
      );
      assert.equal(report.summary.complete, true);
      assert.equal(
        report.tasks.find((t) => t.id === csv.id).record.attempts[0].value,
        bad,
      );
      assert.ok(
        report.tasks
          .find((t) => t.id === csv.id)
          .record.attempts[0].definition.prompt.includes("U+0022"),
      );
      await page.goto(`${base}/#lab/data-formats`);
      await page.locator(".workshop-intro").waitFor();
      if (code === "fr") {
        // Exercise both previews with hostile input and inspect at mobile width too.
        await article.locator("[data-answer]").fill("<img src=x onerror=alert(1)>");
        await article.locator("[data-csv-preview]").click();
        assert.equal(await article.locator("[data-format-output] img").count(), 0);
        await symbols.locator("[data-answer]").fill('"é" <script>alert(1)</script>');
        await symbols.locator("[data-inspect-characters]").click();
        assert.equal(await symbols.locator("[data-format-output] script").count(), 0);
        for (const width of [320, 390, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          const overflow = await page.evaluate(() =>
            [...document.querySelectorAll("body *")]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                return (
                  r.width &&
                  (r.right > innerWidth + 1 || r.left < -1) &&
                  getComputedStyle(el).position !== "fixed" &&
                  !el.closest(".main-nav, .task-nav, .formats-table-wrap")
                );
              })
              .map((el) => ({
                tag: el.tagName,
                className: el.className,
                right: el.getBoundingClientRect().right,
                width: el.getBoundingClientRect().width,
              }))
              .slice(0, 15),
          );
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `Formats overflow at ${width}: ${JSON.stringify(overflow)}`,
          );
          if ([390, 1440].includes(width)) {
            await page
              .locator(".workshop-intro")
              .screenshot({ path: `${output}/formats-plan-${width}.png` });
            await article.screenshot({ path: `${output}/formats-csv-${width}.png` });
            await page
              .locator(".encoding-diagram")
              .screenshot({ path: `${output}/formats-encoding-${width}.png` });
            await page
              .locator("#task-data-formats-character-parts .symbol-samples")
              .screenshot({ path: `${output}/formats-symbols-${width}.png` });
          }
        }
      }
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  console.log(
    "PASS: three format workshops, real files, ungraded inspectors, equivalent CSV grading, raw histories/reload/report, optional feedback and five layouts.",
  );
}
