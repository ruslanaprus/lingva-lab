import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PATHS,
  LANGUAGES,
  getPath,
  buildPath,
  SOURCES,
  TREASURES,
} from "../content/registry.js";
import french from "../content/tracks/fr/foundations.js";
import { validateCourse } from "../content/schema.js";
import { typographyMaterials } from "../content/shared/chapters/unicode/materials.js";
import {
  inspectTypography,
  sameUnicodeText,
  literalOccurrences,
} from "../src/tools/unicode.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { freshState, validateBackup } from "../src/persistence/state.js";
import {
  recordAttempt,
  sectionStats,
  taskStatus,
  recordTreasureAttempt,
} from "../src/learning/progress.js";
import { feedbackModule } from "../src/features/feedback-model.js";
import { createReportData } from "../src/reports/data.js";
import { reportHtml } from "../src/reports/html.js";
import { zipFiles } from "../src/tools/zip.js";
import {
  renderTypographyInput,
  renderTypographyPreview,
} from "../src/ui/exercises/typography.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

test("Precise Unicode comparison keeps spacing, scripts, punctuation and normalization requirements distinct", () => {
  assert.equal(sameUnicodeText("cafe\u0301", "café"), true);
  assert.equal(sameUnicodeText("café", "cafe\u0301", "none"), false);
  assert.equal(sameUnicodeText("cafe\u0301", "cafe\u0301", "none"), true);
  for (const value of [
    "12 s",
    "12\u202Fs",
    "12\ts",
    " 12\u00A0s",
    "12\u00A0s ",
    "12\u00A0ѕ",
  ])
    assert.equal(sameUnicodeText(value, "12\u00A0s"), false, JSON.stringify(value));
  for (const value of ["'", "’", ":", "~"])
    assert.equal(sameUnicodeText(value, "ˈ"), false);
  assert.equal(sameUnicodeText("а", "a"), false);
  assert.equal(sameUnicodeText("²", "2"), false);
  assert.equal(sameUnicodeText(null, "a"), false);
  assert.throws(() => sameUnicodeText("a", "a", "NFKC"));
});

test("The inspector explains canonical search without claiming word, lemma or script equivalence", () => {
  const input = "café cafe\u0301 CAFÉ cаfé";
  const info = inspectTypography(input, "café");
  assert.equal(info.raw, input);
  assert.equal(info.rawMatches, 1);
  assert.equal(info.nfcMatches, 2);
  assert.equal(info.changedByNFC, true);
  assert.equal(info.nfdPoints > info.nfcPoints, true);
  assert.equal(inspectTypography("a а", "a").nfcMatches, 1);
  assert.equal(literalOccurrences("aaaa", "aa"), 2);
  assert.equal(literalOccurrences("abc", ""), 0);
  assert.throws(() => inspectTypography("x".repeat(10001)));
  assert.throws(() => inspectTypography("x", "a".repeat(101)));
});

