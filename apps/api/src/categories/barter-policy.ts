/** Explicit policy for the current flat category catalog; unknown slugs fail closed. */
export const BARTER_CATEGORY_SLUGS = [
  'auto',
  'realty',
  'services',
  'electronics',
  'home',
  'clothes',
  'kids',
  'hobby',
] as const;

export function categoryAllowsBarter(slug: string): boolean {
  return BARTER_CATEGORY_SLUGS.some((allowed) => allowed === slug);
}
