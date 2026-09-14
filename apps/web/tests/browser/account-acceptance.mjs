import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const webRequire = createRequire(join(webRoot, 'package.json'));
const browserRequire = createRequire(join(process.env.BARTER_BROWSER_TOOLS, 'package.json'));
const { chromium, webkit, expect } = browserRequire('@playwright/test');
const baseURL = 'http://127.0.0.1:3200';
const output = join(webRoot, 'test-results/account');
await mkdir(output, { recursive: true });
const serverLogs = [];
const server = spawn(process.execPath, [webRequire.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', '3200'], {
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

function fixture(theme) {
  const user = {
    id: 'fixture-seller', email: 'seller@example.test', phone: null, name: 'Тестовый продавец',
    avatarUrl: null, about: 'Тестовые данные для приёмки интерфейса.', companyName: null, companyInfo: null,
    appTheme: theme.toUpperCase(), notificationsEnabled: true, marketingEnabled: false,
    showEmailPublic: false, showPhonePublic: false, createdAt: '2026-09-01T10:00:00.000Z',
  };
  const category = { id: 'fixture-category', title: 'Электроника', slug: 'electronics', parentId: null };
  const listing = { id: 'fixture-listing', title: 'Тестовый фотоаппарат', city: 'Краснодар',
    priceRub: 3500, status: 'SOLD', category, images: [], activePromotion: null, attributes: {},
    createdAt: '2026-09-10T10:00:00.000Z' };
  return {
    user, category, listing, reply: { enabled: true, text: 'Отвечу в течение дня.' },
    writes: [], unexpected: [], failReply: false, rejectSave: false,
  };
}

async function installFixture(context, state, theme) {
  await context.addInitScript(({ theme }) => {
    if (!localStorage.getItem('barter_token')) localStorage.setItem('barter_token', 'isolated-ui-fixture');
    if (!localStorage.getItem('barter_theme_pref')) localStorage.setItem('barter_theme_pref', theme.toUpperCase());
  }, { theme });
  await context.routeWebSocket(/.*/, socket => socket.close());
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') {
      state.unexpected.push('External request: ' + url.origin);
      return route.abort();
    }
    let path = url.pathname.replace(/^\/api\/backend/, '');
    const api = url.pathname.startsWith('/api/backend/') ||
      ['/auth/me', '/auth/logout', '/chats'].includes(path) || path.startsWith('/socket.io');
    if (!api) return route.continue();
    const method = request.method();
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (path.startsWith('/socket.io')) return json({}, 400);
    if (path === '/auth/me') {
      // Cookie-only presence is outside this fixture. AuthProvider and account requests use a test token.
      if (method === 'GET' && !request.headers().authorization) return json({ message: 'unauthorized' }, 401);
      if (method === 'PATCH') {
        if (state.rejectSave) return json({ message: 'unauthorized' }, 401);
        const body = request.postDataJSON();
        state.writes.push({ path, method, body });
        Object.assign(state.user, body);
      }
      return json(state.user);
    }
    if (path === '/support/seller/auto-reply') {
      if (method === 'GET' && state.failReply) return json({ message: 'unavailable' }, 503);
      if (method === 'PUT') {
        const body = request.postDataJSON();
        state.writes.push({ path, method, body });
        state.reply = body;
      }
      return json(state.reply);
    }
    if (method !== 'GET') {
      state.unexpected.push(method + ' ' + path);
      return json({ message: 'unexpected fixture mutation' }, 405);
    }
    if (path === '/categories') return json([state.category]);
    if (path === '/listings/my') return json([state.listing]);
    if (path === '/chats' || path === '/support/faq') return json([]);
    if (path === '/users/fixture-seller/profile') return json({
      user: state.user, rating: { avg: 5, count: 1 }, reviews: [], activeListings: [],
    });
    if (path === '/reviews/my') return json({
      given: [], received: [{ id: 'fixture-review', rating: 5, createdAt: '2026-09-12T10:00:00.000Z',
        text: 'ПодробностиСделки'.repeat(35), author: { id: 'fixture-buyer', name: 'Тестовый покупатель' },
        listing: { id: state.listing.id, title: state.listing.title } }],
    });
    state.unexpected.push(method + ' ' + path);
    return json({ message: 'unknown fixture route' }, 404);
  });
}

