import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPath, SOURCES, TREASURES } from "../content/registry.js";
import { README_SECTIONS } from "../content/shared/chapters/workspace/materials.js";
import { validateCourse } from "../content/schema.js";
import { freshState, validateBackup } from "../src/persistence/state.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { recordAttempt, sectionStats } from "../src/learning/progress.js";
import { feedbackModule } from "../src/features/feedback-model.js";
import { createReportData } from "../src/reports/data.js";
import { reportHtml } from "../src/reports/html.js";
import { renderLesson, renderWorkshopIntro } from "../src/ui/exercises/workshop.js";
import { zipFiles } from "../src/tools/zip.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

for (const language of ["de", "fr", "en"]) {
  test(`${language}: chapter-one workshop scaffolds all README parts and budgets real reading and practice`, () => {
    const chapter = getPath(`${language}-foundations`).chapters[0];
    assert.equal(chapter.tasks.length, 33);
    assert.equal(chapter.tasks.filter((task) => task.required).length, 30);
    assert.equal(
      chapter.tasks.filter((task) => task.required && task.type === "portfolio").length,
      5,
    );
    assert.equal(chapter.time, 144);
    assert.equal(chapter.workshop.stages.length, 9);
    assert.equal(
      chapter.tasks
        .filter((task) => !task.required)
        .reduce((sum, task) => sum + task.minutes, 0),
      30,
    );
    const microTasks = chapter.tasks.filter((task) => task.stage === "readme").slice(1);
    assert.equal(microTasks.length, 8);
    for (const [index, section] of README_SECTIONS.entries()) {
      assert.ok(
        chapter.workshop.documents
          .find((document) => document.id === "example")
          .content.includes(section),
      );
      assert.ok(
        microTasks[index].title.startsWith(`${index + 1}. ${section}:`),
        `No guided exercise for ${section}`,
      );
    }
    assert.ok(
      chapter.tasks.findIndex((task) => task.id === "workspace-readme-repair") <
        chapter.tasks.findIndex((task) => task.id === "workspace-portfolio"),
    );
    assert.ok(
      chapter.tasks.findIndex((task) => task.id === "workspace-collection-rebuild") <
        chapter.tasks.findIndex((task) => task.id === "workspace-portfolio"),
    );
    assert.equal(chapter.tasks[0].id, "workspace-handover-triage");
    assert.equal(chapter.workshop.files.length, 8);
    assert.ok(chapter.workshop.files.some((file) => file.content.includes("вигадані")));
  });
  test(`${language}: core work alone unlocks completion, report and optional feedback`, () => {
    const course = getPath(`${language}-foundations`),
      chapter = course.chapters[0],
      state = freshState(),
      track = state.paths[course.id];
    for (const task of chapter.tasks.filter(
      (task) => task.required && task.id !== "workspace-portfolio",
    )) {
      const answer =
        task.type === "portfolio" ? portfolioAnswer(task, language) : task.answer;
      recordAttempt(track, task, answer, evaluateTask(task, answer));
    }
    assert.equal(sectionStats(chapter, track).complete, false);
    assert.equal(feedbackModule(state, course.id, chapter.id), null);
    const readmeTask = chapter.tasks.find((task) => task.id === "workspace-portfolio"),
      answer = portfolioAnswer(readmeTask, language);
    assert.equal(evaluateTask(readmeTask, answer).status, "submitted");
    recordAttempt(track, readmeTask, answer, evaluateTask(readmeTask, answer));
    assert.equal(sectionStats(chapter, track).complete, true);
    assert.ok(feedbackModule(state, course.id, chapter.id));
    assert.equal(sectionStats(chapter, track).done, 30);
    assert.ok(
      chapter.tasks
        .filter((task) => !task.required)
        .every((task) => !track.answers[task.id]),
    );
    const restored = validateBackup(JSON.parse(JSON.stringify(state)));
    const report = createReportData({
      state: restored,
      course,
      track: restored.paths[course.id],
      chapterId: chapter.id,
    });
    assert.ok(reportHtml(report).includes("Пояснення та матеріали цієї редакції"));
    assert.equal(
      report.tasks.find((task) => task.id === readmeTask.id).record.attempts[0].value
        .method,
      answer.method,
    );
    assert.ok(
      report.tasks[0].record.attempts[0].definition.prompt.includes(
        "підміняєте дослідницю",
      ),
    );
  });
}

