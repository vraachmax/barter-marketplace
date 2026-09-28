import type { ListingAttrSection } from './listing-attributes-config';

export type CatalogField = { key: string; label: string; dependsOnKey: string | null; options: { value: string; label: string; parentValue: string | null; enabled: boolean }[] };
export type CatalogSchema = { version: 1; fields: CatalogField[] };
export function catalogSections(base: ListingAttrSection[], fields: CatalogField[]): ListingAttrSection[] {
  const keys = new Set(fields.map(f => f.key));
  return base.map(s => ({ ...s, fields: s.fields.filter(f => !keys.has(f.key)) }));
}
export function changeCatalogValue(fields: CatalogField[], values: Record<string, string>, key: string, value: string) {
  const next = { ...values, [key]: value };
  const reset = new Set([key]);
  for (let i = 0; i < fields.length; i++) for (const f of fields) {
    if (f.dependsOnKey && reset.has(f.dependsOnKey)) { next[f.key] = ''; reset.add(f.key); }
  }
  return next;
}
