// Pure serialization for authored examples and downloadable materials.
export function serializeCsv(rows, delimiter = ",") {
  if (![",", ";", "\t"].includes(delimiter) || !Array.isArray(rows))
    throw new Error("Invalid CSV data");
  return rows
    .map((row) =>
      row
        .map((value) => {
          if (typeof value !== "string") throw new Error("CSV values must be strings");
          return value.includes(delimiter) || /["\r\n]/u.test(value)
            ? '"' + value.replaceAll('"', '""') + '"'
            : value;
        })
        .join(delimiter),
    )
    .join("\r\n");
}
