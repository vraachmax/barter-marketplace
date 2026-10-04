import assert from 'node:assert/strict';
import test from 'node:test';
import { attributeFormValues, editedListingAttributes, withUnchangedAttributeValues } from '../src/lib/listing-attributes-config.ts';

const sections = [{ id: 'auto', title: 'Авто', fields: [
  { key: 'auto_make', label: 'Марка', type: 'select', options: [{ value: 'bmw', label: 'BMW' }] },
  { key: 'auto_model', label: 'Модель', type: 'select', dependsOn: 'auto_make', options: [] },
  { key: 'mileage_km', label: 'Пробег', type: 'number' },
] }];

test('editor serializes numeric fields, clears removed fields and retains unrelated data', () => {
  const original = { auto_make: 'bmw', auto_model: 'legacy', mileage_km: 12, extra: { source: 'old' }, isBarter: true };
  assert.deepEqual(attributeFormValues(original), { auto_make: 'bmw', auto_model: 'legacy', mileage_km: '12', isBarter: 'true' });
  assert.deepEqual(editedListingAttributes(sections, { auto_make: 'bmw', mileage_km: '12 345' }, original),
    { auto_make: 'bmw', mileage_km: 12345, extra: { source: 'old' }, isBarter: true });
  assert.deepEqual(editedListingAttributes(sections, {}, {}), {});
});

test('only unchanged legacy values under the same parent appear as retained options', () => {
  const original = { auto_make: 'bmw', auto_model: 'legacy' };
  assert.equal(withUnchangedAttributeValues(sections, original, original)[0].fields[1].options[0].value, 'legacy');
  assert.deepEqual(withUnchangedAttributeValues(sections, { ...original, auto_make: 'lada' }, original)[0].fields[1].options, []);
  assert.deepEqual(withUnchangedAttributeValues(sections, original, {})[0].fields[1].options, []);
});
