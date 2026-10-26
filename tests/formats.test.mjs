import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getPath,
  getExercise,
  SOURCES,
  TREASURES,
  LANGUAGES,
  buildPath,
} from "../content/registry.js";
import french from "../content/tracks/fr/foundations.js";
import { validateCourse } from "../content/schema.js";
import { parseCsv } from "../src/tools/csv.js";
import { serializeCsv } from "../content/shared/csv.js";
import { encodeText } from "../src/tools/encoding.js";
import { zipFiles } from "../src/tools/zip.js";
import { evaluateTask } from "../src/learning/evaluate.js";
import { freshState, validateBackup } from "../src/persistence/state.js";
import {
  recordAttempt,
  sectionStats,
  taskStatus,
  recordTreasureAttempt,
} from "../src/learning/progress.js";
import { createReportData } from "../src/reports/data.js";
import { reportHtml } from "../src/reports/html.js";
import { feedbackModule } from "../src/features/feedback-model.js";
import {
  renderCsvPreview,
  renderCharacterInspection,
} from "../src/ui/exercises/formats.js";
import { portfolioAnswer } from "./helpers/answers.mjs";

test("CSV reads quoting, empty fields, Unicode, significant whitespace and record boundaries", () => {
  assert.deepEqual(parseCsv('\uFEFF"langue","мова, система знаків"\r\n'), [
    ["langue", "мова, система знаків"],
  ]);
  assert.deepEqual(parseCsv('007,"цитата ""так""",, \n008,"а\nб",x,'), [
    ["007", 'цитата "так"', "", " "],
    ["008", "а\nб", "x", ""],
  ]);
  assert.deepEqual(parseCsv("a\rb\n\r\n"), [["a"], ["b"], [""]]);
  assert.deepEqual(parseCsv('""'), [[""]]);
  assert.deepEqual(parseCsv(""), []);
  assert.deepEqual(parseCsv("a;b;", ";"), [["a", "b", ""]]);
  assert.deepEqual(parseCsv("a\tb", "\t"), [["a", "b"]]);
  for (const bad of ['"open', 'a"b,c', '"closed"junk,x', ' "a",b', '"a" ,b'])
    assert.throws(() => parseCsv(bad));
  for (const bad of [
    null,
    {},
    "a".repeat(10001),
    Array(202).fill("a").join("\n"),
    Array(102).fill("a").join(","),
  ])
    assert.throws(() => parseCsv(bad));
  assert.throws(() => parseCsv("a:b", ":"));
});

test("CSV interchange agrees with Python's independent CSV implementation", () => {
  const rows = [
    ["id", "form", "definition", "note"],
    ["001", "Straße", 'цитата "так, ні"', "один\nдва"],
    ["002", "œuvre", "", " "],
    ["003", "naïve", "\r\n", ""],
  ];
  const result = JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        "import csv,io,json,sys; s=sys.stdin.read(); rows=list(csv.reader(io.StringIO(s,newline=''),strict=True)); out=io.StringIO(newline=''); csv.writer(out,quoting=csv.QUOTE_ALL).writerows(rows); print(json.dumps({'rows':rows,'csv':out.getvalue()}))",
      ],
      { input: serializeCsv(rows), encoding: "utf8" },
    ),
  );
  assert.deepEqual(result.rows, rows);
  assert.deepEqual(parseCsv(result.csv), rows);
});

