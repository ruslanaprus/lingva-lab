import { normalized } from "../shared/values.js";
export function unicodePoints(text) {
  return Array.from(text).map((c) => ({
    char: c,
    point: "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"),
  }));
}

export function tokenize(text) {
  return normalized(text)
    .toLocaleLowerCase()
    .split(/\s+/u)
    .map((w) => w.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ""))
    .filter(Boolean);
}

export function wer(reference, hypothesis) {
  const a = tokenize(reference),
    b = tokenize(hypothesis),
    dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  let i = a.length,
    j = b.length,
    S = 0,
    D = 0,
    I = 0;
  const alignment = [];
  while (i || j) {
    if (i && j && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      alignment.unshift({ type: "=", reference: a[--i], hypothesis: b[--j] });
    } else if (i && j && dp[i][j] === dp[i - 1][j - 1] + 1) {
      S++;
      alignment.unshift({ type: "S", reference: a[--i], hypothesis: b[--j] });
    } else if (i && dp[i][j] === dp[i - 1][j] + 1) {
      D++;
      alignment.unshift({ type: "D", reference: a[--i], hypothesis: "∅" });
    } else {
      I++;
      alignment.unshift({ type: "I", reference: "∅", hypothesis: b[--j] });
    }
  }
  return {
    S,
    D,
    I,
    N: a.length,
    rate: a.length ? (S + D + I) / a.length : null,
    alignment,
  };
}
