import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const webRequire = createRequire(join(webRoot, 'package.json'));
const browserRequire = createRequire(join(process.env.BARTER_BROWSER_TOOLS, 'package.json'));
const { chromium, webkit, expect } = browserRequire('@playwright/test');
const baseURL = 'http://127.0.0.1:3201';
const output = join(webRoot, 'test-results/listings-layout');
await mkdir(output, { recursive: true });
const serverLogs = [];
const server = spawn(process.execPath, [webRequire.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', '3201'], {
  cwd: webRoot, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', chunk => serverLogs.push(chunk.toString()));
server.stderr.on('data', chunk => serverLogs.push(chunk.toString()));
const results = [];
const shots = [];
const delay = ms => new Promise(done => setTimeout(done, ms));


async function assertArtwork(bytes, fill, transparent = false, maskable = false) {
  const sharp = webRequire('sharp');
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, right = -1, top = info.height, bottom = -1;
  let blue = 0, orange = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    const [r, g, b, a] = data.subarray(i, i + 4);
    if (!transparent) assert.equal(a, 255, 'home icon must be opaque');
    if (a < 64 || Math.max(r, g, b) - Math.min(r, g, b) < 50) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
    if (b > r) blue++; else orange++;
    if (maskable) assert(Math.hypot(x + 0.5 - info.width / 2, y + 0.5 - info.height / 2) < info.width * 0.4,
      'all colored pixels stay inside the maskable safe circle');
  }
  assert(blue > 0 && orange > 0, 'both complete color shapes are present');
  assert(left > 0 && top > 0 && right < info.width - 1 && bottom < info.height - 1, 'artwork never touches a cut edge');
  assert(Math.abs((bottom - top + 1) / info.height - fill) < 0.05, 'visible mark occupies the intended height');
  assert(Math.abs((left + right + 1) / 2 - info.width / 2) <= 1.5, 'horizontal centering');
  assert(Math.abs((top + bottom + 1) / 2 - info.height / 2) <= 1.5, 'vertical centering');
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error('Next server exited: ' + serverLogs.join(''));
    try {
      const res = await fetch(baseURL + '/profile/settings', { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {}
    await delay(500);
  }
  throw new Error('Next server did not start');
}


const category = { id: 'fixture-category', title: 'Электроника', slug: 'electronics', parentId: null };
const categorySchema = { version: 1, optionsQueryVersion: 1, fields: [
  { key: 'condition', label: 'Состояние', sectionId: 'condition_delivery', sectionTitle: 'Состояние и сделка', fieldType: 'select', parentKey: null },
] };
const conditionOptions = [{ fieldKey: 'condition', value: 'used_good', label: 'Б/у — хорошее' }];
const autoCategory = { id: 'fixture-auto', title: 'Авто', slug: 'auto', parentId: null };
const autoSchema = { version: 2, optionsQueryVersion: 1, fields: [
  { key: 'auto_make', label: 'Марка', sectionId: 'auto_main', sectionTitle: 'Автомобиль', fieldType: 'select', parentKey: null },
  { key: 'auto_model', label: 'Модель', sectionId: 'auto_main', sectionTitle: 'Автомобиль', fieldType: 'select', parentKey: 'auto_make' },
  { key: 'auto_generation', label: 'Поколение', sectionId: 'auto_main', sectionTitle: 'Автомобиль', fieldType: 'select', parentKey: 'auto_model' },
] };
const autoOptions = [
  { fieldKey: 'auto_make', value: 'bmw', label: 'BMW' }, { fieldKey: 'auto_make', value: 'lada', label: 'Lada' },
  { fieldKey: 'auto_model', value: 'bmw/3', label: '3 Series', parentFieldKey: 'auto_make', parentValue: 'bmw' },
  { fieldKey: 'auto_generation', value: 'bmw/3/gen-5', label: 'V (семейство E90)', parentFieldKey: 'auto_model', parentValue: 'bmw/3' },
  { fieldKey: 'auto_model', value: 'lada/vesta', label: 'Vesta', parentFieldKey: 'auto_make', parentValue: 'lada' },
];
const serverUnexpected = [];
// Home is server-rendered: its API must also stay on an isolated loopback fixture.
assert(!process.env.NEXT_PUBLIC_API_URL, 'Run this suite without a public API override');
const api = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3001');
  let data;
  if (req.method === 'GET' && url.pathname === '/categories') data = [category];
  else if (req.method === 'GET' && url.pathname === '/categories/fixture-category/attribute-options') data = url.searchParams.get('fieldKey') === 'condition' ? conditionOptions : [];
  else if (req.method === 'GET' && url.pathname === '/categories/fixture-category/attribute-schema') data = categorySchema;
  else if (req.method === 'GET' && url.pathname === '/listings/my') data = fixture('light').listings;
  else if (req.method === 'GET' && url.pathname === '/listings') data = {
    appliedMode: url.searchParams.get('mode') || 'market', ...(url.searchParams.has('attrs') ? { appliedAttrs: JSON.parse(url.searchParams.get('attrs')) } : {}), page: 1, limit: 20, total: 0, items: [], vipStrip: [],
  };
  else if (req.method === 'GET' && /^\/listings\/fixture-(needs|pending|sold|created)\/similar$/.test(url.pathname)) data = [];
  else if (req.method === 'GET' && /^\/listings\/fixture-(needs|pending|sold|created)$/.test(url.pathname)) {
    // Next Link prefetch also requests listing metadata through the server API.
    const listing = fixture('light').listings.find(x => url.pathname === '/listings/' + x.id) ?? { ...fixture('light').listings[0], id: 'fixture-created', saleEnabled: false, barterEnabled: true };
    data = { ...listing, description: 'Описание тестового объявления.', owner: { id: 'fixture-seller', name: 'Тестовый продавец', email: null, phone: null } };
  }
  else { serverUnexpected.push(req.method + ' ' + url.pathname); res.statusCode = 404; data = {}; }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
});
await new Promise((resolve, reject) => { api.once('error', reject); api.listen(3001, '127.0.0.1', resolve); });

function fixture(theme) {
  const image = { id: 'fixture-photo', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#dce6ef"/></svg>'), sortOrder: 0 };
  const base = { priceRub: 588, city: 'Краснодар', category, activePromotion: null, attributes: {}, createdAt: '2026-09-14T12:00:00.000Z' };
  return {
    user: { id: 'fixture-seller', email: 'seller@example.test', name: 'Тестовый продавец', appTheme: theme.toUpperCase() },
    listings: [
      { ...base, id: 'fixture-needs', title: 'ФотоаппаратСОченьДлиннымНазванием'.repeat(4), status: 'ACTIVE', images: [] },
      { ...base, id: 'fixture-pending', title: 'На модерации', status: 'PENDING', images: [image] },
      { ...base, id: 'fixture-sold', title: 'Проданное объявление', status: 'SOLD', duplicateImageFlag: true, images: [image] },
    ],
    writes: [], unexpected: [], catalogReads: [], catalogSearchReads: [], failListings: false, guest: false,
  };
}

const packages = [{ id: 'fixture-package', code: 'lift', title: 'Поднятие x2', description: 'Тестовый пакет',
  promotionType: 'LIFT', weightMultiplier: 2, durationSec: 86400, priceRub: 19, priceKopecks: 1900, isBundle: false, audience: 'PERSONAL', sortOrder: 1 }];
const plans = [
  { id: 'start', code: 'start', title: 'Старт', listingsLimit: 25, priceRubPerMonth: 990 },
  { id: 'pro', code: 'pro', title: 'Профи', listingsLimit: 200, priceRubPerMonth: 2990 },
  { id: 'business', code: 'business', title: 'Бизнес', listingsLimit: null, priceRubPerMonth: 5990 },
];

async function installFixture(context, state, theme) {
  await context.addInitScript(({ theme }) => {
    localStorage.setItem('barter_token', 'isolated-ui-fixture');
    localStorage.setItem('barter_theme_pref', theme.toUpperCase());
  }, { theme });
  await context.routeWebSocket(/.*/, socket => socket.close());
  await context.route(url => url.hostname !== '127.0.0.1' || url.pathname.startsWith('/api/backend/') ||
    ['/auth/me', '/auth/logout', '/chats'].includes(url.pathname) || url.pathname.startsWith('/socket.io'), async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') {
      state.unexpected.push('External request: ' + url.origin);
      return route.abort();
    }
    const path = url.pathname.replace(/^\/api\/backend/, '');
    if (!url.pathname.startsWith('/api/backend/') && !['/auth/me', '/chats'].includes(path) && !path.startsWith('/socket.io')) return route.continue();
    const method = request.method();
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (path.startsWith('/socket.io')) return json({}, 400);
    if (path === '/auth/me') return state.guest || !request.headers().authorization ? json({}, 401) : json(state.user);
    if (method === 'PATCH' && path.startsWith('/listings/fixture-')) {
      const body = request.postDataJSON();
      const listing = state.listings.find(x => path === '/listings/' + x.id || path === '/listings/' + x.id + '/status');
      assert(listing, 'Unknown mutation target');
      state.writes.push({ path, body });
      if (body.publishFromModeration) listing.status = 'ACTIVE';
      else {
        Object.assign(listing, body);
        if (body.categoryId) listing.category = [category, autoCategory].find(c => c.id === body.categoryId);
      }
      return json(listing);
    }
    if (method === 'POST' && path === '/listings') {
      const body = request.postDataJSON();
      state.writes.push({ path, body });
      return json({ ...body, id: 'fixture-created', category, images: [] }, 201);
    }
    if (method !== 'GET') {
      state.unexpected.push(method + ' ' + path);
      return json({ message: 'Unexpected fixture mutation' }, 405);
    }
    if (path === '/listings/capabilities') return json(state.oldApi ? null : { tradeModesVersion: 1, exchangePreferencesVersion: 1, ...(state.oldWishesApi ? {} : { structuredWishesVersion: 1 }) });
    if (path === '/categories') return json([category, autoCategory]);
    if (path === '/categories/fixture-auto/attribute-schema') return state.failCatalog ? json({}, 503) : json(autoSchema);
    if (path === '/categories/fixture-auto/attribute-options') return json(autoOptions.filter(option =>
      option.fieldKey === url.searchParams.get('fieldKey') && (!option.parentValue || option.parentValue === url.searchParams.get('parentValue'))));
    if (path === '/categories/fixture-category/attribute-options') {
      state.catalogReads.push(url.searchParams.get('fieldKey'));
      return json(url.searchParams.get('fieldKey') === 'condition' ? conditionOptions : []);
    }
    if (path === '/categories/fixture-category/attribute-schema') return json(categorySchema);
    if (path === '/listings') {
      state.catalogSearchReads.push(url.searchParams.get('attrs'));
      return json({ appliedMode: url.searchParams.get('mode') || 'market',
        ...(url.searchParams.has('attrs') ? { appliedAttrs: JSON.parse(url.searchParams.get('attrs')) } : {}),
        page: 1, limit: 20, total: 0, items: [], vipStrip: [] });
    }
    if (path === '/listings/my') return state.failListings ? json({}, 503) : json(state.listings);
    if (path === '/wallet/packages') return json(packages);
    if (path === '/wallet/pro-plans') return json(plans);
    if (path === '/wallet/pro/subscription') return json(null);
    if (path === '/wallet/balance') return state.guest ? json({}, 401) : json({ balanceKopecks: 0, balanceRub: 0, updatedAt: '2026-09-26T12:00:00Z' });
    if (path === '/wallet/transactions') return json([]);
    if (path === '/chats' || path === '/support/faq') return json([]);
    state.unexpected.push(method + ' ' + path);
    return json({}, 404);
  });
}

