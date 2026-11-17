// Original teaching texts and partial manual annotations. C10 intentionally has an incorrect POS tag.
export default {
  code: "fr",
  name: "французька",
  word: "demande",
  lemma: "demander",
  fragment: "demande",
  variant: "demandé",
  falseForm: "redemande",
  noun: "demande",
  resource: "corpus-orfeo",
  documents: {
    C01: {
      text: "Demande de participation : les bibliothécaires demandent une inscription avant vendredi. La séance est ouverte à tous les étudiants.",
      annotations: [
        {
          form: "Demande",
          lemma: "demande",
          pos: "NOUN",
          occurrence: 1,
        },
        {
          form: "demandent",
          lemma: "demander",
          pos: "VERB",
          occurrence: 1,
        },
      ],
    },
    C02: {
      text: "Je demande aux membres de venir plus tôt. Une demande par personne suffit pour préparer la rencontre.",
      annotations: [
        {
          form: "demande",
          lemma: "demander",
          pos: "VERB",
          occurrence: 1,
        },
        {
          form: "demande",
          lemma: "demande",
          pos: "NOUN",
          occurrence: 2,
        },
      ],
    },
    C03: {
      text: "Inscrivez la demande dans le formulaire. Le champ contient le texte envoyé par un étudiant.",
      annotations: [
        {
          form: "demande",
          lemma: "demande",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C04: {
      text: "La tutrice cite un message ancien. Elle demande aux étudiants de patienter. Cette demande concernait une séance de 2024, pas le cours actuel.",
      annotations: [
        {
          form: "demande",
          lemma: "demander",
          pos: "VERB",
          occurrence: 1,
        },
        {
          form: "demande",
          lemma: "demande",
          pos: "NOUN",
          occurrence: 2,
        },
      ],
    },
    C05: {
      text: "Demande de réservation pour la rencontre de 2024. Apportez votre carte lors de cette séance.",
      annotations: [
        {
          form: "Demande",
          lemma: "demande",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C06: {
      text: "Une demande désigne ici une entrée du formulaire. Le paragraphe explique un terme et ne demande aucune action au lecteur.",
      annotations: [
        {
          form: "demande",
          lemma: "demande",
          pos: "NOUN",
          occurrence: 1,
        },
        {
          form: "demande",
          lemma: "demander",
          pos: "VERB",
          occurrence: 2,
        },
      ],
    },
    C07: {
      text: "Nous demandons une réponse avant jeudi. Les organisateurs préparent la liste des participants.",
      annotations: [
        {
          form: "demandons",
          lemma: "demander",
          pos: "VERB",
          occurrence: 1,
        },
      ],
    },
    C08: {
      text: "La personne redemande le numéro de la salle. Elle avait oublié la première réponse.",
      annotations: [
        {
          form: "redemande",
          lemma: "redemander",
          pos: "VERB",
          occurrence: 1,
        },
      ],
    },
    C09: {
      text: "Après la consultation, la tutrice a demandé un bref résumé. Les étudiants l’ont envoyé le lendemain.",
      annotations: [
        {
          form: "demandé",
          lemma: "demander",
          pos: "VERB",
          occurrence: 1,
        },
      ],
    },
    C10: {
      text: "La coordinatrice demande une réponse courte. Elle souhaite connaître le nombre de participants.",
      annotations: [
        {
          form: "demande",
          lemma: "demander",
          pos: "NOUN",
          occurrence: 1,
        },
      ],
    },
    C11: {
      text: "La demande est arrivée ce matin, dit la personne interrogée. Puis elle demande un délai supplémentaire. Les deux emplois viennent du même entretien.",
      annotations: [
        {
          form: "demande",
          lemma: "demande",
          pos: "NOUN",
          occurrence: 1,
        },
        {
          form: "demande",
          lemma: "demander",
          pos: "VERB",
          occurrence: 2,
        },
      ],
    },
    C12: {
      text: "Veuillez apporter un court exemple de texte. La séance commence à dix heures.",
      annotations: [],
    },
  },
  expected: {
    wordHits: 12,
    wordDocuments: 8,
    caseHits: 10,
    lemmaHits: 8,
    lemmaDocuments: 8,
    verbHits: 7,
    filteredHits: 4,
  },
};
