import { lessonText } from "./shared/lesson-text.js";

export function validateWorkshop(chapter, sources, validId) {
  const fail = (message) => {
    throw new Error(`${chapter.id}: ${message}`);
  };
  const strings = (values) =>
    Array.isArray(values) &&
    values.every((value) => typeof value === "string" && value.trim());
  const workshop = chapter.workshop;
  if (
    !workshop ||
    typeof workshop.guidance !== "string" ||
    !Array.isArray(workshop.stages) ||
    !workshop.stages.length
  )
    fail("invalid workshop plan");
  const stages = new Map();
  for (const key of ["title", "exampleLabel", "fallbackGuidance"])
    if (workshop[key] !== undefined && !strings([workshop[key]]))
      fail(`invalid workshop ${key}`);
  for (const stage of workshop.stages) {
    if (
      !validId(stage.id) ||
      stages.has(stage.id) ||
      !strings([stage.title, stage.goal])
    )
      fail("invalid workshop stage");
    stages.set(stage.id, stage);
  }
  let previous = -1;
  for (const task of chapter.tasks) {
    const stage = stages.get(task.stage),
      reading = task.lesson;
    const position = workshop.stages.indexOf(stage);
    if (
      !stage ||
      position < previous ||
      !!stage.optional !== (task.required === false) ||
      !Number.isSafeInteger(task.minutes) ||
      task.minutes <= 0
    )
      fail(`${task.id}: invalid workshop sequence or duration`);
    previous = position;
    if (
      !reading ||
      !strings([reading.title]) ||
      !strings(reading.paragraphs) ||
      !reading.paragraphs.length ||
      !strings(reading.steps) ||
      !Array.isArray(reading.sources) ||
      reading.sources.some((key) => !Object.hasOwn(sources, key)) ||
      (reading.example !== undefined && typeof reading.example !== "string")
    )
      fail(`${task.id}: invalid reading or source`);
    if (task.prompt.length + lessonText(reading).length + 32 > 20000)
      fail(`${task.id}: reading exceeds the historical prompt limit`);
    const submission = task.submission;
    for (const key of ["title", "methodPlaceholder"])
      if (submission?.[key] !== undefined && !strings([submission[key]]))
        fail(`${task.id}: invalid submission ${key}`);
    if (
      submission &&
      (task.type !== "portfolio" ||
        !strings([submission.methodLabel, submission.reflectionLabel]) ||
        !Number.isSafeInteger(submission.minimumMethodLength) ||
        submission.minimumMethodLength < 120 ||
        submission.minimumMethodLength > 15000 ||
        !Number.isSafeInteger(submission.minimumReflectionLength) ||
        submission.minimumReflectionLength < 100 ||
        submission.minimumReflectionLength > 15000 ||
        !strings(submission.sections) ||
        !submission.sections.length ||
        new Set(submission.sections).size !== submission.sections.length)
    )
      fail(`${task.id}: invalid submission requirements`);
    if (
      submission?.downloadName !== undefined &&
      (typeof submission.downloadName !== "string" ||
        !/^[a-zA-Z0-9_-]+\.txt$/u.test(submission.downloadName))
    )
      fail(`${task.id}: invalid text download name`);
  }
  if (
    chapter.time !==
    chapter.tasks
      .filter((task) => task.required !== false)
      .reduce((sum, task) => sum + task.minutes, 0)
  )
    fail("workshop duration must equal required reading and activity estimates");
  for (const stage of stages.values())
    if (!chapter.tasks.some((task) => task.stage === stage.id))
      fail("empty workshop stage");
  if (
    !Array.isArray(workshop.files) ||
    !workshop.files.length ||
    !Array.isArray(workshop.documents)
  )
    fail("missing workshop materials");
  const names = new Set(),
    documents = new Set();
  for (const file of [...workshop.files, ...workshop.documents]) {
    if (
      typeof file.name !== "string" ||
      !file.name ||
      file.name.includes("\\") ||
      Array.from(file.name).some((char) => char.codePointAt(0) < 32) ||
      file.name.split("/").some((part) => !part || part === ".." || part === ".") ||
      names.has(file.name) ||
      typeof file.content !== "string"
    )
      fail("invalid or duplicate material");
    names.add(file.name);
  }
  for (const document of workshop.documents) {
    if (
      !validId(document.id) ||
      documents.has(document.id) ||
      !strings([document.label])
    )
      fail("invalid workshop document");
    documents.add(document.id);
  }
  if (!documents.has("example") || !documents.has("template"))
    fail("workshop needs an example and template");
  return chapter;
}
