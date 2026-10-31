// These are comparisons of text representations, not spelling or phonetic analysis.
export function sameUnicodeText(value, expected, form = "NFC") {
  if (typeof value !== "string" || typeof expected !== "string") return false;
  if (form === "none") return value === expected;
  if (form !== "NFC") throw new Error("Unsupported Unicode comparison");
  return value.normalize("NFC") === expected.normalize("NFC");
}

export function literalOccurrences(text, probe) {
  if (!probe) return 0;
  let count = 0,
    position = 0;
  while ((position = text.indexOf(probe, position)) !== -1) {
    count++;
    position += probe.length;
  }
  return count;
}

export function inspectTypography(value, probe = "") {
  if (
    typeof value !== "string" ||
    value.length > 10000 ||
    typeof probe !== "string" ||
    probe.length > 100
  )
    throw new Error("Перевищено межу навчального інспектора.");
  const nfc = value.normalize("NFC"),
    nfd = value.normalize("NFD");
  return {
    raw: value,
    nfc,
    nfd,
    points: Array.from(value).length,
    nfcPoints: Array.from(nfc).length,
    nfdPoints: Array.from(nfd).length,
    changedByNFC: nfc !== value,
    ...(probe
      ? {
          probe,
          rawMatches: literalOccurrences(value, probe),
          nfcMatches: literalOccurrences(nfc, probe.normalize("NFC")),
        }
      : {}),
  };
}
