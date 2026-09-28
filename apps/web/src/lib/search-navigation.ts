export type SearchFilterChanges = Partial<Record<'q' | 'categoryId' | 'sort' | 'priceMin' | 'priceMax' | 'attrs', string>>;

export function parseCatalogAttrs(raw: string): Record<string, string> {
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        Object.entries(value).every(([key, item]) => /^[a-z][a-z0-9_]{0,63}$/.test(key) && typeof item === 'string')) {
      return value as Record<string, string>;
    }
  } catch { /* A bad link should not break the filter sheet. */ }
  return {};
}

export function searchFilterHref(current: string, changes: SearchFilterChanges, mode: string): string {
  const params = new URLSearchParams(current);
  params.set('mode', mode);
  params.delete('page');
  if (changes.categoryId !== undefined && changes.categoryId !== params.get('categoryId') && changes.attrs === undefined) params.delete('attrs');
  for (const [key, value] of Object.entries(changes)) {
    const trimmed = value.trim();
    if (!trimmed || (key === 'sort' && trimmed === 'relevant')) params.delete(key);
    else params.set(key, trimmed);
  }
  return `/search?${params.toString()}`;
}
