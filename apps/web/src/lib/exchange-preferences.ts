export type ExchangePreferences = {
  anyOffer: boolean;
  wantedCategoryIds: string[];
  wantedDescription: string;
  canAddCash: boolean;
  acceptsCash: boolean;
  maxCashRub: number | null;
};
export const emptyExchangePreferences = (): ExchangePreferences => ({ anyOffer: true, wantedCategoryIds: [], wantedDescription: '', canAddCash: false, acceptsCash: false, maxCashRub: null });

export function exchangePreferencesError(value: ExchangePreferences): string | null {
  if (!value.anyOffer && !value.wantedCategoryIds.length && !value.wantedDescription.trim()) return 'Выберите категорию, опишите пожелания или включите любые предложения.';
  if (value.maxCashRub !== null && (!Number.isInteger(value.maxCashRub) || value.maxCashRub < 0 || value.maxCashRub > 2147483647)) return 'Укажите доплату целым числом от 0 до 2 147 483 647 ₽.';
  return null;
}