async function contained(locator) {
  const result = await locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    const clipped = [];
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const p = parent.getBoundingClientRect();
      if (/hidden|clip|auto|scroll/.test(style.overflowX) && (r.left < p.left - 1 || r.right > p.right + 1)) clipped.push(parent.tagName + ':x');
      if (/hidden|clip|auto|scroll/.test(style.overflowY) && (r.top < p.top - 1 || r.bottom > p.bottom + 1)) clipped.push(parent.tagName + ':y');
    }
    return { width: r.width, height: r.height, left: r.left, right: r.right, viewport: innerWidth, clipped };
  });
  assert(result.left >= -1 && result.right <= result.viewport + 1, JSON.stringify(result));
  assert.deepEqual(result.clipped, [], 'clipped element: ' + JSON.stringify(result));
  return result;
}


async function spacingCheck(page, width, alignHeader = true) {
  // During hydration the wallet can briefly render both its loading and loaded
  // shells. Measure only after the transition has settled.
  await expect(page.locator('.page-content-spacing')).toHaveCount(1);
  const metrics = await page.locator('.page-content-spacing').evaluate(el => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    const header = document.querySelector('header > div');
    const h = header?.getBoundingClientRect(), hs = header && getComputedStyle(header);
    return { left: r.left + parseFloat(s.paddingLeft), right: r.right - parseFloat(s.paddingRight),
      gutter: parseFloat(s.paddingLeft), bottom: parseFloat(s.paddingBottom),
      bodyBottom: parseFloat(getComputedStyle(document.body).paddingBottom),
      headerLeft: h && h.left + parseFloat(hs.paddingLeft),
      headerRight: h && h.right - parseFloat(hs.paddingRight),
      overflow: document.documentElement.scrollWidth > innerWidth };
  });
  assert.equal(metrics.gutter, width < 768 ? 16 : 24, JSON.stringify(metrics));
  assert.equal(metrics.bottom, width < 768 ? 116 : 40, JSON.stringify(metrics));
  assert.equal(metrics.bodyBottom, 0, 'no second body reserve: ' + JSON.stringify(metrics));
  assert.equal(metrics.overflow, false, 'horizontal page overflow');
  if (alignHeader) {
    assert(Math.abs(metrics.left - metrics.headerLeft) <= 1, 'left rail: ' + JSON.stringify(metrics));
    assert(Math.abs(metrics.right - metrics.headerRight) <= 1, 'right rail: ' + JSON.stringify(metrics));
  }
}