for (const code of ["de", "fr", "en"]) {
  const course = getPath(`${code}-foundations`),
    chapter = course.chapters[3],
    material = LANGUAGES[code];
  test(`${code}: chapter four scaffolds input, normalization, typography, IPA and handover without requiring optional work`, () => {
    assert.equal(chapter.id, "unicode");
    assert.equal(chapter.tasks.length, 39);
    assert.equal(chapter.tasks.filter((t) => t.required).length, 36);
    assert.equal(chapter.time, 167);
    assert.equal(
      chapter.tasks.filter((t) => !t.required).reduce((n, t) => n + t.minutes, 0),
      23,
    );
    assert.ok(chapter.tasks.every((t) => t.lesson.paragraphs.length >= 2));
    assert.ok(!JSON.stringify(chapter).includes("—"));
    const sequence = [
      "language-settings",
      "two-input-methods",
      "mixed-script",
      "normalization-inspector",
      "enter-nfd",
      "editorial-quotes",
      "nonbreaking-space",
      "ipa-purpose",
      "ipa-panel",
      "ipa-features",
      "roundtrip",
      "repair-notice",
      "typography-guide",
      "handover",
    ].map((id) => chapter.tasks.findIndex((t) => t.id === `unicode-${id}`));
    assert.ok(
      sequence.every(
        (position, i) => position >= 0 && (!i || position > sequence[i - 1]),
      ),
    );
    for (const t of chapter.tasks) {
      const result = evaluateTask(
        t,
        t.type === "portfolio" ? portfolioAnswer(t, code) : t.answer,
      );
      assert.equal(
        result.status,
        t.type === "portfolio" ? "submitted" : "passed",
        t.id,
      );
    }
    const notice = chapter.tasks.find((t) => t.id === "unicode-repair-notice"),
      m = typographyMaterials(material);
    assert.equal(evaluateTask(notice, m.broken).status, "failed");
    assert.equal(evaluateTask(notice, m.repaired).status, "passed");
    assert.equal(
      evaluateTask(notice, m.repaired.replace("12\u00A0s", "12 s")).status,
      "failed",
    );
    const nfd = chapter.tasks.find((t) => t.id === "unicode-enter-nfd");
    assert.equal(evaluateTask(nfd, material.accent).status, "failed");
    assert.equal(evaluateTask(nfd, material.nfd).status, "passed");
  });
  test(`${code}: raw wrong answers, significant whitespace and pending-review work survive report and backup`, () => {
    const state = freshState(),
      track = state.paths[course.id];
    const space = chapter.tasks.find((t) => t.id === "unicode-nonbreaking-space");
    const wrong = " 12 s ";
    recordAttempt(track, space, wrong, evaluateTask(space, wrong));
    assert.equal(taskStatus(track.answers[space.id], space), "failed");
    for (const t of chapter.tasks.filter((t) => t.required)) {
      const value = t.type === "portfolio" ? portfolioAnswer(t, code) : t.answer;
      recordAttempt(track, t, value, evaluateTask(t, value));
    }
    assert.equal(sectionStats(chapter, track).complete, true);
    assert.ok(feedbackModule(state, course.id, chapter.id));
    assert.equal(
      chapter.tasks.filter((t) => !t.required).some((t) => track.answers[t.id]),
      false,
    );
    const copy = validateBackup(JSON.parse(JSON.stringify(state)));
    assert.equal(copy.paths[course.id].answers[space.id].attempts[0].value, wrong);
    assert.equal(
      copy.paths[course.id].answers[space.id].attempts[1].value,
      "12\u00A0s",
    );
    const report = createReportData({
      state: copy,
      course,
      track: copy.paths[course.id],
      chapterId: chapter.id,
    });
    const guide = report.tasks.find((t) => t.id === "unicode-typography-guide");
    assert.equal(guide.record.attempts[0].status, "submitted");
    assert.match(guide.record.attempts[0].value.method, /Нормалізація й пошук/);
    assert.ok(reportHtml(report).includes("Критерії ручного оцінювання"));
    const guideTask = chapter.tasks.find((t) => t.id === guide.id),
      answer = portfolioAnswer(guideTask, code);
    assert.equal(
      evaluateTask(guideTask, {
        ...answer,
        method: answer.method.replace("8. Передача й обмеження", "8. Інше"),
      }).status,
      "failed",
    );
  });
}

