/**
 * Barter Match v1: reciprocal, explainable candidate ranking.
 * No fabricated "trained model": behavior weights adapt as genuine events arrive.
 * Do not use demo events for learning. Never auto-accept or auto-reserve a trade.
 */
export type MatchListing = {
  id: string; ownerId: string; categoryId: string; title: string; city: string;
  barterEnabled: boolean; status: string; priceRub: number | null;
  exchangePreferences?: unknown;
};
export type MatchEvent = {
  userId: string; categoryId: string;
  type: 'VIEW_ITEM' | 'CLICK_ITEM' | 'ADD_TO_FAVORITES' | 'SEND_MESSAGE';
  createdAt: Date;
};
export type MatchResult = {
  listingId: string; score: number; reasons: string[];
  cashGapRub: number | null; mutual: boolean;
};
type Prefs = {
  anyOffer?: boolean; wantedCategoryIds?: string[]; wantedDescription?: string;
  canAddCash?: boolean; acceptsCash?: boolean; maxCashRub?: number | null;
};
const bounded = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const eventWeights: Record<MatchEvent['type'], number> = {
  VIEW_ITEM: 0.15, CLICK_ITEM: 0.6, ADD_TO_FAVORITES: 2.0, SEND_MESSAGE: 3.0,
};
function prefs(value: unknown): Prefs {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Prefs;
}
const words = (s: string) => new Set(s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
function desire(source: MatchListing, target: MatchListing) {
  const p = prefs(source.exchangePreferences);
  const categories = Array.isArray(p.wantedCategoryIds) ? p.wantedCategoryIds : [];
  if (categories.includes(target.categoryId)) return { score: 1, reason: 'Подходит желаемая категория' };
  const requested = typeof p.wantedDescription === 'string' ? p.wantedDescription : '';
  const a = words(requested), b = words(target.title);
  if (a.size && [...a].some(token => b.has(token))) return { score: 0.85, reason: 'Совпадает с пожеланием' };
  if (p.anyOffer) return { score: 0.42, reason: 'Рассматривает разные предложения' };
  return { score: 0, reason: '' };
}
/** Recency decay and per-user caps prevent a single click-spammer dominating ranking. */
export function learnCategoryAffinity(events: MatchEvent[], userId: string, now = new Date()) {
  const scores = new Map<string, number>();
  const counted = new Map<string, number>();
  for (const event of events) {
    if (event.userId !== userId) continue;
    const ageDays = (now.getTime() - new Date(event.createdAt).getTime()) / 86400000;
    if (!Number.isFinite(ageDays) || ageDays < 0 || ageDays > 90) continue;
    const key = event.categoryId + ':' + event.type;
    const repeats = counted.get(key) ?? 0;
    if (repeats >= 20) continue;
    counted.set(key, repeats + 1);
    const weight = eventWeights[event.type] * Math.pow(0.5, ageDays / 21);
    scores.set(event.categoryId, (scores.get(event.categoryId) ?? 0) + weight);
  }
  const max = Math.max(1, ...scores.values());
  return new Map([...scores].map(([category, weight]) => [category, weight / max]));
}
/**
 * Only ACTIVE barter listings from different owners are eligible.
 * Strong reciprocal intent is prioritized over engagement, location and price.
 */
export function matchListings(
  mine: MatchListing, candidates: MatchListing[],
  affinity: ReadonlyMap<string, number> = new Map(),
  limit = 20,
): MatchResult[] {
  if (!mine.barterEnabled || mine.status !== 'ACTIVE') return [];
  return candidates.flatMap((other): MatchResult[] => {
    if (other.id === mine.id || other.ownerId === mine.ownerId ||
        !other.barterEnabled || other.status !== 'ACTIVE') return [];
    const forward = desire(mine, other), backward = desire(other, mine);
    if (!forward.score || !backward.score) return [];
    const reasons = [forward.reason, backward.reason === forward.reason ? 'Обоюдный интерес' : 'Вторая сторона: ' + backward.reason];
    let score = 70 * Math.min(forward.score, backward.score) + 15 * ((forward.score + backward.score) / 2);
    if (mine.city.trim().toLowerCase() === other.city.trim().toLowerCase()) {
      score += 8; reasons.push('Один город');
    }
    let cashGapRub: number | null = null;
    if (mine.priceRub != null && other.priceRub != null && mine.priceRub > 0 && other.priceRub > 0) {
      cashGapRub = other.priceRub - mine.priceRub;
      const magnitude = Math.abs(cashGapRub) / Math.max(mine.priceRub, other.priceRub);
      score += 5 * (1 - bounded(magnitude, 0, 1));
      const payerPrefs = prefs(cashGapRub > 0 ? mine.exchangePreferences : other.exchangePreferences);
      const payeePrefs = prefs(cashGapRub > 0 ? other.exchangePreferences : mine.exchangePreferences);
      if (cashGapRub !== 0 && (payerPrefs.canAddCash === false || payeePrefs.acceptsCash === false ||
          (typeof payerPrefs.maxCashRub === 'number' && Math.abs(cashGapRub) > payerPrefs.maxCashRub))) {
        score -= 25; reasons.push('Нужна договорённость о доплате');
      }
    }
    // Learned signal can only fine-tune, never override reciprocal intent.
    score += 2 * (affinity.get(other.categoryId) ?? 0);
    return [{ listingId: other.id, score: Math.round(bounded(score, 0, 100) * 10) / 10,
      reasons, cashGapRub, mutual: true }];
  }).sort((a,b) => b.score - a.score || a.listingId.localeCompare(b.listingId))
    .slice(0, bounded(Math.trunc(limit) || 20, 1, 100));
}
