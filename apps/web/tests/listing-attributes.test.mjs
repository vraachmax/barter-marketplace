import test from 'node:test';
import assert from 'node:assert/strict';
import { getListingAttrSectionsForCategorySlug as sections, serializeListingAttributes as serialize, validateListingAttributes as validate, formatListingAttributeValue as format, withCatalogFieldDefinitions, withCatalogOptions, changeCatalogAttribute } from '../src/lib/listing-attributes-config.ts';

test('catalog field metadata controls the existing vehicle field without changing other categories', () => {
  const schema = { version: 1, fields: [{ key: 'fuel', label: 'Тип топлива', sectionId: 'auto_main', sectionTitle: 'Автомобиль', fieldType: 'select' }] };
  const configured = withCatalogFieldDefinitions(sections('auto'), schema);
  assert.equal(configured.flatMap(section => section.fields).find(field => field.key === 'fuel').label, 'Тип топлива');
  assert.deepEqual(configured.flatMap(section => section.fields).find(field => field.key === 'fuel').options, []);
  assert.equal(configured.flatMap(section => section.fields).find(field => field.key === 'auto_make').label, 'Марка');
  assert.equal(sections('auto').flatMap(section => section.fields).find(field => field.key === 'fuel').label, 'Топливо');
});

test('schema parent clears a selected child even before its options have loaded', () => {
  const schema = { version: 2, fields: [
    { key: 'auto_make', label: 'Марка', sectionId: 'auto_main', sectionTitle: 'Автомобиль', fieldType: 'select' },
    { key: 'auto_model', label: 'Модель', sectionId: 'auto_main', sectionTitle: 'Автомобиль', fieldType: 'select', parentKey: 'auto_make' },
  ] };
  const fields = withCatalogFieldDefinitions(sections('auto'), schema).flatMap(section => section.fields);
  assert.equal(fields.find(field => field.key === 'auto_model').dependsOn, 'auto_make');
  assert.deepEqual(changeCatalogAttribute({ auto_make: 'bmw', auto_model: '3-series' }, 'auto_make', 'lada', [], schema), { auto_make: 'lada' });
});

test('server catalog choices drive vehicle select without changing other fields', () => {
  const configured = withCatalogOptions(sections('auto'), [{ fieldKey: 'fuel', value: 'hydrogen', label: 'Водород' }]);
  const fuel = configured.flatMap(section => section.fields).find(field => field.key === 'fuel');
  assert.deepEqual(fuel.options, [{ value: 'hydrogen', label: 'Водород' }]);
  assert.deepEqual(serialize(configured, { fuel: 'hydrogen', auto_year: '2024' }), { fuel: 'hydrogen', auto_year: 2024 });
  assert.match(validate(configured, { fuel: 'petrol' }), /выберите значение из списка/);
  assert.equal(validate(configured, { fuel: 'hydrogen' }), null);
  assert.ok(sections('auto').flatMap(section => section.fields).find(field => field.key === 'fuel').options.length > 1);
});

test('dependent model options follow the selected make and clear on parent change', () => {
  const choices = [
    { fieldKey: 'auto_make', value: 'bmw', label: 'BMW' },
    { fieldKey: 'auto_make', value: 'lada', label: 'Lada' },
    { fieldKey: 'auto_model', value: '3-series', label: '3 Series', parentFieldKey: 'auto_make', parentValue: 'bmw' },
    { fieldKey: 'auto_model', value: 'vesta', label: 'Vesta', parentFieldKey: 'auto_make', parentValue: 'lada' },
  ];
  const fields = withCatalogOptions(sections('auto'), choices, { auto_make: 'bmw' }).flatMap(section => section.fields);
  assert.equal(fields.find(field => field.key === 'auto_make').type, 'select');
  assert.deepEqual(fields.find(field => field.key === 'auto_model').options, [{ value: '3-series', label: '3 Series' }]);
  assert.match(validate([{ id: 'auto', title: 'Авто', fields }], { auto_make: 'bmw', auto_model: 'vesta' }), /выберите значение/);
  assert.deepEqual(changeCatalogAttribute({ auto_make: 'bmw', auto_model: '3-series' }, 'auto_make', 'lada', choices), { auto_make: 'lada' });
});

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
