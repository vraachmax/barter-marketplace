import { BadRequestException } from '@nestjs/common';

export type ExchangePreferences = {
  anyOffer: boolean;
  wantedCategoryIds: string[];
  wantedDescription: string;
  canAddCash: boolean;
  acceptsCash: boolean;
  maxCashRub: number | null;
};

/** Full replacement of explicit wishes; omission preserves existing data, null clears it. */
export function parseExchangePreferences(value: unknown): ExchangePreferences | null {
  if (value === null) return null;
  const fail = (): never => { throw new BadRequestException('invalid_exchange_preferences'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const v = value as Record<string, unknown>;
  const keys = ['anyOffer', 'wantedCategoryIds', 'wantedDescription', 'canAddCash', 'acceptsCash', 'maxCashRub'];
  if (Object.keys(v).some(k => !keys.includes(k))) return fail();
  if (typeof v.anyOffer !== 'boolean' || typeof v.canAddCash !== 'boolean' || typeof v.acceptsCash !== 'boolean') return fail();
  if (!Array.isArray(v.wantedCategoryIds) || v.wantedCategoryIds.length > 10 ||
    v.wantedCategoryIds.some(id => typeof id !== 'string' || !id.length || id.length > 64 || id.trim() !== id)) return fail();
  if (new Set(v.wantedCategoryIds).size !== v.wantedCategoryIds.length) return fail();
  if (typeof v.wantedDescription !== 'string' || v.wantedDescription.length > 500) return fail();
  const wantedDescription = v.wantedDescription.trim();
  if (!v.anyOffer && !v.wantedCategoryIds.length && !wantedDescription) return fail();
  if (v.maxCashRub !== null && (typeof v.maxCashRub !== 'number' || !Number.isInteger(v.maxCashRub) || v.maxCashRub < 0 || v.maxCashRub > 2147483647)) return fail();
  if (!v.canAddCash && v.maxCashRub !== null) return fail();
  return { anyOffer: v.anyOffer, wantedCategoryIds: v.wantedCategoryIds as string[], wantedDescription,
    canAddCash: v.canAddCash, acceptsCash: v.acceptsCash, maxCashRub: v.maxCashRub as number | null };
}
