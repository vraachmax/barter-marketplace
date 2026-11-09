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
    assert.equal(auto.catalogRevision, 7);
    assert.equal(await db.categoryAttributeOption.count({ where: { categoryId: auto.id, fieldKey: 'auto_make' } }), 311);
    assert.equal(await db.categoryAttributeOption.count({ where: { categoryId: auto.id, fieldKey: 'auto_model' } }), 5465);
    const schema = await service.attributeSchema(auto.id);
    assert.equal(schema.fields.find(field => field.key === 'auto_model').parentKey, 'auto_make');
    assert.equal(schema.fields.find(field => field.key === 'auto_generation').parentKey, 'auto_model');
    const generations = await service.attributeOptions(auto.id, { fieldKey: 'auto_generation', parentFieldKey: 'auto_model', parentValue: 'bmw/3-series' });
    assert.equal(generations.length, 7);
    assert(generations.every(row => row.parentValue === 'bmw/3-series'));
    assert.equal((await service.attributeOptions(auto.id, { fieldKey: 'auto_generation', parentFieldKey: 'auto_model', parentValue: 'lada/vesta' })).length, 0);
    const makes = await service.attributeOptions(auto.id, { fieldKey: 'auto_make' });
    assert.equal(makes.length, 311);
    const models = await service.attributeOptions(auto.id, { fieldKey: 'auto_model', parentFieldKey: 'auto_make', parentValue: 'lada' });
    assert.equal(models.length, 38);
    assert(models.every(model => model.value.startsWith('lada/') && model.parentValue === 'lada'));
    assert.equal((await service.attributeOptions(auto.id, { fieldKey: 'auto_model' })).length, 0);
    await service.ensureSeed();
    // Cross-vertical taxonomy is additive and retains old published category IDs.
    const total=await db.category.count();
    assert(total>=208,'199 nested categories + 9 roots should be present');
    const phoneCategory=await db.category.findUniqueOrThrow({where:{slug:'electronics-phones'}});
    const iphoneBrands=await service.attributeOptions(phoneCategory.id,{fieldKey:'device_brand'});
    assert(iphoneBrands.some(row=>row.value==='apple'));
    const iphoneModels=await service.attributeOptions(phoneCategory.id,{
      fieldKey:'device_model',parentFieldKey:'device_brand',parentValue:'apple'
    });
    assert(iphoneModels.some(row=>row.label==='iPhone 13'));
    const phoneFields=await service.attributeSchema(phoneCategory.id);
    assert(phoneFields.fields.some(field=>field.key==='device_model'&&field.parentKey==='device_brand'));
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
    assert.equal(await db.categoryAttributeOption.count({ where: { categoryId: auto.id, fieldKey: 'auto_generation' } }), 55);
    assert.equal((await db.category.findUniqueOrThrow({ where: { id: auto.id } })).catalogRevision, 7);
    assert.equal(await db.categoryAttributeOption.count({ where: { categoryId: auto.id, fieldKey: 'auto_model' } }), 5465);
    const { importBulkVehicleCatalog, readVehicleSnapshot }=require('../dist/categories/vehicle-bulk-import');
    const snapshot=readVehicleSnapshot();
    const sum=Object.values(snapshot.kinds).reduce((total,kind)=>total+kind.models.length,0);
    assert(sum>=14000 && sum<=30000,'Require complete independently sourced bulk snapshot');
    const bulk=await importBulkVehicleCatalog(db);
    assert.equal(bulk.verified,true);
    assert.equal(bulk.car.verifiedImported,snapshot.kinds.car.models.length);
    assert.equal(bulk.motorcycles.verifiedImported,
      snapshot.kinds.motorcycle.models.length+snapshot.kinds.moped.models.length);
    assert.equal(bulk.commercials.verifiedImported,
      snapshot.kinds.van.models.length+snapshot.kinds.truck.models.length+snapshot.kinds.bus.models.length);
    const motor=await db.category.findUniqueOrThrow({where:{slug:'auto-motorcycles'}});
    const honda=await service.attributeOptions(motor.id,{fieldKey:'vehicle_make'});
    assert(honda.some(x=>x.value==='honda'));
    const hondaModels=await service.attributeOptions(motor.id,{
      fieldKey:'vehicle_model',parentFieldKey:'vehicle_make',parentValue:'honda'
    });
    assert(hondaModels.length>0);
    assert(hondaModels.every(x=>x.parentValue==='honda'));
    const stableModel=await db.categoryAttributeOption.findFirstOrThrow({
      where:{categoryId:auto.id,fieldKey:'auto_model',value:'bmw/x5'},
      select:{id:true},
    });
    await importBulkVehicleCatalog(db);
    assert.equal((await db.categoryAttributeOption.findFirstOrThrow({
      where:{categoryId:auto.id,fieldKey:'auto_model',value:'bmw/x5'},select:{id:true},
    })).id,stableModel.id);
    console.log('PASS '+snapshot.version+': '+sum+' source models across 6 vehicle kinds, resumable and idempotent');
  } finally {
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
