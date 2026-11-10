// Original teaching texts, not excerpts from the linked databases or standards.
export default {
  extraSources: ["term-fr-pos"],
  name: "французька → українська",
  terms: [
    "occurrence de mot",
    "forme graphique distincte",
    "lemme",
    "corpus de textes",
    "corpus d’apprenants",
    "corpus parallèle",
    "annotation",
    "étiquetage en parties du discours",
    "base terminologique",
    "concordance",
  ],
  posAlias: "étiquetage POS",
  forms: ["chat", "chats", "chat"],
  lemma: "chat",
  candidateText:
    "Notre corpus de textes contient des productions d’apprenants. Le corpus d’apprenants documente les tâches écrites et le niveau de langue. Nous comptons séparément les occurrences de mots et les formes graphiques distinctes. Les formes chat et chats sont rattachées au lemme chat. L’étiquetage en parties du discours, aussi appelé étiquetage POS, attribue une partie du discours à chaque mot. Une annotation est ici une information linguistique associée au texte. Le corpus parallèle contient des textes et leurs traductions. Une concordance montre les occurrences en contexte. La base terminologique conserve nos concepts et leurs désignations. Le rapport paraîtra lundi.",
  candidateHint:
    "Productions d’apprenants – матеріали тих, хто вивчає мову; tâches écrites – письмові завдання; partie du discours – частина мови. Forme graphique distincte тут означає різне написання за правилами P1, а не окрему лему або граматичний клас.",
  tokenOther: "Le jeton permet d’accéder au compte utilisateur.",
  tokenOtherUk: "Токен надає доступ до облікового запису.",
  learnerAmbiguous: "corpus pédagogique",
  responseTerm: "temps de réponse",
  responseA: "Le temps de réponse s’arrête au début de la première réponse.",
  responseB: "Le temps de réponse s’arrête quand la réponse complète est disponible.",
  draft:
    "Nous comptons trois lemmes : chat, chats, chat. Après lemmatisation, il reste un lemme : chat. Le corpus pédagogique contient uniquement des productions de personnes qui apprennent le français. L’étiquetage en parties du discours et l’étiquetage POS figurent dans la base terminologique.",
  resourcePair:
    "Для французької траєкторії можна порівняти IATE та TERMIUM Plus у доступних мовних парах. Канадський контекст TERMIUM не переноситься автоматично на французькі установи або український переклад. Якщо потрібної пари чи доступу немає, використайте навчальні картки; знання другої іноземної мови не потрібне.",
};
