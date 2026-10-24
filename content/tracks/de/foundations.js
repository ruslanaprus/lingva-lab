import { foundationAssessment } from "../../shared/assessment.js";
import { foundationMilestones } from "../../shared/milestones.js";
import chapter1 from "../../shared/chapters/workspace.js";
import chapter2 from "../../shared/chapters/data-formats.js";
import chapter3 from "../../shared/chapters/unicode.js";
import chapter4 from "../../shared/chapters/terminal-navigation.js";
import chapter5 from "../../shared/chapters/text-search.js";
import chapter6 from "../../shared/chapters/regex-search.js";
import chapter7 from "../../shared/chapters/regex-cleanup.js";
import chapter8 from "../../shared/chapters/git-history.js";
import chapter9 from "../../shared/chapters/digital-audio.js";
import chapter10 from "../../shared/chapters/speech-annotation.js";
import chapter11 from "../../shared/chapters/speech-technologies.js";
import chapter12 from "../../shared/chapters/nlp-ai.js";

// This list owns this path's chapter selection and order.
export default {
  id: "de-foundations",
  language: "de",
  level: "foundations",
  revision: 1,
  milestones: foundationMilestones,
  assessment: foundationAssessment,
  title: "Німецька / Основи",
  chapters: [
    chapter1,
    chapter2,
    chapter3,
    chapter4,
    chapter5,
    chapter6,
    chapter7,
    chapter8,
    chapter9,
    chapter10,
    chapter11,
    chapter12,
  ],
};