for (const code of ["de", "fr", "en"]) {
  test(`${code}: character prerequisites precede CSV; reading and external practice form a 155-minute route`, () => {
    const chapter = getPath(`${code}-foundations`).chapters[2];
    assert.equal(chapter.id, "data-formats");
    assert.equal(chapter.tasks.length, 41);
    assert.equal(chapter.tasks.filter((t) => t.required).length, 38);
    assert.equal(chapter.time, 155);
    assert.equal(
      chapter.tasks.filter((t) => !t.required).reduce((s, t) => s + t.minutes, 0),
      23,
    );
    assert.ok(chapter.tasks.every((t) => t.lesson.paragraphs.length >= 2));
    const order = [
      "character-parts",
      "ascii-sort",
      "unicode-utf8",
      "straight-quote-recognition",
      "straight-quote-input",
      "autoquotes-observation",
      "plain-formatted",
      "record-field-header",
      "csv-field-count",
      "csv-quoted-field",
      "csv-embedded-quote",
      "import-round",
      "export-roundtrip",
    ].map((id) => chapter.tasks.findIndex((t) => t.id === `data-formats-${id}`));
    assert.ok(
      order.every((position, i) => position >= 0 && (!i || position > order[i - 1])),
    );
    assert.equal(
      chapter.tasks.filter((t) => t.id.startsWith("data-formats-situation-")).length,
      6,
    );
    assert.equal(
      chapter.tasks.find((t) => t.id === "data-formats-dictionary-json").required,
      false,
    );
  });
  test(`${code}: CSV grades equivalent values while retaining exact failed and successful inputs`, () => {
    const task = getExercise(`${code}-foundations`, "data-formats-csv-quoted-field"),
      word = LANGUAGES[code].word;
    const state = freshState(),
      track = state.paths[`${code}-foundations`];
    const bad = `  ${word},“мова, система знаків”  `;
    recordAttempt(track, task, bad, evaluateTask(task, bad));
    for (const answer of [
      `${word},"мова, система знаків"`,
      `"${word}","мова, система знаків"\r\n`,
    ]) {
      const result = evaluateTask(task, answer);
      assert.equal(result.status, "passed");
      recordAttempt(track, task, answer, result);
    }
    for (const wrong of [
      `${word},мова, система знаків`,
      `${word}," мова, система знаків"`,
      `"${word}","мова, система знаків"\n\n`,
      `${word.toUpperCase()},"мова, система знаків"`,
    ])
      assert.equal(evaluateTask(task, wrong).status, "failed");
    const restored = validateBackup(JSON.parse(JSON.stringify(state)));
    assert.equal(
      restored.paths[`${code}-foundations`].answers[task.id].attempts[0].value,
      bad,
    );
    assert.equal(
      restored.paths[`${code}-foundations`].answers[task.id].definition.type,
      "exact",
    );
    const multiline = getExercise(`${code}-foundations`, "data-formats-csv-line-break");
    assert.equal(
      evaluateTask(multiline, multiline.answer.replaceAll("\n", "\r\n")).status,
      "passed",
    );
  });
  test(`${code}: core-only completion unlocks feedback and report; passport remains a reviewable submission`, () => {
    const course = getPath(`${code}-foundations`),
      chapter = course.chapters[2],
      state = freshState(),
      track = state.paths[course.id];
    const final = chapter.tasks.find((t) => t.id === "data-formats-portfolio");
    for (const task of chapter.tasks.filter((t) => t.required && t.id !== final.id)) {
      const answer =
        task.type === "portfolio" ? portfolioAnswer(task, code) : task.answer;
      recordAttempt(track, task, answer, evaluateTask(task, answer));
    }
    assert.equal(sectionStats(chapter, track).complete, false);
    assert.equal(feedbackModule(state, course.id, chapter.id), null);
    const answer = portfolioAnswer(final, code);
    assert.equal(
      evaluateTask(final, {
        ...answer,
        method: answer.method.replace("5. Рішення для передачі", "5. Інше"),
      }).status,
      "failed",
    );
    assert.equal(
      evaluateTask(final, {
        ...answer,
        method: answer.method + "\n[Замініть цей рядок]",
      }).status,
      "failed",
    );
    assert.equal(evaluateTask(final, answer).status, "submitted");
    recordAttempt(track, final, answer, evaluateTask(final, answer));
    assert.equal(sectionStats(chapter, track).complete, true);
    assert.ok(feedbackModule(state, course.id, chapter.id));
    assert.ok(
      chapter.tasks.filter((t) => !t.required).every((t) => !track.answers[t.id]),
    );
    const restored = validateBackup(JSON.parse(JSON.stringify(state))),
      report = createReportData({
        state: restored,
        course,
        track: restored.paths[course.id],
        chapterId: chapter.id,
      });
    assert.equal(
      report.tasks.find((t) => t.id === final.id).record.attempts[0].value.method,
      answer.method,
    );
    assert.ok(reportHtml(report).includes("Пояснення та матеріали цієї редакції"));
  });
}

test("Published CSV revision-one history is retained without completing the changed task or awarding repeat XP", () => {
  const course = getPath("fr-foundations"),
    task = getExercise(course.id, "data-formats-csv-quoted-field"),
    state = freshState(),
    track = state.paths[course.id];
  const old = { ...task, revision: 1, prompt: "Попередня умова CSV" };
  recordAttempt(track, old, task.answer, {
    status: "passed",
    feedback: "Попередній результат",
  });
  const restored = validateBackup(JSON.parse(JSON.stringify(state))).paths[course.id];
  assert.equal(taskStatus(restored.answers[task.id], task), "new");
  const result = recordAttempt(
    restored,
    task,
    task.answer,
    evaluateTask(task, task.answer),
  );
  assert.equal(result.newXP, 0);
  assert.equal(
    result.record.attempts[0].definition.prompt.startsWith("Попередня умова CSV"),
    true,
  );
  assert.equal(result.record.attempts[0].definition.revision, 1);
  assert.equal(result.record.attempts[1].definition.revision, 2);
});

