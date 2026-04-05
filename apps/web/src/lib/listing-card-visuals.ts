import type { ListingCard } from '@/lib/api';

export type PromoKind = NonNullable<ListingCard['promoType']>;

/** Card wrapper in feed (vertical) — Avito-style clean white cards */
export function feedListingCardClass(promo: ListingCard['promoType']): string {
  const base =
    'group flex flex-col rounded-xl bg-white overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-all duration-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] dark:bg-zinc-900 dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]';
  if (promo === 'TOP') {
    return `${base} ring-1 ring-[#FF6F00]/30`;
  }
  if (promo === 'VIP') {
    return `${base} ring-1 ring-[#FF6F00]/30`;
  }
  if (promo === 'XL') {
    return `${base} ring-1 ring-[#007AFF]/30`;
  }
  return base;
}

/** Card in "Recommended" block */
export function recommendedListingCardClass(promo: ListingCard['promoType']): string {
  const base =
    'group flex flex-col rounded-xl bg-white overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-all duration-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] dark:bg-zinc-900 dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]';
  if (promo === 'TOP') {
    return `${base} ring-1 ring-[#FF6F00]/30`;
  }
  if (promo === 'VIP') {
    return `${base} ring-1 ring-[#FF6F00]/30`;
  }
  if (promo === 'XL') {
    return `${base} ring-1 ring-[#007AFF]/30`;
  }
  return base;
}

/** Light accent on preview for promoted */
export function listingThumbPromoExtraClass(_promo: ListingCard['promoType']): string {
  return '';
}

/** Price in card — Avito shows price prominently */
export function feedListingPriceClass(): string {
  return 'text-[16px] font-bold text-[#1A1A1A] dark:text-zinc-50 mb-0.5';
}

export function recommendedListingPriceClass(): string {
  return 'text-[16px] font-bold text-[#1A1A1A] dark:text-zinc-50 mb-0.5';
}
