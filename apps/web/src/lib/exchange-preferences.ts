export const HANDOFF_METHODS = ['MEETING', 'DELIVERY', 'ONLINE'] as const;
export type HandoffMethod = (typeof HANDOFF_METHODS)[number];
export const handoffLabels: Record<HandoffMethod,string> = {
  MEETING:'Личная встреча', DELIVERY:'Доставка', ONLINE:'Онлайн'
};
/** Missing/legacy preferences are unset, never implicitly consent to meetings. */
export function listedHandoffMethods(value: unknown): HandoffMethod[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const v = (value as { handoffMethods?: unknown }).handoffMethods;
  return Array.isArray(v) ? HANDOFF_METHODS.filter(m => v.includes(m)) : [];
}
export type WantedItem = { categoryId: string; attributes: Record<string, string> };
export type ExchangePreferences = {
  wantedItems?: WantedItem[];
  handoffMethods?: HandoffMethod[];
  anyOffer: boolean;
  wantedCategoryIds: string[];
  wantedDescription: string;
  canAddCash: boolean;
  acceptsCash: boolean;
  maxCashRub: number | null;
};
export const emptyExchangePreferences = (): ExchangePreferences => ({ handoffMethods: [], anyOffer: true, wantedCategoryIds: [], wantedDescription: '', canAddCash: false, acceptsCash: false, maxCashRub: null });

export function exchangePreferencesError(value: ExchangePreferences): string | null {
  if (!value.handoffMethods?.length) return 'Выберите хотя бы один способ передачи при обмене.';
  if (value.handoffMethods.length > 3 || new Set(value.handoffMethods).size !== value.handoffMethods.length || value.handoffMethods.some(m => !HANDOFF_METHODS.includes(m))) return 'Проверьте способы передачи.';
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
