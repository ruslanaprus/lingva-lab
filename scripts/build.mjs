import { mkdir, copyFile, cp, rm } from "node:fs/promises";
// Anchor cleanup to this project's generated output, regardless of the invoking directory.
const output = new URL("../dist/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of [
  "index.html",
  "styles.css",
  "app.js",
  "course.js",
  "engine.js",
  "regex-worker.js",
  "_headers",
])
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(file, output));
await cp(new URL("../assets/", import.meta.url), new URL("assets/", output), {
  recursive: true,
});
console.log("Static website prepared in dist/");
