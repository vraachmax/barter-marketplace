const PRICE_SUFFIX: Record<string, string> = {
  per_day: 'за сутки', per_hour: 'в час', per_service: 'за услугу',
  per_sqm: 'за м²', per_month: 'в месяц', per_shift: 'за смену',
};

export function formatListingPrice(value: number | null, priceType?: string | null) {
  if (value == null) return 'Цена договорная';
  const suffix = priceType ? PRICE_SUFFIX[priceType] : undefined;
  return `${value.toLocaleString('ru-RU')} ₽${suffix ? ` ${suffix}` : ''}`;
}

export function listingLoginHref(listingId: string) {
  return `/auth?mode=login&next=${encodeURIComponent(`/listing/${listingId}`)}`;
}
