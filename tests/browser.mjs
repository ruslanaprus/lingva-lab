// Optional browser QA: supply PLAYWRIGHT_MODULE as an absolute path to an existing
// Playwright installation, or install Playwright separately. The website has no dependencies.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { LANGUAGES, getModules } from "../course.js";
import { checkActivityReports } from "./browser-activity.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : "@playwright/test"
);
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const output = process.env.LINGVA_QA_OUTPUT || "/tmp/lingva-lab-qa";
await mkdir(output, { recursive: true });
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
};
const headers = await readFile(resolve(root, "_headers"), "utf8");
const server = createServer(async (req, res) => {
  try {
    const path = resolve(
      root,
      "." +
        new URL(req.url, "http://localhost").pathname.replace(
          /\/$/,
          "/index.html",
        ),
    );
    if (!path.startsWith(root + sep) && path !== root) throw Error("path");
    for (const line of headers.split("\n")) {
      const match = line.match(/^  ([\w-]+): (.+)$/);
      if (match) res.setHeader(match[1], match[2]);
    }
    res.setHeader("Content-Type", contentTypes[extname(path)] || "text/plain");
    res.end(await readFile(path));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [],
    responses = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) responses.push(r.url());
  });
  await page.goto(base);
  await page.locator(".module-card").first().waitFor();
  assert.equal(await page.locator(".module-card").count(), 12);
  console.log("Course map loaded.");
  await page.screenshot({ path: output + "/map-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "DE Німецька" }).click();
  await page.locator("[name=student]").fill("Тестова студентка");
  await page.locator("[name=group]").fill("ФЛ-11");
  await page.locator("#profile-form [type=submit]").click();
  const go = async (hash) => {
    await page.goto(base + "/#" + hash);
    await page.locator("#main h1").waitFor();
  };
  if (!process.argv.includes("--layout-only")) {
    // Real failure -> hint -> success -> retry: counters and XP are observed in the UI.
    await go("lab/1");
    await page.locator('[name=answer-1-1][value="0"]').check();
    await page.locator('[data-check="1-1"]').click();
    await page.locator("#task-1-1 .feedback.failed").waitFor();
    await page.locator('[data-hint="1-1"]').click();
    await page.locator('[name=answer-1-1][value="1"]').check();
    await page.locator('[data-check="1-1"]').click();
    assert.equal(await page.locator("#xp-label").textContent(), "40 XP");
    await page.locator('[data-check="1-1"]').click();
    assert.equal(await page.locator("#xp-label").textContent(), "40 XP");
    assert.match(
      await page.locator("#task-1-1 .attempt-meta").textContent(),
      /СПРОБИ 3 · ПОМИЛКИ 1 · ПОВТОРНІ ПОДАННЯ 2/,
    );
    // Complete one whole language through actual controls, including all interactive tools.
    for (const m of getModules("de")) {
      await go("lab/" + m.id);
      for (const t of m.tasks) {
        if (t.id === "1-1") continue;
        const article = page.locator(`[data-task="${t.id}"]`);
        if (["choice", "unicode", "wave"].includes(t.type))
          await article
            .locator(`input[type=radio][value="${t.answer}"]`)
            .check();
        else if (["exact", "json", "wer"].includes(t.type))
          await article
            .locator("[data-answer]")
            .fill(
              t.type === "json"
                ? JSON.stringify(t.expected)
                : t.type === "wer"
                  ? t.reference
                  : t.answer,
            );
        else if (t.type === "regex")
          await article
            .locator("[data-pattern]")
            .fill(
              t.id === "6-1"
                ? LANGUAGES.de.regexExample
                : LANGUAGES.de.variantExample,
            );
        else if (t.type === "replace") {
          await article
            .locator("[data-pattern]")
            .fill("\\[\\d{2}:\\d{2}:\\d{2}\\] ");
        } else if (t.type === "terminal") {
          const commands =
            t.goal === "navigate"
              ? ["oops", "ls", "cd original/archive/1893", "cat lost.txt"]
              : t.goal === "copy"
                ? [
                    "mkdir results",
                    "cp original/interview.txt results/interview.txt",
                  ]
                : [`grep "${LANGUAGES.de.word}" corpus.txt`];
          for (const command of commands) {
            await article.locator("[data-command]").fill(command);
            await article.locator("[data-command]").press("Enter");
          }
        } else if (t.type === "git") {
          await article.locator("[data-git-text]").fill(t.expected);
          for (const command of [
            "git status",
            "git add transcription.txt",
            'git commit -m "Виправлено текст за перевіреним джерелом"',
            "git log",
          ]) {
            await article.locator("[data-command]").fill(command);
            await article.locator("[data-command]").press("Enter");
          }
        } else if (t.type === "interval") {
          await article.locator("[data-interval=start]").fill("0.60");
          await article.locator("[data-interval=end]").fill("1.10");
          await article.locator("[data-interval=label]").fill("B");
          const downloaded = page.waitForEvent("download");
          await article.locator("[data-export-grid]").click();
          await (await downloaded).saveAs(output + "/sample.TextGrid");
        } else if (t.type === "portfolio") {
          await article
            .locator("[data-portfolio=artifact]")
            .fill("results/lab-" + m.id + ".txt");
          await article
            .locator("[data-portfolio=method]")
            .fill(
              "Мета — перевірити роботу цифрового інструмента на невеликій вибірці. Я зберігаю вихідні дані, описую інструмент і параметри, документую послідовність дій та порівнюю результат із перевіреним джерелом.",
            );
          await article
            .locator("[data-portfolio=reflection]")
            .fill(
              "Висновки обмежені розміром вибірки. Для перевірки потрібні незалежні приклади та повторне анотування. Дані, параметри та результати збережені окремо для іншого дослідника.",
            );
          await article.locator("[data-portfolio=confirm]").check();
        }
        await article.locator("[data-check]").click();
        await article
          .locator(
            `.feedback.${t.type === "portfolio" ? "submitted" : "passed"}`,
          )
          .waitFor();
      }
      assert.ok(
        await page.locator(".section-complete").count(),
        `Module ${m.id} did not complete`,
      );
      console.log("Module " + m.id + " passed.");
    }
    assert.equal(await page.locator("#xp-label").textContent(), "2280 XP");
    assert.equal(
      await page.locator("#progress-label").textContent(),
      "12 / 12",
    );
    await go("lab/3");
    await page.locator("[data-treasure=unicode]").click();
    await page.locator('[name=treasure-unicode][value="1"]').check();
    await page.locator("[data-check-treasure]").click();
    assert.equal(await page.locator("#xp-label").textContent(), "2340 XP");
    await page.locator("[data-check-treasure]").click();
    assert.equal(await page.locator("#xp-label").textContent(), "2340 XP");
    // Reports have actual chosen answers, full attempt history and pending-review status.
    await go("lab/1");
    const reportPromise = page.waitForEvent("download");
    await page.locator(".sidebar-controls [data-action=report]").click();
    const report = await reportPromise;
    await report.saveAs(output + "/report.html");
    const reportText = await readFile(output + "/report.html", "utf8");
    assert.match(reportText, /Практику розділу пройдено/);
    assert.match(reportText, /Спроба 3/);
    assert.match(reportText, /Варіант №1 \(індекс 0\): working\//);
    assert.match(reportText, /Активний час/);
    assert.match(reportText, /потребують перевірки викладачем/);
    assert.match(reportText, /Підказок на момент подання: 1/);
    await go("portfolio");
    const backupPromise = page.waitForEvent("download");
    await page.locator("[data-action=backup]").click();
    await (await backupPromise).saveAs(output + "/backup.json");
    const backup = JSON.parse(await readFile(output + "/backup.json", "utf8"));
    assert.equal(backup.tracks.de.answers["1-1"].attempts.length, 3);
    // Hostile imports must be rejected before either in-memory or saved progress changes.
    const beforeImport = await page.evaluate(() =>
      localStorage.getItem("lingva-lab:v1"),
    );
    for (const extra of [
      { machine: true },
      { history: true },
      { extra: { toString: null } },
    ]) {
      const hostile = structuredClone(backup);
      Object.assign(hostile.tracks.de.answers["6-1"].attempts[0].value, extra);
      await page.locator("#toast").evaluate((el) => {
        el.textContent = "";
      });
      await page
        .locator("#backup-input")
        .setInputFiles({
          name: "hostile-backup.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(hostile)),
        });
      await page
        .locator("#toast")
        .filter({ hasText: "Не вдалося імпортувати" })
        .waitFor();
      assert.equal(await page.locator("#info-dialog").isVisible(), false);
      assert.equal(
        await page.evaluate(() => localStorage.getItem("lingva-lab:v1")),
        beforeImport,
      );
    }
    await page.reload();
    assert.equal(await page.locator("#xp-label").textContent(), "2340 XP");
    await go("lab/6");
    assert.equal(await page.locator("#task-6-1.passed").count(), 1);
    const preservedReport = page.waitForEvent("download");
    await page.locator(".sidebar-controls [data-action=report]").click();
    await (
      await preservedReport
    ).saveAs(output + "/after-rejected-import.html");
    assert.match(
      await readFile(output + "/after-rejected-import.html", "utf8"),
      /Шаблон:/,
    );
    await go("portfolio");
    await page.locator("#profile-button").click();
    await page.locator("[name=language][value=fr]").check();
    await page.locator("#profile-form [type=submit]").click();
    assert.equal(await page.locator("#xp-label").textContent(), "0 XP");
    await go("lab/3");
    assert.match(await page.locator("#task-3-2").textContent(), /œ/);
    await page.reload();
    assert.match(
      await page.locator("#language-label").textContent(),
      /Français/,
    );
    assert.equal(await page.locator("#xp-label").textContent(), "0 XP");
    // Import previews a replacement and restores all languages.
    await go("portfolio");
    await page.locator("#backup-input").setInputFiles(output + "/backup.json");
    await page.locator("#confirm-import").click();
    assert.equal(await page.locator("#xp-label").textContent(), "2340 XP");
    await go("reference");
    await page.locator("#reference-search").fill("TextGrid");
    assert.ok((await page.locator(".glossary-item:visible").count()) >= 1);
    assert.ok((await page.locator(".glossary-item:visible").count()) < 10);
    await checkActivityReports(browser, base, output);
  }
  // Desktop, tablet and mobile layouts cover every page and the most demanding lab controls.
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "map",
      "lab/4",
      "lab/6",
      "lab/10",
      "lab/11",
      "portfolio",
      "reference",
    ]) {
      await go(route);
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.width &&
              (r.right > innerWidth + 1 || r.left < -1) &&
              getComputedStyle(el).position !== "fixed" &&
              !el.closest(".main-nav")
            );
          })
          .map((el) => ({
            tag: el.tagName,
            classes: el.className,
            width: el.getBoundingClientRect().width,
          }))
          .slice(0, 12),
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Horizontal overflow: ${route} at ${width}: ${JSON.stringify(overflow)}`,
      );
    }
    if (width === 390) {
      await go("map");
      await page.screenshot({
        path: output + "/map-mobile.png",
        fullPage: true,
      });
      await go("lab/6");
      await page.screenshot({
        path: output + "/regex-mobile.png",
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go("lab/4");
  await page.screenshot({
    path: output + "/terminal-desktop.png",
    fullPage: true,
  });
  await go("portfolio");
  await page.screenshot({
    path: output + "/portfolio-desktop.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(responses, []);
  console.log(
    process.argv.includes("--layout-only")
      ? "PASS: 35 responsive layouts across five viewport widths; no JavaScript or HTTP errors."
      : "PASS: 60 browser task flows, hostile-import rejection/storage preservation, reload/report recovery, valid backup restore, retries/XP/history, language isolation and 35 responsive layouts.",
  );
  console.log("QA artifacts: " + output);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
