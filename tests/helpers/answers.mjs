import { readFileSync } from "node:fs";
import { LANGUAGES } from "../../content/registry.js";
import { lexiconMethod } from "./lexicon.mjs";
import { serializeCsv } from "../../content/shared/csv.js";

const readme = readFileSync(
  new URL("../fixtures/workspace-readme.txt", import.meta.url),
  "utf8",
);
const editorialLog = readFileSync(
  new URL("../fixtures/editorial-log.txt", import.meta.url),
  "utf8",
);
const formatAudit = readFileSync(
  new URL("../fixtures/format-audit.txt", import.meta.url),
  "utf8",
);
const typographyGuide = readFileSync(
  new URL("../fixtures/typography-guide.txt", import.meta.url),
  "utf8",
);
const searchLog = readFileSync(
  new URL("../fixtures/search-log.txt", import.meta.url),
  "utf8",
);
const dictionaryDossier = readFileSync(
  new URL("../fixtures/dictionary-dossier.txt", import.meta.url),
  "utf8",
);
const bilingualDossier = readFileSync(
  new URL("../fixtures/bilingual-dossier.txt", import.meta.url),
  "utf8",
);
const terminologyDossier = readFileSync(
  new URL("../fixtures/terminology-dossier.txt", import.meta.url),
  "utf8",
);
function terminologyMethod(material) {
  const t = material.terminology;
  const targets = [
    "слововживання",
    "тип словоформи",
    "лема",
    "корпус текстів",
    "корпус мовлення тих, хто вивчає мову",
  ];
  const definitions = [
    "Окреме вживання слова за правилом P1.",
    "Різне написання в умовах P1.",
    "Базова форма для зіставлення словоформ.",
    "Задокументована добірка текстів для питання.",
    "Корпус матеріалів тих, хто вивчає мову.",
  ];
  const csv = serializeCsv([
    [
      "concept_id",
      "domain",
      "source_term",
      "source_alias",
      "target_preferred",
      "target_admitted",
      "target_deprecated",
      "definition_uk",
      "context_source",
      "context_uk",
      "definition_evidence",
      "term_evidence",
      "locator",
      "scope",
      "review_status",
      "decision_note",
      "related_id",
      "modified",
    ],
    ...targets.map((target, i) => [
      `C0${i + 1}`,
      "навчальна корпусна лінгвістика",
      t.terms[i],
      "",
      target,
      "",
      i === 4 ? "навчальний корпус" : "",
      definitions[i],
      t.candidateText,
      "Тексти, назви й одиниці навчального опису.",
      `авторська картка C0${i + 1}`,
      "авторський D1",
      i < 3 ? "D1, речення 3–4; P1" : `D1, речення ${i === 3 ? 1 : 2}`,
      "цей проєкт",
      "draft",
      "Зовнішню перевірку ще не виконано.",
      i === 4 ? "C04" : "",
      "не встановлено",
    ]),
  ]);
  return (
    terminologyDossier
      .replaceAll("{{LANGUAGE}}", material.native)
      // A textarea uses LF, including CSV pasted into the surrounding TXT dossier.
      .replace("{{GLOSSARY}}", csv.replaceAll("\r\n", "\n"))
      .replaceAll("{{FIRST}}", t.forms[0])
      .replaceAll("{{SECOND}}", t.forms[1])
  );
}
export function portfolioAnswer(task, language = "de") {
  const material = LANGUAGES[language];
  return {
    artifact:
      task.id === "workspace-portfolio"
        ? `${material.root}/README.txt`
        : "results/practical-notes.txt",
    method:
      task.id === "terminology-glossary-dossier"
        ? terminologyMethod(material)
        : task.id === "bilingual-contexts-decision-dossier"
          ? bilingualDossier.replaceAll("{{LANGUAGE}}", material.native)
          : task.editor === "dictionary"
            ? lexiconMethod(language)
            : task.id === "digital-dictionaries-word-dossier"
              ? dictionaryDossier.replaceAll("{{LANGUAGE}}", material.native)
              : task.id === "information-search-research-log"
                ? searchLog.replaceAll("{{LANGUAGE}}", material.native)
                : task.id === "workspace-portfolio"
                  ? readme
                      .replaceAll("{{ROOT}}", material.root)
                      .replaceAll("{{CODE}}", language)
                      .replaceAll("{{LANGUAGE}}", material.native)
                  : task.id === "academic-documents-portfolio"
                    ? editorialLog
                    : task.id === "data-formats-portfolio"
                      ? formatAudit
                      : task.id === "unicode-typography-guide"
                        ? typographyGuide.replaceAll("{{LANGUAGE}}", material.native)
                        : "Я описую використані джерела, інструменти та досліджувану проблему. Вказую точні параметри аналізу, перераховую отримані результати і спосіб їх перевірки. Це навчальний опис, а наявність зовнішнього артефакту потребує перевірки викладачем.",
    reflection:
      "Висновки обмежені наданим навчальним набором і не поширюються на всіх носіїв мови. Потрібно окремо звірити фактичні файли, інвентар і спосіб відновлення. Якщо дію ще не виконано, вона залишається планом; я не видаю припущення за перевірений результат.",
    confirm: true,
  };
}
