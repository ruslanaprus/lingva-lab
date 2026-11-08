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
import { evaluateTask } from "../src/learning/evaluate.js";
import { freshState, validateBackup } from "../src/persistence/state.js";
import {
  recordAttempt,
  sectionStats,
  trackStats,
  recordTreasureAttempt,
  badges,
} from "../src/learning/progress.js";
import { feedbackModule } from "../src/features/feedback-model.js";
import { createReportData } from "../src/reports/data.js";
import { EVIDENCE_SECTIONS } from "../content/shared/chapters/bilingual-contexts/materials.js";
import {
  renderAlignmentInput,
  renderAlignmentPreview,
} from "../src/ui/exercises/alignment.js";
import { parseCsv } from "../src/tools/csv.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

for (const code of ["de", "fr", "en"]) {
  test(`${code}: contextual evidence submissions complete the workshop without optional challenges`, () => {
    const course = getPath(`${code}-foundations`);
    const chapter = course.chapters.find((c) => c.id === "bilingual-contexts");
    const dossier = chapter.tasks.find(
      (t) => t.id === "bilingual-contexts-decision-dossier",
    );
    const state = freshState(),
      track = state.paths[course.id];
    assert.equal(feedbackModule(state, course.id, chapter.id), null);
    for (const task of chapter.tasks.filter((t) => t.required && t.id !== dossier.id)) {
      const answer =
        task.type === "portfolio" ? portfolioAnswer(task, code) : task.answer;
      const result = evaluateTask(task, answer);
      assert.equal(
        result.status,
        task.type === "portfolio" ? "submitted" : "passed",
        task.id,
      );
      recordAttempt(track, task, answer, result);
    }
    assert.equal(sectionStats(chapter, track).complete, false);
    const valid = portfolioAnswer(dossier, code);
    const template = chapter.workshop.documents.find(
      (d) => d.id === "template",
    ).content;
    assert.equal(
      evaluateTask(dossier, { ...valid, method: template }).status,
      "failed",
    );
    for (const heading of EVIDENCE_SECTIONS)
      assert.equal(
        evaluateTask(dossier, {
          ...valid,
          method: valid.method.replace(heading, "Пропущена частина"),
        }).status,
        "failed",
        heading,
      );
    recordAttempt(track, dossier, valid, evaluateTask(dossier, valid));
    assert.equal(sectionStats(chapter, track).complete, true);
    assert.ok(feedbackModule(state, course.id, chapter.id));
    assert.ok(
      badges(course, track).find((b) => b.id === "context-investigator").unlocked,
    );
    assert.ok(
      chapter.tasks.filter((t) => !t.required).every((t) => !track.answers[t.id]),
    );
    const xp = trackStats(course, track).xp;
    recordAttempt(track, dossier, valid, evaluateTask(dossier, valid));
    assert.equal(trackStats(course, track).xp, xp);
    for (let i = 0; i < 2; i++)
      recordTreasureAttempt(track, "witness", TREASURES.witness.answer, chapter.id);
    assert.equal(trackStats(course, track).xp, xp + 60);
    const restored = validateBackup(JSON.parse(JSON.stringify(state)));
    const report = createReportData({
      state: restored,
      course,
      track: restored.paths[course.id],
      chapterId: chapter.id,
    });
    assert.equal(report.summary.complete, true);
    assert.equal(
      report.tasks.find((t) => t.id === dossier.id).record.attempts[0].status,
      "submitted",
    );
  });
}

test("Wrong pairs, raw text and choice indexes remain in bilingual reports with the complete alignment context", () => {
  const course = getPath("de-foundations"),
    chapter = course.chapters[8];
  const state = freshState(),
    track = state.paths[course.id];
  const single = chapter.tasks.find((t) => t.id === "bilingual-contexts-mission");
  const multiple = chapter.tasks.find((t) => t.id === "bilingual-contexts-modality");
  const inspector = chapter.tasks.find((t) => t.inspector === "alignment");
  const entries = [
    [single, 0],
    [multiple, [0, 2]],
    [inspector, " T1 "],
  ];
  for (const [task, value] of entries) {
    assert.equal(evaluateTask(task, value).status, "failed");
    recordAttempt(track, task, value, evaluateTask(task, value));
    recordAttempt(track, task, task.answer, evaluateTask(task, task.answer));
  }
  const restored = validateBackup(JSON.parse(JSON.stringify(state)));
  const report = createReportData({
    state: restored,
    course,
    track: restored.paths[course.id],
    chapterId: chapter.id,
  });
  for (const [task, value] of entries) {
    const attempt = report.tasks.find((t) => t.id === task.id).record.attempts[0];
    assert.deepEqual(attempt.value, value);
    for (const option of attempt.selectedOptions || [])
      assert.equal(option.value, task.options[option.index]);
    if (task.alignment)
      for (const segment of [...task.alignment.sources, ...task.alignment.targets])
        assert.ok(attempt.definition.prompt.includes(segment.text));
  }
});