async function geometry(page, label) {
  const metrics = await page.evaluate(() => {
    const header = document.querySelector('header');
    const rect = header.getBoundingClientRect();
    const main = document.querySelector('main')?.getBoundingClientRect();
    const title = getComputedStyle(header.querySelector('h1'));
    const section = document.querySelector('#settings-section-title');
    return {
      viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      headerHeight: rect.height, headerTop: rect.top,
      titleSize: parseFloat(title.fontSize), titleWeight: title.fontWeight,
      sectionTitleSize: section ? parseFloat(getComputedStyle(section).fontSize) : null,
      mainLeft: main?.left, mainRight: main?.right,
    };
  });
  assert(metrics.scrollWidth <= metrics.viewport + 1, label + ': horizontal page overflow');
  assert(metrics.headerHeight >= 64, label + ': header shorter than 64px');
  assert.equal(metrics.titleSize, 18, label + ': header typography overridden');
  assert.equal(metrics.titleWeight, '600', label + ': header weight overridden');
  if (metrics.sectionTitleSize !== null) assert.equal(metrics.sectionTitleSize, 20, label + ': section typography overridden');
  assert(Math.abs(metrics.headerTop) <= 1, label + ': header not at viewport top');
  if (metrics.mainLeft !== undefined) {
    assert(metrics.mainLeft >= -1 && metrics.mainRight <= metrics.viewport + 1, label + ': content outside viewport');
  }
  const back = page.locator('header a').first();
  const box = await back.boundingBox();
  assert(box.width >= 44 && box.height >= 44, label + ': back target below 44px');
  return metrics;
}

async function fieldGeometry(locator) {
  const metrics = await locator.evaluate(el => {
    const style = getComputedStyle(el);
    return { height: el.getBoundingClientRect().height, font: parseFloat(style.fontSize), radius: parseFloat(style.borderRadius) };
  });
  assert(metrics.height >= 48, 'field shorter than 48px: ' + JSON.stringify(metrics));
  assert(metrics.font >= 16, 'field text smaller than 16px: ' + JSON.stringify(metrics));
  assert.equal(metrics.radius, 16, 'field radius differs from shared standard');
}

async function screenshot(page, key) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(output, key + '.png'), animations: 'disabled', fullPage: true });
  const preview = await page.screenshot({ type: 'jpeg', quality: 65, animations: 'disabled' });
  shots.push({ key, image: preview.toString('base64') });
}

