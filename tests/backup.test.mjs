import { exerciseSnapshot } from "../src/learning/progress.js";
import { TREASURES } from "../content/registry.js";
import test from "node:test";
import assert from "node:assert/strict";
import { freshState, validateBackup } from "../src/persistence/state.js";
import { createGit } from "../src/tools/git.js";
import { createTerminal } from "../src/tools/terminal.js";
import { formatTaskValue } from "../src/learning/values.js";
import { foundationChapters as getModules } from "./helpers/course.mjs";

const timestamp = "2026-10-23T00:00:00.000Z";
function backupWithValue(language, id, value, location = "attempt") {
  const state = freshState();
  state.activePathId = `${language}-foundations`;
  const definition = exerciseSnapshot(
    getModules(language)
      .flatMap((chapter) => chapter.tasks)
      .find((task) => task.id === id),
  );
  state.paths[`${language}-foundations`].answers[id] = {
    definition,
    draft: location === "draft" ? value : null,
    attempts:
      location === "attempt"
        ? [
            {
              at: timestamp,
              value,
              status: "failed",
              feedback: "",
              hints: 0,
              definition,
              graderVersion: 1,
            },
          ]
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
      ["regex-search-word-forms", { pattern: "x" }],
      ["regex-cleanup-timestamps", { pattern: "x", replacement: "" }],
      [
        "workspace-portfolio",
        { artifact: "results.txt", method: "", reflection: "", confirm: false },
      ],
      [
        "speech-annotation-segment-boundaries",
        { start: "0.60", end: "1.10", label: "B" },
      ],
      ["git-history-research-commit", createGit(language)],
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
          const input = backupWithValue(language, id, { ...value, ...extra }, location);
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
    assert.throws(() =>
      validateBackup(backupWithValue("de", "workspace-original-storage", value)),
    );
    const state = freshState();
    const definition = exerciseSnapshot({
      ...TREASURES.unicode,
      id: "unicode",
      type: "choice",
      revision: 1,
    });
    state.paths["de-foundations"].treasures.unicode = {
      definition,
      attempts: [
        {
          at: timestamp,
          value,
          status: "failed",
          feedback: "",
          hints: 0,
          definition,
          graderVersion: 1,
        },
      ],
    };
    assert.throws(() => validateBackup(state));
  }
  for (const value of [null, 0, "0", 1, "1"]) {
    assert.doesNotThrow(() =>
      validateBackup(backupWithValue("de", "workspace-original-storage", value)),
    );
  }
});

test("Reject unvalidated fields at every retained record layer", () => {
  const cases = [
    (state) => {
      state.extra = {};
    },
    (state) => {
      state.paths["de-foundations"].extra = {};
    },
    (state) => {
      state.paths["de-foundations"].answers[
        "terminal-navigation-archive-navigation"
      ].extra = {};
    },
    (state) => {
      state.paths["de-foundations"].answers[
        "terminal-navigation-archive-navigation"
      ].attempts[0].extra = {};
    },
    (state) => {
      state.paths["de-foundations"].answers[
        "terminal-navigation-archive-navigation"
      ].attempts[0].value.machine.extra = {};
    },
    (state) => {
      state.paths["de-foundations"].answers[
        "terminal-navigation-archive-navigation"
      ].attempts[0].value.commands.push({
        input: "ls",
        ok: true,
        action: "ls",
        extra: {},
      });
    },
    (state) => {
      state.paths["de-foundations"].answers[
        "terminal-navigation-archive-navigation"
      ].toolEvents.push({
        at: timestamp,
        input: "ls",
        output: "original/",
        ok: true,
        extra: {},
      });
    },
    (state) => {
      state.paths["de-foundations"].treasures.unicode = { attempts: [], extra: {} };
    },
    (state) => {
      state.paths["de-foundations"].treasures.unicode = {
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
    const state = backupWithValue("de", "terminal-navigation-archive-navigation", {
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
  assert.throws(() =>
    validateBackup(backupWithValue("de", "git-history-research-commit", git)),
  );
});

test("Restore legitimate simulator histories without retaining references to input", () => {
  const state = backupWithValue("fr", "terminal-navigation-archive-navigation", {
    machine: createTerminal("fr"),
    commands: [{ input: "ls", ok: true, action: "ls", target: null, pattern: null }],
  });
  state.paths["fr-foundations"].answers[
    "terminal-navigation-archive-navigation"
  ].toolEvents.push({
    at: timestamp,
    input: "ls",
    output: "original/",
    ok: true,
  });
  const clean = validateBackup(state);
  assert.deepEqual(clean, state);
  state.paths["fr-foundations"].answers[
    "terminal-navigation-archive-navigation"
  ].attempts[0].value.machine.dirs.push("/tampered");
  assert.ok(
    !clean.paths["fr-foundations"].answers[
      "terminal-navigation-archive-navigation"
    ].attempts[0].value.machine.dirs.includes("/tampered"),
  );
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(clean))), clean);
});

test("Task formatting remains safe even when passed malformed, unvalidated values", () => {
  const tasks = getModules("de").flatMap((m) => m.tasks);
  const task = (id) => tasks.find((t) => t.id === id);
  for (const id of [
    "regex-search-word-forms",
    "regex-cleanup-timestamps",
    "workspace-portfolio",
    "speech-annotation-segment-boundaries",
    "git-history-research-commit",
    "terminal-navigation-archive-navigation",
  ]) {
    for (const value of [
      { pattern: "x", machine: true },
      { history: true },
      { extra: { toString: null } },
      { commands: [null], machine: {} },
    ]) {
      assert.equal(formatTaskValue(task(id), value), "Некоректні дані відповіді");
    }
    assert.equal(formatTaskValue(task(id), null), "—");
  }
  assert.equal(
    formatTaskValue(task("regex-search-word-forms"), { pattern: "x" }),
    "Шаблон: x",
  );
  assert.match(
    formatTaskValue(task("terminal-navigation-archive-navigation"), {
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
    formatTaskValue(task("git-history-research-commit"), git),
    /Checked source\nCorrected text/,
  );
});
