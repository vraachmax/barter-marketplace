/** Нормализация для сравнения дубликатов объявлений. */
export function normalizeListingText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigrams(s: string): Set<string> {
  const pad = `  ${s}  `;
  const out = new Set<string>();
  for (let i = 0; i < pad.length - 2; i++) {
    out.add(pad.slice(i, i + 3));
  }
  return out;
}

/** Jaccard по триграммам — устойчиво к длинным текстам. */
export function trigramJaccardSimilarity(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) {
    if (B.has(x)) inter++;
  }
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Расстояние Левенштейна (O(nm), для коротких строк). */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const t = prev;
    prev = cur;
    cur = t;
  }
  return prev[n];
}

/**
 * Схожесть заголовка + описания с порогом ~90% (как в ТЗ).
 * Короткие тексты — доля совпадения по Левенштейну; длинные — триграммный Jaccard.
 */
export function listingBodySimilarity(
  titleA: string,
  descA: string,
  titleB: string,
  descB: string,
): number {
  const ca = normalizeListingText(`${titleA}\n${descA}`);
  const cb = normalizeListingText(`${titleB}\n${descB}`);
  if (ca.length === 0 && cb.length === 0) return 1;
  if (ca === cb) return 1;
  const maxLen = Math.max(ca.length, cb.length);
  if (maxLen <= 1200) {
    const dist = levenshteinDistance(ca, cb);
    return 1 - dist / maxLen;
  }
  return trigramJaccardSimilarity(ca, cb);
}
