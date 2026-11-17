import test from "node:test";
import assert from "node:assert/strict";
import {
  getPath,
  LANGUAGES,
  buildPath,
  SOURCES,
  TREASURES,
} from "../content/registry.js";
import french from "../content/tracks/fr/foundations.js";
import { validateCourse } from "../content/schema.js";
import {
  prepareConcordance,
  tokenizeConcordance,
} from "../content/shared/concordance-data.js";
import { searchConcordance, concordanceText } from "../src/tools/concordance.js";
import { createConcordanceWorkbench } from "../src/ui/exercises/concordance.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { freshState, validateBackup } from "../src/persistence/state.js";
import {
  recordAttempt,
  sectionStats,
  recordTreasureAttempt,
  trackStats,
  badges,
} from "../src/learning/progress.js";
import { feedbackModule } from "../src/features/feedback-model.js";
import { createReportData } from "../src/reports/data.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

const GOLD = {
  de: {
    word: ["C01", "C02", "C02", "C03", "C04", "C05", "C06", "C11", "C11"],
    lemma: ["C01", "C02", "C04", "C07", "C09", "C10"],
    pos: ["C01", "C02", "C04", "C07", "C09"],
  },
  fr: {
    word: [
      "C01",
      "C02",
      "C02",
      "C03",
      "C04",
      "C04",
      "C05",
      "C06",
      "C06",
      "C10",
      "C11",
      "C11",
    ],
    lemma: ["C01", "C02", "C04", "C06", "C07", "C09", "C10", "C11"],
    pos: ["C01", "C02", "C04", "C06", "C07", "C09", "C11"],
  },
  en: {
    word: ["C01", "C02", "C02", "C03", "C04", "C04", "C05", "C06", "C11", "C11"],
    lemma: [
      "C01",
      "C01",
      "C02",
      "C02",
      "C03",
      "C04",
      "C04",
      "C05",
      "C06",
      "C07",
      "C09",
      "C10",
      "C11",
      "C11",
    ],
    pos: ["C01", "C02", "C04", "C07", "C09", "C11"],
  },
};
for (const code of ["de", "fr", "en"]) {
  test(`${code}: literal word, fragment, lemma, case, metadata and POS have independently checked hit sets`, () => {
    const m = LANGUAGES[code].concordance,
      d = prepareConcordance(m);
    const initial = searchConcordance(d),
      lemma = searchConcordance(d, d.presets.lemma),
      pos = searchConcordance(d, d.presets.pos);
    assert.deepEqual(
      initial.rows.map((r) => r.documentId),
      GOLD[code].word,
    );
    assert.deepEqual(
      lemma.rows.map((r) => r.documentId),
      GOLD[code].lemma,
    );
    assert.deepEqual(
      pos.rows.map((r) => r.documentId),
      GOLD[code].pos,
    );
    assert.equal(initial.documentCount, m.expected.wordDocuments);
    assert.equal(initial.hitCount, m.expected.wordHits);
    assert.equal(lemma.hitCount, m.expected.lemmaHits);
    assert.equal(pos.hitCount, m.expected.verbHits);
    assert.equal(searchConcordance(d, d.presets.case).hitCount, m.expected.caseHits);
    const fragment = searchConcordance(d, d.presets.fragment);
    assert.ok(
      fragment.rows.some((r) => r.documentId === "C08" && r.form === m.falseForm),
    );
    assert.ok(!lemma.rows.some((r) => r.documentId === "C08"));
    assert.ok(lemma.rows.some((r) => r.documentId === "C09" && r.form === m.variant));
    assert.ok(!initial.rows.some((r) => r.documentId === "C09"));
    assert.ok(lemma.rows.some((r) => r.documentId === "C10" && r.pos === "NOUN"));
    assert.ok(!pos.rows.some((r) => r.documentId === "C10"));
    const filtered = searchConcordance(d, d.presets.filtered);
    assert.deepEqual(
      [...new Set(filtered.rows.map((r) => r.documentId))],
      ["C01", "C02", "C07", "C10"],
    );
    assert.equal(filtered.hitCount, m.expected.filteredHits);
    assert.equal(searchConcordance(d, d.presets.empty).hitCount, 0);
    assert.equal(
      searchConcordance(d, { corpus: "notices2025", genre: "interview" })
        .searchedDocuments,
      0,
    );
    const broad = searchConcordance(d, { window: 6, sort: "right" }),
      narrow = searchConcordance(d, { window: 1 });
    assert.deepEqual(
      new Set(broad.rows.map((r) => r.id)),
      new Set(narrow.rows.map((r) => r.id)),
    );
    assert.ok(
      broad.rows.some(
        (r) =>
          r.left.length + r.right.length >
          narrow.rows.find((n) => n.id === r.id).left.length +
            narrow.rows.find((n) => n.id === r.id).right.length,
      ),
    );
    for (const row of broad.rows)
      assert.equal(
        d.documents
          .find((doc) => doc.id === row.documentId)
          .text.slice(row.start, row.end),
        row.form,
      );
    const exported = concordanceText(d, initial);
    for (const row of initial.rows) assert.ok(exported.includes(row.id));
    assert.ok(exported.includes("Повний контекст:"));
    assert.ok(exported.includes("POS: all"));
  });
  test(`${code}: required concordance work alone unlocks completion, feedback and milestone; records survive reload`, () => {
    const course = getPath(`${code}-foundations`),
      chapter = course.chapters.find((c) => c.id === "concordance");
    assert.equal(chapter.tasks.length, 31);
    assert.equal(chapter.tasks.filter((t) => t.required).length, 28);
    assert.equal(chapter.time, 109);
    assert.equal(
      chapter.tasks.filter((t) => !t.required).reduce((n, t) => n + t.minutes, 0),
      22,
    );
    assert.ok(!JSON.stringify(chapter).includes("—"));
    const state = freshState(),
      track = state.paths[course.id];
    assert.equal(feedbackModule(state, course.id, chapter.id), null);
    for (const task of chapter.tasks.filter((t) => t.required)) {
      const value =
        task.type === "portfolio" ? portfolioAnswer(task, code) : task.answer;
      const result = evaluateTask(task, value);
      assert.equal(
        result.status,
        task.type === "portfolio" ? "submitted" : "passed",
        task.id,
      );
      recordAttempt(track, task, value, result);
    }
    assert.equal(sectionStats(chapter, track).complete, true);
    assert.ok(feedbackModule(state, course.id, chapter.id));
    assert.equal(
      badges(course, track).find((b) => b.id === "concordance-reader").unlocked,
      true,
    );
    assert.ok(
      chapter.tasks.filter((t) => !t.required).every((t) => !track.answers[t.id]),
    );
    const study = chapter.tasks.find((t) => t.id === "concordance-usage-study"),
      value = portfolioAnswer(study, code),
      xp = trackStats(course, track).xp;
    recordAttempt(track, study, value, evaluateTask(study, value));
    assert.equal(trackStats(course, track).xp, xp);
    for (const section of study.submission.sections)
      assert.equal(
        evaluateTask(study, {
          ...value,
          method: value.method.replace(section, "Пропущено"),
        }).status,
        "failed",
      );
    assert.equal(
      evaluateTask(study, {
        ...value,
        method: chapter.workshop.documents.find((d) => d.id === "template").content,
      }).status,
      "failed",
    );
    recordTreasureAttempt(track, "window", TREASURES.window.answer, chapter.id);
    recordTreasureAttempt(track, "window", TREASURES.window.answer, chapter.id);
    assert.equal(trackStats(course, track).xp, xp + 60);
    const restored = validateBackup(JSON.parse(JSON.stringify(state))),
      report = createReportData({
        state: restored,
        course,
        track: restored.paths[course.id],
        chapterId: chapter.id,
      });
    assert.equal(report.summary.complete, true);
    assert.equal(
      report.tasks.find((t) => t.id === study.id).record.attempts[0].status,
      "submitted",
    );
  });
}

