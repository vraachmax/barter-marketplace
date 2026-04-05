/**
 * Ранжирование объявлений для выдачи (маркетплейс).
 * score = relevance*0.4 + engagement*0.2 + freshness*0.15 + seller*0.15 + price*0.1
 */

const W_RELEVANCE = 0.4;
const W_ENGAGEMENT = 0.2;
const W_FRESHNESS = 0.15;
const W_SELLER = 0.15;
const W_PRICE = 0.1;

/** ~20 дней «период затухания» для exp */
const FRESHNESS_DECAY_DAYS = 20;

export type ListingRankInput = {
  id: string;
  title: string;
  description: string;
  priceRub: number | null;
  createdAt: Date;
  viewsCount: number;
  clicksCount: number;
  favoritesCount: number;
  categoryId: string;
  ownerId: string;
  sellerRating: number | null; // 1–5 или null
  sellerResponseRate: number; // 0–1
};

export type ListingRankResult = ListingRankInput & {
  relevance_score: number;
  engagement_score: number;
  freshness_score: number;
  seller_score: number;
  price_score: number;
  score: number;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zA-Zа-яА-ЯёЁ0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * Упрощённый TF‑IDF по пулу: сумма tf*idf по терминам запроса, нормировка на максимум в пуле.
 */
export function relevanceScoresForPool(
  query: string | undefined,
  docs: Array<{ title: string; description: string }>,
): number[] {
  const n = docs.length;
  if (n === 0) return [];
  const qTerms = tokenize(query ?? '');
  if (qTerms.length === 0) {
    return docs.map(() => 1);
  }

  const docTokens = docs.map((d) => ({
    title: new Set(tokenize(d.title)),
    desc: new Set(tokenize(d.description)),
    all: new Set([...tokenize(d.title), ...tokenize(d.description)]),
  }));

  const df = new Map<string, number>();
  for (const term of qTerms) {
    let c = 0;
    for (const dt of docTokens) {
      if (dt.all.has(term)) c++;
    }
    df.set(term, c);
  }

  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    const dt = docTokens[i];
    let s = 0;
    for (const term of qTerms) {
      const idf = Math.log(1 + n / (1 + (df.get(term) ?? 0)));
      const inTitle = dt.title.has(term) ? 1 : 0;
      const inDesc = dt.desc.has(term) ? 1 : 0;
      const tf = inTitle * 2 + inDesc;
      s += tf * idf;
    }
    raw.push(s);
  }

  const maxRaw = Math.max(...raw, 1e-9);
  return raw.map((r) => Math.min(1, r / maxRaw));
}

export function freshnessScore(createdAt: Date, now: Date): number {
  const ageMs = Math.max(0, now.getTime() - new Date(createdAt).getTime());
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.exp(-ageDays / FRESHNESS_DECAY_DAYS);
}

export function sellerScore(rating: number | null, responseRate: number): number {
  const r = rating == null || Number.isNaN(rating) ? 3 : Math.min(5, Math.max(1, rating));
  const rr = Math.min(1, Math.max(0, responseRate));
  return (r / 5) * rr;
}

export function priceScoreVsMedian(priceRub: number | null, categoryMedian: number | null): number {
  if (priceRub == null || priceRub <= 0) return 0.5;
  if (categoryMedian == null || categoryMedian <= 0) return 0.5;
  const rel = Math.abs(priceRub - categoryMedian) / categoryMedian;
  return Math.max(0, 1 - Math.min(1, rel));
}

function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span < 1e-9) return values.map(() => 0.5);
  return values.map((v) => (v - min) / span);
}

function median(nums: number[]): number | null {
  const a = nums.filter((x) => Number.isFinite(x) && x > 0).sort((x, y) => x - y);
  if (a.length === 0) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid]! : (a[mid - 1]! + a[mid]!) / 2;
}

/** Медиана цены по категории внутри текущего пула */
export function categoryMediansFromPool(
  rows: Array<{ categoryId: string; priceRub: number | null }>,
): Map<string, number> {
  const byCat = new Map<string, number[]>();
  for (const r of rows) {
    if (r.priceRub == null || r.priceRub <= 0) continue;
    const arr = byCat.get(r.categoryId) ?? [];
    arr.push(r.priceRub);
    byCat.set(r.categoryId, arr);
  }
  const out = new Map<string, number>();
  for (const [catId, prices] of byCat) {
    const m = median(prices);
    if (m != null) out.set(catId, m);
  }
  return out;
}

export function engagementScores(
  views: number[],
  clicks: number[],
  favorites: number[],
): number[] {
  const nv = minMaxNormalize(views);
  const nc = minMaxNormalize(clicks);
  const nf = minMaxNormalize(favorites);
  const n = nv.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push((nv[i]! + nc[i]! + nf[i]!) / 3);
  }
  return out;
}

export function combineScore(parts: {
  relevance: number;
  engagement: number;
  freshness: number;
  seller: number;
  price: number;
}): number {
  return (
    parts.relevance * W_RELEVANCE +
    parts.engagement * W_ENGAGEMENT +
    parts.freshness * W_FRESHNESS +
    parts.seller * W_SELLER +
    parts.price * W_PRICE
  );
}

