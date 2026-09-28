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
    assert.equal(auto.catalogRevision, 2);
    assert.equal(await db.categoryAttributeOption.count({ where: { categoryId: auto.id, fieldKey: 'auto_make' } }), 308);
    assert.equal(await db.categoryAttributeOption.count({ where: { categoryId: auto.id, fieldKey: 'auto_model' } }), 5455);
    const schema = await service.attributeSchema(auto.id);
    assert.equal(schema.fields.find(field => field.key === 'auto_model').parentKey, 'auto_make');
    const makes = await service.attributeOptions(auto.id, { fieldKey: 'auto_make' });
    assert.equal(makes.length, 308);
    const models = await service.attributeOptions(auto.id, { fieldKey: 'auto_model', parentFieldKey: 'auto_make', parentValue: 'lada' });
    assert.equal(models.length, 38);
    assert(models.every(model => model.value.startsWith('lada/') && model.parentValue === 'lada'));
    assert.equal((await service.attributeOptions(auto.id, { fieldKey: 'auto_model' })).length, 0);
    await service.ensureSeed();
    assert.equal(await db.categoryAttributeOption.count({ where: { categoryId: auto.id, fieldKey: 'auto_model' } }), 5455);
    console.log('PASS 308 makes, 5455 parent-scoped models and idempotent PostgreSQL import');
  } finally {
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
