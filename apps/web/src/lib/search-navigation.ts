export type SearchFilterChanges = Partial<Record<'q' | 'categoryId' | 'sort' | 'priceMin' | 'priceMax' | 'attributeFilters', string>>;

export function searchFilterHref(current: string, changes: SearchFilterChanges, mode: string): string {
  const params = new URLSearchParams(current);
  params.set('mode', mode);
  params.delete('page');
  if (changes.categoryId !== undefined && changes.categoryId !== params.get('categoryId')) params.delete('attributeFilters');
  for (const [key, value] of Object.entries(changes)) {
    const trimmed = value.trim();
    if (!trimmed || (key === 'sort' && trimmed === 'relevant')) params.delete(key);
    else params.set(key, trimmed);
  }
  return `/search?${params.toString()}`;
}
