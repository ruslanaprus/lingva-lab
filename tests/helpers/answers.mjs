import { readFileSync } from "node:fs";
import { LANGUAGES } from "../../content/registry.js";

const readme = readFileSync(
  new URL("../fixtures/workspace-readme.txt", import.meta.url),
  "utf8",
);
const editorialLog = readFileSync(
  new URL("../fixtures/editorial-log.txt", import.meta.url),
  "utf8",
);
export function portfolioAnswer(task, language = "de") {
  const material = LANGUAGES[language];
  return {
    artifact:
      task.id === "workspace-portfolio"
        ? `${material.root}/README.txt`
        : "results/practical-notes.txt",
    method:
      task.id === "workspace-portfolio"
        ? readme
            .replaceAll("{{ROOT}}", material.root)
            .replaceAll("{{CODE}}", language)
            .replaceAll("{{LANGUAGE}}", material.native)
        : task.id === "academic-documents-portfolio"
          ? editorialLog
          : "Я описую джерела, інструменти та дослідницьке питання. Вказую точні параметри аналізу, називаю отримані результати і спосіб їх незалежної перевірки. Це навчальний опис, а наявність зовнішнього артефакту потребує перевірки викладачем.",
    reflection:
      "Висновки обмежені малим навчальним набором і не поширюються на всіх носіїв мови. Потрібно окремо звірити фактичні файли, інвентар і спосіб відновлення. Якщо дію ще не виконано, вона залишається планом; я не видаю припущення за перевірений результат.",
    confirm: true,
  };
}
