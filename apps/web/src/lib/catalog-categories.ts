import type { Category } from './api';

/** Only offer categories that exist in the API. Labels are not identifiers. */
export function getAvailableCatalogCategories<T extends { slug: string }>(
  tiles: readonly T[],
  categories: readonly Category[],
): Array<T & { categoryId: string }> {
  const idsBySlug = new Map(
    categories
      .filter((category) => category?.id && category?.slug)
      .map((category) => [category.slug, category.id]),
  );

  return tiles.flatMap((tile) => {
    if (tile.slug === 'all') return [{ ...tile, categoryId: '' }];
    const categoryId = idsBySlug.get(tile.slug);
    return categoryId ? [{ ...tile, categoryId }] : [];
  });
}
