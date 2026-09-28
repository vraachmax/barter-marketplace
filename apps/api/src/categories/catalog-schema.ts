import { BadRequestException } from '@nestjs/common';

export type CatalogField = {
  key: string; label: string; dependsOnKey: string | null;
  options: { value: string; label: string; parentValue: string | null; enabled: boolean }[];
};

export function validateCatalogValues(fields: CatalogField[], values: Record<string, unknown>, previous?: Record<string, unknown>, filtering = false) {
  for (const field of fields) {
    const value = values[field.key];
    if (value === undefined || value === null || value === '') continue;
    // Old non-canonical values can remain on an unrelated edit, never on create/filter.
    if (!filtering && previous && value === previous[field.key] &&
      (!field.dependsOnKey || values[field.dependsOnKey] === previous[field.dependsOnKey])) continue;
    const option = field.options.find(o => o.enabled && o.value === value);
    if (!option || (field.dependsOnKey && option.parentValue !== values[field.dependsOnKey])) {
      throw new BadRequestException({ code: 'invalid_catalog_value', field: field.key, message: 'Выберите значение характеристики из справочника.' });
    }
  }
  if (filtering && Object.keys(values).some(key => !fields.some(f => f.key === key))) {
    throw new BadRequestException('unknown_catalog_filter');
  }
}

export function parseCatalogFilters(raw?: string): Record<string, string> {
  if (raw === undefined) return {};
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new BadRequestException('invalid_catalog_filters'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('invalid_catalog_filters');
  const entries = Object.entries(value);
  if (entries.length > 16 || entries.some(([k, v]) => !/^[a-z][a-z0-9_]{0,63}$/.test(k) || typeof v !== 'string' || !v.length || v.length > 80)) {
    throw new BadRequestException('invalid_catalog_filters');
  }
  return value as Record<string, string>;
}

