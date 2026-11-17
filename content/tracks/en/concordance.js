// Original teaching texts and partial manual annotations. C10 intentionally has an incorrect POS tag.
export default {
  code: "en",
  name: "англійська",
  word: "request",
  lemma: "request",
  fragment: "request",
  variant: "requested",
  falseForm: "requester",
  noun: "request",
  resource: "corpus-bnc",
  documents: {
    C01: {
      text: "Request for participation: the library requests registration by Friday. The session is open to all students.",
      annotations: [
        {
          form: "Request",
          lemma: "request",
          pos: "NOUN",
          occurrence: 1,
        },
        {
          form: "requests",
          lemma: "request",
          pos: "VERB",
          occurrence: 1,
        },
      ],
    },
    C02: {
      text: "We request an early reply from club members. One request per person is enough to prepare the evening.",
      annotations: [
        {
          form: "request",
          lemma: "request",
          pos: "VERB",
          occurrence: 1,
        },
        {
          form: "request",
          lemma: "request",
          pos: "NOUN",
          occurrence: 2,
        },
      ],
    },
    C03: {
      text: "Enter the request in the form. The field stores the text sent by a student.",
      annotations: [
        {
          form: "request",
          lemma: "request",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C04: {
      text: "The tutor quotes an old notice. We request a short pause, it says. That request concerned a session in 2024, rather than the current class.",
      annotations: [
        {
          form: "request",
          lemma: "request",
          pos: "VERB",
          occurrence: 1,
        },
        {
          form: "request",
          lemma: "request",
          pos: "NOUN",
          occurrence: 2,
        },
      ],
    },
    C05: {
      text: "Request for a place at the 2024 meeting. Bring your card to that session.",
      annotations: [
        {
          form: "Request",
          lemma: "request",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C06: {
      text: "A request means an entry in this form. This paragraph explains the term and asks the reader to do nothing.",
      annotations: [
        {
          form: "request",
          lemma: "request",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C07: {
      text: "The organisers are requesting a reply by Thursday. They need time to prepare the list of participants.",
      annotations: [
        {
          form: "requesting",
          lemma: "request",
          pos: "VERB",
          occurrence: 1,
        },
      ],
    },
    C08: {
      text: "The requester forgot the room number. The interview describes a person rather than giving an instruction.",
      annotations: [
        {
          form: "requester",
          lemma: "requester",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C09: {
      text: "After the consultation, the tutor requested a short summary. The students sent it the following day.",
      annotations: [
        {
          form: "requested",
          lemma: "request",
          pos: "VERB",
          occurrence: 1,
        },
      ],
    },
    C10: {
      text: "The coordinator requests a short reply. She wants to know the number of participants.",
      annotations: [
        {
          form: "requests",
          lemma: "request",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C11: {
      text: "The request arrived this morning, says the speaker. Then we request another day to reply. Both examples come from the same interview.",
      annotations: [
        {
          form: "request",
          lemma: "request",
          pos: "NOUN",
          occurrence: 1,
        },
        {
          form: "request",
          lemma: "request",
          pos: "VERB",
          occurrence: 2,
        },
      ],
    },
    C12: {
      text: "Please bring a short text example. The session starts at ten.",
      annotations: [],
    },
  },
  expected: {
    wordHits: 10,
    wordDocuments: 7,
    caseHits: 8,
    lemmaHits: 14,
    lemmaDocuments: 10,
    verbHits: 6,
    filteredHits: 6,
  },
};