async function bottomClearanceCheck(page, width) {
  if (width >= 768) return;
  await page.locator('.page-content-spacing').evaluate(el => el.scrollIntoView({ block: 'end' }));
  const geometry = await page.evaluate(() => {
    const content = document.querySelector('.page-content-spacing');
    const last = content.lastElementChild.getBoundingClientRect();
    const nav = document.querySelector('.magic-nav').getBoundingClientRect();
    return { contentBottom: last.bottom, bubbleTop: nav.top - 20 };
  });
  assert(geometry.contentBottom <= geometry.bubbleTop - 16, 'last content can clear the hub: ' + JSON.stringify(geometry));
}

async function headerCheck(page) {
  await expect(page.locator('header:visible')).toHaveCount(1);
  const title = page.locator('header:visible h1');
  await expect(title).toHaveText('Мои объявления');
  const style = await title.evaluate(el => ({ font: getComputedStyle(el).fontSize, weight: getComputedStyle(el).fontWeight }));
  assert.deepEqual(style, { font: '18px', weight: '600' });
  const box = await page.locator('header:visible').boundingBox();
  assert(box.height >= 64);
  await contained(page.getByRole('navigation', { name: 'Статусы объявлений' }));
}

async function shot(page, key, scrollTarget) {
  if (scrollTarget) await scrollTarget.scrollIntoViewIfNeeded();
  else await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(output, key + '.png'), animations: 'disabled', fullPage: true });
  const preview = await page.screenshot({ type: 'jpeg', quality: 70, animations: 'disabled' });
  if (key.includes('-440-')) shots.push({ key, image: preview.toString('base64') });
}


