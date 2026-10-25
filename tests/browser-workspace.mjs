import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getPath } from "../content/registry.js";
import { freshState, STORAGE_KEY } from "../src/persistence/state.js";
import { recordAttempt } from "../src/learning/progress.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

export async function checkWorkspaceWorkshop(browser, base, output) {
  const course = getPath("fr-foundations"),
    chapter = course.chapters[0],
    state = freshState();
  state.activePathId = course.id;
  for (const task of chapter.tasks.filter(
    (task) => task.required && task.id !== "workspace-portfolio",
  )) {
    const answer =
      task.type === "portfolio" ? portfolioAnswer(task, "fr") : task.answer;
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
  try {
    await page.goto(base + "/#lab/workspace");
    await page.locator(".workshop-intro").waitFor();
    assert.equal(await page.locator(".workshop-stage").count(), 9);
    assert.equal(await page.locator(".task-lesson").count(), 33);
    assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
    assert.ok(
      (await page.locator(".workshop-intro").textContent()).includes("144 ХВ + 30 ХВ"),
    );
    const download = async (selector, name) => {
      const pending = page.waitForEvent("download");
      await page.locator(selector).click();
      const file = await pending,
        path = output + "/" + name;
      await file.saveAs(path);
      return { file, body: await readFile(path) };
    };
    const pack = await download(
      ".workshop-downloads [data-action=materials]",
      "workspace-fr.zip",
    );
    assert.equal(pack.file.suggestedFilename(), "workspace-case-fr.zip");
    assert.equal(pack.body.readUInt32LE(0), 0x04034b50);
    const template = await download(
      "[data-workshop-document=template]",
      "workspace-template.txt",
    );
    assert.ok(template.body.toString().includes("Походження і доступ"));
    assert.ok(template.body.toString().includes("[Замініть цей рядок"));
    const example = await download(
      "[data-workshop-document=example]",
      "workspace-example.txt",
    );
    assert.ok(example.body.toString().includes("C01"));
    assert.ok(!example.body.toString().includes("S03"));
    const preview = page.locator(".workshop-files").first();
    await preview.locator(":scope > summary").click();
    await preview.locator("details").first().locator("summary").click();
    assert.equal(
      await preview.locator("details").first().locator("code").textContent(),
      chapter.workshop.files[0].content,
    );
    await preview.locator(":scope > summary").click();
    await page
      .locator('.workshop-task-nav [data-scroll-task="workspace-readme-location"]')
      .click();
    await page.waitForFunction(() => {
      const rect = document
        .querySelector("#task-workspace-readme-location")
        .getBoundingClientRect();
      return rect.top < innerHeight && rect.bottom > 0;
    });
    const task = chapter.tasks.find((task) => task.id === "workspace-portfolio"),
      answer = portfolioAnswer(task, "fr"),
      article = page.locator("#task-workspace-portfolio");
    for (const key of ["artifact", "method", "reflection"])
      await article.locator(`[data-portfolio=${key}]`).fill(answer[key]);
    await article
      .locator("[data-portfolio=method]")
      .fill(answer.method.replace("4. Походження і доступ", "4. Інше"));
    await article.locator("[data-portfolio=confirm]").check();
    await article.locator("[data-check]").click();
    await article.locator(".feedback.failed").waitFor();
    assert.match(
      await article.locator(".feedback").textContent(),
      /Походження і доступ/,
    );
    assert.equal(await page.locator("[data-chapter-feedback]").count(), 0);
    await article.locator("[data-portfolio=method]").fill(answer.method);
    await article.locator("[data-check]").click();
    await article.locator(".feedback.submitted").waitFor();
    assert.equal(await page.locator("[data-chapter-feedback]").count(), 1);
    assert.equal(
      await page.locator("[data-chapter-feedback]").evaluate((el) => el.open),
      false,
    );
    const record = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      STORAGE_KEY,
    );
    assert.equal(record.paths[course.id].answers[task.id].attempts[0].status, "failed");
    assert.equal(
      record.paths[course.id].answers[task.id].attempts[1].value.method,
      answer.method,
    );
    assert.ok(
      chapter.tasks
        .filter((task) => !task.required)
        .every((task) => !record.paths[course.id].answers[task.id]),
    );
    const ownReadme = await download(
      '[data-download-method="workspace-portfolio"]',
      "workspace-own-README.txt",
    );
    assert.equal(ownReadme.body.toString(), answer.method);
    await page.reload();
    await article.waitFor();
    assert.equal(
      await article.locator("[data-portfolio=method]").inputValue(),
      answer.method,
    );
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Workshop overflows at ${width}`,
      );
      if ([390, 1440].includes(width)) {
        await page
          .locator(".workshop-intro")
          .screenshot({ path: output + `/workspace-plan-${width}.png` });
        await article.screenshot({ path: output + `/workspace-readme-${width}.png` });
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: French workshop readings/navigation, ZIP/template/example downloads, README checks, exact draft/history restore, core-only completion/feedback and five layouts.",
    );
  } finally {
    await context.close();
  }
}
