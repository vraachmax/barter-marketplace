import type { ListingCard } from '@/lib/api';

export type PromoKind = NonNullable<ListingCard['promoType']>;

/** Оболочка карточки в ленте (вертикальная) */
export function feedListingCardClass(promo: ListingCard['promoType']): string {
  const base =
    'group flex flex-col rounded-xl bg-white overflow-hidden transition-all duration-150 hover:-translate-y-[3px] hover:shadow-[var(--shadow-hover)] dark:bg-zinc-950';
  if (promo === 'TOP') {
    return `${base} ring-1 ring-[#06D6A0]/30`;
  }
  if (promo === 'VIP') {
    return `${base} ring-1 ring-[#06D6A0]/30`;
  }
  if (promo === 'XL') {
    return `${base} ring-1 ring-[#00B4D8]/30`;
  }
  return base;
}

/** Карточка в блоке «Рекомендованные» */
export function recommendedListingCardClass(promo: ListingCard['promoType']): string {
  const base =
    'group flex flex-col rounded-xl bg-white overflow-hidden transition-all duration-150 hover:-translate-y-[3px] hover:shadow-[var(--shadow-hover)] dark:bg-zinc-950';
  if (promo === 'TOP') {
    return `${base} ring-1 ring-[#06D6A0]/30`;
  }
  if (promo === 'VIP') {
    return `${base} ring-1 ring-[#06D6A0]/30`;
  }
  if (promo === 'XL') {
    return `${base} ring-1 ring-[#00B4D8]/30`;
  }
  return base;
}

/** Лёгкий акцент на превью для продвигаемых */
export function listingThumbPromoExtraClass(_promo: ListingCard['promoType']): string {
  return '';
}

/** Цена в карточке */
export function feedListingPriceClass(): string {
  return 'text-lg font-bold text-[#1a1a1a] dark:text-zinc-50 mb-1';
}

export function recommendedListingPriceClass(): string {
  return 'text-lg font-bold text-[#1a1a1a] dark:text-zinc-50 mb-1';
}
