// Original teaching texts and partial manual annotations. C10 intentionally has an incorrect POS tag.
export default {
  code: "de",
  name: "німецька",
  word: "bitte",
  lemma: "bitten",
  fragment: "bitte",
  variant: "gebeten",
  falseForm: "bitter",
  noun: "Bitte",
  resource: "corpus-dwds",
  documents: {
    C01: {
      text: "Bitte melden Sie sich bis Freitag an. Die Bibliothek bittet um eine frühe Anmeldung.",
      annotations: [
        {
          form: "Bitte",
          lemma: "bitte",
          pos: "PART",
          occurrence: 1,
        },
        {
          form: "bittet",
          lemma: "bitten",
          pos: "VERB",
          occurrence: 1,
        },
      ],
    },
    C02: {
      text: "Meldet euch bitte für den offenen Abend an. Ich bitte euch, einen kurzen Text mitzubringen.",
      annotations: [
        {
          form: "bitte",
          lemma: "bitte",
          pos: "PART",
          occurrence: 1,
        },
        {
          form: "bitte",
          lemma: "bitten",
          pos: "VERB",
          occurrence: 2,
        },
      ],
    },
    C03: {
      text: "Tragen Sie die Bitte in das Formular ein. Die Kategorie Bitten enthält Anfragen von Studierenden.",
      annotations: [
        {
          form: "Bitte",
          lemma: "Bitte",
          pos: "NOUN",
          occurrence: 1,
        },
        {
          form: "Bitten",
          lemma: "Bitte",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C04: {
      text: "Die Tutorin erzählt von einer früheren Sitzung. Sie bat die Gruppe um Geduld. Diese Bitte galt dem Termin von 2024, nicht dem heutigen Kurs.",
      annotations: [
        {
          form: "bat",
          lemma: "bitten",
          pos: "VERB",
          occurrence: 1,
        },
        {
          form: "Bitte",
          lemma: "Bitte",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C05: {
      text: "Bitte bringen Sie Ihren Ausweis mit. Dieses Treffen fand im Jahr 2024 statt.",
      annotations: [
        {
          form: "Bitte",
          lemma: "bitte",
          pos: "PART",
          occurrence: 1,
        },
      ],
    },
    C06: {
      text: "Eine Bitte bezeichnet hier einen Eintrag im Formular. Der Absatz erklärt das Wort und fordert keine Handlung von den Lesenden.",
      annotations: [
        {
          form: "Bitte",
          lemma: "Bitte",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C07: {
      text: "Die Organisatoren bitten um eine Rückmeldung. Sie sammeln die Antworten bis Donnerstag.",
      annotations: [
        {
          form: "bitten",
          lemma: "bitten",
          pos: "VERB",
          occurrence: 1,
        },
      ],
    },
    C08: {
      text: "Der Kaffee schmeckte bitter. Im Gespräch ging es um das Essen, nicht um eine Aufforderung.",
      annotations: [
        {
          form: "bitter",
          lemma: "bitter",
          pos: "ADJ",
          occurrence: 1,
        },
      ],
    },
    C09: {
      text: "Nach dem Gespräch hat die Tutorin um eine kurze Zusammenfassung gebeten. Die Studierenden haben sie am nächsten Tag geschickt.",
      annotations: [
        {
          form: "gebeten",
          lemma: "bitten",
          pos: "VERB",
          occurrence: 1,
        },
      ],
    },
    C10: {
      text: "Die Koordinatorin bittet um eine kurze Antwort. Sie möchte die Zahl der Teilnehmenden wissen.",
      annotations: [
        {
          form: "bittet",
          lemma: "bitten",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C11: {
      text: "Komm bitte früher, sagt die Sprecherin. Und bring bitte das Formular mit. Beide Äußerungen stammen aus demselben Gespräch.",
      annotations: [
        {
          form: "bitte",
          lemma: "bitte",
          pos: "PART",
          occurrence: 1,
        },
        {
          form: "bitte",
          lemma: "bitte",
          pos: "PART",
          occurrence: 2,
        },
      ],
    },
    C12: {
      text: "Bringen Sie ein kurzes Textbeispiel mit. Die Einführung beginnt um zehn Uhr.",
      annotations: [],
    },
  },
  expected: {
    wordHits: 9,
    wordDocuments: 7,
    caseHits: 4,
    lemmaHits: 6,
    lemmaDocuments: 6,
    verbHits: 5,
    filteredHits: 4,
  },
};
