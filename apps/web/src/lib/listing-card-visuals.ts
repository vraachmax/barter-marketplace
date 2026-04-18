import type { ListingCard } from '@/lib/api';

export type PromoKind = NonNullable<ListingCard['promoType']>;

/**
 * Стили рамки для карточек ленты/рекомендаций — Avito 2026.
 * Оставлено для обратной совместимости: новый `ListingCardComponent`
 * применяет подсветку через shadcn `Card` + `ring-*` utility.
 */

/** Card wrapper in feed (vertical) — Avito-style clean white cards */
export function feedListingCardClass(promo: ListingCard['promoType']): string {
  const base =
    'group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md';
  if (promo === 'TOP' || promo === 'VIP') {
    return `${base} ring-accent/40`;
  }
  if (promo === 'XL') {
    return `${base} ring-primary/40`;
  }
  return base;
}

/** Card in "Recommended" block */
export function recommendedListingCardClass(promo: ListingCard['promoType']): string {
  return feedListingCardClass(promo);
}

/** Light accent on preview for promoted */
export function listingThumbPromoExtraClass(_promo: ListingCard['promoType']): string {
  return '';
}

/** Price in card — Avito shows price prominently */
export function feedListingPriceClass(): string {
  return 'text-[16px] font-bold text-foreground leading-tight tracking-tight';
}

export function recommendedListingPriceClass(): string {
  return feedListingPriceClass();
}
