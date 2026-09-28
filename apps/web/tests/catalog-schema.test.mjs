import test from 'node:test';
import assert from 'node:assert/strict';
import { changeCatalogValue, catalogSections } from '../src/lib/catalog-schema.ts';
import { searchFilterHref } from '../src/lib/search-navigation.ts';
import { catalogModeHref } from '../src/lib/catalog-mode.ts';

test('changing parent clears transitive dependent values and keeps independent values', () => {
  const fields = [{ key: 'model', dependsOnKey: 'make' }, { key: 'generation', dependsOnKey: 'model' }];
  assert.deepEqual(changeCatalogValue(fields, { make: 'a', model: 'a1', generation: 'a1g', fuel: 'petrol' }, 'make', 'b'), { make: 'b', model: '', generation: '', fuel: 'petrol' });
});
test('database fields replace only matching static controls', () => {
  assert.deepEqual(catalogSections([{ id: 'auto', fields: [{ key: 'fuel' }, { key: 'mileage' }] }], [{ key: 'fuel' }])[0].fields, [{ key: 'mileage' }]);
});
test('category changes clear stale attribute filters; both modes and other filters preserve them', () => {
  const raw = new URLSearchParams({ categoryId: 'auto', attributeFilters: '{"fuel":"diesel"}', q: 'машина', page: '3' }).toString();
  const changed = new URL('https://fixture.test' + searchFilterHref(raw, { categoryId: 'home' }, 'barter'));
  assert.equal(changed.searchParams.has('attributeFilters'), false);
  const sorted = new URL('https://fixture.test' + searchFilterHref(raw, { sort: 'cheap' }, 'market'));
  assert.equal(sorted.searchParams.get('attributeFilters'), '{"fuel":"diesel"}');
  assert.equal(sorted.searchParams.has('page'), false);
  const switched = new URL('https://fixture.test' + catalogModeHref('/search', Object.fromEntries(new URLSearchParams(raw)), 'barter'));
  assert.equal(switched.searchParams.get('attributeFilters'), '{"fuel":"diesel"}');
});
