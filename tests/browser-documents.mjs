import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPath, TREASURES } from "../content/registry.js";
import { freshState, STORAGE_KEY } from "../src/persistence/state.js";
import { recordAttempt } from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

export async function checkDocumentWorkshop(browser, base, output) {
  const course = getPath("fr-foundations"),
    chapter = course.chapters[1],
    state = freshState();
  state.activePathId = course.id;
  const final = chapter.tasks.find((t) => t.id === "academic-documents-portfolio"),
    first = chapter.tasks[0];
  for (const task of chapter.tasks.filter(
    (t) => t.required && t.id !== final.id && t.id !== first.id,
  )) {
    const value = task.type === "portfolio" ? portfolioAnswer(task, "fr") : task.answer;
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
  const download = async (selector, name) => {
    const pending = page.waitForEvent("download");
    await page.locator(selector).click();
    const file = await pending,
      path = output + "/" + name;
    await file.saveAs(path);
    return { name: file.suggestedFilename(), body: await readFile(path) };
  };
  try {
    await page.goto(base + "/#lab/academic-documents");
    await page.locator(".workshop-intro").waitFor();
    assert.equal(await page.locator(".task-lesson").count(), 32);
    assert.equal(await page.locator(".workshop-stage").count(), 9);
    assert.ok((await page.locator(".breadcrumb").textContent()).includes("РОЗДІЛ 02"));
    assert.ok(
      (await page.locator(".workshop-intro").textContent()).includes("155 ХВ + 28 ХВ"),
    );
    assert.ok(
      !(await page.locator(".workshop-intro").textContent()).includes("приклад README"),
    );
    assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
    const pack = await download(
      ".workshop-downloads [data-action=materials]",
      "documents-fr.zip",
    );
    assert.equal(pack.name, "academic-documents-case-fr.zip");
    assert.equal(pack.body.readUInt32LE(0), 0x04034b50);
    assert.ok(pack.body.includes(Buffer.from("corpus pédagogique")));
    const template = await download(
      "[data-workshop-document=template]",
      "editorial-template.txt",
    );
    assert.ok(template.body.toString().includes("Термінобаза:"));
    const example = await download(
      "[data-workshop-document=example]",
      "editorial-example.txt",
    );
    assert.ok(example.body.toString().includes("АФІША"));
    const preview = page.locator(".workshop-files").first();
    await preview.locator(":scope > summary").click();
    await preview.locator("details").first().locator("summary").click();
    assert.equal(
      await preview.locator("details").first().locator("code").textContent(),
      chapter.workshop.files[0].content,
    );
    await preview.locator(":scope > summary").click();
    const start = page.locator(`#task-${first.id}`);
    await start.locator('input[value="0"]').check();
    await start.locator("[data-check]").click();
    await start.locator(".feedback.failed").waitFor();
    await start.locator("[data-hint]").click();
    await start.locator(`input[value="${first.answer}"]`).check();
    await start.locator("[data-check]").click();
    await start.locator(".feedback.passed").waitFor();
    const article = page.locator(`#task-${final.id}`),
      answer = portfolioAnswer(final, "fr");
    for (const key of ["artifact", "method", "reflection"])
      await article.locator(`[data-portfolio=${key}]`).fill(answer[key]);
    await article
      .locator("[data-portfolio=method]")
      .fill(answer.method.replace("6. Відкриті питання", "6. Інше"));
    await article.locator("[data-portfolio=confirm]").check();
    await article.locator("[data-check]").click();
    await article.locator(".feedback.failed").waitFor();
    assert.ok(
      (await article.locator(".feedback").textContent()).includes("Журнал редакції"),
    );
    assert.ok(!(await article.locator(".feedback").textContent()).includes("README"));
    await page.reload();
    assert.ok(
      (await article.locator("[data-portfolio=method]").inputValue()).includes(
        "6. Інше",
      ),
    );
    await article.locator("[data-portfolio=method]").fill(answer.method);
    await article.locator("[data-check]").click();
    await article.locator(".feedback.submitted").waitFor();
    assert.equal(await page.locator("[data-chapter-feedback]").count(), 1);
    assert.equal(
      await page.locator("[data-chapter-feedback]").evaluate((el) => el.open),
      false,
    );
    const own = await download(
      `[data-download-method="${final.id}"]`,
      "editorial-own-log.txt",
    );
    assert.equal(own.name, "editorial-log.txt");
    assert.equal(own.body.toString(), answer.method);
    const data = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      STORAGE_KEY,
    );
    assert.ok(
      chapter.tasks
        .filter((t) => !t.required)
        .every((t) => !data.paths[course.id].answers[t.id]),
    );
    assert.equal(
      data.paths[course.id].answers[first.id].attempts[0].selectedOptions[0].value,
      first.options[0],
    );
    assert.equal(data.paths[course.id].answers[final.id].attempts[0].status, "failed");
    assert.equal(
      data.paths[course.id].answers[final.id].attempts[1].value.method,
      answer.method,
    );
    const before = Number(
      (await page.locator("#xp-label").textContent()).replace(/\D/g, ""),
    );
    await page.locator("[data-treasure=editorial]").click();
    await page.locator('[name=treasure-editorial][value="0"]').check();
    await page.locator("[data-check-treasure=editorial]").click();
    await page
      .locator(`[name=treasure-editorial][value="${TREASURES.editorial.answer}"]`)
      .check();
    await page.locator("[data-check-treasure=editorial]").click();
    await page.locator("[data-check-treasure=editorial]").click();
    assert.equal(await page.locator("#xp-label").textContent(), `${before + 60} XP`);
    const report = await download(
      ".sidebar-controls [data-action=report]",
      "documents-report.html",
    );
    assert.ok(report.body.toString().includes("ЖУРНАЛ РЕДАКЦІЇ"));
    assert.ok(report.body.toString().includes("Печатка без погодження"));
    assert.ok(report.body.toString().includes("Активний час"));
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Documents overflow at ${width}`,
      );
      if ([390, 1440].includes(width)) {
        await page
          .locator(".workshop-intro")
          .screenshot({ path: output + `/documents-plan-${width}.png` });
        await article.screenshot({
          path: output + `/documents-portfolio-${width}.png`,
        });
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: document workshop downloads, readings, failed drafts, journal checks, required-only completion, feedback, hidden challenge/XP and five layouts.",
    );
  } finally {
    await context.close();
  }
}
