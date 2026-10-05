const assert = require('node:assert/strict');
require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AuthGuard } = require('@nestjs/passport');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { ListingsService } = require('../dist/listings/listings.service');
const { ListingsController } = require('../dist/listings/listings.controller');
const { CategoriesController } = require('../dist/categories/categories.controller');
const { CategoriesService } = require('../dist/categories/categories.service');
const { MediaStorageService } = require('../dist/storage/media-storage.service');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.pathname, '/barter_message_ci');
  const db = new PrismaClient();
  let app, owner, outsider, category, wantedCategory, autoCategory, autoChild, autoGrandchild;
  let indexed = false;
  try {
    owner = await db.user.create({ data: { name: 'Trade mode fixture' } });
    outsider = await db.user.create({ data: { name: 'Other fixture' } });
    category = await db.category.create({ data: { slug: 'hobby', title: 'Хобби' } });
    wantedCategory = await db.category.create({ data: { slug: 'electronics', title: 'Электроника' } });
    const meili = {
      isEnabled: () => indexed, upsertListingById: async () => {},
      // Deliberately stale index includes every mode. SQL must recheck before paging/counting.
      searchListings: async () => {
        const hits = await db.listing.findMany({ where: { ownerId: owner.id }, select: { id: true }, orderBy: { id: 'asc' } });
        return { hits, estimatedTotalHits: hits.length };
      },
    };
    const service = new ListingsService(db, meili, { tryResolveUserId: () => null }, {});
    const module = await Test.createTestingModule({
      controllers: [ListingsController, CategoriesController],
      providers: [
        { provide: ListingsService, useValue: service },
        { provide: CategoriesService, useValue: new CategoriesService(db) },
        { provide: MediaStorageService, useValue: {} },
      ],
    }).overrideGuard(AuthGuard('jwt')).useValue({ canActivate(context) {
      const req = context.switchToHttp().getRequest();
      const user = [owner, outsider].find(u => u.id === req.headers['x-fixture-user']);
      if (!user) return false;
      req.user = user;
      return true;
    } }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    const http = () => request(app.getHttpServer());
    const patch = (id, body, user = owner) => http().patch('/listings/' + id).set('x-fixture-user', user.id).send(body);
    assert.equal((await http().get('/listings/capabilities').expect(200)).body.tradeModesVersion, 1);
    const modes = [[true, false], [false, true], [true, true]];
    const listings = [];
    const descriptions = ['Керамическая ваза ручной работы, гладкая глазурь.', 'Коллекционная книга о древних городах и архитектуре.', 'Деревянная шахматная доска с резными фигурами.'];
    for (let i = 0; i < modes.length; i++) {
      const [saleEnabled, barterEnabled] = modes[i];
      const res = await http().post('/listings').set('x-fixture-user', owner.id).send({
        title: ['Ваза голубая', 'Книга история', 'Шахматы деревянные'][i], description: descriptions[i],
        city: 'Краснодар', categoryId: category.id, priceRub: 1000 + i * 100,
        latitude: 45, longitude: 39, saleEnabled, barterEnabled,
        ...(i === 1 ? { exchangePreferences: { anyOffer: false, wantedCategoryIds: [wantedCategory.id], wantedDescription: 'Фотоаппарат', canAddCash: true, acceptsCash: false, maxCashRub: 5000 } } : {}),
      }).expect(201);
      assert.equal(res.body.saleEnabled, saleEnabled);
      assert.equal(res.body.barterEnabled, barterEnabled);
      if (i === 1) {
        assert.deepEqual(res.body.exchangePreferences.wantedCategoryIds, [wantedCategory.id]);
        assert.equal(res.body.exchangePreferences.maxCashRub, 5000);
        assert.equal((await http().get('/listings/' + res.body.id).expect(200)).body.exchangePreferences.wantedDescription, 'Фотоаппарат');
      } else assert.equal(res.body.exchangePreferences, null);
      listings.push(res.body);
    }
    assert.equal(await db.listing.count({ where: { ownerId: owner.id } }), 3);
    console.log('PASS create three modes as three identities, no duplicate for dual placement');

    for (const sort of ['relevant', 'new', 'cheap', 'expensive', 'nearby']) {
      for (const mode of ['market', 'barter']) {
        const expected = listings.filter(x => mode === 'market' ? x.saleEnabled : x.barterEnabled).map(x => x.id).sort();
        const ids = [];
        for (const page of [1, 2]) {
          const res = await http().get('/listings').query({ mode, sort, page, limit: 1, lat: 45, lon: 39 }).expect(200);
          assert.equal(res.body.total, 2);
          ids.push(...res.body.items.map(x => x.id));
          for (const row of res.body.items) assert.equal(row.isBarter, row.barterEnabled);
        }
        assert.deepEqual(ids.sort(), expected);
      }
    }
    console.log('PASS both catalogs, all five sorts, two pages and shared dual listing id');

    indexed = true;
    // Query matches every row by city; stale index also includes exchange-only.
    const search = await http().get('/listings').query({ mode: 'market', q: 'Краснодар', limit: 1, page: 2 }).expect(200);
    assert.equal(search.body.total, 2);
    assert.equal(search.body.items[0].saleEnabled, true);
    indexed = false;
    await db.listingPromotion.create({ data: { listingId: listings[1].id, type: 'VIP', weight: 120, startsAt: new Date(0), endsAt: new Date('2099-01-01') } });
    const market = (await http().get('/listings?mode=market&limit=20').expect(200)).body;
    assert(![...market.items, ...market.vipStrip].some(x => x.id === listings[1].id));
    const barter = (await http().get('/listings?mode=barter&limit=20').expect(200)).body;
    assert(barter.vipStrip.some(x => x.id === listings[1].id));
    console.log('PASS stale index and paid placement cannot bypass mode eligibility');

    const exchange = listings[1];
    await db.favorite.create({ data: { userId: outsider.id, listingId: exchange.id } });
    await db.listingImage.create({ data: { listingId: exchange.id, url: '/fixture.png' } });
    const changed = await patch(exchange.id, { saleEnabled: true, barterEnabled: true, priceRub: null }).expect(200);
    assert.equal(changed.body.id, exchange.id);
    assert.equal(changed.body.priceRub, null);
    assert.equal(changed.body.images.length, 1);
    assert.equal(await db.favorite.count({ where: { listingId: exchange.id } }), 1);
    const detail = (await http().get('/listings/' + exchange.id).expect(200)).body;
    assert.equal(detail.barterEnabled, true);
    const mine = (await http().get('/listings/my').set('x-fixture-user', owner.id).expect(200)).body;
    assert.equal(mine.find(x => x.id === exchange.id).saleEnabled, true);
    await patch(exchange.id, { attributes: { isBarter: false, brand: 'Retained' } }).expect(200);
    assert.equal((await db.listing.findUniqueOrThrow({ where: { id: exchange.id } })).barterEnabled, false);
    await patch(exchange.id, { barterEnabled: true }).expect(200);
    assert.equal((await db.listing.findUniqueOrThrow({ where: { id: exchange.id } })).attributes.brand, 'Retained');
    console.log('PASS edit/detail/owner readback preserves id, favorite, photo, legacy opt-in and attributes');

    await patch(exchange.id, { saleEnabled: false, barterEnabled: false }).expect(400);
    await patch(exchange.id, { barterEnabled: false, attributes: { isBarter: true } }).expect(400);
    for (const value of [null, 'false', 0]) await patch(exchange.id, { saleEnabled: value }).expect(400);
    await patch(exchange.id, { saleEnabled: false }, outsider).expect(403);
    await assert.rejects(db.listing.update({ where: { id: exchange.id }, data: { saleEnabled: false, barterEnabled: false, attributes: { isBarter: false } } }));
    console.log('PASS invalid modes, conflicting alias, wrong owner and database invariant rejected');
    const wishes = { anyOffer: false, wantedCategoryIds: [category.id], wantedDescription: 'Велосипед', canAddCash: true, acceptsCash: true, maxCashRub: 15000 };
    assert.equal((await http().get('/listings/capabilities').expect(200)).body.exchangePreferencesVersion, 1);
    await patch(exchange.id, { exchangePreferences: wishes }).expect(200);
    assert.deepEqual((await http().get('/listings/' + exchange.id).expect(200)).body.exchangePreferences, wishes);
    await patch(exchange.id, { city: 'Москва' }).expect(200);
    const refreshed = (await http().get('/listings/my').set('x-fixture-user', owner.id).expect(200)).body;
    assert.deepEqual(refreshed.find(x => x.id === exchange.id).exchangePreferences, wishes);
    await patch(exchange.id, { exchangePreferences: { ...wishes, wantedCategoryIds: ['nonexistent'] } }).expect(400);
    await patch(exchange.id, { exchangePreferences: { ...wishes, maxCashRub: -1 } }).expect(400);
    await patch(exchange.id, { exchangePreferences: wishes }, outsider).expect(403);
    await patch(exchange.id, { barterEnabled: false }).expect(200);
    assert.deepEqual((await db.listing.findUniqueOrThrow({ where: { id: exchange.id } })).exchangePreferences, wishes);
    await patch(exchange.id, { exchangePreferences: wishes }).expect(400);
    await patch(exchange.id, { barterEnabled: true, exchangePreferences: null }).expect(200);
    assert.equal((await db.listing.findUniqueOrThrow({ where: { id: exchange.id } })).exchangePreferences, null);
    console.log('PASS exchange wishes persist, validate category/budget/owner, survive sale mode and clear explicitly');

    autoCategory = await db.category.create({ data: { slug: 'auto', title: 'Авто' } });
    await db.categoryAttributeField.create({ data: {
      categoryId: autoCategory.id, key: 'fuel', label: 'Топливо',
      sectionId: 'auto_main', sectionTitle: 'Автомобиль', sortOrder: 0,
    } });
    await db.categoryAttributeField.create({ data: {
      categoryId: autoCategory.id, key: 'auto_model', label: 'Модель',
      sectionId: 'auto_main', sectionTitle: 'Автомобиль', parentKey: 'auto_make', sortOrder: 1,
    } });
    const schema = (await http().get(`/categories/${autoCategory.id}/attribute-schema`).expect(200)).body;
    assert.equal(schema.version, 1);
    assert.equal(schema.optionsQueryVersion, 1);
    assert.deepEqual(schema.fields, [
      { key: 'fuel', label: 'Топливо', sectionId: 'auto_main', sectionTitle: 'Автомобиль', fieldType: 'select', parentKey: null },
      { key: 'auto_model', label: 'Модель', sectionId: 'auto_main', sectionTitle: 'Автомобиль', fieldType: 'select', parentKey: 'auto_make' },
    ]);
    await db.categoryAttributeOption.createMany({ data: [
      { categoryId: autoCategory.id, fieldKey: 'fuel', value: 'petrol', label: 'Бензин', sortOrder: 0 },
      { categoryId: autoCategory.id, fieldKey: 'fuel', value: 'electric', label: 'Электро', sortOrder: 1 },
    ] });
    const bmw = await db.categoryAttributeOption.create({ data: {
      categoryId: autoCategory.id, fieldKey: 'auto_make', value: 'bmw', label: 'BMW',
    } });
    await db.categoryAttributeOption.create({ data: {
      categoryId: autoCategory.id, fieldKey: 'auto_make', value: 'lada', label: 'Lada',
    } });
    await db.categoryAttributeOption.create({ data: {
      categoryId: autoCategory.id, fieldKey: 'auto_model', value: '3-series', label: '3 Series', parentOptionId: bmw.id,
    } });
    const choices = (await http().get(`/categories/${autoCategory.id}/attribute-options`).set('x-fixture-user', owner.id).expect(200)).body;
    assert.deepEqual(choices.find(x => x.value === '3-series'), {
      fieldKey: 'auto_model', value: '3-series', label: '3 Series', parentFieldKey: 'auto_make', parentValue: 'bmw',
    });
    assert.deepEqual(choices.filter(x => x.fieldKey === 'fuel').map(x => x.value), ['petrol', 'electric']);
    const rootFuel = (await http().get(`/categories/${autoCategory.id}/attribute-options?fieldKey=fuel`).expect(200)).body;
    assert.deepEqual(rootFuel.map(x => x.value), ['petrol', 'electric']);
    const bmwModels = (await http().get(`/categories/${autoCategory.id}/attribute-options?fieldKey=auto_model&parentFieldKey=auto_make&parentValue=bmw`).expect(200)).body;
    assert.deepEqual(bmwModels.map(x => x.value), ['3-series']);
    const ladaModels = (await http().get(`/categories/${autoCategory.id}/attribute-options?fieldKey=auto_model&parentFieldKey=auto_make&parentValue=lada`).expect(200)).body;
    assert.deepEqual(ladaModels, []);
    await http().get(`/categories/${autoCategory.id}/attribute-options?parentValue=bmw`).expect(400);
    const car = await http().post('/listings').set('x-fixture-user', owner.id).send({
      title: 'Автомобиль городской электрический', description: 'Электромобиль с проверенной историей обслуживания.',
      city: 'Краснодар', categoryId: autoCategory.id, priceRub: 800000,
      attributes: { fuel: 'electric' },
    }).expect(201);
    assert.equal(car.body.attributes.fuel, 'electric');
    await patch(car.body.id, { attributes: { fuel: 'coal' } }).expect(400);
    await patch(car.body.id, { attributes: { fuel: 'petrol' } }).expect(200);
    assert.equal((await db.listing.findUniqueOrThrow({ where: { id: car.body.id } })).attributes.fuel, 'petrol');
    await patch(car.body.id, { attributes: { fuel: 'petrol', auto_make: 'bmw', auto_model: '3-series' } }).expect(200);
    await patch(car.body.id, { attributes: { fuel: 'petrol', auto_make: 'lada', auto_model: '3-series' } }).expect(400);
    // Existing catalog values may have been retired since publication.
    const legacyAttributes = { fuel: 'retired-fuel', auto_make: 'bmw', auto_model: 'retired-model', mileage_km: 100 };
    await db.listing.update({ where: { id: car.body.id }, data: { attributes: legacyAttributes } });
    await patch(car.body.id, { attributes: { ...legacyAttributes, mileage_km: 200 } }).expect(200);
    assert.equal((await http().get('/listings/' + car.body.id).expect(200)).body.attributes.mileage_km, 200);
    await patch(car.body.id, { attributes: { ...legacyAttributes, auto_make: 'lada' } }).expect(400);
    await patch(car.body.id, { categoryId: category.id, attributes: legacyAttributes }).expect(400);
    await patch(car.body.id, { attributes: { fuel: 'petrol', auto_make: 'bmw', auto_model: '3-series' } }).expect(200);
    console.log('PASS unchanged legacy catalog values survive editing, changed parent/category cannot reuse them');
    autoChild = await db.category.create({ data: { slug: 'auto-cars-fixture', title: 'Легковые', parentId: autoCategory.id } });
    autoGrandchild = await db.category.create({ data: { slug: 'auto-sedans-fixture', title: 'Седаны', parentId: autoChild.id } });
    const listedCategories = (await http().get('/categories').expect(200)).body;
    assert.equal(listedCategories.find(c => c.id === autoGrandchild.id).rootSlug, 'auto');
    assert.equal(listedCategories.find(c => c.id === autoGrandchild.id).barterAllowed, true);
    assert.deepEqual((await http().get(`/categories/${autoGrandchild.id}/attribute-schema`).expect(200)).body.fields, schema.fields);
    assert.deepEqual((await http().get(`/categories/${autoGrandchild.id}/attribute-options?fieldKey=fuel`).expect(200)).body, rootFuel);
    assert.deepEqual((await http().get(`/categories/${autoGrandchild.id}/attribute-options?fieldKey=auto_model&parentFieldKey=auto_make&parentValue=bmw`).expect(200)).body, bmwModels);
    const sedan = await http().post('/listings').set('x-fixture-user', owner.id).send({
      title: 'Городской седан для обмена', description: 'Седан в хорошем состоянии с проверенной историей.',
      city: 'Краснодар', categoryId: autoGrandchild.id, saleEnabled: true, barterEnabled: true,
      attributes: { fuel: 'petrol', auto_make: 'bmw', auto_model: '3-series' },
    }).expect(201);
    await patch(sedan.body.id, { attributes: { fuel: 'coal' } }).expect(400);
    const petrolFilter = JSON.stringify({ fuel: 'petrol' });
    for (const mode of ['market', 'barter']) {
      const expected = mode === 'market' ? [car.body.id, sedan.body.id].sort() : [sedan.body.id];
      for (const sort of ['relevant', 'new', 'cheap', 'expensive']) {
        const ids = [];
        for (const page of [1, 2]) {
          const response = await http().get('/listings').query({ categoryId: autoCategory.id, attrs: petrolFilter, mode, sort, limit: 1, page }).expect(200);
          assert.deepEqual(response.body.appliedAttrs, { fuel: 'petrol' });
          assert.equal(response.body.total, expected.length);
          ids.push(...response.body.items.map(item => item.id));
        }
        assert.deepEqual(ids.sort(), expected);
      }
    }
    assert.equal((await http().get('/listings').query({ categoryId: autoCategory.id, attrs: JSON.stringify({ fuel: 'electric' }) }).expect(200)).body.total, 0);
    await http().get('/listings').query({ categoryId: autoCategory.id, attrs: JSON.stringify({ fuel: 'coal' }) }).expect(400);
    await http().get('/listings').query({ categoryId: autoCategory.id, attrs: JSON.stringify({ unknown: 'petrol' }) }).expect(400);
    await http().get('/listings').query({ attrs: petrolFilter }).expect(400);
    for (const mode of ['market', 'barter']) {
      for (const sort of ['relevant', 'new', 'cheap', 'expensive']) {
        const results = (await http().get('/listings').query({ categoryId: autoCategory.id, mode, sort, limit: 1, page: 1 }).expect(200)).body;
        assert.equal(results.total, mode === 'market' ? 2 : 1);
        if (mode === 'barter') assert.equal(results.items[0].id, sedan.body.id);
      }
    }
    indexed = true;
    const parentText = (await http().get('/listings').query({ categoryId: autoCategory.id, mode: 'market', q: 'седан', sort: 'relevant' }).expect(200)).body;
    assert(parentText.items.some(x => x.id === sedan.body.id));
    indexed = false;
    console.log('PASS catalog choices endpoint, stored value and rejected unknown choice');
    await db.categoryAttributeField.create({ data: {
      categoryId: autoCategory.id, key: 'auto_make', label: 'Марка', sectionId: 'auto_main', sectionTitle: 'Автомобиль',
    } });
    const concrete = { ...wishes, wantedCategoryIds: [], wantedDescription: '', wantedItems: [
      { categoryId: autoGrandchild.id, attributes: { auto_make: 'bmw', auto_model: '3-series', fuel: 'petrol' } },
    ] };
    assert.equal((await http().get('/listings/capabilities').expect(200)).body.structuredWishesVersion, 1);
    // Previous scenarios have filled all five free active slots. Retire their
    // sale-only fixture before testing creation; keep the production limit intact.
    await db.listing.update({ where: { id: listings[0].id }, data: { status: 'ARCHIVED' } });
    const withWishes = await http().post('/listings').set('x-fixture-user', owner.id).send({
      title: 'Коллекция марок для обмена на автомобиль', description: 'Большая личная коллекция, состав и условия обсудим при встрече.',
      city: 'Краснодар', categoryId: category.id, saleEnabled: false, barterEnabled: true, exchangePreferences: concrete,
    }).expect(res => assert.equal(res.status, 201, JSON.stringify(res.body)));
    assert.deepEqual(withWishes.body.exchangePreferences.wantedItems, concrete.wantedItems);
    await patch(exchange.id, { exchangePreferences: concrete }).expect(200);
    assert.deepEqual((await http().get('/listings/' + exchange.id).expect(200)).body.exchangePreferences, concrete);
    await patch(exchange.id, { priceRub: 777 }).expect(200);
    assert.deepEqual((await http().get('/listings/my').set('x-fixture-user', owner.id).expect(200)).body.find(x => x.id === exchange.id).exchangePreferences, concrete);
    // An old client omits the additive key while updating text/cash.
    const { wantedItems, ...oldClient } = concrete;
    await patch(exchange.id, { exchangePreferences: { ...oldClient, maxCashRub: 20000 } }).expect(200);
    assert.deepEqual((await db.listing.findUniqueOrThrow({ where: { id: exchange.id } })).exchangePreferences.wantedItems, wantedItems);
    for (const badItem of [
      { ...wantedItems[0], categoryId: 'nonexistent' },
      { ...wantedItems[0], categoryId: category.id },
      { ...wantedItems[0], attributes: { auto_model: '3-series' } },
      { ...wantedItems[0], attributes: { auto_make: 'lada', auto_model: '3-series' } },
      { ...wantedItems[0], attributes: { auto_make: 'invented' } },
      { ...wantedItems[0], attributes: { title: 'bmw' } },
    ]) await patch(exchange.id, { exchangePreferences: { ...concrete, wantedItems: [badItem] } }).expect(400);
    await patch(exchange.id, { exchangePreferences: concrete }, outsider).expect(403);
    await patch(exchange.id, { barterEnabled: false, saleEnabled: true }).expect(200);
    assert.deepEqual((await db.listing.findUniqueOrThrow({ where: { id: exchange.id } })).exchangePreferences.wantedItems, wantedItems);
    await patch(exchange.id, { barterEnabled: true, exchangePreferences: { ...concrete, anyOffer: true, wantedItems: [] } }).expect(200);
    assert.deepEqual((await db.listing.findUniqueOrThrow({ where: { id: exchange.id } })).exchangePreferences.wantedItems, []);
    await patch(exchange.id, { exchangePreferences: null }).expect(200);
    console.log('PASS cross-category structured wishes, inherited catalog, exact parents, old client preservation and explicit clearing');
  } finally {
    if (app) await app.close();
    if (owner) {
      const ids = (await db.listing.findMany({ where: { ownerId: owner.id }, select: { id: true } })).map(x => x.id);
      await db.favorite.deleteMany({ where: { listingId: { in: ids } } });
      await db.listingPromotion.deleteMany({ where: { listingId: { in: ids } } });
      await db.listing.deleteMany({ where: { id: { in: ids } } });
    }
    if (category) await db.category.delete({ where: { id: category.id } });
    if (wantedCategory) await db.category.delete({ where: { id: wantedCategory.id } });
    if (autoGrandchild) await db.category.delete({ where: { id: autoGrandchild.id } });
    if (autoChild) await db.category.delete({ where: { id: autoChild.id } });
    if (autoCategory) await db.category.delete({ where: { id: autoCategory.id } });
    await db.user.deleteMany({ where: { id: { in: [owner?.id, outsider?.id].filter(Boolean) } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
