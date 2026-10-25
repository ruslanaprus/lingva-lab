import outline from "./outline.js";
import documents from "./documents.js";
// Language material only: application behavior is shared.
export default {
  outline,
  documents,
  code: "de",
  name: "Німецька",
  native: "Deutsch",
  tag: "de-DE",
  word: "Sprache",
  special: "ä ö ü Ä Ö Ü ß ẞ „ “",
  sentence: "Die Sprache öffnet neue Türen.",
  sample:
    "Die Sprache lebt. Eine Sprache verändert sich. Wir hören die Stimmen der Stadt.",
  root: "German_Philology",
  typo: "Die deutsche Sprache eröfnet neue Mögllichkeiten für das Studiumm.",
  fixed: "Die deutsche Sprache eröffnet neue Möglichkeiten für das Studium.",
  forms: ["Haus", "Häuser", "Maus", "Mäuse"],
  lemma: "Haus",
  pos: "NOUN",
  accent: "schön",
  nfd: "schön",
  regexCorpus: "lernen lernte gelernt verlernen lernenX lernen",
  regexTargets: ["lernen", "lernte", "gelernt", "lernen"],
  regexExample: "\\b(lernen|lernte|gelernt)\\b",
  variantCorpus: "Straße Strasse Straßen Strauß",
  variantTargets: ["Straße", "Strasse"],
  variantExample: "\\bStra(ß|ss)e\\b",
  transcript:
    "SPK01: [00:01:14] Die Sprache lebt.\nSPK02: [00:01:17] Ja, sie verändert sich.",
  clean: "SPK01: Die Sprache lebt.\nSPK02: Ja, sie verändert sich.",
  reference: "Wir lesen heute ein neues Buch",
  hypothesis: "Wir lesen ein neues Buch",
  ambiguous: "Die Ente ist bereit zu essen.",
  ambiguity: "Хто їстиме: качка чи людина, для якої її приготували?",
  tts: "Der Weg führt um die Bank.",
  tokens: "Ich | lese | ein | Buch | .",
  tokenSentence: "Ich lese ein Buch.",
  quote: "„Sprache und Kultur“",
  academic:
    "Die deutsche Sprache in der Welt\nEinleitung\nDeutsch wird in verschiedenen Ländern gesprochen. Digitale Quellen machen regionale Sprachformen zugänglich.\n1. Sprache und Gesellschaft\n1.1. Regionale Vielfalt\nDialekte sind ein wichtiger Teil des sprachlichen Erbes.\n2. Digitale Forschung\nKorpora erlauben systematische Vergleiche.\nFazit\nJede digitale Analyse braucht überprüfbare Quellen.",
};
