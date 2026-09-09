import test from 'node:test';
import assert from 'node:assert/strict';
import { getListingAttrSectionsForCategorySlug as sections, serializeListingAttributes as serialize, validateListingAttributes as validate, formatListingAttributeValue as format } from '../src/lib/listing-attributes-config.ts';

test('job has meaningful vacancy fields and no product condition or delivery', () => {
  const keys = sections('job').flatMap(section => section.fields.map(field => field.key));
  for (const key of ['company_name', 'salary_to', 'salary_period', 'work_schedule', 'responsibilities', 'requirements', 'benefits']) assert.ok(keys.includes(key));
  for (const key of ['condition', 'handover', 'price_flex']) assert.ok(!keys.includes(key));
  assert.ok(keys.length < 48);
});
test('service and realty omit product defaults, goods retain them', () => {
  for (const slug of ['services', 'realty']) assert.ok(!sections(slug).some(section => section.id === 'condition_delivery'));
  assert.ok(sections('electronics').some(section => section.id === 'condition_delivery'));
});
test('serialization preserves fractional measurements and excludes unrelated category fields', () => {
  assert.deepEqual(serialize(sections('auto'), { engine_volume: '1,6', mileage_km: '87 000', company_name: 'Other category' }), { engine_volume: 1.6, mileage_km: 87000 });
});
test('salary range and shift duration are validated before publication', () => {
  assert.match(validate(sections('job'), { salary_to: '80000' }, '100000'), /Зарплата/);
  assert.match(validate(sections('job'), { shift_hours: '25' }), /24/);
  assert.equal(validate(sections('job'), { shift_hours: '12', salary_to: '120000' }, '100000'), null);
});
test('invalid numeric attributes and oversized text cannot silently disappear', () => {
  assert.match(validate(sections('job'), { salary_to: '-' }), /число/);
  assert.match(validate(sections('job'), { responsibilities: 'a'.repeat(501) }), /500/);
});
test('legacy jobs remain readable and new values have public labels', () => {
  assert.equal(format('experience_level', 'lead'), 'Руководитель');
  assert.equal(format('work_schedule', 'rotation'), 'Вахта');
});