test("Published Unicode IDs keep their history and do not earn twice after a stricter revision", () => {
  const task = getPath("de-foundations").chapters[3].tasks.find(
    (t) => t.id === "unicode-special-characters",
  );
  const state = freshState(),
    track = state.paths["de-foundations"],
    old = { ...task, revision: 1, prompt: "Попередній набір символів" };
  recordAttempt(track, old, "old raw input", {
    status: "passed",
    feedback: "Історичний результат",
  });
  const restored = validateBackup(JSON.parse(JSON.stringify(state))).paths[
    track.path.id
  ];
  assert.equal(taskStatus(restored.answers[task.id], task), "new");
  assert.equal(
    recordAttempt(restored, task, task.answer, evaluateTask(task, task.answer)).newXP,
    0,
  );
  assert.equal(restored.answers[task.id].attempts[0].value, "old raw input");
  assert.equal(
    restored.answers[task.id].attempts[0].definition.prompt.startsWith(old.prompt),
    true,
  );
  // This retired ID belonged to a different academic-document task and must not be reused.
  assert.equal(
    Object.values(PATHS).some((p) =>
      p.chapters.flatMap((c) => c.tasks).some((t) => t.id === "unicode-portfolio"),
    ),
    false,
  );
  assert.equal(recordTreasureAttempt(restored, "unicode", 1, "unicode").newXP, 60);
  assert.equal(recordTreasureAttempt(restored, "unicode", 1, "unicode").newXP, 0);
});

test("Language examples remain independent, and invalid Unicode contracts are rejected", () => {
  const de = JSON.stringify(getPath("de-foundations")),
    material = structuredClone(LANGUAGES.fr);
  material.typography.quoteText = "«\u00A0langue\u00A0»";
  assert.equal(
    buildPath(french, material).chapters[3].tasks.find(
      (t) => t.id === "unicode-editorial-quotes",
    ).answer,
    material.typography.quoteText,
  );
  assert.equal(JSON.stringify(getPath("de-foundations")), de);
  for (const mutate of [
    (t) => (t.normalization = "NFKC"),
    (t) => (t.palette = ["<script>"]),
    (t) => (t.palette = ["a", "a"]),
    (t) => (t.probe = "x".repeat(101)),
    (t) => (t.checker = "typo"),
  ]) {
    const c = structuredClone(getPath("de-foundations")),
      t = c.chapters[3].tasks.find((t) => t.checker === "unicode");
    mutate(t);
    assert.throws(() => validateCourse(c, SOURCES, TREASURES));
  }
  const t = getPath("en-foundations").chapters[3].tasks.find(
    (t) => t.id === "unicode-ipa-panel",
  );
  const rendered = renderTypographyInput(
    { ...t, palette: ['"'], title: "<img src=x>" },
    "\n<img src=x>",
  );
  assert.ok(!rendered.includes("<img src=x>"));
  assert.match(rendered, /&lt;img/);
  const preview = renderTypographyPreview(
    "<script>alert(1)</script>\u00A0\u200B",
    "<script>",
  );
  assert.ok(!preview.includes("<script>"));
  assert.match(preview, /U\+00A0/);
  assert.match(preview, /U\+200B/);
});

test("Downloaded packs independently preserve NFD, invisible characters and all CSV values", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lingva-typography-"));
  try {
    for (const code of ["de", "fr", "en"]) {
      const chapter = getPath(`${code}-foundations`).chapters[3],
        path = join(directory, code + ".zip");
      await writeFile(
        path,
        new Uint8Array(await zipFiles(chapter.workshop.files).arrayBuffer()),
      );
      const result = JSON.parse(
        execFileSync(
          "python3",
          [
            "-c",
            `import csv,io,json,sys,zipfile,unicodedata
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
for f in z.namelist(): z.read(f).decode('utf-8')
rows=list(csv.reader(io.StringIO(z.read('control-cases.csv').decode('utf-8'),newline=''),strict=True))
assert rows[2][1] != unicodedata.normalize('NFC',rows[2][1])
assert '\\u00a0' in rows[3][1]
assert '\\u200b' in z.read('broken-notice.txt').decode('utf-8')
print(json.dumps({'rows':rows,'files':len(z.namelist())}))`,
            path,
          ],
          { encoding: "utf8" },
        ),
      );
      assert.equal(result.files, 7);
      assert.deepEqual(result.rows, typographyMaterials(LANGUAGES[code]).controls);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
