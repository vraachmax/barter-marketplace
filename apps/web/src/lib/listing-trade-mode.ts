export type ListingTradeMode = 'sale' | 'barter' | 'both';

export function listingTradeMode(listing: {
  saleEnabled?: boolean;
  barterEnabled?: boolean;
  isBarter?: boolean;
  attributes?: Record<string, unknown> | null;
}): ListingTradeMode {
  const barter = listing.barterEnabled ?? listing.isBarter ?? (listing.attributes?.isBarter === true);
  return listing.saleEnabled === false && barter ? 'barter' : barter ? 'both' : 'sale';
}

export function tradeModeFields(mode: ListingTradeMode) {
  return { saleEnabled: mode !== 'barter', barterEnabled: mode !== 'sale' };
}

export function tradeModeLabel(mode: ListingTradeMode) {
  return mode === 'barter' ? 'Только обмен' : mode === 'both' ? 'Продажа или обмен' : 'Только продажа';
}

export const TRADE_MODES_UNAVAILABLE = 'Не удалось проверить поддержку режимов размещения. Повторите попытку чуть позже. Ваши данные остаются в форме.';
