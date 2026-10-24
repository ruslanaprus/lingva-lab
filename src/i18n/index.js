import uk from "./uk.js";
export const dictionaries = { uk };
export const SUPPORTED_LOCALES = Object.keys(dictionaries);
let locale = "uk";
export function setInterfaceLocale(value) {
  if (!Object.hasOwn(dictionaries, value))
    throw new Error(`Unsupported interface locale: ${value}`);
  locale = value;
}
export function t(key, parameters = {}) {
  const value = dictionaries[locale][key];
  if (typeof value !== "string")
    throw new Error(`Missing interface text: ${locale}/${key}`);
  return value.replace(/\{([a-zA-Z]+)\}/g, (_, name) =>
    String(parameters[name] ?? `{${name}}`),
  );
}
export const countLabel = (noun, count) =>
  `${count} ${t(`counts.${noun}.${new Intl.PluralRules(locale).select(count)}`)}`;
export const localeTag = () => (locale === "uk" ? "uk-UA" : locale);
