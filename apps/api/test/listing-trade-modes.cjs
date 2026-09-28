const assert = require('node:assert/strict');
require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AuthGuard } = require('@nestjs/passport');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { ListingsService } = require('../dist/listings/listings.service');
const { ListingsController } = require('../dist/listings/listings.controller');
const { MediaStorageService } = require('../dist/storage/media-storage.service');
const { CategoriesController } = require('../dist/categories/categories.controller');
const { CategoriesService } = require('../dist/categories/categories.service');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.pathname, '/barter_message_ci');
  const db = new PrismaClient();
  let app, owner, outsider, category, wantedCategory, autoCategory;
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
    const schema = (await http().get('/categories/' + autoCategory.id + '/attributes').expect(200)).body;
    assert.equal(schema.version, 1);
    assert.equal(schema.fields.length, 4);
    assert(schema.fields.find(f => f.key === 'fuel').options.some(o => o.value === 'diesel'));
    await http().get('/categories/missing/attributes').expect(404);
    const cars = [];
    for (const fuel of ['petrol', 'diesel']) {
      const body = { title: 'Автомобиль ' + fuel, description: 'Исправный автомобиль для ежедневных поездок.', city: 'Краснодар', categoryId: autoCategory.id, priceRub: 500000, latitude: 45, longitude: 39, saleEnabled: true, barterEnabled: true, attributes: { fuel, drive: 'awd' } };
      await http().post('/listings').set('x-fixture-user', owner.id).send({ ...body, attributes: { fuel: 'made-up' } }).expect(400);
      cars.push((await http().post('/listings').set('x-fixture-user', owner.id).send(body).expect(201)).body);
    }
    await db.listingPromotion.create({ data: { listingId: cars[0].id, type: 'VIP', weight: 120, startsAt: new Date(0), endsAt: new Date('2099-01-01') } });
    const attributeFilters = JSON.stringify({ fuel: 'diesel', drive: 'awd' });
    for (const useIndex of [false, true]) {
      indexed = useIndex;
      for (const mode of ['market', 'barter']) for (const sort of ['relevant', 'new', 'cheap', 'expensive', 'nearby']) {
        const query = { categoryId: autoCategory.id, attributeFilters, mode, sort, limit: 1, lat: 45, lon: 39, ...(useIndex ? { q: 'Краснодар' } : {}) };
        const result = (await http().get('/listings').query(query).expect(200)).body;
        assert.equal(result.appliedAttributeFilters, attributeFilters);
        assert.equal(result.total, 1);
        assert.deepEqual(result.items.map(x => x.id), [cars[1].id]);
        assert(!result.vipStrip.some(x => x.id === cars[0].id));
        const second = (await http().get('/listings').query({ ...query, page: 2 }).expect(200)).body;
        assert.equal(second.total, 1);
        assert.equal(second.items.length, 0);
      }
    }
    for (const raw of ['null', '{"fuel":"wrong"}', '{"unknown":"value"}', '{"fuel":1}']) {
      await http().get('/listings').query({ categoryId: autoCategory.id, attributeFilters: raw }).expect(400);
    }
    await http().get('/listings').query({ attributeFilters }).expect(400);
    await patch(cars[1].id, { attributes: { fuel: 'wrong' } }).expect(400);
    await patch(cars[1].id, { attributes: { fuel: 'electric', drive: 'fwd' } }).expect(200);
    assert.equal((await http().get('/listings/' + cars[1].id).expect(200)).body.attributes.fuel, 'electric');
    await db.listing.update({ where: { id: cars[0].id }, data: { attributes: { fuel: 'Legacy fuel' } } });
    await patch(cars[0].id, { attributes: { fuel: 'Legacy fuel', mileage: 100 } }).expect(200);
    await patch(cars[0].id, { attributes: { fuel: 'Different legacy' } }).expect(400);
    console.log('PASS shared catalog schema, strict writes, legacy edit preservation, filters before paging/VIP/stale index in both modes');
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
    if (autoCategory) await db.category.delete({ where: { id: autoCategory.id } });
    await db.user.deleteMany({ where: { id: { in: [owner?.id, outsider?.id].filter(Boolean) } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
