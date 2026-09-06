export type CatalogMode = 'market' | 'barter';
export const CATALOG_MODE_COOKIE = 'barter_catalog_mode';
export const CATALOG_MODE_EVENT = 'barter:catalog-mode-change';

export function parseCatalogMode(value?: string | null): CatalogMode {
  return value === 'barter' ? 'barter' : 'market';
}

export function modeFromCookie(cookie: string): CatalogMode {
  const value = cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${CATALOG_MODE_COOKIE}=`))?.split('=')[1];
  return parseCatalogMode(value);
}

export function catalogModeHref(path: '/' | '/search', values: Record<string, string>, mode: CatalogMode) {
  const query = new URLSearchParams();
  for (const key of ['q', 'city', 'categoryId', 'priceMin', 'priceMax', 'sort', 'lat', 'lon', 'radiusKm']) {
    if (values[key] !== undefined) query.set(key, values[key]);
  }
  query.set('mode', mode);
  return `${path}?${query}`;
}

/** Old API versions ignore unknown query fields. Never label that data as barter. */
export function assertCatalogMode<T extends {
  appliedMode?: string;
  items?: unknown[];
  vipStrip?: unknown[];
}>(response: T, mode: CatalogMode): T {
  if (mode === 'barter') {
    const rows = [...(response.items ?? []), ...(response.vipStrip ?? [])];
    if (response.appliedMode !== 'barter' || rows.some((row) =>
      row === null || typeof row !== 'object' || !('isBarter' in row) || row.isBarter !== true)) {
      throw new Error('barter_filter_unavailable');
    }
  }
  return response;
}

export function catalogErrorMessage(error: unknown): string {
  return error instanceof Error && error.message === 'barter_filter_unavailable'
    ? 'Режим «Бартер» появится после обновления сервера. Сейчас можно смотреть объявления в «Маркете».'
    : 'Не удалось загрузить объявления. Проверьте фильтры и повторите попытку.';
}
