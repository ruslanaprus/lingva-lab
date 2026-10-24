export const now = () => new Date().toISOString();

export const normalized = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ");

export const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const text = (value, max = 50000) =>
  typeof value === "string" && value.length <= max;

export const onlyKeys = (value, keys) =>
  object(value) && Object.keys(value).every((key) => keys.includes(key));

export const pick = (value, keys) =>
  Object.fromEntries(
    keys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]]),
  );

export const indexValue = (value, count) =>
  (typeof value === "number" ||
    (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value))) &&
  Number.isSafeInteger(Number(value)) &&
  Number(value) >= 0 &&
  Number(value) < count;
