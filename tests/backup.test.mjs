import test from "node:test";
import assert from "node:assert/strict";
import {
  freshState,
  createGit,
  createTerminal,
  validateBackup,
  formatTaskValue,
} from "../engine.js";
import { getModules } from "../course.js";

const timestamp = "2026-10-23T00:00:00.000Z";
function backupWithValue(language, id, value, location = "attempt") {
  const state = freshState();
  state.activeLanguage = language;
  state.tracks[language].answers[id] = {
    draft: location === "draft" ? value : null,
    attempts:
      location === "attempt"
        ? [{ at: timestamp, value, status: "failed", feedback: "", hints: 0 }]
        : [],
    hints: 0,
    hintOpened: false,
    toolEvents: [],
  };
  return JSON.parse(JSON.stringify(state));
}

for (const language of ["de", "fr", "en"]) {
  test(`${language}: reject foreign type discriminators in drafts and history`, () => {
    const cases = [
      ["6-1", { pattern: "x" }],
      ["7-1", { pattern: "x", replacement: "" }],
      [
        "1-5",
        { artifact: "results.txt", method: "", reflection: "", confirm: false },
      ],
      ["10-1", { start: "0.60", end: "1.10", label: "B" }],
      ["8-1", createGit(language)],
    ];
    for (const [id, value] of cases) {
      for (const location of ["draft", "attempt"]) {
        assert.doesNotThrow(() =>
          validateBackup(backupWithValue(language, id, value, location)),
        );
        for (const extra of [
          { machine: true },
          { history: true },
          { extra: { toString: null } },
        ]) {
          // A legitimate Git value already owns history; machine and nested extras cover that path.
          const input = backupWithValue(
            language,
            id,
            { ...value, ...extra },
            location,
          );
          assert.throws(
            () => validateBackup(input),
            /сумісна резервна копія/,
            `${id} ${location}: ${JSON.stringify(extra)}`,
          );
        }
      }
    }
  });
}

test("Reject nonprimitive choices and treasure answers instead of coercing them", () => {
  for (const value of [true, false, [], [1], "", {}]) {
    assert.throws(() => validateBackup(backupWithValue("de", "1-1", value)));
    const state = freshState();
    state.tracks.de.treasures.unicode = {
      attempts: [
        { at: timestamp, value, status: "failed", feedback: "", hints: 0 },
      ],
    };
    assert.throws(() => validateBackup(state));
  }
  for (const value of [null, 0, "0", 1, "1"]) {
    assert.doesNotThrow(() =>
      validateBackup(backupWithValue("de", "1-1", value)),
    );
  }
});

test("Reject unvalidated fields at every retained record layer", () => {
  const cases = [
    (state) => {
      state.extra = {};
    },
    (state) => {
      state.tracks.de.extra = {};
    },
    (state) => {
      state.tracks.de.answers["4-1"].extra = {};
    },
    (state) => {
      state.tracks.de.answers["4-1"].attempts[0].extra = {};
    },
    (state) => {
      state.tracks.de.answers["4-1"].attempts[0].value.machine.extra = {};
    },
    (state) => {
      state.tracks.de.answers["4-1"].attempts[0].value.commands.push({
        input: "ls",
        ok: true,
        action: "ls",
        extra: {},
      });
    },
    (state) => {
      state.tracks.de.answers["4-1"].toolEvents.push({
        at: timestamp,
        input: "ls",
        output: "original/",
        ok: true,
        extra: {},
      });
    },
    (state) => {
      state.tracks.de.treasures.unicode = { attempts: [], extra: {} };
    },
    (state) => {
      state.tracks.de.treasures.unicode = {
        attempts: [
          {
            at: timestamp,
            value: 0,
            status: "failed",
            feedback: "",
            hints: 0,
            extra: {},
          },
        ],
      };
    },
  ];
  for (const mutate of cases) {
    const state = backupWithValue("de", "4-1", {
      machine: createTerminal("de"),
      commands: [],
    });
    mutate(state);
    assert.throws(() => validateBackup(state));
  }
  const git = createGit("de");
  git.history.push({
    text: "Text",
    message: "Changed text",
    at: timestamp,
    extra: {},
  });
  assert.throws(() => validateBackup(backupWithValue("de", "8-1", git)));
});

test("Restore legitimate simulator histories without retaining references to input", () => {
  const state = backupWithValue("fr", "4-1", {
    machine: createTerminal("fr"),
    commands: [
      { input: "ls", ok: true, action: "ls", target: null, pattern: null },
    ],
  });
  state.tracks.fr.answers["4-1"].toolEvents.push({
    at: timestamp,
    input: "ls",
    output: "original/",
    ok: true,
  });
  const clean = validateBackup(state);
  assert.deepEqual(clean, state);
  state.tracks.fr.answers["4-1"].attempts[0].value.machine.dirs.push(
    "/tampered",
  );
  assert.ok(
    !clean.tracks.fr.answers["4-1"].attempts[0].value.machine.dirs.includes(
      "/tampered",
    ),
  );
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(clean))), clean);
});

test("Task formatting remains safe even when passed malformed, unvalidated values", () => {
  const tasks = getModules("de").flatMap((m) => m.tasks);
  const task = (id) => tasks.find((t) => t.id === id);
  for (const id of ["6-1", "7-1", "1-5", "10-1", "8-1", "4-1"]) {
    for (const value of [
      { pattern: "x", machine: true },
      { history: true },
      { extra: { toString: null } },
      { commands: [null], machine: {} },
    ]) {
      assert.equal(
        formatTaskValue(task(id), value),
        "Некоректні дані відповіді",
      );
    }
    assert.equal(formatTaskValue(task(id), null), "—");
  }
  assert.equal(formatTaskValue(task("6-1"), { pattern: "x" }), "Шаблон: x");
  assert.match(
    formatTaskValue(task("4-1"), {
      machine: createTerminal("de"),
      commands: [{ input: "ls", ok: false, action: "ls" }],
    }),
    /\$ ls \[помилка\]/,
  );
  const git = createGit("de");
  git.history.push({
    text: "Corrected text",
    message: "Checked source",
    at: timestamp,
  });
  assert.match(
    formatTaskValue(task("8-1"), git),
    /Checked source\nCorrected text/,
  );
});
