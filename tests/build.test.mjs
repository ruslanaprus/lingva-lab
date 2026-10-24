import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  copyFile,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

test("Build removes stale output while keeping cleanup inside its own project", async () => {
  const sandbox = await mkdtemp(join(tmpdir(), "lingva-build-"));
  const project = join(sandbox, "site");
  const unrelated = join(sandbox, "other");
  const files = [
    "index.html",
    "styles.css",
    "app.js",
    "course.js",
    "engine.js",
    "activity.js",
    "regex-worker.js",
    "_headers",
  ];
  try {
    await mkdir(join(project, "scripts"), { recursive: true });
    await mkdir(join(project, "assets"));
    await mkdir(join(project, "dist", "assets"), { recursive: true });
    await mkdir(join(unrelated, "dist"), { recursive: true });
    await copyFile(
      new URL("../scripts/build.mjs", import.meta.url),
      join(project, "scripts", "build.mjs"),
    );
    for (const file of files)
      await writeFile(join(project, file), `source: ${file}`);
    await writeFile(join(project, "assets", "signal.wav"), "fixture asset");
    await writeFile(
      join(project, "dist", "student-backup.json"),
      "must not be published",
    );
    await writeFile(
      join(project, "dist", "assets", "old-report.html"),
      "must not be published",
    );
    await writeFile(join(unrelated, "dist", "keep.txt"), "unrelated project");
    execFileSync(process.execPath, [join(project, "scripts", "build.mjs")], {
      cwd: unrelated,
    });
    assert.deepEqual(
      (await readdir(join(project, "dist"))).sort(),
      [...files, "assets"].sort(),
    );
    assert.deepEqual(await readdir(join(project, "dist", "assets")), [
      "signal.wav",
    ]);
    for (const file of files)
      assert.equal(
        await readFile(join(project, "dist", file), "utf8"),
        `source: ${file}`,
      );
    assert.equal(
      await readFile(join(unrelated, "dist", "keep.txt"), "utf8"),
      "unrelated project",
    );
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});