test("The alignment inspector rejects malformed metadata and missing historical evidence", () => {
  const original = getPath("de-foundations");
  for (const mutate of [
    (t) => {
      delete t.alignment;
    },
    (t) => {
      t.alignment.sources[1].id = "S1";
    },
    (t) => {
      t.alignment.targets[0].text = "x".repeat(2001);
    },
    (t) => {
      t.alignment.targets[0].id = "invalid";
    },
    (t) => {
      t.alignment.targetLanguage = "";
    },
    (t) => {
      t.answer = "T9";
    },
    (t) => {
      t.lesson.example = "Сусідні сегменти пропущено.";
    },
    (t) => {
      delete t.inspector;
    },
  ]) {
    const changed = structuredClone(original);
    mutate(changed.chapters[8].tasks.find((t) => t.inspector === "alignment"));
    assert.throws(() => validateCourse(changed, SOURCES, TREASURES), /alignment/);
  }
});

test("Alignment comparison escapes both texts and provenance and does not generate assessment controls", () => {
  const task = structuredClone(
    getPath("en-foundations").chapters[8].tasks.find(
      (t) => t.inspector === "alignment",
    ),
  );
  task.alignment.document = '<img src=x onerror="bad()">';
  task.alignment.sources[0].text = "<script>bad()</script>";
  task.alignment.targets[0].text = '<svg onload="bad()">';
  const html = renderAlignmentPreview(task.alignment, "S1", "T1");
  for (const unsafe of ["<script>", "<img src=x", "<svg onload"])
    assert.ok(!html.includes(unsafe));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("data-check"));
  assert.ok(renderAlignmentInput(task, '"><img src=x>').includes("&quot;&gt;&lt;img"));
  assert.match(renderAlignmentPreview(task.alignment, "S9", "T1"), /Оберіть/);
});

test("French bilingual data changes independently of German and every other chapter", () => {
  const german = structuredClone(getPath("de-foundations"));
  const original = getPath("fr-foundations"),
    material = structuredClone(LANGUAGES.fr);
  material.bilingual.main = "Nouvelle phrase française pour le test.";
  const changed = buildPath(french, material);
  assert.ok(JSON.stringify(changed.chapters[8]).includes(material.bilingual.main));
  for (const chapter of changed.chapters.filter((c) => c.id !== "bilingual-contexts"))
    assert.deepEqual(
      chapter,
      original.chapters.find((c) => c.id === chapter.id),
    );
  assert.deepEqual(getPath("de-foundations"), german);
});

test("Bilingual packs preserve multilingual CSV values and mark educational examples explicitly", () => {
  for (const code of ["de", "fr", "en"]) {
    const chapter = getPath(`${code}-foundations`).chapters[8],
      b = LANGUAGES[code].bilingual;
    assert.equal(chapter.tasks.length, 40);
    assert.equal(chapter.tasks.filter((t) => t.required).length, 37);
    assert.equal(chapter.time, 162);
    assert.equal(
      chapter.tasks.filter((t) => !t.required).reduce((n, t) => n + t.minutes, 0),
      28,
    );
    assert.ok(!JSON.stringify(chapter).includes("—"));
    const csv = parseCsv(
      chapter.workshop.files.find((f) => f.name.endsWith(".csv")).content,
    );
    assert.deepEqual(csv[1].slice(0, 6), [
      "B1",
      code,
      "uk",
      b.phrase,
      b.main,
      b.mainUk,
    ]);
    const cards = chapter.workshop.files.find((f) =>
      f.name.startsWith("bilingual-cards-"),
    ).content;
    assert.match(cards, /не справжні результати/);
    assert.ok(
      cards.includes(b.main) && cards.includes(b.other) && cards.includes(b.negative),
    );
    const quiz = chapter.tasks.filter((t) => t.type === "choice" && !t.multiple);
    assert.deepEqual(new Set(quiz.map((t) => t.answer)), new Set([0, 1, 2]));
    assert.ok(
      quiz.filter(
        (t) => t.options[t.answer].length < Math.max(...t.options.map((v) => v.length)),
      ).length >
        quiz.length / 2,
    );
  }
});