test("Concordance query validation rejects unsupported patterns and settings; NFC and literal matching retain original text", () => {
  const d = prepareConcordance(LANGUAGES.fr.concordance);
  const result = searchConcordance(d, { query: "demande\u0301", mode: "word" });
  assert.equal(result.hitCount, 1);
  assert.equal(result.rows[0].form, "demandé");
  for (const options of [
    { query: "" },
    { query: "a b" },
    { query: ".*" },
    { query: "<img src=x onerror=alert(1)>" },
    { query: "a".repeat(81) },
    { mode: "regex" },
    { corpus: "foreign" },
    { pos: "script" },
    { caseSensitive: "false" },
    { window: 99 },
  ])
    assert.throws(() => searchConcordance(d, options));
  const doc = d.documents.find((doc) => doc.id === "C12"),
    word = doc.tokens.find((t) => /\p{L}/u.test(t.form)).form;
  assert.ok(searchConcordance(d, { query: word, mode: "word" }).hitCount > 0);
  assert.equal(searchConcordance(d, { query: word, mode: "lemma" }).hitCount, 0);
});

test("Malformed concordance content, offsets, language or preset references fail course validation", () => {
  const course = getPath("de-foundations");
  for (const mutate of [
    (c) => {
      c.workshop.concordance.documents[0].tokens[0].start = 9000;
    },
    (c) => {
      c.workshop.concordance.documents[1].id = "C01";
    },
    (c) => {
      c.workshop.concordance.defaults.mode = "regex";
    },
    (c) => {
      c.workshop.concordance.defaults.query = "two words";
    },
    (c) => {
      c.workshop.concordance.presets.case.caseSensitive = "false";
    },
    (c) => {
      c.tasks[0].lesson.concordancePreset = "missing";
    },
    (c) => {
      c.workshop.concordance.language = "fr";
    },
  ]) {
    const changed = structuredClone(course);
    mutate(changed.chapters.find((c) => c.id === "concordance"));
    assert.throws(() => validateCourse(changed, SOURCES, TREASURES));
  }
});

