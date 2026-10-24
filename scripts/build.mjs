import { mkdir, copyFile, cp, rm, readFile, writeFile } from "node:fs/promises";
// Anchor cleanup to this project's generated output, regardless of the invoking directory.
const output = new URL("../dist/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ["index.html", "_headers"])
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(file, output));
for (const directory of ["src", "content", "styles", "assets"])
  await cp(
    new URL(`../${directory}/`, import.meta.url),
    new URL(`${directory}/`, output),
    { recursive: true },
  );
const metadata = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const versionFile = new URL("src/version.js", output);
const version = await readFile(versionFile, "utf8");
await writeFile(
  versionFile,
  version.replace(
    /APP_VERSION = "[^"]+"/,
    `APP_VERSION = ${JSON.stringify(metadata.version)}`,
  ),
);
console.log("Static website prepared in dist/");
