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
    sends: [], savedAttempts: new Map(), loseSendResponse: false, unexpected: [], rejectSend: false, rejectHistory: false, rejectList: false,
    uploads: [], rejectUpload: false, holdUpload: null,
    holdSend: null, holdHistory: null, historyStarted: false, guest: false,
    makeMessage: message,
  };
}
async function install(context, state, theme) {
  await context.addInitScript(theme => {
    // Accelerate only the upload deadline when explicitly enabled by the scenario.
    // The real browser AbortSignal still cancels fetch; production requests use 60000ms.
    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
    AbortSignal.timeout = ms => {
      if (ms === 60000) window.__uploadDeadline = ms;
      return nativeTimeout(ms === 60000 && window.__fastUploadTimeout ? 800 : ms);
    };
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
    const media = path.match(/^\/chats\/([ab])\/media$/);
    if (media && req.method() === 'POST') {
      const id = media[1];
      const multipart = req.postDataBuffer().toString();
      const clientMessageId = multipart.match(/name="clientMessageId"\r\n\r\n([^\r]+)/)?.[1];
      assert.match(clientMessageId ?? '', /^[0-9a-f-]{36}$/);
      state.uploads.push({ id, body: multipart, key: clientMessageId });
      if (state.holdUpload) await state.holdUpload;
      if (state.rejectUpload) return json({ message: 'upload unavailable' }, 503).catch(() => {});
      const attemptKey = 'media:' + id + ':' + clientMessageId;
      const previous = state.savedAttempts.get(attemptKey);
      if (previous) return json(previous).catch(() => {});
      const message = { ...state.makeMessage('media-' + state.uploads.length, 'Фото', state.user.id), mediaType: 'IMAGE', mediaUrl: null };
      state.messages[id].push(message);
      state.savedAttempts.set(attemptKey, message);
      return json(message).catch(() => {}); // A timed-out client may already have aborted.
    }
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
        state.sends.push({ id, text: body.text, key: body.clientMessageId });
        assert.match(body.clientMessageId, /^[0-9a-f-]{36}$/);
        if (state.holdSend) await state.holdSend;
        if (state.rejectSend) return json({ message: 'temporarily unavailable' }, 503);
        const attemptKey = id + ':' + body.clientMessageId;
        const previous = state.savedAttempts.get(attemptKey);
        if (previous) return json(previous, previous.text === body.text ? 200 : 409);
        const message = state.makeMessage('sent-' + state.sends.length, body.text, state.user.id);
        state.messages[id].push(message);
        state.savedAttempts.set(attemptKey, message);
        if (state.loseSendResponse) { state.loseSendResponse = false; return json({ message: 'response lost after commit' }, 503); }
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
    if (width < 768) {
      const bubble = page.locator('.message-bubble').first();
      await expect(bubble).toBeVisible();
      const mobileMetrics = await page.evaluate(() => {
        const bubble = document.querySelector('.message-bubble');
        const header = document.querySelector('.thread-header');
        const composer = document.querySelector('textarea[aria-label="Сообщение"]');
        return {
          bubbleFont: getComputedStyle(bubble).fontSize,
          bubbleLineHeight: getComputedStyle(bubble).lineHeight,
          headerHeight: Math.round(header.getBoundingClientRect().height),
          composerHeight: Math.round(composer.getBoundingClientRect().height),
        };
      });
      assert.equal(mobileMetrics.bubbleFont, '12.8px', 'Claude mobile message font');
      assert.equal(mobileMetrics.bubbleLineHeight, '18px', 'Claude mobile message leading');
      assert.equal(mobileMetrics.headerHeight, 61, 'Measured Claude conversation top area');
      assert.equal(mobileMetrics.composerHeight, 36, 'Claude composer pill height');
      await page.screenshot({ path: join(output, key + '-reference-conversation.png') });
      checks.push('reference mobile conversation geometry and screenshot');
    }
    if (width < 768) {
      await page.evaluate(() => {
        document.documentElement.style.setProperty('--safe-area-top', '59px');
        document.documentElement.style.setProperty('--safe-area-bottom', '34px');
      });
      const dock = page.locator('.magic-nav');
      // The reference chat is full-screen; only the chat list owns the dock.
      await expect(dock).toBeHidden();
      await page.getByRole('button', { name: 'Назад к списку' }).click();
      await expect(dock).toBeVisible();
      const dockY = (await dock.boundingBox()).y;
      const title = page.getByRole('heading', { name: 'Сообщения', exact: true }).last();
      assert((await title.boundingBox()).y >= 59, 'chat list title clears the system area');
      assert.equal(await page.evaluate(() => window.scrollY), 0);
      await choose('Анна');
      await expect(dock).toBeHidden();
      assert.equal(await page.evaluate(() => window.scrollY), 0, 'history scroll does not move the document');
      assert.equal(await page.locator('body').evaluate(el => Math.round(el.getBoundingClientRect().height)), 956);
      await page.screenshot({ path: join(output, key + '-safe-area.png') });
      await page.getByRole('button', { name: 'Назад к списку' }).click();
      await expect(dock).toBeVisible();
      assert(Math.abs((await dock.boundingBox()).y - dockY) < 1, 'dock stays anchored when returning to chat list');
      await choose('Анна');
      await page.evaluate(() => {
        document.documentElement.style.removeProperty('--safe-area-top');
        document.documentElement.style.removeProperty('--safe-area-bottom');
      });
      checks.push('full-screen chat, nav in list, safe-area title and stable list dock');
    }
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

    const beforeLoss = state.messages.a.length;
    await input.fill('Сохранено, но ответ потерян');
    state.loseSendResponse = true;
    await send.click();
    await expect(page.getByRole('alert').filter({ hasText: 'Нет подтверждения отправки' })).toBeVisible();
    await expect(input).toBeEnabled();
    const lostKey = state.sends.at(-1).key;
    assert.equal(state.messages.a.length, beforeLoss + 1);
    await choose('Борис');
    await choose('Анна');
    await expect(input).toHaveValue('Сохранено, но ответ потерян');
    await send.click();
    await expect(input).toHaveValue('');
    await expect(input).toBeEnabled();
    assert.equal(state.sends.at(-1).key, lostKey);
    assert.equal(state.messages.a.length, beforeLoss + 1);
    await expect(page.getByText('Сохранено, но ответ потерян', { exact: true })).toHaveCount(1);
    await input.fill('Сохранено, но ответ потерян');
    await send.click();
    await expect(input).toHaveValue('');
    await expect(input).toBeEnabled();
    assert.notEqual(state.sends.at(-1).key, lostKey);
    assert.equal(state.messages.a.length, beforeLoss + 2);
    checks.push('lost acknowledgement reuses key; new identical message uses a new key');

    // Real browser file input and multipart fetch; API persistence here is a fixture.
    const fileInput = page.getByLabel('Прикрепить фото или видео');
    const image = { name: 'attachment.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64') };
    await fileInput.setInputFiles(image);
    await input.fill('Подпись к фото');
    state.rejectUpload = true;
    await send.click();
    await expect(page.getByRole('alert').filter({ hasText: 'Нет подтверждения отправки' })).toBeVisible();
    await expect(input).toHaveValue('Подпись к фото');
    await expect(page.getByText(image.name, { exact: true })).toBeVisible();
    await expect(send).toBeEnabled();
    assert.equal(state.uploads.length, 1);
    assert.ok(state.uploads[0].body.includes('filename="attachment.png"'));
    assert.ok(state.uploads[0].body.includes('Подпись к фото'));
    await choose('Борис');
    await expect(page.getByText(image.name, { exact: true })).toHaveCount(0);
    await choose('Анна');
    await expect(page.getByText(image.name, { exact: true })).toBeVisible();
    await expect(input).toHaveValue('Подпись к фото');
    state.rejectUpload = false;
    await send.click();
    await expect(page.getByText(image.name, { exact: true })).toHaveCount(0);
    await expect(input).toHaveValue('');
    await expect(input).toBeEnabled();
    assert.equal(state.uploads.length, 2);
    assert.equal(state.uploads[0].key, state.uploads[1].key);
    checks.push('upload failure retains file/caption by chat; explicit retry clears confirmed draft');

    let releaseUpload;
    state.holdUpload = new Promise(resolve => { releaseUpload = resolve; });
    await fileInput.setInputFiles(image);
    await input.fill('Запоздалое фото');
    await send.evaluate(button => { button.click(); button.click(); });
    await expect.poll(() => state.uploads.length).toBe(3);
    await expect(send).toBeDisabled();
    await choose('Борис');
    await expect(input).toHaveValue('Черновик Борису');
    releaseUpload(); state.holdUpload = null;
    await expect(send).toBeEnabled();
    await expect(input).toHaveValue('Черновик Борису');
    assert.equal(state.uploads.at(-1).id, 'a');
    await choose('Анна');
    await expect(input).toHaveValue('');
    await expect(page.getByText(image.name, { exact: true })).toHaveCount(0);
    checks.push('late upload success and double click cannot clear another chat draft');

    await fileInput.setInputFiles(image);
    await input.fill('Фото без подтверждения');
    state.holdUpload = new Promise(resolve => { releaseUpload = resolve; });
    await page.evaluate(() => { window.__fastUploadTimeout = true; });
    await send.click();
    await expect.poll(() => state.uploads.length).toBe(4);
    await expect(page.getByRole('alert').filter({ hasText: 'Нет подтверждения отправки' })).toBeVisible();
    await expect(send).toBeEnabled();
    await expect(input).toHaveValue('Фото без подтверждения');
    await expect(page.getByText(image.name, { exact: true })).toBeVisible();
    assert.equal(await page.evaluate(() => window.__uploadDeadline), 60000);
    // Even if the server completes after the client abort, do not retry automatically.
    releaseUpload(); state.holdUpload = null;
    await expect.poll(() => state.messages.a.some(m => m.id === 'media-4')).toBe(true);
    await page.evaluate(() => { window.__fastUploadTimeout = false; });
    await page.getByRole('button', { name: 'Обновить переписку', exact: true }).click();
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue('Фото без подтверждения');
    await expect(page.getByText(image.name, { exact: true })).toBeVisible();
    assert.equal(state.uploads.length, 4);
    await choose('Борис');
    await choose('Анна');
    await expect(input).toHaveValue('Фото без подтверждения');
    await expect(page.getByText(image.name, { exact: true })).toBeVisible();
    await page.screenshot({ path: join(output, key + '-upload-timeout.png'), fullPage: true });
    checks.push('native upload abort releases busy, preserves draft and does not automatically repeat');
    const mediaCountBeforeRetry = state.messages.a.length;
    const lostMediaKey = state.uploads.at(-1).key;
    await send.click();
    await expect(input).toHaveValue('');
    await expect(input).toBeEnabled();
    await expect(page.getByText(image.name, { exact: true })).toHaveCount(0);
    assert.equal(state.uploads.at(-1).key, lostMediaKey);
    assert.equal(state.messages.a.length, mediaCountBeforeRetry);
    await fileInput.setInputFiles(image);
    await input.fill('Фото без подтверждения');
    await send.click();
    await expect(input).toHaveValue('');
    await expect(input).toBeEnabled();
    assert.notEqual(state.uploads.at(-1).key, lostMediaKey);
    assert.equal(state.messages.a.length, mediaCountBeforeRetry + 1);
    checks.push('media retry keeps key across chats; confirmed new operation gets a fresh key');


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
// Isolated VISUAL fixture: data reproduces the reference conversation spacing,
// while the screenshot is rendered by the real Next.js chat components.
async function referenceConversation(theme) {
  const browser = await webkit.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 850 }, isMobile: true, hasTouch: true,
    colorScheme: theme, reducedMotion: 'reduce',
  });
  const state = fixture(theme);
  state.chats[0].peer = { id: 'peer-a', name: 'Максим', avatarUrl: null };
  state.chats[0].listing = {
    id: 'fixture-phone', title: 'iPhone 15 Pro', category: { title: 'Смартфоны' },
    priceRub: 95000, city: 'Краснодар', saleEnabled: true, barterEnabled: true,
    previewImageUrl: null,
  };
  const msg = (id, text, senderId, time) => ({
    ...state.makeMessage(id, text, senderId),
    createdAt: '2026-09-19T' + time + ':00Z',
    isReadByPeer: senderId === 'fixture-user',
  });
  state.messages.a = [
    msg('ref-1', 'Здравствуйте! Интересует обмен на ваш iPhone 15 Pro.', 'fixture-user', '10:24'),
    msg('ref-2', 'Здравствуйте! Да, давайте обсудим варианты. Что вы предлагаете?', 'peer-a', '10:26'),
    msg('ref-3', 'Моё предложение: MacBook Air M2, доплата 20 000 ₽.', 'fixture-user', '10:27'),
    msg('ref-4', 'Выглядит интересно, можно подробнее про состояние MacBook?', 'peer-a', '10:29'),
    msg('ref-5', 'Конечно! MacBook в отличном состоянии, использовался аккуратно. Могу отправить дополнительные фото и чек, если нужно.', 'fixture-user', '10:33'),
    msg('ref-6', 'Отлично, давайте созвонимся сегодня и обсудим детали.', 'peer-a', '10:34'),
  ];
  await install(context, state, theme);
  const page = await context.newPage();
  try {
    await page.goto(baseURL + '/messages?chatId=a');
    await expect(page.getByText('Отлично, давайте созвонимся сегодня и обсудим детали.', { exact: true })).toBeVisible();
    await expect(page.locator('.thread-listing-preview')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(output, 'reference-conversation-393x850-' + theme + '.png') });
    const geometry = await page.evaluate(() => {
      const rect = selector => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const { x, y, width, height } = el.getBoundingClientRect();
        return { x, y, width, height };
      };
      return {
        header: rect('.thread-header'),
        listing: rect('.thread-listing-preview'),
        bubble: rect('.message-bubble'),
        composer: rect('.messages-composer'),
        input: rect('textarea[aria-label="Сообщение"]'),
      };
    });
    await writeFile(join(output, 'reference-conversation-393x850-' + theme + '-geometry.json'), JSON.stringify(geometry, null, 2));
    assert.equal(Math.round(geometry.header.height), 61);
    assert.equal(Math.round(geometry.listing.height), 80);
    assert.equal(Math.round(geometry.input.height), 36);
    console.log('BARTER_MESSAGES_REFERENCE_PASS ' + theme);
  } finally { await context.close(); await browser.close(); }
}