test("README submission rejects missing sections and unfilled templates while retaining pending-review semantics", () => {
  const chapter = getPath("fr-foundations").chapters[0],
    task = chapter.tasks.find((task) => task.id === "workspace-portfolio"),
    answer = portfolioAnswer(task, "fr");
  assert.equal(evaluateTask(task, answer).status, "submitted");
  const missing = {
    ...answer,
    method: answer.method.replace("4. Походження і доступ", "4. Інше"),
  };
  assert.equal(evaluateTask(task, missing).status, "failed");
  assert.match(evaluateTask(task, missing).feedback, /Походження і доступ/);
  assert.equal(
    evaluateTask(task, {
      ...answer,
      method: answer.method + "\n[Замініть цей рядок конкретною інформацією.]",
    }).status,
    "failed",
  );
  assert.equal(evaluateTask(task, { ...answer, confirm: false }).status, "failed");
});

test("Workshop content validation rejects broken stages, sources, durations and unsafe downloads", () => {
  const original = getPath("de-foundations");
  for (const mutate of [
    (course) => {
      course.chapters[0].tasks[0].stage = "unknown-stage";
    },
    (course) => {
      course.chapters[0].tasks[0].lesson.sources = ["missing-source"];
    },
    (course) => {
      course.chapters[0].time = 1;
    },
    (course) => {
      course.chapters[0].tasks.at(-1).required = true;
    },
    (course) => {
      course.chapters[0].workshop.files[0].name = "../outside.txt";
    },
    (course) => {
      course.chapters[0].workshop.files[1].name =
        course.chapters[0].workshop.files[0].name;
    },
  ]) {
    const broken = structuredClone(original);
    mutate(broken);
    assert.throws(() => validateCourse(broken, SOURCES, TREASURES));
  }
});

test("Reading context is escaped in the page and report and survives backup snapshots", () => {
  const course = getPath("en-foundations"),
    task = structuredClone(course.chapters[0].tasks[0]);
  task.lesson.example = '<script>alert("reading")</script>';
  assert.ok(!renderLesson(task.lesson).includes("<script>"));
  assert.ok(renderLesson(task.lesson).includes("&lt;script&gt;"));
  const state = freshState(),
    track = state.paths[course.id];
  recordAttempt(track, task, 0, evaluateTask(task, 0));
  const restored = validateBackup(state);
  assert.ok(
    restored.paths[course.id].answers[task.id].attempts[0].definition.prompt.includes(
      "<script>",
    ),
  );
  const html = reportHtml(
    createReportData({
      state: restored,
      course,
      track: restored.paths[course.id],
      chapterId: "workspace",
    }),
  );
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(renderWorkshopIntro(course.chapters[0]).includes("144 ХВ + 30 ХВ"));
});

test("Downloaded ZIPs unpack with exact Unicode text, filenames and valid checksums", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lingva-workspace-zip-"));
  try {
    for (const language of ["de", "fr", "en"]) {
      const files = getPath(`${language}-foundations`).chapters[0].workshop.files;
      const archive = join(directory, language + ".zip");
      await writeFile(archive, new Uint8Array(await zipFiles(files).arrayBuffer()));
      const decoded = JSON.parse(
        execFileSync(
          "python3",
          [
            "-c",
            "import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps([{ 'name':n,'content':z.read(n).decode('utf-8') } for n in z.namelist()],ensure_ascii=False))",
            archive,
          ],
          { encoding: "utf8" },
        ),
      );
      assert.deepEqual(decoded, files);
    }
    assert.throws(() => zipFiles([{ name: "../unsafe.txt", content: "x" }]));
    assert.throws(() =>
      zipFiles([
        { name: "x.txt", content: "a" },
        { name: "x.txt", content: "b" },
      ]),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
