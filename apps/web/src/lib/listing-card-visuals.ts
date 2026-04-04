import type { ListingCard } from '@/lib/api';

export type PromoKind = NonNullable<ListingCard['promoType']>;

/** Оболочка карточки в ленте (вертикальная) */
export function feedListingCardClass(promo: ListingCard['promoType']): string {
  const base =
    'group flex flex-col rounded-xl bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] dark:bg-zinc-900 dark:shadow-none dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]';
  if (promo === 'TOP') {
    return `${base} ring-1 ring-[#06D6A0]/40`;
  }
  if (promo === 'VIP') {
    return `${base} ring-1 ring-[#06D6A0]/40`;
  }
  if (promo === 'XL') {
    return `${base} ring-1 ring-[#00B4D8]/40`;
  }
  return base;
}

/** Карточка в блоке «Рекомендованные» */
export function recommendedListingCardClass(promo: ListingCard['promoType']): string {
  const base =
    'group flex flex-col rounded-xl bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] dark:bg-zinc-900 dark:shadow-none dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]';
  if (promo === 'TOP') {
    return `${base} ring-1 ring-[#06D6A0]/40`;
  }
  if (promo === 'VIP') {
    return `${base} ring-1 ring-[#06D6A0]/40`;
  }
  if (promo === 'XL') {
    return `${base} ring-1 ring-[#00B4D8]/40`;
  }
  return base;
}

/** Лёгкий акцент на превью для продвигаемых */
export function listingThumbPromoExtraClass(_promo: ListingCard['promoType']): string {
  return '';
}

/** Цена в карточке */
export function feedListingPriceClass(): string {
  return 'text-[15px] font-bold text-[#1a1a1a] dark:text-zinc-50 mb-0.5 md:text-base';
}

export function recommendedListingPriceClass(): string {
  return 'text-[15px] font-bold text-[#1a1a1a] dark:text-zinc-50 mb-0.5 md:text-base';
}
