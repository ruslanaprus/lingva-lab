import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { freshState, STORAGE_KEY } from "../engine.js";

export async function checkActivityReports(browser, base, output) {
  const context = await browser.newContext({ acceptDownloads: true });
  const seed = freshState();
  seed.activeLanguage = "de";
  await context.addInitScript(({ seed, key }) => {
    if (!location.protocol.startsWith("http")) return;
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed));
    // Controlled page presence lets the integration test exercise each lifecycle
    // transition without relying on the headless window manager's focus behavior.
    window.testPresence = { visible: true, focused: true };
    Object.defineProperty(document, "visibilityState", {
      get: () => window.testPresence.visible ? "visible" : "hidden",
    });
    document.hasFocus = () => window.testPresence.focused;
  }, { seed, key: STORAGE_KEY });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const start = new Date("2026-10-24T12:00:00.000Z");
    await page.clock.install({ time: start });
    await page.clock.pauseAt(start);
    const go = async (route) => {
      await page.goto(`${base}/#${route}`);
      await page.locator("#main h1").waitFor();
    };
    const progress = () => page.evaluate((key) => {
      document.dispatchEvent(new Event("visibilitychange"));
      return JSON.parse(localStorage.getItem(key));
    }, STORAGE_KEY);
    const presence = (visible, focused) => page.evaluate(({ visible, focused }) => {
      window.testPresence = { visible, focused };
      document.dispatchEvent(new Event("visibilitychange"));
    }, { visible, focused });
    const downloadReport = async (id, format) => {
      const downloading = page.waitForEvent("download");
      await page.locator(`[data-action="report${format === "json" ? "-json" : ""}"][data-module="${id}"]`).click();
      const path = `${output}/activity-section-${id}.${format}`;
      await (await downloading).saveAs(path);
      return readFile(path, "utf8");
    };

    await go("lab/1");
    await page.clock.fastForward(5000);
    await page.locator('[name=answer-1-1][value="0"]').check();
    await page.locator('[data-check="1-1"]').click();
    await page.locator('[data-hint="1-1"]').click();
    assert.equal((await progress()).tracks.de.activity[1].visits, 1);
    await page.clock.fastForward(130_000);
    const afterIdle = (await progress()).tracks.de.activity[1];
    assert.equal(afterIdle.pageMs, 135_000);
    assert.equal(afterIdle.activeMs, 125_000);
    await page.clock.fastForward(10_000);
    assert.equal((await progress()).tracks.de.activity[1].activeMs, 125_000);

    // Synthetic input cannot keep a page active. Real Playwright input does.
    await page.locator('[name=answer-1-1][value="0"]').evaluate((input) =>
      input.dispatchEvent(new Event("input", { bubbles: true })),
    );
    await page.clock.fastForward(5000);
    assert.equal((await progress()).tracks.de.activity[1].activeMs, 125_000);
    await page.locator('[name=answer-1-1][value="1"]').check();
    await page.locator('[data-check="1-1"]').click();
    await page.clock.fastForward(5000);
    assert.equal((await progress()).tracks.de.activity[1].activeMs, 130_000);

    await presence(false, false);
    await page.clock.fastForward(60_000);
    assert.equal((await progress()).tracks.de.activity[1].activeMs, 130_000);
    await presence(true, false);
    await page.clock.fastForward(10_000);
    assert.equal((await progress()).tracks.de.activity[1].activeMs, 130_000);
    await presence(true, true);
    await page.clock.fastForward(5000);
    await go("lab/2");
    const sectionOne = (await progress()).tracks.de.activity[1];
    assert.equal(sectionOne.pageMs, 230_000);
    assert.equal(sectionOne.visibleMs, 160_000);
    assert.equal(sectionOne.activeMs, 135_000);

    const typed = '\n  cafe\u0301 <script>alert("x")</script>  \n';
    await page.locator('[data-answer="2-3"]').fill(typed);
    await page.locator('[data-check="2-3"]').click();
    await page.locator('#task-2-3 .feedback.failed').waitFor();
    await page.locator('[data-answer="2-3"]').fill('{"form":"Haus","lemma":"Haus","pos":"NOUN"}');
    await page.locator('[data-check="2-3"]').click();
    await page.clock.fastForward(20_000);
    await go("portfolio");
    await page.clock.fastForward(60_000);

    const sectionReport = JSON.parse(await downloadReport(1, "json"));
    assert.equal(sectionReport.activity.pageMs, sectionOne.pageMs);
    assert.equal(sectionReport.activity.activeMs, sectionOne.activeMs);
    assert.equal(sectionReport.activity.awayMs, 70_000);
    assert.equal(sectionReport.activity.idleMs, 25_000);
    assert.equal(sectionReport.activity.idleAfterMs, 120_000);
    assert.deepEqual(sectionReport.tasks[0].record.attempts[0].selectedOptions,
      [{ index: 0, number: 1, value: "working/ — тут його відредагую" }]);
    const textReport = JSON.parse(await downloadReport(2, "json"));
    assert.equal(textReport.tasks[2].record.attempts[0].value, typed);
    assert.equal(textReport.tasks[2].record.attempts[0].status, "failed");
    const html = await downloadReport(2, "html");
    assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
    assert.ok(!html.includes('<script>alert('));
    assert.ok(html.includes("Активний час"));
    // Read the generated document as a DOM, preserving its leading newline too.
    const reportPage = await context.newPage();
    await reportPage.setContent(html);
    assert.equal(await reportPage.locator("article").nth(2).locator(".attempt pre code").first().textContent(), typed);
    await reportPage.close();
    assert.equal(JSON.parse(await downloadReport(12, "json")).activity.tracked, false);

    await go("lab/1");
    await page.clock.fastForward(5000);
    const beforeReload = (await progress()).tracks.de.activity[1];
    assert.equal(beforeReload.visits, 2);
    await page.reload();
    await page.locator("#activity-time").waitFor();
    const afterReload = (await progress()).tracks.de.activity[1];
    assert.equal(afterReload.visits, 3);
    assert.equal(afterReload.activeMs, beforeReload.activeMs);
    assert.equal((await progress()).tracks.de.answers["1-1"].attempts.length, 2);

    await page.goto("about:blank");
    await page.clock.fastForward(86_400_000);
    await go("lab/1");
    assert.equal((await progress()).tracks.de.activity[1].activeMs, afterReload.activeMs);
    await page.locator("#profile-button").click();
    await page.locator('[name=language][value="fr"]').check();
    await page.locator('#profile-form [type="submit"]').click();
    await page.clock.fastForward(5000);
    const languages = (await progress()).tracks;
    assert.equal(languages.fr.activity[1].activeMs, 5000);
    assert.equal(languages.de.activity[1].activeMs, afterReload.activeMs);
    assert.deepEqual(errors, []);
    console.log("PASS: answer snapshots/escaping and timed reports; idle, hidden/focus, routes, reload, offline gap and language isolation.");
  } finally {
    await context.close();
  }
}