async function runScenario(browserType, mode, theme) {
  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport: mode === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    isMobile: mode === 'mobile', hasTouch: mode === 'mobile', deviceScaleFactor: 1,
    colorScheme: theme, reducedMotion: 'reduce', serviceWorkers: 'block',
  });
  const state = fixture(theme);
  await installFixture(context, state, theme);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const key = browserType.name() + '-' + mode + '-' + theme;
  const checks = [];
  try {
    await page.goto(baseURL + '/profile/settings');
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(state.user.email);
    await fieldGeometry(page.getByLabel('Email', { exact: true }));
    await geometry(page, key + '/account');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const save = page.getByRole('button', { name: 'Сохранить', exact: true });
    const saveBox = await save.boundingBox();
    assert(saveBox.height >= 52, 'Save button shorter than 52px');
    checks.push('account layout, fields, theme and 52px save');
    await screenshot(page, key + '-account');

    const nav = page.getByRole('navigation', { name: 'Разделы настроек' });
    await nav.getByRole('button', { name: 'Витрина продавца', exact: true }).click();
    const name = page.getByLabel(/Имя на витрине/);
    const about = page.getByLabel(/О продавце/);
    await name.fill('Продавец после сохранения');
    const longText = 'Подробное описание продавца. '.repeat(15);
    await about.fill(longText);
    await fieldGeometry(name);
    await save.click();
    await expect(page.getByRole('status').filter({ hasText: 'Настройки раздела сохранены' })).toBeVisible();
    assert.equal(state.writes.length, 1);
    assert.deepEqual(Object.keys(state.writes[0].body).sort(), ['about', 'name']);
    await page.reload();
    await expect(name).toHaveValue('Продавец после сохранения');
    await expect(about).toHaveValue(longText.trim());
    checks.push('storefront PATCH isolation and reload');
    await screenshot(page, key + '-storefront');

    await nav.getByRole('button', { name: 'Внешний вид', exact: true }).click();
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    await page.getByRole('button', { name: nextTheme === 'dark' ? /Тёмная/ : /Светлая/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', nextTheme);
    await save.click();
    await expect(page.getByRole('status').filter({ hasText: 'Настройки раздела сохранены' })).toBeVisible();
    assert.deepEqual(state.writes.at(-1).body, { appTheme: nextTheme.toUpperCase() });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', nextTheme);
    await expect(page.getByRole('button', { name: nextTheme === 'dark' ? /Тёмная/ : /Светлая/ })).toHaveAttribute('aria-pressed', 'true');
    checks.push('theme switch, section payload and reload');
    await geometry(page, key + '/appearance');
    if (mode === 'mobile') {
      for (const choice of ['Системная', 'Светлая', 'Тёмная']) {
        const box = await page.getByRole('button', { name: new RegExp(choice) }).boundingBox();
        assert(box.height >= 72 && box.height <= 100, 'Mobile theme choice is not a compact row');
      }
    }
    await screenshot(page, key + '-appearance');

    await nav.getByRole('button', { name: 'Безопасность', exact: true }).click();
    await fieldGeometry(page.getByLabel('Текущий пароль', { exact: true }));
    await page.getByLabel('Текущий пароль', { exact: true }).focus();
    await expect(page.getByLabel('Текущий пароль', { exact: true })).toBeFocused();
    checks.push('password field geometry and focus; no password mutation');

    await page.getByRole('link', { name: 'Назад в профиль', exact: true }).click();
    await expect(page.locator('header h1')).toHaveText('Профиль');
    await page.locator('a[href="/profile/orders"]:visible').first().click();
    await expect(page.getByText('Тестовый фотоаппарат', { exact: true })).toBeVisible();
    await geometry(page, key + '/orders');
    await screenshot(page, key + '-orders');
    await page.getByRole('link', { name: 'Назад в профиль', exact: true }).click();
    await page.locator('a[href="/profile/reviews"]:visible').first().click();
    await expect(page.getByText('Тестовый покупатель', { exact: true })).toBeVisible();
    await geometry(page, key + '/reviews');
    await screenshot(page, key + '-reviews');
    await page.getByRole('link', { name: 'Назад в профиль', exact: true }).click();
    await expect(page.locator('header h1')).toHaveText('Профиль');
    checks.push('profile → orders → profile → reviews → profile, long review text');

    state.failReply = true;
    await page.goto(baseURL + '/profile/settings?section=storefront');
    await expect(page.getByText('Не удалось загрузить автоответ. Настройки витрины можно сохранить отдельно.')).toBeVisible();
    await name.fill('Витрина без автоответа');
    const count = state.writes.length;
    await save.click();
    await expect(page.getByRole('status').filter({ hasText: 'Настройки раздела сохранены' })).toBeVisible();
    assert.equal(state.writes.length, count + 1);
    assert.deepEqual(state.writes.at(-1).body, { name: 'Витрина без автоответа' });
    checks.push('auto-reply failure cannot overwrite saved reply');

    state.rejectSave = true;
    await nav.getByRole('button', { name: 'Аккаунт', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill('new@example.test');
    await save.click();
    await expect(page.locator('main').getByRole('alert')).toContainText('Сессия истекла');
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue('new@example.test');
    await expect(page.getByRole('link', { name: 'Войти снова', exact: true })).toHaveAttribute('href', '/auth?next=%2Fprofile%2Fsettings%3Fsection%3Daccount');
    checks.push('401 preserves input and login return path');

    assert.deepEqual(errors, [], 'browser runtime errors');
    assert.deepEqual(state.unexpected, [], 'unexpected API/external requests');
    results.push({ key, passed: true, checks });
    console.log('BARTER_QA_PASS ' + key + ' ' + checks.length + ' checks');
  } catch (error) {
    await screenshot(page, key + '-failure').catch(() => {});
    results.push({ key, passed: false, checks, error: error.stack, runtimeErrors: errors, unexpected: state.unexpected });
    console.error('BARTER_QA_FAIL ' + key + '\n' + error.stack);
  } finally {
    await context.close();
    await browser.close();
  }
}

try {
  await waitForServer();
  for (const theme of ['light', 'dark']) {
    await runScenario(chromium, 'desktop', theme);
    await runScenario(webkit, 'mobile', theme);
  }
  // A review sheet is a browser screenshot of actual captured screens, not a generated mockup.
  const review = await chromium.launch();
  try {
    const page = await review.newPage({ viewport: { width: 840, height: 1320 }, deviceScaleFactor: 1 });
    const selected = shots.filter(shot => shot.key.includes('webkit') && /account|appearance|reviews/.test(shot.key)).slice(0, 6);
    await page.setContent('<html><style>body{margin:0;background:#dce1e8;font:13px Arial}.grid{display:grid;grid-template-columns:repeat(3,280px)}figure{margin:0;padding:8px}figcaption{height:32px;overflow:hidden}img{display:block;width:264px}</style><div class="grid">' +
      selected.map(shot => '<figure><figcaption>' + shot.key + '</figcaption><img src="data:image/jpeg;base64,' + shot.image + '"></figure>').join('') + '</div></html>');
    await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
    const sheet = await page.screenshot({ type: 'jpeg', quality: 70, fullPage: true });
    await writeFile(join(output, 'review-sheet.jpg'), sheet);
    console.log('BARTER_QA_REVIEW_IMAGE ' + sheet.toString('base64'));
  } finally { await review.close(); }
} finally {
  server.kill('SIGTERM');
  await writeFile(join(output, 'server.log'), serverLogs.join(''));
  await writeFile(join(output, 'results.json'), JSON.stringify({
    scope: 'Production web build with browser-routed API fixtures; no live backend, real account, iPhone keyboard or physical safe area validation.',
    baseURL, results,
  }, null, 2));
}
if (results.length !== 4 || results.some(result => !result.passed)) process.exitCode = 1;
