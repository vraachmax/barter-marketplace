const LEGACY_BARTER_SLUGS = new Set([
  'auto', 'realty', 'services', 'electronics', 'home', 'clothes', 'kids', 'hobby',
]);

/** Server policy wins. Fallback supports the currently deployed categories API. */
export function canOfferBarter(category?: { slug?: string; barterAllowed?: boolean } | null): boolean {
  if (!category) return false;
  return category.barterAllowed ?? LEGACY_BARTER_SLUGS.has(category.slug ?? '');
}
