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
const serverUnexpected = [];
// Home is server-rendered: its API must also stay on an isolated loopback fixture.
assert(!process.env.NEXT_PUBLIC_API_URL, 'Run this suite without a public API override');
const api = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3001');
  let data;
  if (req.method === 'GET' && url.pathname === '/categories') data = [category];
  else if (req.method === 'GET' && url.pathname === '/listings') data = {
    appliedMode: url.searchParams.get('mode') || 'market', page: 1, limit: 20, total: 0, items: [], vipStrip: [],
  };
  else if (req.method === 'GET' && /^\/listings\/fixture-(needs|pending|sold)\/similar$/.test(url.pathname)) data = [];
  else if (req.method === 'GET' && /^\/listings\/fixture-(needs|pending|sold)$/.test(url.pathname)) {
    // Next Link prefetch also requests listing metadata through the server API.
    const listing = fixture('light').listings.find(x => url.pathname === '/listings/' + x.id);
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
    writes: [], unexpected: [], failListings: false, guest: false,
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
  await context.route('**/*', async route => {
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
      else Object.assign(listing, body);
      return json(listing);
    }
    if (method !== 'GET') {
      state.unexpected.push(method + ' ' + path);
      return json({ message: 'Unexpected fixture mutation' }, 405);
    }
    if (path === '/categories') return json([category]);
    if (path === '/listings/my') return state.failListings ? json({}, 503) : json(state.listings);
    if (path === '/wallet/packages') return json(packages);
    if (path === '/wallet/pro-plans') return json(plans);
    if (path === '/wallet/pro/subscription') return json(null);
    if (path === '/wallet/balance') return json({ balanceKopecks: 0, balanceRub: 0 });
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

async function headerCheck(page) {
  const title = page.locator('header h1');
  await expect(title).toHaveText('Мои объявления');
  const style = await title.evaluate(el => ({ font: getComputedStyle(el).fontSize, weight: getComputedStyle(el).fontWeight }));
  assert.deepEqual(style, { font: '18px', weight: '600' });
  const box = await page.locator('header').boundingBox();
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
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const key = browserType.name() + '-' + width + '-' + theme;
  const checks = [];
  try {
    await page.goto(baseURL + '/profile/listings?tab=SOLD');
    await expect(page).toHaveURL(/\/listings\?tab=COMPLETED/);
    await page.goto(baseURL + '/listings?tab=NEEDS_ACTION');
    await expect(page.getByRole('heading', { name: 'Требуют внимания', exact: true })).toBeVisible();
    await headerCheck(page);
    const tabs = page.getByRole('navigation', { name: 'Статусы объявлений' });
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
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
    assert.equal(state.writes.length, 0);
    const pending = page.locator('main li').filter({ hasText: 'На модерации' });
    await pending.locator('summary').click();
    await pending.getByRole('button', { name: 'Подтвердить публикацию', exact: true }).click();
    await expect(pending).toHaveCount(0);
    assert.deepEqual(state.writes, [{ path: '/listings/fixture-pending', body: { publishFromModeration: true } }]);
    checks.push('editor opens without mutation; pending publication uses existing handler');

    await tabs.getByRole('button', { name: 'Завершены 1', exact: true }).click();
    await expect(page).toHaveURL(/tab=COMPLETED/);
    await page.reload();
    const sold = page.locator('main li').filter({ hasText: 'Проданное объявление' });
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

    await page.goto(baseURL + '/pricing');
    const badge = page.getByText('Рекомендуем', { exact: true });
    await expect(badge).toBeVisible();
    await badge.scrollIntoViewIfNeeded();
    await contained(badge);
    const planCard = badge.locator('xpath=..');
    const badgeBox = await badge.boundingBox();
    const planBox = await planCard.boundingBox();
    assert(badgeBox.y >= planBox.y && badgeBox.y + badgeBox.height <= planBox.y + planBox.height);
    await shot(page, key + '-pricing', planCard);
    await expect(page.getByRole('link', { name: 'Применить', exact: true }).first()).toHaveAttribute('href', '/listings');
    checks.push('recommended badge fully inside plan card');

    await page.goto(baseURL + '/?mode=market&sort=new');
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
    await shot(page, key + '-catalog');
    await page.goto(baseURL + '/search');
    const searchToggle = page.getByRole('navigation', { name: 'Маркет или Бартер' });
    await expect(searchToggle).toBeVisible();
    const searchBox = await contained(searchToggle);
    assert(Math.abs((searchBox.left + searchBox.right) / 2 - width / 2) <= 1, 'search toggle is off-center');
    checks.push('catalog and search centered, selected pill aligned, sort preserved');

    state.failListings = true;
    await page.goto(baseURL + '/listings');
    await expect(page.getByRole('heading', { name: 'Не удалось загрузить объявления' })).toBeVisible();
    state.failListings = false;
    await page.getByRole('button', { name: 'Повторить', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Активные объявления', exact: true })).toBeVisible();
    state.guest = true;
    await page.goto(baseURL + '/listings?tab=COMPLETED');
    await expect(page.getByRole('link', { name: 'Войти или зарегистрироваться' })).toHaveAttribute('href', '/auth?next=%2Flistings%3Ftab%3DCOMPLETED');
    assert.deepEqual(errors, [], 'browser errors');
    assert.deepEqual(state.unexpected, [], 'unexpected browser requests');
    checks.push('error retry and guest return route');
    results.push({ key, passed: true, checks });
    console.log('BARTER_LAYOUT_PASS ' + key + ' ' + checks.length + ' checks');
  } catch (error) {
    await shot(page, key + '-failure').catch(() => {});
    results.push({ key, passed: false, checks, error: error.stack, errors, unexpected: state.unexpected });
    console.error('BARTER_LAYOUT_FAIL ' + key + '\n' + error.stack);
  } finally { await context.close(); await browser.close(); }
}

try {
  await waitForServer();
  for (const theme of ['light', 'dark']) {
    for (const width of [360, 440, 820, 1280]) await scenario(width < 768 ? webkit : chromium, width, theme);
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 1400 }, deviceScaleFactor: 1 });
    await page.setContent('<html><style>body{margin:0;background:#dce1e8;font:13px Arial}.grid{display:grid;grid-template-columns:repeat(3,300px)}figure{margin:0;padding:8px}figcaption{height:32px}img{display:block;width:284px}</style><div class="grid">' +
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
if (results.length !== 8 || results.some(x => !x.passed)) process.exitCode = 1;
