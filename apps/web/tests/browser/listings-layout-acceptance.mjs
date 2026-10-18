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


async function assertApprovedOrangeMark(bytes) {
  const sharp = webRequire('sharp');
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, right = -1, top = info.height, bottom = -1, orange = 0, other = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    const [r, g, b, a] = data.subarray(i, i + 4);
    if (a < 64 || Math.max(r, g, b) - Math.min(r, g, b) < 50) continue;
    if (r > g && g > b) orange++; else other++;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  assert(orange > info.width * info.height * 0.25, 'approved orange logo has meaningful visible area');
  assert(other < orange / 10, 'no obsolete blue/orange mark remains');
  assert(top <= 3 && bottom >= info.height - 4, 'logo uses almost the full reference canvas');
  assert(Math.abs((left + right + 1) / 2 - info.width / 2) <= 2, 'orange logo centered on X');
  assert(Math.abs((top + bottom + 1) / 2 - info.height / 2) <= 2, 'orange logo centered on Y');
}

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
  assert(orange > 50, 'approved orange logomark must remain visible');
  assert(blue === 0, 'old blue brand must not appear in iOS/PWA artwork');
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
  // A read already dispatched during page teardown can reach the isolated server.
  else if (req.method === 'POST' && url.pathname === '/analytics/events') data = { ok: true };
  else if (req.method === 'GET' && url.pathname === '/reviews/listing/fixture-detail/eligibility') data = { canReview: false, reason: 'no_chat' };
  else if (req.method === 'GET' && url.pathname === '/presence/users/fixture-peer') data = { isOnline: false, lastSeenAt: null };
  else if (req.method === 'GET' && url.pathname === '/users/fixture-peer/profile') data = { user: { id: 'fixture-peer', name: 'Продавец', avatarUrl: null, about: null, companyName: null, companyInfo: null }, rating: { avg: null, count: 0 }, reviews: [], activeListings: [] };
  else if (req.method === 'GET' && url.pathname === '/favorites') data = [];
  else if (req.method === 'GET' && url.pathname === '/listings/my') data = fixture('light').listings;
  else if (req.method === 'GET' && url.pathname === '/listings') data = {
    appliedMode: url.searchParams.get('mode') || 'market', ...(url.searchParams.has('attrs') ? { appliedAttrs: JSON.parse(url.searchParams.get('attrs')) } : {}), page: 1, limit: 20, total: 0, items: [], vipStrip: [],
  };
  else if (req.method === 'GET' && /^\/listings\/fixture-(needs|pending|sold|created|detail)\/similar$/.test(url.pathname)) data = [];
  else if (req.method === 'GET' && /^\/listings\/fixture-(needs|pending|sold|created|detail)$/.test(url.pathname)) {
    // Next Link prefetch also requests listing metadata through the server API.
    const listing = fixture('light').listings.find(x => url.pathname === '/listings/' + x.id) ?? { ...fixture('light').listings[0], id: 'fixture-created', saleEnabled: false, barterEnabled: true };
    data = url.pathname === '/listings/fixture-detail'
      ? { ...listing, id: 'fixture-detail', title: 'Тестовое объявление', status: 'ACTIVE', saleEnabled: true, barterEnabled: true,
          images: [
            { id: 'detail-photo-1', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#f5eee8"/></svg>'), sortOrder: 0 },
            { id: 'detail-photo-2', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#e4e8fc"/></svg>'), sortOrder: 1 },
          ], description: 'Описание тестового объявления.', owner: { id: 'fixture-peer', name: 'Продавец', email: null, phone: null } }
      : { ...listing, description: 'Описание тестового объявления.', owner: { id: 'fixture-seller', name: 'Тестовый продавец', email: null, phone: null } };
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
    // The detail acceptance opens genuine analytics, presence and review widgets.
    // Only explicit fixture entities are permitted here; unknown calls still fail.
    if (method === 'POST' && path === '/analytics/events') return json({ ok: true }, 201);
    if (method === 'GET' && path === '/reviews/listing/fixture-detail/eligibility') return json({ canReview: false, reason: 'no_chat' });
    if (method === 'GET' && path === '/presence/users/fixture-peer') return json({ isOnline: false, lastSeenAt: null });
    if (method === 'GET' && path === '/users/fixture-peer/profile') return json({ user: { id: 'fixture-peer', name: 'Продавец', avatarUrl: null, about: null, companyName: null, companyInfo: null }, rating: { avg: null, count: 0 }, reviews: [], activeListings: [] });
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
    if (path === '/favorites') return json(state.previewFavorites ?? []);
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
  assert.deepEqual(style, { font: '18px', weight: '700' });
  const box = await page.locator('header:visible').boundingBox();
  assert(box.height >= (page.viewportSize().width < 768 ? 58 : 64));
  await contained(page.getByRole('navigation', { name: 'Статусы объявлений' }));
}

async function shot(page, key, scrollTarget) {
  if (scrollTarget) await scrollTarget.scrollIntoViewIfNeeded();
  else await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.app-scroll-root')?.scrollTo(0, 0); });
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
    if (width < 768) {
      const source = state.listings[1];
      state.previewFavorites = [{ id: 'favorite-preview', listing: { ...source,
        images: [source.images[0], { ...source.images[0], id: 'second', url: source.images[0].url.replace('dce6ef', 'ff9944') }] } }];
      await visit('/favorites');
      const thumb = page.locator('.photo-hold-preview').first();
      await expect(thumb).toBeVisible();
      assert.equal(await thumb.evaluate(el => el.closest('a')), null, 'hold surface is not a native link preview target');
      const src = await thumb.locator('div[aria-hidden="false"] img').getAttribute('src');
      const touch = async (type, dx = 0, dy = 0) => thumb.evaluate((el, { type, dx, dy }) => {
        const r = el.getBoundingClientRect();
        // WebKit exposes Touch but disallows constructing it. This checks our
        // real DOM listeners with explicit touch data, not native iPhone gesture recognition.
        const point = { identifier: 1, target: el, clientX: r.x + 12 + dx, clientY: r.y + 12 + dy };
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperties(event, {
          touches: { value: type === 'touchend' || type === 'touchcancel' ? [] : [point] },
          changedTouches: { value: [point] },
        });
        return el.dispatchEvent(event);
      }, { type, dx, dy });
      await touch('touchstart');
      await expect(thumb).toHaveAttribute('data-photo-holding', 'true');
      await expect(thumb.locator('div[aria-hidden="false"] img')).not.toHaveAttribute('src', src);
      await touch('touchmove', 0, 1);
      await expect(thumb).toHaveAttribute('data-photo-index', '1');
      await touch('touchend');
      // Browser-generated click after a hold must not open the listing.
      assert.equal(await thumb.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))), false);
      await expect(page).toHaveURL(/favorites$/);
      await touch('touchstart');
      assert.equal(await touch('touchmove', 0, 40), true, 'normal vertical swipe remains scrollable');
      await page.waitForTimeout(400);
      await expect(thumb).toHaveAttribute('data-photo-holding', 'false');
      await touch('touchcancel');
      await touch('touchstart');
      await touch('touchend');
      // Observe an ordinary release click before React handles navigation.
      assert.equal(await thumb.evaluate(el => {
        let prevented;
        el.parentElement.addEventListener('click', event => { prevented = event.defaultPrevented; event.preventDefault(); event.stopPropagation(); }, { once: true });
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return prevented;
      }), false);
      if (browserType.name() === 'chromium') {
        await visit('/favorites');
        const nativeThumb = page.locator('.photo-hold-preview').first();
        await expect(nativeThumb).toBeVisible();
        const bounds = await nativeThumb.boundingBox();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + 30, y: bounds.y + 30 }] });
        await expect(nativeThumb).toHaveAttribute('data-photo-index', '1');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect(page).toHaveURL(/favorites$/);
        await cdp.detach();
      }
      state.previewFavorites = [];
      checks.push('photo hold changes image, consumes release click, permits swipe and next tap');
    }
    documentTransition = 'server redirect';
    await visit('/profile/listings?tab=SOLD');
    await expect(page).toHaveURL(/\/listings\?tab=COMPLETED/);
    await expect(page.getByRole('heading', { name: 'Завершённые объявления', exact: true })).toBeVisible();
    documentTransition = null;
    await visit('/listings?tab=NEEDS_ACTION');
    await expect(page.getByRole('heading', { name: 'Требуют внимания', exact: true })).toBeVisible();
    await headerCheck(page);
    await spacingCheck(page, width);
    const dock = page.getByRole('navigation', { name: 'Основная навигация', exact: true });
    if (width < 768) {
      await expect(dock).toBeVisible();
      for (const link of await dock.getByRole('link').all()) {
        const bounds = await contained(link);
        assert(bounds.width >= 44 && bounds.height >= 44, '44px navigation touch target');
      }
      // Regression: the fixed iPhone dock must touch the bottom edge, not
      // float 50-70px above a black blank strip in standalone Safari.
      const dockBox = await dock.boundingBox();
      assert(dockBox && Math.abs(dockBox.y + dockBox.height - page.viewportSize().height) < 2,
        'mobile dock must extend through the bottom safe area');
      const palette = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        return ['--bg-page', '--bg-surface', '--bg-muted', '--fg-default', '--fg-muted', '--border-default'].map(key => css.getPropertyValue(key).trim());
      });
      if (theme === 'dark') assert.deepEqual(palette, ['#0e0e10', '#1a1a1d', '#1e1e22', '#f6f6f8', '#9a9aa6', '#2a2a2f']);
      await dock.getByRole('button', { name: 'Добавить объявление' }).click();
      const compose = page.getByRole('dialog', { name: 'Новое объявление' });
      await expect(compose).toBeVisible();
      await contained(compose);
      await expect(compose.getByRole('link', { name: /^Обменять/ })).toHaveAttribute('href', '/new?tradeMode=barter');
      await shot(page, key + '-liquid-compose');
      await page.keyboard.press('Escape');
      await expect(compose).not.toBeVisible();
      await expect(dock.getByRole('button', { name: 'Добавить объявление' })).toBeFocused();
      await dock.getByRole('link', { name: 'Избранное', exact: true }).click();
      await expect(page).toHaveURL(/\/favorites$/);
      await expect(dock.getByRole('link', { name: 'Избранное', exact: true })).toHaveAttribute('aria-current', 'page');
      await dock.getByRole('link', { name: 'Главная', exact: true }).click();
      await expect(page).toHaveURL(baseURL + '/');
      await expect(dock.getByRole('link', { name: 'Главная', exact: true })).toHaveAttribute('aria-current', 'page');
      await dock.getByRole('link', { name: 'Избранное', exact: true }).click();
      await expect(page).toHaveURL(/\/favorites$/);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      checks.push('tab taps, next tap, native menu dismissal, touch targets and graphite palette');
      await visit('/listings?tab=NEEDS_ACTION');
      await expect(page.getByRole('heading', { name: 'Требуют внимания', exact: true })).toBeVisible();
    } else await expect(dock).not.toBeVisible();
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
    // Exactly one visible hero at a time: the supplied Claude banner on mobile,
    // the existing proportional promotional layout on desktop.
    // The app router can briefly retain an off-screen route during navigation.
    // Assert the actual number of visible banners, not the total DOM nodes.
    await expect(page.locator('.claude-mobile-hero:visible')).toHaveCount(width < 768 ? 1 : 0);
    await expect(page.locator('.refresh-hero:visible')).toHaveCount(width < 768 ? 0 : 1);
    const logo = page.getByRole('link', { name: 'Бартер — на главную', exact: true }).filter({ visible: true });
    await expect(logo).toBeVisible();
    await expect(logo).toContainText('БАРТЕР');
    // The approved logo is two real image assets: mark + Cyrillic wordmark.
    const brandImages = await logo.locator('img').all();
    assert.equal(brandImages.length, 2, 'mark and wordmark');
    for (const brandImage of brandImages) {
      await expect(brandImage).toHaveJSProperty('complete', true);
      assert(await brandImage.evaluate(img => img.naturalWidth > 0), 'brand artwork is loaded');
      await contained(brandImage);
    }
    await contained(logo);
    if (width < 768) {
      // Desktop WebKit has no physical notch. Exercise a nonzero safe area,
      // without claiming this emulates the actual iPhone status-bar renderer.
      await page.evaluate(() => document.documentElement.style.setProperty('--safe-area-top', '59px'));
      const header = page.locator('.catalog-mobile-header');
      const material = await header.evaluate(el => {
        const css = getComputedStyle(el);
        return { padding: css.paddingTop, blur: css.backdropFilter || css.webkitBackdropFilter,
          background: css.backgroundColor, page: getComputedStyle(document.body).backgroundColor };
      });
      assert.equal(material.padding, '12px', '12px breathing room after the system inset');
      assert.equal(material.blur, 'none', 'top-edge logo header has no backdrop blur');
      assert.equal(material.background, material.page, 'system area is an opaque continuation of the page');
      const logoBox = await logo.boundingBox();
      assert(logoBox.y >= 71, 'logo stays below the safe area plus its own spacing');
      assert(await logo.evaluate(el => {
        const b = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
      }), 'no overlay covers the logo');
      // The catalog fixture is empty; give its shell a scrollable height.
      await header.evaluate(el => { el.parentElement.style.minHeight = '1800px'; });
      await page.evaluate(() => document.querySelector('.app-scroll-root').scrollTo(0, 240));
      await expect.poll(() => page.evaluate(() => document.querySelector('.app-scroll-root').scrollTop)).toBeGreaterThan(100);
      await expect.poll(async () => (await header.boundingBox()).y).toBeGreaterThanOrEqual(0);
      assert((await logo.boundingBox()).y >= 71, 'scrolling keeps the logo below system chrome');
      await header.evaluate(el => { el.parentElement.style.removeProperty('min-height'); });
      await shot(page, key + '-header-safe-area');
      await page.evaluate(() => document.documentElement.style.removeProperty('--safe-area-top'));
      checks.push('opaque logo header, safe area plus 12px, and unobstructed branding');
    }
    const markBox = await brandImages[0].boundingBox();
    const wordBox = await brandImages[1].boundingBox();
    assert(markBox.x + markBox.width <= wordBox.x, 'wordmark must not overlap the mark');
    assert(Math.abs(markBox.y + markBox.height / 2 - wordBox.y - wordBox.height / 2) < 1,
      'mark and name share a vertical center');
    const markResponse = await page.request.get(baseURL + '/brand/claude-mark.png');
    assert.equal(markResponse.status(), 200);
    await assertApprovedOrangeMark(await markResponse.body());
    const apple = page.locator('link[rel="apple-touch-icon"]');
    await expect(apple).toHaveCount(1);
    const appleHref = await apple.getAttribute('href');
    assert.equal(appleHref, '/brand/claude-pwa/apple-touch-icon.png');
    const appleResponse = await page.request.get(baseURL + appleHref);
    assert.equal(appleResponse.status(), 200);
    const appleBytes = await appleResponse.body();
    assert.equal(appleBytes.readUInt32BE(16), 180);
    assert.equal(appleBytes.readUInt32BE(20), 180);
    await assertArtwork(appleBytes, 0.65);
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
      await assertArtwork(bytes, icon.purpose === 'maskable' ? 0.52 : 0.65, false, icon.purpose === 'maskable');
    }
    assert.equal(await page.locator('link[href="/favicon.svg"]').count(), 0);
    for (const link of await page.locator('link[rel="icon"]').all()) {
      const href = await link.getAttribute('href');
      assert(href.startsWith('/brand/claude-pwa/'), 'no stale icon candidate');
      const res = await page.request.get(baseURL + href);
      assert.equal(res.status(), 200);
      await assertArtwork(await res.body(), 0.7, true);
    }
    if (key.includes('440')) console.log('BARTER_APPLE_ICON_IMAGE ' + appleBytes.toString('base64'));
    checks.push('full mark bounds, alignment, larger Apple/PWA artwork and maskable safe circle');
    const toggle = page.getByRole('navigation', { name: 'Режим каталога' });
    for (const mode of ['market', 'barter', 'both']) {
      const label = mode === 'market' ? 'Покупка' : mode === 'barter' ? 'Обмен' : 'Оба';
      await toggle.getByRole('link', { name: label, exact: true }).click();
      await expect(toggle.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(page).toHaveURL(new RegExp('mode=' + mode));
      assert(new URL(page.url()).searchParams.get('sort') === 'new');
      const box = await contained(toggle);
      assert(Math.abs((box.left + box.right) / 2 - (width + (width >= 1280 ? 224 : 0)) / 2) <= 1, 'toggle is not centered: ' + JSON.stringify(box));
      const selected = await toggle.getByRole('link', { name: label, exact: true }).boundingBox();
      const pill = await toggle.locator('[data-selected="true"]').boundingBox();
      assert(Math.abs(pill.x + pill.width / 2 - selected.x - selected.width / 2) <= 2, 'selected pill is off-center');
    }
    await spacingCheck(page, width, false);
    await shot(page, key + '-catalog');
    await visit('/search');
    const searchToggle = page.getByRole('navigation', { name: 'Режим каталога' });
    await expect(searchToggle).toBeVisible();
    await spacingCheck(page, width);
    await shot(page, key + '-search');
    const searchBox = await contained(searchToggle);
    assert(Math.abs((searchBox.left + searchBox.right) / 2 - (width + (width >= 1280 ? 224 : 0)) / 2) <= 1, 'search toggle is off-center');
    checks.push('catalog and search centered, selected pill aligned, sort preserved');
    if (width === 360 || width === 1280) {
      await visit('/search?categoryId=fixture-category&mode=market');
      await page.getByRole('button', { name: /^Фильтры/ }).click();
      await page.getByRole('dialog').getByLabel('Состояние').selectOption('used_good');
      await page.getByRole('button', { name: 'Показать результаты' }).click();
      await expect(page).toHaveURL(/attrs=/);
      await expect(page.getByText('Характеристики · 1')).toBeVisible();
      await page.getByRole('navigation', { name: 'Режим каталога' }).getByRole('link', { name: 'Обмен' }).click();
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

    // Claude detail acceptance: real gallery buttons and contact actions remain usable.
    if (width === 390 || width === 440 || width === 1280) {
      await visit('/listing/fixture-detail');
      const detailTitle = page.getByRole('heading', { name: 'Тестовое объявление', exact: true });
      await expect(detailTitle).toBeVisible();
      const galleryDots = page.locator('.listing-gallery-mobile-dots button');
      await expect(galleryDots).toHaveCount(2);
      if (width < 768) {
        assert.equal(await page.locator('.listing-detail-grid').evaluate(el => getComputedStyle(el).display),
          'contents', 'legacy !important must not interrupt the hero/sheet order');
        const photoBox = await page.locator('.listing-detail-media').boundingBox();
        const titleBox = await detailTitle.boundingBox();
        assert(photoBox && titleBox && titleBox.y >= photoBox.y + photoBox.height - 46,
          'title must render immediately after the image as the Claude sheet');
        const share = page.getByRole('button', { name: 'Поделиться' });
        const shareBox = await share.boundingBox();
        assert(shareBox && shareBox.width <= 45 && shareBox.x >= 0 && shareBox.x + shareBox.width <= width,
          'share must remain inside a round 40px button, not overlap the photo');
        await expect(page.locator('.listing-detail-head-actions .listing-feed-favorite')).toBeVisible();
        await galleryDots.nth(1).click();
        await expect(galleryDots.nth(1)).toHaveAttribute('aria-pressed', 'true');
        const footer = page.locator('.listing-detail .listing-primary-actions');
        await expect(footer).toBeVisible();
        const footerBounds = await footer.boundingBox();
        assert(footerBounds && footerBounds.y > 600 && footerBounds.y + footerBounds.height >= 755,
          'detail contact buttons must stay anchored near the bottom of the mobile viewport');
        await expect(page.getByRole('navigation', { name: 'Основная навигация', exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: 'Открыть на весь экран' }).click();
        const full = page.getByRole('dialog', { name: 'Просмотр фотографий' });
        await expect(full).toBeVisible();
        assert.equal(await full.evaluate(el => getComputedStyle(el).backgroundColor),
          'rgb(0, 0, 0)', 'fullscreen viewer must be opaque, never leak listing text');
        await page.getByRole('button', { name: 'Закрыть' }).click();
        await expect(full).toHaveCount(0);
      }
      checks.push('hero before title, compact share/favorite, opaque viewer, working gallery and contact footer');
    }

    state.failListings = true;
    await visit('/listings');
    await expect(page.getByRole('heading', { name: 'Не удалось загрузить объявления' })).toBeVisible();
    state.failListings = false;
    await page.getByRole('button', { name: 'Повторить', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Активные объявления', exact: true })).toBeVisible();
    if (width === 360 || width === 1280) {
      await visit('/new?tradeMode=barter');
      await expect(page.getByRole('navigation', { name: 'Основная навигация', exact: true })).toHaveCount(0);
      await page.getByPlaceholder('iPhone 14 Pro Max 256 ГБ').fill('iPhone для обмена');
      await page.getByRole('button', { name: 'Электроника', exact: true }).first().click();
      await page.getByRole('button', { name: 'Далее', exact: true }).click();
      await expect(page.getByRole('radio', { name: /^Только обмен/ })).toBeChecked();
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
      await expect(page.locator('.publication-form').getByText('Только обмен', { exact: true })).toBeVisible();
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
    await scenario(chromium, 390, theme);
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
if (results.length !== 12 || results.some(x => !x.passed)) process.exitCode = 1;
