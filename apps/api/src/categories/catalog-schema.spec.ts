import { parseCatalogFilters, validateCatalogValues, type CatalogField } from './catalog-schema';
const fields: CatalogField[] = [
  { key: 'make', label: 'Марка', dependsOnKey: null, options: [{ value: 'a', label: 'A', parentValue: null, enabled: true }] },
  { key: 'model', label: 'Модель', dependsOnKey: 'make', options: [{ value: 'a1', label: 'A1', parentValue: 'a', enabled: true }, { value: 'old', label: 'Old', parentValue: 'a', enabled: false }] },
];
describe('catalog membership and query contract', () => {
  it('checks dependent values without inventing arbitrary text', () => {
    expect(() => validateCatalogValues(fields, { make: 'a', model: 'a1' })).not.toThrow();
    for (const v of [{ model: 'a1' }, { make: 'a', model: 'old' }, { make: 'other' }, { make: 42 }]) expect(() => validateCatalogValues(fields, v)).toThrow();
  });
  it('preserves legacy unchanged values only on edits, never on search or create', () => {
    expect(() => validateCatalogValues(fields, { make: 'legacy' }, { make: 'legacy' })).not.toThrow();
    expect(() => validateCatalogValues(fields, { make: 'legacy' })).toThrow();
    expect(() => validateCatalogValues(fields, { make: 'legacy' }, { make: 'legacy' }, true)).toThrow();
    expect(() => validateCatalogValues(fields, { make: 'other', model: 'old' }, { make: 'a', model: 'old' })).toThrow();
  });
  it('rejects unknown filters but leaves unrelated legacy attributes intact', () => {
    expect(() => validateCatalogValues(fields, { condition: 'used' })).not.toThrow();
    expect(() => validateCatalogValues(fields, { condition: 'used' }, undefined, true)).toThrow();
  });
  it.each(['null', '[]', 'true', '{', '{"x":false}', '{"x":{"a":1}}', '{"x":""}', '{"__proto__":"x"}'])('rejects malformed query %s', value => {
    expect(() => parseCatalogFilters(value)).toThrow();
  });
  it('accepts empty and bounded exact filters', () => {
    expect(parseCatalogFilters()).toEqual({});
    expect(parseCatalogFilters('{"make":"a"}')).toEqual({ make: 'a' });
    expect(() => parseCatalogFilters(JSON.stringify(Object.fromEntries(Array.from({ length: 17 }, (_, i) => ['f' + i, 'x']))))).toThrow();
  });
});
