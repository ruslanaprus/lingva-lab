// Bounded, dependency-free CSV codec. Spaces and Unicode values are significant.
export function parseCsv(input, delimiter = ",") {
  if (typeof input !== "string" || input.length > 10000)
    throw new Error("Текст CSV має бути рядком до 10 000 символів.");
  if (![",", ";", "\t"].includes(delimiter))
    throw new Error("Непідтримуваний роздільник CSV.");
  const text = input.startsWith("\uFEFF") ? input.slice(1) : input;
  if (!text.length) return [];
  const rows = [];
  let row = [],
    field = "",
    mode = "start",
    endedRecord = false;
  const finishField = () => {
    row.push(field);
    field = "";
    mode = "start";
    if (row.length > 100) throw new Error("У CSV забагато полів.");
  };
  const finishRow = () => {
    finishField();
    rows.push(row);
    row = [];
    if (rows.length > 200) throw new Error("У CSV забагато записів.");
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    endedRecord = false;
    if (mode === "quoted") {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else mode = "closed";
      } else field += char;
      continue;
    }
    if (char === delimiter) {
      finishField();
      continue;
    }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      finishRow();
      endedRecord = true;
      continue;
    }
    if (mode === "closed")
      throw new Error(
        `Після закривальної лапки потрібні роздільник або кінець запису (позиція ${i + 1}).`,
      );
    if (char === '"') {
      if (mode !== "start")
        throw new Error(
          `Лапка всередині поля без обрамлення (позиція ${i + 1}). Поле обрамлюють, а внутрішню лапку подвоюють.`,
        );
      mode = "quoted";
    } else {
      field += char;
      mode = "plain";
    }
  }
  if (mode === "quoted")
    throw new Error("Поле почалося з прямої лапки, але не має закривальної.");
  if (!endedRecord) finishRow();
  return rows;
}