async function scenario(browserType, width, theme) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 956 : 1000 },
    isMobile: width < 768, hasTouch: width < 768, colorScheme: theme, deviceScaleFactor: 1,
    reducedMotion: 'reduce', serviceWorkers: 'block' });
  const state = fixture(theme);
  await installFixture(context, state, theme);
  let page;
  const errors = [];
  const failedRequests = [];
  const pendingRsc = new Set();
  let documentTransition = null;
  const navigationDiagnostics = [];
  const onError = e => {
    const item = { message: e.message, url: page.url(), transition: documentTransition };
    // WebKit reports cancelled native RSC fetches as pageerror during document
    // replacement. Retain these diagnostics; never allow this exception during UI actions.
    if (browserType.name() === 'webkit' && documentTransition &&
        /^\/127\.0\.0\.1:3201\/[^\s]*[?&]_rsc=[^\s]+ due to access control checks\.$/.test(e.message)) {
      navigationDiagnostics.push(item);
    } else errors.push(item);
  };
  async function visit(path) {
    // These are independent screen scenarios, not cross-document navigation tests.
    // Stop observing only when deliberately disposing the previous test document.
    if (page) { page.off('pageerror', onError); await page.close(); }
    pendingRsc.clear();
    page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', onError);
    page.on('request', request => { if (new URL(request.url()).searchParams.has('_rsc')) pendingRsc.add(request); });
    page.on('requestfinished', request => pendingRsc.delete(request));
    page.on('requestfailed', request => {
      pendingRsc.delete(request);
      failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
    });
    await page.goto(baseURL + path);
  }
  const key = browserType.name() + '-' + width + '-' + theme;
  const checks = [];
  try {
    documentTransition = 'server redirect';
    await visit('/profile/listings?tab=SOLD');
    await expect(page).toHaveURL(/\/listings\?tab=COMPLETED/);
    await expect(page.getByRole('heading', { name: 'Завершённые объявления', exact: true })).toBeVisible();
    documentTransition = null;
    await visit('/listings?tab=NEEDS_ACTION');
    await expect(page.getByRole('heading', { name: 'Требуют внимания', exact: true })).toBeVisible();
    await headerCheck(page);
    await spacingCheck(page, width);
    let tabs = page.getByRole('navigation', { name: 'Статусы объявлений' });
    await expect(tabs.getByRole('button', { name: 'Внимание 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(tabs.getByRole('button', { name: 'Завершены 1', exact: true })).toBeVisible();
    for (const button of await tabs.getByRole('button').all()) { const box = await contained(button); assert(box.height >= 44); }
    const card = page.locator('main li').filter({ hasText: state.listings[0].title });
    await contained(card);
    await expect(card.getByRole('button', { name: 'Нет ни одного фото' })).toHaveCount(0);
    await shot(page, key + '-listings');
    checks.push('shared header, equal tabs, long title, completed item excluded from attention');

    await card.locator('summary').click();
    await card.getByRole('button', { name: 'Редактировать', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Название', { exact: true })).toHaveValue(state.listings[0].title);
    await page.getByLabel('Состояние', { exact: true }).selectOption('used_good');
    const exchangeOnly = page.getByRole('radio', { name: /^Только обмен/ });
    await exchangeOnly.check();
    await page.getByLabel('Пожелания к обмену', { exact: true }).fill('Рассмотрю фотоаппарат или велосипед');
    await page.getByLabel('Могу доплатить', { exact: true }).check();
    await page.getByLabel('Моя доплата до, ₽', { exact: true }).fill('15000');
    await page.getByLabel('Готов принять доплату', { exact: true }).check();
    await expect(page.getByLabel('Оценочная стоимость, ₽')).toBeVisible();
    // An old backend must not silently discard the new mode fields.
    state.oldApi = true;
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('поддержку режимов');
    assert.equal(state.writes.length, 0);
    state.oldApi = false;
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.equal(state.writes.at(-1).body.saleEnabled, false);
    assert.equal(state.writes.at(-1).body.barterEnabled, true);
    await visit('/listings?tab=NEEDS_ACTION');
    let edited = page.locator('main li').filter({ hasText: state.listings[0].title });
    tabs = page.getByRole('navigation', { name: 'Статусы объявлений' });
    await edited.locator('summary').click();
    await edited.getByRole('button', { name: 'Редактировать', exact: true }).click();
    await expect(page.getByRole('radio', { name: /^Только обмен/ })).toBeChecked();
    await expect(page.getByLabel('Состояние', { exact: true })).toHaveValue('used_good');
    await expect(page.getByLabel('Пожелания к обмену', { exact: true })).toHaveValue('Рассмотрю фотоаппарат или велосипед');
    await expect(page.getByLabel('Моя доплата до, ₽', { exact: true })).toHaveValue('15000');
    await expect(page.getByLabel('Готов принять доплату', { exact: true })).toBeChecked();
    await shot(page, key + '-trade-mode');
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
    state.writes.length = 0;
    checks.push('exchange-only edit persists after reload; old API cannot silently accept it');
    await visit('/listings?tab=NEEDS_ACTION');
    edited = page.locator('main li').filter({ hasText: state.listings[0].title });
    await edited.locator('summary').click();
    await edited.getByRole('button', { name: 'Редактировать', exact: true }).click();
    state.failCatalog = true;
    assert.equal(await page.getByLabel('Категория', { exact: true }).evaluate(el => getComputedStyle(el).colorScheme), theme);
    await page.getByLabel('Категория', { exact: true }).selectOption(autoCategory.id);
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Не удалось загрузить');
    await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toBeDisabled();
    state.failCatalog = false;
    await page.getByRole('button', { name: 'Повторить загрузку характеристик' }).click();
    await page.getByRole('combobox', { name: 'Марка', exact: true }).selectOption('bmw');
    await page.getByRole('combobox', { name: 'Модель', exact: true }).selectOption('bmw/3');
    await page.getByRole('combobox', { name: 'Поколение', exact: true }).selectOption('bmw/3/gen-5');
    await page.getByRole('combobox', { name: 'Марка', exact: true }).selectOption('lada');
    await expect(page.getByRole('combobox', { name: 'Модель', exact: true })).toHaveValue('');
    await expect(page.getByRole('combobox', { name: 'Поколение', exact: true })).toHaveValue('');
    await page.getByRole('combobox', { name: 'Модель', exact: true }).selectOption('lada/vesta');
    await shot(page, key + '-auto-editor', page.getByRole('combobox', { name: 'Модель', exact: true }));
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.deepEqual(state.writes.at(-1).body.attributes, { auto_make: 'lada', auto_model: 'lada/vesta', isBarter: true });
    await visit('/listings?tab=NEEDS_ACTION');
    const autoCard = page.locator('main li').filter({ hasText: state.listings[0].title });
    tabs = page.getByRole('navigation', { name: 'Статусы объявлений' });
    await autoCard.locator('summary').click();
    await autoCard.getByRole('button', { name: 'Редактировать', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Модель', exact: true })).toHaveValue('lada/vesta');
    await page.getByRole('combobox', { name: 'Модель', exact: true }).selectOption('');
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.equal(state.writes.at(-1).body.attributes.auto_model, undefined);
    state.writes.length = 0;
    checks.push('editor catalog failure/retry, category reset, dependent selection, reload and clearing');
    await autoCard.getByRole('button', { name: 'Редактировать', exact: true }).click();
    await page.getByRole('button', { name: 'Добавить конкретное пожелание', exact: true }).click();
    let wish = page.getByRole('group', { name: 'Конкретное пожелание 1', exact: true });
    state.failCatalog = true;
    await wish.getByLabel('Категория желаемой вещи', { exact: true }).selectOption(autoCategory.id);
    await expect(wish.getByRole('alert')).toContainText('Не удалось загрузить');
    await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toBeDisabled();
    state.failCatalog = false;
    await wish.getByRole('button', { name: 'Повторить загрузку пожелания' }).click();
    await wish.getByRole('combobox', { name: 'Марка', exact: true }).selectOption('bmw');
    await wish.getByRole('combobox', { name: 'Модель', exact: true }).selectOption('bmw/3');
    await wish.getByRole('combobox', { name: 'Марка', exact: true }).selectOption('lada');
    await expect(wish.getByRole('combobox', { name: 'Модель', exact: true })).toHaveValue('');
    await wish.getByRole('combobox', { name: 'Модель', exact: true }).selectOption('lada/vesta');
    await shot(page, key + '-structured-wish', wish.getByRole('combobox', { name: 'Модель', exact: true }));
    state.oldWishesApi = true;
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('не поддерживает конкретные пожелания');
    assert.equal(state.writes.length, 0, 'old API cannot silently drop structured wishes');
    state.oldWishesApi = false;
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.deepEqual(state.writes.at(-1).body.exchangePreferences.wantedItems, [{ categoryId: autoCategory.id, attributes: { auto_make: 'lada', auto_model: 'lada/vesta' } }]);
    await visit('/listings?tab=NEEDS_ACTION');
    const wishedCard = page.locator('main li').filter({ hasText: state.listings[0].title });
    await wishedCard.locator('summary').click();
    await wishedCard.getByRole('button', { name: 'Редактировать', exact: true }).click();
    wish = page.getByRole('group', { name: 'Конкретное пожелание 1', exact: true });
    await expect(wish.getByRole('combobox', { name: 'Модель', exact: true })).toHaveValue('lada/vesta');
    await wish.getByRole('button', { name: 'Удалить пожелание 1', exact: true }).click();
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.deepEqual(state.writes.at(-1).body.exchangePreferences.wantedItems, []);
    state.writes.length = 0;
    tabs = page.getByRole('navigation', { name: 'Статусы объявлений' });
    checks.push('structured wishes: failure/retry, parent reset, old API guard, persisted reload and explicit removal');
    const pending = page.locator('main li').filter({ hasText: 'На модерации' });
    await pending.locator('summary').click();
    await pending.getByRole('button', { name: 'Подтвердить публикацию', exact: true }).click();
    await expect(pending).toHaveCount(0);
    assert.deepEqual(state.writes, [{ path: '/listings/fixture-pending', body: { publishFromModeration: true } }]);
    checks.push('editor opens without mutation; pending publication uses existing handler');

    await tabs.getByRole('button', { name: 'Завершены 1', exact: true }).click();
    await expect(page).toHaveURL(/tab=COMPLETED/);
    await expect.poll(() => pendingRsc.size, { timeout: 12000, message: 'RSC prefetch must finish before reload' }).toBe(0);
    documentTransition = 'explicit reload';
    await page.reload();
    await page.waitForLoadState('load');
    const sold = page.locator('main li').filter({ hasText: 'Проданное объявление' });
    await expect(sold).toBeVisible();
    documentTransition = null;
    await sold.locator('summary').click();
    await sold.getByRole('button', { name: 'Вернуть в активные', exact: true }).click();
    await expect(sold).toHaveCount(0);
    assert.deepEqual(state.writes.at(-1), { path: '/listings/fixture-sold/status', body: { status: 'ACTIVE' } });
    await tabs.getByRole('button', { name: 'Активные 1', exact: true }).click();
    await expect(page).toHaveURL(/tab=ACTIVE/);
    await page.goBack();
    await expect(page).toHaveURL(/tab=COMPLETED/);
    await expect(tabs.getByRole('button', { name: 'Завершены 0', exact: true })).toHaveAttribute('aria-pressed', 'true');
    checks.push('completed restore, reload and browser history');

    await tabs.getByRole('button', { name: 'Активные 1', exact: true }).click();
    const active = page.locator('main li').filter({ hasText: 'На модерации' });
    await active.locator('summary').click();
    await active.getByRole('button', { name: 'Продвинуть', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Продвинуть', exact: true })).toBeDisabled();
    await expect(dialog.getByRole('link', { name: 'Открыть кошелёк', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    assert.equal(state.writes.length, 2);
    checks.push('shared promotion chooser opens without payment');

    await visit('/pricing');
    const badge = page.getByText('Рекомендуем', { exact: true });
    await expect(badge).toBeVisible();
    await spacingCheck(page, width);
    const sectionMargins = await page.locator('.page-content-spacing > section').evaluateAll(els => els.map(el => parseFloat(getComputedStyle(el).marginTop)));
    assert.deepEqual(sectionMargins, Array(3).fill(width < 768 ? 32 : 48));
    await badge.scrollIntoViewIfNeeded();
    await contained(badge);
    const planCard = badge.locator('xpath=..');
    const badgeBox = await badge.boundingBox();
    const planBox = await planCard.boundingBox();
    assert(badgeBox.y >= planBox.y && badgeBox.y + badgeBox.height <= planBox.y + planBox.height);
    await shot(page, key + '-pricing', planCard);
    await shot(page, key + '-pricing-top');
    await bottomClearanceCheck(page, width);
    await shot(page, key + '-pricing-bottom', page.locator('.page-content-spacing > section').last());
    await expect(page.getByRole('link', { name: 'Применить', exact: true }).first()).toHaveAttribute('href', '/listings');
    checks.push('pricing header/content rails, 32/48 section rhythm, recommended badge inside card');
    await visit('/wallet');
    await expect(page.getByText('Операций пока нет.', { exact: true })).toBeVisible();
    await spacingCheck(page, width);
    await shot(page, key + '-wallet');
    await bottomClearanceCheck(page, width);
    state.guest = true;
    await visit('/wallet');
    await expect(page.getByText('Кошелёк недоступен', { exact: true })).toBeVisible();
    await spacingCheck(page, width);
    state.guest = false;
    checks.push('wallet populated and guest states keep the same content rails');


    await visit('/?mode=market&sort=new');
    const logo = page.getByRole('link', { name: 'Бартер — на главную', exact: true }).filter({ visible: true });
    await expect(logo).toBeVisible();
    await expect(logo).toContainText('БАРТЕР');
    await expect(logo.locator('img')).toHaveJSProperty('complete', true);
    assert(await logo.locator('img').evaluate(img => img.naturalWidth > 0));
    await contained(logo);
    await contained(logo.locator('img'));
    const markBox = await logo.locator('img').boundingBox();
    const wordBox = await logo.locator('span').last().boundingBox();
    assert(markBox.x + markBox.width <= wordBox.x, 'wordmark must not overlap the mark');
    assert(Math.abs(markBox.y + markBox.height / 2 - wordBox.y - wordBox.height / 2) < 1,
      'mark and name share a vertical center');
    const markResponse = await page.request.get(baseURL + '/brand/bubble-b-v2/mark.png');
    assert.equal(markResponse.status(), 200);
    await assertArtwork(await markResponse.body(), 0.94, true);
    const apple = page.locator('link[rel="apple-touch-icon"]');
    await expect(apple).toHaveCount(1);
    const appleHref = await apple.getAttribute('href');
    assert.equal(appleHref, '/brand/bubble-b-v2/apple-touch-icon.png');
    const appleResponse = await page.request.get(baseURL + appleHref);
    assert.equal(appleResponse.status(), 200);
    const appleBytes = await appleResponse.body();
    assert.equal(appleBytes.readUInt32BE(16), 180);
    assert.equal(appleBytes.readUInt32BE(20), 180);
    await assertArtwork(appleBytes, 0.84);
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifestResponse = await page.request.get(baseURL + manifestHref);
    assert.equal(manifestResponse.status(), 200);
    const manifest = await manifestResponse.json();
    assert.equal(manifest.short_name, 'БАРТЕР');
    assert.equal(manifest.display, 'standalone');
    assert(manifest.icons.some(icon => icon.purpose === 'maskable' && icon.sizes === '512x512'));
    for (const icon of manifest.icons) {
      const response = await page.request.get(baseURL + icon.src);
      assert.equal(response.status(), 200);
      const bytes = await response.body();
      const [w, h] = icon.sizes.split('x').map(Number);
      assert.equal(bytes.readUInt32BE(16), w);
      assert.equal(bytes.readUInt32BE(20), h);
      await assertArtwork(bytes, icon.purpose === 'maskable' ? 0.60 : 0.84, false, icon.purpose === 'maskable');
    }
    assert.equal(await page.locator('link[href="/favicon.svg"]').count(), 0);
    for (const link of await page.locator('link[rel="icon"]').all()) {
      const href = await link.getAttribute('href');
      assert(href.startsWith('/brand/bubble-b-v2/'), 'no stale icon candidate');
      const res = await page.request.get(baseURL + href);
      assert.equal(res.status(), 200);
      await assertArtwork(await res.body(), 0.84);
    }
    if (key.includes('440')) console.log('BARTER_APPLE_ICON_IMAGE ' + appleBytes.toString('base64'));
    checks.push('full mark bounds, alignment, larger Apple/PWA artwork and maskable safe circle');
    const toggle = page.getByRole('navigation', { name: 'Маркет или Бартер' });
    for (const mode of ['market', 'barter']) {
      const label = mode === 'market' ? 'Маркет' : 'Бартер';
      await toggle.getByRole('link', { name: label, exact: true }).click();
      await expect(toggle.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(page).toHaveURL(new RegExp('mode=' + mode));
      assert(new URL(page.url()).searchParams.get('sort') === 'new');
      const box = await contained(toggle);
      assert(Math.abs((box.left + box.right) / 2 - width / 2) <= 1, 'toggle is not centered: ' + JSON.stringify(box));
      const selected = await toggle.getByRole('link', { name: label, exact: true }).boundingBox();
      const pill = await toggle.locator('span[aria-hidden]').boundingBox();
      assert(Math.abs(pill.x + pill.width / 2 - selected.x - selected.width / 2) <= 2, 'selected pill is off-center');
    }
    await spacingCheck(page, width, false);
    await shot(page, key + '-catalog');
    await visit('/search');
    const searchToggle = page.getByRole('navigation', { name: 'Маркет или Бартер' });
    await expect(searchToggle).toBeVisible();
    await spacingCheck(page, width);
    await shot(page, key + '-search');
    const searchBox = await contained(searchToggle);
    assert(Math.abs((searchBox.left + searchBox.right) / 2 - width / 2) <= 1, 'search toggle is off-center');
    checks.push('catalog and search centered, selected pill aligned, sort preserved');
    if (width === 360 || width === 1280) {
      await visit('/search?categoryId=fixture-category&mode=market');
      await page.getByRole('button', { name: /^Фильтры/ }).click();
      await page.getByRole('dialog').getByLabel('Состояние').selectOption('used_good');
      await page.getByRole('button', { name: 'Показать результаты' }).click();
      await expect(page).toHaveURL(/attrs=/);
      await expect(page.getByText('Характеристики · 1')).toBeVisible();
      await page.getByRole('navigation', { name: 'Маркет или Бартер' }).getByRole('link', { name: 'Бартер' }).click();
      await expect(page).toHaveURL(/attrs=/);
      assert(state.catalogSearchReads.includes(JSON.stringify({ condition: 'used_good' })), 'mode search keeps selected catalog option');
      checks.push('catalog filter uses schema option and survives Market/Barter switch');
      await visit('/search?categoryId=fixture-auto&mode=market');
      await page.getByRole('button', { name: /^Фильтры/ }).click();
      let filters = page.getByRole('dialog');
      await filters.getByLabel('Марка', { exact: true }).selectOption('bmw');
      await filters.getByLabel('Модель', { exact: true }).selectOption('bmw/3');
      await filters.getByLabel('Поколение', { exact: true }).selectOption('bmw/3/gen-5');
      await page.getByRole('button', { name: 'Показать результаты' }).click();
      await expect(page).toHaveURL(/gen-5/);
      await page.getByRole('button', { name: /^Фильтры/ }).click();
      filters = page.getByRole('dialog');
      await expect(filters.getByLabel('Поколение', { exact: true })).toHaveValue('bmw/3/gen-5');
      await filters.getByLabel('Марка', { exact: true }).selectOption('lada');
      await page.getByRole('button', { name: 'Показать результаты' }).click();
      await expect(page).not.toHaveURL(/gen-5/);
      checks.push('generation filter persists and changing make clears every descendant');
    }

    state.failListings = true;
    await visit('/listings');
    await expect(page.getByRole('heading', { name: 'Не удалось загрузить объявления' })).toBeVisible();
    state.failListings = false;
    await page.getByRole('button', { name: 'Повторить', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Активные объявления', exact: true })).toBeVisible();
    if (width === 360 || width === 1280) {
      await visit('/new');
      await page.getByPlaceholder('iPhone 14 Pro Max 256 ГБ').fill('iPhone для обмена');
      await page.getByRole('button', { name: 'Электроника', exact: true }).first().click();
      await page.getByRole('button', { name: 'Далее', exact: true }).click();
      await page.getByRole('radio', { name: /^Только обмен/ }).check();
      await page.getByLabel('Оценочная стоимость, ₽').fill('18000');
      await page.getByLabel('Рассмотрю любые предложения', { exact: true }).uncheck();
      await page.getByLabel('Пожелания к обмену', { exact: true }).fill('Фотоаппарат с объективом');
      await page.getByLabel('Могу доплатить', { exact: true }).check();
      await page.getByLabel('Моя доплата до, ₽', { exact: true }).fill('5000');
      await page.getByRole('button', { name: 'Добавить конкретное пожелание', exact: true }).click();
      const newWish = page.getByRole('group', { name: 'Конкретное пожелание 1', exact: true });
      await newWish.getByLabel('Категория желаемой вещи', { exact: true }).selectOption(autoCategory.id);
      await newWish.getByRole('combobox', { name: 'Марка', exact: true }).selectOption('bmw');
      await newWish.getByRole('combobox', { name: 'Модель', exact: true }).selectOption('bmw/3');
      await newWish.getByRole('combobox', { name: 'Поколение', exact: true }).selectOption('bmw/3/gen-5');
      await page.getByPlaceholder('Состояние, комплект, дефекты, история покупки, способ передачи…').fill('Телефон в хорошем состоянии, полный комплект. Рассмотрю обмен на фотоаппарат.');
      for (let step = 2; step <= 4; step++) await page.getByRole('button', { name: 'Далее', exact: true }).click();
      await expect(page.getByText('Только обмен', { exact: true })).toBeVisible();
      await expect(page.getByText(/Оценка:.*18/)).toBeVisible();
      await expect(page.getByRole('region', { name: 'Условия обмена' })).toContainText('Марка: BMW');
      await expect(page.getByRole('region', { name: 'Условия обмена' })).toContainText('Поколение: V (семейство E90)');
      await page.getByRole('button', { name: 'Опубликовать', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Объявление опубликовано', exact: true })).toBeVisible();
      const creates = state.writes.filter(x => x.path === '/listings');
      assert.equal(creates.length, 1);
      assert.equal(creates[0].body.saleEnabled, false);
      assert.equal(creates[0].body.barterEnabled, true);
      assert.equal(creates[0].body.priceRub, 18000);
      assert.equal(creates[0].body.exchangePreferences.wantedDescription, 'Фотоаппарат с объективом');
      assert.equal(creates[0].body.exchangePreferences.maxCashRub, 5000);
      assert.equal(creates[0].body.exchangePreferences.anyOffer, false);
      assert.deepEqual(creates[0].body.exchangePreferences.wantedItems, [{ categoryId: autoCategory.id, attributes: { auto_make: 'bmw', auto_model: 'bmw/3', auto_generation: 'bmw/3/gen-5' } }]);
      assert(state.catalogReads.includes('condition'), 'catalog options requested for the controlled field');
      assert(!state.catalogReads.includes(null), 'new schema avoids the unscoped catalog payload');
      checks.push('five-step publication sends exchange-only once with optional valuation');
    }
    state.guest = true;
    await visit('/listings?tab=COMPLETED');
    await expect(page.getByRole('link', { name: 'Войти или зарегистрироваться' })).toHaveAttribute('href', '/auth?next=%2Flistings%3Ftab%3DCOMPLETED');
    assert.deepEqual(errors, [], 'browser errors');
    assert.deepEqual(state.unexpected, [], 'unexpected browser requests');
    checks.push('error retry and guest return route');
    results.push({ key, passed: true, checks, navigationDiagnostics });
    console.log('BARTER_NAVIGATION_DIAGNOSTICS ' + key + ' ' + JSON.stringify(navigationDiagnostics));
    console.log('BARTER_LAYOUT_PASS ' + key + ' ' + checks.length + ' checks');
  } catch (error) {
    await shot(page, key + '-failure').catch(() => {});
    results.push({ key, passed: false, checks, error: error.stack, errors, failedRequests, pendingRsc: [...pendingRsc].map(r => r.url()), unexpected: state.unexpected });
    console.error('BARTER_LAYOUT_FAIL ' + key + '\n' + error.stack);
    console.error('BARTER_LAYOUT_DIAGNOSTICS ' + JSON.stringify({ errors, navigationDiagnostics, failedRequests, pendingRsc: [...pendingRsc].map(r => r.url()) }));
  } finally { await context.close(); await browser.close(); }
}

try {
  await waitForServer();
  for (const theme of ['light', 'dark']) {
    for (const width of [360, 440, 768, 820, 1280]) await scenario(width < 768 ? webkit : chromium, width, theme);
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 720 }, deviceScaleFactor: 1 });
    await page.setContent('<html><style>body{margin:0;background:#dce1e8;font:13px Arial}.grid{display:grid;grid-template-columns:repeat(4,300px)}figure{margin:0;padding:8px}figcaption{height:32px}img{display:block;width:284px}</style><div class="grid">' +
      shots.filter(x => !x.key.endsWith('failure')).map(x => '<figure><figcaption>' + x.key + '</figcaption><img src="data:image/jpeg;base64,' + x.image + '"></figure>').join('') + '</div></html>');
    await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
    const sheet = await page.screenshot({ type: 'jpeg', quality: 72, fullPage: true });
    await writeFile(join(output, 'review-sheet.jpg'), sheet);
    console.log('BARTER_LAYOUT_REVIEW_IMAGE ' + sheet.toString('base64'));
  } finally { await browser.close(); }
  assert.deepEqual(serverUnexpected, [], 'unexpected server fixture requests');
} finally {
  server.kill('SIGTERM');
  api.close();
  await writeFile(join(output, 'server.log'), serverLogs.join(''));
  await writeFile(join(output, 'results.json'), JSON.stringify({ scope: 'Production web build with loopback SSR API and browser fixtures; no real account, payments or physical iPhone.', results }, null, 2));
}
if (results.length !== 10 || results.some(x => !x.passed)) process.exitCode = 1;
