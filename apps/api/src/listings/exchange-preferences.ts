import { BadRequestException } from '@nestjs/common';

export type WantedItem = { categoryId: string; attributes: Record<string, string> };
export type ExchangePreferences = {
  wantedItems?: WantedItem[];
  anyOffer: boolean;
  wantedCategoryIds: string[];
  wantedDescription: string;
  canAddCash: boolean;
  acceptsCash: boolean;
  maxCashRub: number | null;
};

/** Validate the incoming contract; legacy PATCH preservation is handled by the service. */
export function parseExchangePreferences(value: unknown): ExchangePreferences | null {
  if (value === null) return null;
  const fail = (): never => { throw new BadRequestException('invalid_exchange_preferences'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const v = value as Record<string, unknown>;
  const keys = ['anyOffer', 'wantedCategoryIds', 'wantedDescription', 'canAddCash', 'acceptsCash', 'maxCashRub', 'wantedItems'];
  if (Object.keys(v).some(k => !keys.includes(k))) return fail();
  if (typeof v.anyOffer !== 'boolean' || typeof v.canAddCash !== 'boolean' || typeof v.acceptsCash !== 'boolean') return fail();
  if (!Array.isArray(v.wantedCategoryIds) || v.wantedCategoryIds.length > 10 ||
    v.wantedCategoryIds.some(id => typeof id !== 'string' || !id.length || id.length > 64 || id.trim() !== id)) return fail();
  if (new Set(v.wantedCategoryIds).size !== v.wantedCategoryIds.length) return fail();
  if (typeof v.wantedDescription !== 'string' || v.wantedDescription.length > 500) return fail();
  const wantedDescription = v.wantedDescription.trim();
  let wantedItems: WantedItem[] | undefined;
  if (v.wantedItems !== undefined) {
    if (!Array.isArray(v.wantedItems) || v.wantedItems.length > 5) return fail();
    wantedItems = v.wantedItems.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item) ||
        Object.keys(item).some(key => !['categoryId', 'attributes'].includes(key))) return fail();
      if (typeof item.categoryId !== 'string' || !item.categoryId.length || item.categoryId.length > 64 || item.categoryId.trim() !== item.categoryId) return fail();
      if (!item.attributes || typeof item.attributes !== 'object' || Array.isArray(item.attributes)) return fail();
      const entries = Object.entries(item.attributes);
      if (!entries.length || entries.length > 10 || entries.some(([key, val]) =>
        !/^[a-z][a-z0-9_]{0,63}$/.test(key) || typeof val !== 'string' || !val.length || val.length > 128 || val.trim() !== val)) return fail();
      return { categoryId: item.categoryId, attributes: Object.fromEntries(entries) as Record<string, string> };
    });
    const identities = wantedItems.map(item => JSON.stringify([item.categoryId, Object.entries(item.attributes).sort(([a], [b]) => a.localeCompare(b))]));
    if (new Set(identities).size !== identities.length) return fail();
  }
  if (!v.anyOffer && !v.wantedCategoryIds.length && !wantedDescription && !wantedItems?.length) return fail();
  if (v.maxCashRub !== null && (typeof v.maxCashRub !== 'number' || !Number.isInteger(v.maxCashRub) || v.maxCashRub < 0 || v.maxCashRub > 2147483647)) return fail();
  if (!v.canAddCash && v.maxCashRub !== null) return fail();
  return { ...(wantedItems !== undefined ? { wantedItems } : {}), anyOffer: v.anyOffer, wantedCategoryIds: v.wantedCategoryIds as string[], wantedDescription,
    canAddCash: v.canAddCash, acceptsCash: v.acceptsCash, maxCashRub: v.maxCashRub as number | null };
}
