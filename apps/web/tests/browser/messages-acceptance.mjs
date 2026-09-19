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
const baseURL = 'http://127.0.0.1:3202';
const output = join(webRoot, 'test-results/messages');
await mkdir(output, { recursive: true });
const serverLogs = [];
const server = spawn(process.execPath, [webRequire.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', '3202'], {
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
  const message = (id, text, senderId = 'peer-a') => ({ id, text, senderId, sender: { id: senderId, name: 'Анна' }, createdAt: '2026-09-19T12:00:00Z', mediaUrl: null, mediaType: null });
  return {
    user: { id: 'fixture-user', name: 'Покупатель', email: 'buyer@example.test', appTheme: theme.toUpperCase() },
    chats: ['a', 'b'].map(id => ({ id, peer: { id: 'peer-' + id, name: id === 'a' ? 'Анна' : 'Борис' }, listing: null, myRole: 'buyer', unreadCount: 0, updatedAt: '2026-09-19T12:00:00Z', lastMessage: null })),
    messages: { a: [message('a-1', 'Сообщение Анны')], b: [message('b-1', 'Сообщение Бориса', 'peer-b')] },
    sends: [], unexpected: [], rejectSend: false, rejectHistory: false, rejectList: false,
    holdSend: null, holdHistory: null, historyStarted: false, guest: false,
    makeMessage: message,
  };
}
async function install(context, state, theme) {
  await context.addInitScript(theme => {
    localStorage.setItem('barter_token', 'isolated-ui-fixture');
    localStorage.setItem('barter_theme_pref', theme.toUpperCase());
  }, theme);
  await context.routeWebSocket(/.*/, socket => socket.close());
  await context.route(url => url.hostname !== '127.0.0.1' || url.pathname.startsWith('/api/backend/') || url.pathname.startsWith('/socket.io') || url.pathname === '/auth/me', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.hostname !== '127.0.0.1') { state.unexpected.push(url.origin); return route.abort(); }
    const path = url.pathname.replace(/^\/api\/backend/, '');
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path.startsWith('/socket.io')) return json({}, 400);
    if (path === '/auth/me') return json(state.user, req.headers().authorization && !state.guest ? 200 : 401);
    if (path === '/chats') return json(state.chats, state.guest ? 401 : state.rejectList ? 503 : 200);
    if (path === '/support/templates' || path === '/support/faq') return json([]);
    if (path === '/support/advise') return json({ tip: null, suggestions: [] });
    const match = path.match(/^\/chats\/([ab])\/messages$/);
    if (match) {
      const id = match[1];
      if (req.method() === 'GET') {
        const snapshot = [...state.messages[id]];
        if (id === 'a' && state.holdHistory) { state.historyStarted = true; await state.holdHistory; }
        return json(snapshot, state.rejectHistory ? 503 : 200);
      }
      if (req.method() === 'POST') {
        const body = req.postDataJSON();
        state.sends.push({ id, text: body.text });
        if (state.holdSend) await state.holdSend;
        if (state.rejectSend) return json({ message: 'temporarily unavailable' }, 503);
        const message = state.makeMessage('sent-' + state.sends.length, body.text, state.user.id);
        state.messages[id].push(message);
        return json(message);
      }
    }
    state.unexpected.push(req.method() + ' ' + path);
    return json({}, 404);
  });
}
async function scenario(type, width, theme) {
  const browser = await type.launch();
  const context = await browser.newContext({ viewport: { width, height: 956 }, isMobile: width < 768, hasTouch: width < 768, colorScheme: theme, reducedMotion: 'reduce' });
  const state = fixture(theme);
  await install(context, state, theme);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const key = type.name() + '-' + width + '-' + theme;
  const checks = [];
  const input = page.getByRole('textbox', { name: 'Сообщение', exact: true });
  const send = page.getByRole('button', { name: 'Отправить', exact: true });
  const choose = async name => {
    if (width < 768 && await page.getByRole('button', { name: 'Назад к списку' }).isVisible()) await page.getByRole('button', { name: 'Назад к списку' }).click();
    await page.getByRole('button', { name: new RegExp(name) }).click();
  };
  try {
    await page.goto(baseURL + '/messages?chatId=a');
    await expect(page.getByText('Сообщение Анны', { exact: true })).toBeVisible();
    await input.fill('Черновик Анне');
    await choose('Борис');
    await expect(page.getByText('Сообщение Бориса', { exact: true })).toBeVisible();
    await expect(input).toHaveValue('');
    await input.fill('Черновик Борису');
    await choose('Анна');
    await expect(input).toHaveValue('Черновик Анне');
    await expect(page).toHaveURL(/chatId=a/);
    checks.push('separate drafts and URL navigation');

    state.rejectSend = true;
    await send.click();
    await expect(page.getByRole('alert').filter({ hasText: 'Нет подтверждения отправки' })).toBeVisible();
    await expect(input).toHaveValue('Черновик Анне');
    assert.equal(state.messages.a.length, 1);
    await page.getByRole('button', { name: 'Обновить переписку', exact: true }).click();
    state.rejectSend = false;
    await send.click();
    await expect(input).toHaveValue('');
    await expect(page.getByText('Черновик Анне', { exact: true })).toHaveCount(1);
    assert.equal(state.sends.length, 2);
    checks.push('failed send preserves draft; explicit retry renders one message');

    await input.fill('Отправка в старый чат');
    let releaseSend;
    state.holdSend = new Promise(resolve => { releaseSend = resolve; });
    await send.evaluate(button => { button.click(); button.click(); });
    await expect(send).toBeDisabled();
    await choose('Борис');
    await expect(input).toHaveValue('Черновик Борису');
    releaseSend(); state.holdSend = null;
    await expect(send).toBeEnabled();
    await expect(input).toHaveValue('Черновик Борису');
    await expect(page.getByText('Отправка в старый чат', { exact: true })).toHaveCount(0);
    assert.equal(state.sends.length, 3);
    assert.equal(state.sends[2].id, 'a');
    checks.push('late send cannot clear or populate another conversation');

    let releaseHistory;
    state.holdHistory = new Promise(resolve => { releaseHistory = resolve; });
    await choose('Анна');
    await expect.poll(() => state.historyStarted).toBe(true);
    await choose('Борис');
    await expect(page.getByText('Сообщение Бориса', { exact: true })).toBeVisible();
    releaseHistory(); state.holdHistory = null;
    await expect(page.getByText('Сообщение Анны', { exact: true })).toHaveCount(0);
    await expect(input).toHaveValue('Черновик Борису');
    checks.push('late history response cannot replace current conversation');

    state.rejectHistory = true;
    await choose('Анна');
    await expect(page.getByText('Не удалось загрузить переписку', { exact: true })).toBeVisible();
    await expect(send).toBeDisabled();
    state.rejectHistory = false;
    await page.getByRole('button', { name: 'Обновить переписку', exact: true }).click();
    await expect(page.getByText('Отправка в старый чат', { exact: true })).toBeVisible();
    const long = 'ОченьДлинноеСлово'.repeat(160);
    await input.fill(long);
    await send.click();
    await expect(page.getByText(long, { exact: true })).toBeVisible();
    await expect(input).toHaveAttribute('maxlength', '4000');
    const geometry = await send.evaluate(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, viewport: innerHeight, width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }; });
    assert(geometry.height >= 44 && geometry.top >= 0 && geometry.bottom <= geometry.viewport);
    assert(geometry.scrollWidth <= geometry.width + 1);
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue('');
    await input.focus();
    await expect(input).toBeFocused();
    await page.screenshot({ path: join(output, key + '.png'), fullPage: true });
    if (width === 440) {
      const encoded = (await page.screenshot({ type: 'jpeg', quality: 65 })).toString('base64');
      for (let offset = 0; offset < encoded.length; offset += 6000) console.log('BARTER_MESSAGES_IMAGE ' + key + ' ' + offset + ' ' + encoded.slice(offset, offset + 6000));
    }
    checks.push('history error/retry, long text, focus and composer geometry');

    await choose('Борис');
    await page.goBack();
    await expect(page).toHaveURL(width < 768 ? /\/messages$/ : /chatId=a/);
    if (width < 768) await expect(page.getByRole('searchbox', { name: 'Поиск по диалогам' })).toBeVisible();
    assert.deepEqual(errors, []);
    assert.deepEqual(state.unexpected, []);
    checks.push('browser back and no unexpected API calls');
    results.push({ key, passed: true, checks });
    console.log('BARTER_MESSAGES_PASS ' + key + ' ' + checks.length + ' checks');
  } catch(error) {
    await page.screenshot({ path: join(output, key + '-failure.png'), fullPage: true }).catch(() => {});
    results.push({ key, passed: false, checks, error: error.stack, errors, unexpected: state.unexpected });
    console.error('BARTER_MESSAGES_FAIL ' + key + '\n' + error.stack);
  } finally { await context.close(); await browser.close(); }
}
try {
  await waitForServer();
  for (const theme of ['light', 'dark']) for (const width of [360, 440, 1280]) await scenario(width < 768 ? webkit : chromium, width, theme);
} finally {
  server.kill('SIGTERM');
  await writeFile(join(output, 'server.log'), serverLogs.join(''));
  await writeFile(join(output, 'results.json'), JSON.stringify({ scope: 'Production build, isolated API/auth fixtures; no real messages or physical iPhone.', results }, null, 2));
}
if (results.length !== 6 || results.some(x => !x.passed)) process.exitCode = 1;
