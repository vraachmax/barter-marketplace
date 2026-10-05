const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { CategoriesService } = require('../dist/categories/categories.service');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.pathname, '/barter_message_ci');
  const db = new PrismaClient();
  try {
    const service = new CategoriesService(db);
    await service.ensureSeed();
    const auto = await db.category.findUniqueOrThrow({ where: { slug: 'auto' } });
    assert.equal(auto.catalogRevision, 3);
    assert.equal(await db.categoryAttributeOption.count({ where: { categoryId: auto.id, fieldKey: 'auto_make' } }), 311);
    assert.equal(await db.categoryAttributeOption.count({ where: { categoryId: auto.id, fieldKey: 'auto_model' } }), 5465);
    const schema = await service.attributeSchema(auto.id);
    assert.equal(schema.fields.find(field => field.key === 'auto_model').parentKey, 'auto_make');
    const makes = await service.attributeOptions(auto.id, { fieldKey: 'auto_make' });
    assert.equal(makes.length, 311);
    const models = await service.attributeOptions(auto.id, { fieldKey: 'auto_model', parentFieldKey: 'auto_make', parentValue: 'lada' });
    assert.equal(models.length, 38);
    assert(models.every(model => model.value.startsWith('lada/') && model.parentValue === 'lada'));
    assert.equal((await service.attributeOptions(auto.id, { fieldKey: 'auto_model' })).length, 0);
    await service.ensureSeed();
    assert.equal(await db.categoryAttributeOption.count({ where: { categoryId: auto.id, fieldKey: 'auto_model' } }), 5465);
    const supplement = require('../src/categories/ru-car-supplement-2026.10.05.json');
    for (const model of supplement.models) {
      const options = await service.attributeOptions(auto.id, { fieldKey: 'auto_model', parentFieldKey: 'auto_make', parentValue: model.makeId });
      assert(options.some(option => option.value === model.id && option.parentValue === model.makeId));
    }
    // Simulate an existing v2 install and verify additive upgrade preserves IDs.
    const old = await db.categoryAttributeOption.findFirstOrThrow({ where: { categoryId: auto.id, value: 'lada' } });
    await db.categoryAttributeOption.deleteMany({ where: { categoryId: auto.id, value: { in: supplement.models.map(model => model.id) } } });
    await db.category.update({ where: { id: auto.id }, data: { catalogRevision: 2 } });
    await service.ensureSeed();
    assert.equal((await db.categoryAttributeOption.findFirstOrThrow({ where: { categoryId: auto.id, value: 'lada' } })).id, old.id);
    assert.equal(await db.categoryAttributeOption.count({ where: { categoryId: auto.id, fieldKey: 'auto_model' } }), 5465);
    console.log('PASS 311 makes, 5465 parent-scoped models, RU supplement and resumable v2 upgrade');
  } finally {
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