/** Небольшой буст платного продвижения (не входит в базовую формулу, но нужен бизнесу). */
export function promotionBoost(promoWeight: number): number {
  return Math.min(0.12, (promoWeight ?? 0) / 1800);
}

/** Поднятие в выдаче: TOP / XL (boost). VIP — отдельная полоса, без буста в скоринге. */
export function isBoostPromotionType(t: string | null | undefined): boolean {
  return t === 'TOP' || t === 'XL';
}

export function isVipPromotionType(t: string | null | undefined): boolean {
  return t === 'VIP';
}

/**
 * Не более 20% выдачи — платные (VIP-полоса + буст в ленте).
 * cap = floor((vipSlots + limit) * 0.2), буст-слотов в странице = cap - vipSlots.
 */
export function allocatePaidPromotionSlots(limit: number, vipAvailable: number): {
  vipSlots: number;
  boostSlotsPerPage: number;
} {
  const Vmax = Math.min(vipAvailable, limit + 8);
  for (let V = Vmax; V >= 0; V--) {
    const cap = Math.floor((V + limit) * 0.2);
    const B = cap - V;
    if (B >= 0 && B <= limit) {
      return { vipSlots: V, boostSlotsPerPage: B };
    }
  }
  return { vipSlots: 0, boostSlotsPerPage: Math.max(0, Math.floor(limit * 0.2)) };
}

export type ScoredRow<T> = { raw: T; finalScore: number };

/**
 * Лента без VIP: органика и буст (TOP/XL) с ограничением ~20% буста через чередование.
 * При boostSlotsPerPage === 0 — вся органика сверху, затем буст (без смешивания).
 */
export function mergeOrganicAndBoostFeeds<T>(
  organic: ScoredRow<T>[],
  boosted: ScoredRow<T>[],
  boostSlotsPerPage: number,
): ScoredRow<T>[] {
  const byScore = (a: ScoredRow<T>, b: ScoredRow<T>) => b.finalScore - a.finalScore;
  const o = [...organic].sort(byScore);
  const b = [...boosted].sort(byScore);
  if (boostSlotsPerPage === 0) {
    return [...o, ...b];
  }
  const out: ScoredRow<T>[] = [];
  let oi = 0;
  let bi = 0;
  /** После стольких органических подряд вставляем один буст (~1/5 ≈ 20%). */
  const organicStride = 4;
  while (oi < o.length || bi < b.length) {
    for (let k = 0; k < organicStride && oi < o.length; k++) {
      out.push(o[oi++]!);
    }
    if (bi < b.length) {
      out.push(b[bi++]!);
    } else if (oi < o.length) {
      out.push(o[oi++]!);
    }
  }
  return out;
}

/** Страница ленты: в окне не больше maxBoost буст-слотов. */
export function slicePageWithBoostCap<T extends { id: string }>(
  merged: ScoredRow<T>[],
  skip: number,
  limit: number,
  maxBoost: number,
  isBoosted: (raw: T) => boolean,
): ScoredRow<T>[] {
  const window = merged.slice(skip);
  const taken = new Set<string>();
  const page: ScoredRow<T>[] = [];
  let boosts = 0;

  for (const row of window) {
    if (page.length >= limit) break;
    const id = row.raw.id;
    if (taken.has(id)) continue;
    if (isBoosted(row.raw)) {
      if (boosts >= maxBoost) continue;
      page.push(row);
      taken.add(id);
      boosts++;
    } else {
      page.push(row);
      taken.add(id);
    }
  }

  if (page.length < limit) {
    for (const row of window) {
      if (page.length >= limit) break;
      const id = row.raw.id;
      if (taken.has(id)) continue;
      if (!isBoosted(row.raw)) {
        page.push(row);
        taken.add(id);
      }
    }
  }

  if (page.length < limit) {
    for (const row of window) {
      if (page.length >= limit) break;
      const id = row.raw.id;
      if (taken.has(id)) continue;
      page.push(row);
      taken.add(id);
    }
  }

  return page;
}

export function rankListings(
  query: string | undefined,
  rows: ListingRankInput[],
  now: Date,
): ListingRankResult[] {
  const relevance = relevanceScoresForPool(
    query,
    rows.map((r) => ({ title: r.title, description: r.description })),
  );
  const medians = categoryMediansFromPool(rows);
  const engagement = engagementScores(
    rows.map((r) => r.viewsCount),
    rows.map((r) => r.clicksCount),
    rows.map((r) => r.favoritesCount),
  );

  return rows.map((r, i) => {
    const freshness = freshnessScore(r.createdAt, now);
    const seller = sellerScore(r.sellerRating, r.sellerResponseRate);
    const med = medians.get(r.categoryId) ?? null;
    const price = priceScoreVsMedian(r.priceRub, med);
    const relevance_score = relevance[i] ?? 0;
    const engagement_score = engagement[i] ?? 0;
    const score = combineScore({
      relevance: relevance_score,
      engagement: engagement_score,
      freshness,
      seller,
      price,
    });
    return {
      ...r,
      relevance_score,
      engagement_score,
      freshness_score: freshness,
      seller_score: seller,
      price_score: price,
      score,
    };
  });
}
