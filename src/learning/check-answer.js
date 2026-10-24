import { evaluateTask } from "./evaluate.js";
import { runRegex } from "../tools/regex.js";

// The checker has no page or storage dependencies. Regex execution is isolated
// in a time-limited Worker; tests can supply another executor.
export const createAnswerChecker = (executeRegex) => async (exercise, answer) => {
  if (!["regex", "replace"].includes(exercise.type))
    return evaluateTask(exercise, answer);
  const toolResult = await executeRegex(exercise, answer);
  return { ...evaluateTask(exercise, answer, toolResult), toolResult };
};

export const checkAnswer = createAnswerChecker(runRegex);