test("Concordance renderer escapes corpus text, metadata and attributes", () => {
  const d = prepareConcordance(LANGUAGES.en.concordance),
    doc = d.documents[0];
  doc.text = '<img src=x onerror="alert(1)"> request';
  doc.title = '<svg onload="alert(1)">';
  doc.tokens = tokenizeConcordance(doc.text);
  const html = createConcordanceWorkbench({ download() {} }).render(
    d,
    "en-foundations",
  );
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes("<svg"));
  assert.ok(html.includes("&lt;"));
});

test("French concordance examples are isolated from German and other chapters", () => {
  const german = structuredClone(getPath("de-foundations")),
    original = getPath("fr-foundations"),
    material = structuredClone(LANGUAGES.fr);
  material.concordance.documents.C12.text = "Veuillez lire un autre exemple.";
  const changed = buildPath(french, material);
  assert.ok(
    JSON.stringify(changed.chapters.find((c) => c.id === "concordance")).includes(
      material.concordance.documents.C12.text,
    ),
  );
  for (const chapter of changed.chapters.filter((c) => c.id !== "concordance"))
    assert.deepEqual(
      chapter,
      original.chapters.find((c) => c.id === chapter.id),
    );
  assert.deepEqual(getPath("de-foundations"), german);
});

test("Concordance questions vary answer positions and avoid a consistently longest correct option", () => {
  for (const code of ["de", "fr", "en"]) {
    const quiz = getPath(`${code}-foundations`)
      .chapters.find((c) => c.id === "concordance")
      .tasks.filter((t) => t.type === "choice");
    assert.deepEqual(new Set(quiz.map((t) => t.answer)), new Set([0, 1, 2]));
    assert.ok(
      quiz.filter(
        (t) => t.options[t.answer].length < Math.max(...t.options.map((o) => o.length)),
      ).length >=
        quiz.length / 2,
    );
  }
});
