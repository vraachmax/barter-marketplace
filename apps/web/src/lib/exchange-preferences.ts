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
export const emptyExchangePreferences = (): ExchangePreferences => ({ anyOffer: true, wantedCategoryIds: [], wantedDescription: '', canAddCash: false, acceptsCash: false, maxCashRub: null });

export function exchangePreferencesError(value: ExchangePreferences): string | null {
  if (!value.anyOffer && !value.wantedCategoryIds.length && !value.wantedDescription.trim() && !value.wantedItems?.length) return 'Выберите категорию, опишите пожелания или включите любые предложения.';
  if ((value.wantedItems?.length ?? 0) > 5) return 'Можно указать не более пяти конкретных пожеланий.';
  if (value.wantedItems?.some(item => !item.categoryId || !Object.values(item.attributes).some(Boolean))) return 'Укажите категорию и хотя бы одну характеристику для каждого конкретного пожелания или удалите его.';
  const identities = (value.wantedItems ?? []).map(item => JSON.stringify([item.categoryId, Object.entries(item.attributes).sort(([a], [b]) => a.localeCompare(b))]));
  if (new Set(identities).size !== identities.length) return 'Удалите повторяющееся конкретное пожелание.';
  if (value.maxCashRub !== null && (!Number.isInteger(value.maxCashRub) || value.maxCashRub < 0 || value.maxCashRub > 2147483647)) return 'Укажите доплату целым числом от 0 до 2 147 483 647 ₽.';
  return null;
}

export function supportsStructuredWishes(capability: { structuredWishesVersion?: number } | null | undefined, value?: ExchangePreferences | null): boolean {
  // An explicit empty array is also a write: it clears previously stored wishes.
  return value?.wantedItems === undefined || capability?.structuredWishesVersion === 1;
}