test("Three language-specific ZIPs independently decode and agree across CSV, JSON, XML and UTF-16LE", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lingva-formats-"));
  try {
    for (const code of ["de", "fr", "en"]) {
      const files = getPath(`${code}-foundations`).chapters[2].workshop.files;
      const archive = join(directory, `${code}.zip`);
      await writeFile(archive, new Uint8Array(await zipFiles(files).arrayBuffer()));
      const result = JSON.parse(
        execFileSync(
          "python3",
          [
            "-c",
            `import zipfile,json,sys,csv,io,xml.etree.ElementTree as ET
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
raw=z.read('wordlist-utf16le.txt'); assert raw[:2]==bytes([255,254]); assert raw.decode('utf-16')==z.read('wordlist.txt').decode('utf-8')
rows=list(csv.reader(io.StringIO(z.read('wordlist.csv').decode('utf-8'),newline=''),strict=True))
j=json.loads(z.read('dictionary.json')); x=ET.fromstring(z.read('dictionary.xml'))
jrows=[[r[k] for k in rows[0]] for r in j['entries']]
xrows=[[r.attrib['id'],r.findtext('form'),r.findtext('definition'),r.findtext('note') or ''] for r in x]
assert rows[1:]==jrows==xrows; assert json.loads(z.read('mislabeled.csv'))==j
print(json.dumps({'rows':rows[1:],'count':len(z.namelist())}))`,
            archive,
          ],
          { encoding: "utf8" },
        ),
      );
      assert.deepEqual(result.rows, LANGUAGES[code].formats.records);
      assert.equal(result.count, 10);
    }
    assert.deepEqual(
      Array.from(encodeText("Aéя😀", "utf16le")),
      [255, 254, 65, 0, 233, 0, 79, 4, 61, 216, 0, 222],
    );
    assert.throws(() =>
      zipFiles([{ name: "x.txt", content: "x", encoding: "invalid" }]),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("CSV preview and character inspector escape content, and content contracts reject invalid controls", () => {
  for (const render of [renderCsvPreview, renderCharacterInspection]) {
    const html = render("<img src=x onerror=alert(1)>");
    assert.ok(!html.includes("<img src=x"));
    assert.ok(html.includes("&lt;"));
  }
  assert.match(renderCharacterInspection('"é"'), /U\+0022/);
  assert.match(renderCharacterInspection('"é"'), /C3 A9/);
  for (const mutate of [
    (c) => {
      c.chapters[2].tasks.find((t) => t.checker).expectedRows = [[null]];
    },
    (c) => {
      c.chapters[2].tasks.find((t) => t.checker).checker = "unknown";
    },
    (c) => {
      c.chapters[2].tasks.find((t) => t.inspector).inspector = "unsafe";
    },
    (c) => {
      c.chapters[2].workshop.files[0].encoding = "unknown";
    },
    (c) => {
      c.chapters[2].tasks.find((t) => t.lesson.diagram).lesson.diagram = "unknown";
    },
  ]) {
    const course = structuredClone(getPath("de-foundations"));
    mutate(course);
    assert.throws(() => validateCourse(course, SOURCES, TREASURES));
  }
});

test("French material can change without German changes; format treasure records choices and rewards once", () => {
  const before = JSON.stringify(getPath("de-foundations")),
    material = structuredClone(LANGUAGES.fr);
  material.formats.records[0][1] = "nouvel exemple";
  assert.ok(
    buildPath(french, material)
      .chapters[2].workshop.files.find((f) => f.name === "wordlist.csv")
      .content.includes("nouvel exemple"),
  );
  assert.equal(JSON.stringify(getPath("de-foundations")), before);
  const track = freshState().paths["de-foundations"];
  assert.equal(recordTreasureAttempt(track, "formats", 0, "data-formats").newXP, 0);
  assert.equal(recordTreasureAttempt(track, "formats", 1, "data-formats").newXP, 60);
  assert.equal(recordTreasureAttempt(track, "formats", 1, "data-formats").newXP, 0);
  assert.deepEqual(track.treasures.formats.attempts[0].selectedOptions, [
    { index: 0, number: 1, value: TREASURES.formats.options[0] },
  ]);
});