async function chatListRecovery() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 393, height: 850 }, isMobile: true, hasTouch: true, colorScheme: 'light' });
  const state = fixture('light');
  state.rejectList = true;
  await install(context, state, 'light');
  const page = await context.newPage();
  const chatPaths = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.endsWith('/chats')) chatPaths.push(url.pathname);
  });
  try {
    await page.goto(baseURL + '/messages');
    await expect(page.getByRole('alert').filter({ hasText: 'Сервис сообщений временно недоступен' })).toBeVisible();
    await page.screenshot({ path: join(output, 'messages-list-393x850-server-error.png') });
    state.rejectList = false;
    await page.getByRole('button', { name: 'Повторить загрузку' }).click();
    await expect(page.getByRole('button', { name: /Анна/ })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Сервис сообщений временно недоступен' })).toHaveCount(0);
    await page.screenshot({ path: join(output, 'messages-list-393x850-loaded.png') });
    assert(chatPaths.some(path => path === '/api/backend/chats'), 'at least one chat read must use same-origin proxy: ' + JSON.stringify(chatPaths));
    console.log('BARTER_MESSAGES_RECOVERY_PASS 393x850');
  } finally { await context.close(); await browser.close(); }
}
try {
  await waitForServer();
  for (const theme of ['light', 'dark']) await referenceConversation(theme);
  await chatListRecovery();
  for (const theme of ['light', 'dark']) for (const width of [360, 440, 1280]) await scenario(width < 768 ? webkit : chromium, width, theme);
} finally {
  server.kill('SIGTERM');
  await writeFile(join(output, 'server.log'), serverLogs.join(''));
  await writeFile(join(output, 'results.json'), JSON.stringify({ scope: 'Production build, isolated API/auth fixtures; no real messages or physical iPhone.', results }, null, 2));
}
if (results.length !== 6 || results.some(x => !x.passed)) process.exitCode = 1;
