import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
import { formatListingPrice, listingLoginHref } from '../src/lib/listing-presentation.ts';

// Execute the real event handlers without a browser or a live API.
// This does not replace visual, focus, or real-device acceptance.
function harness(request, browser = {}) {
  const state = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = { current: initial };
      return state[index];
    },
  };
  const source = readFileSync(new URL('../src/components/listing-actions.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports, AbortSignal, Error,
    navigator: browser,
    window: { location: { href: 'https://example.test/listing/item-1' } },
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === '@/lib/api') return { apiFetchJson: request };
      if (name === '@/components/auth-provider') return { useAuth: () => ({ ready: true, user: { id: 'buyer' } }) };
      if (name === '@/lib/listing-presentation') return { listingLoginHref };
      return new Proxy({}, { get: (_, key) => String(key) });
    },
  });
  return (component) => {
    cursor = 0;
    return exports[component]({ listingId: 'item-1', title: 'Объявление' });
  };
}

function nodes(tree) {
  if (tree == null || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree !== 'object') return [tree];
  return [tree, ...nodes(tree.props?.children)];
}
function button(tree, caption) {
  return nodes(tree).find((node) => node?.type === 'Button' && nodes(node.props.children).includes(caption));
}

test('report rejects API errors and offers retry instead of showing false success', async () => {
  const render = harness(async () => ({ ok: false, status: 500, message: 'unavailable' }));
  button(render('ListingReportButton'), 'Отправить жалобу').props.onClick();
  await new Promise((done) => setImmediate(done));
  const tree = render('ListingReportButton');
  assert(nodes(tree).includes('Не удалось отправить жалобу. Попробуйте ещё раз.'));
  assert(!nodes(tree).includes('Жалоба отправлена на рассмотрение.'));
});

test('report handles expired authentication with a return link', async () => {
  const render = harness(async () => ({ ok: false, status: 401, message: 'unauthorized' }));
  button(render('ListingReportButton'), 'Отправить жалобу').props.onClick();
  await new Promise((done) => setImmediate(done));
  const tree = render('ListingReportButton');
  assert(nodes(tree).includes('Войдите, чтобы отправить жалобу.'));
  assert.equal(button(tree, 'Войти').props.render.props.href, '/auth?mode=login&next=%2Flisting%2Fitem-1');
});

test('report allows one in-flight request and confirms only a successful response', async () => {
  let resolve;
  let calls = 0;
  const render = harness(async (path, init) => {
    calls++;
    assert.equal(path, '/listings/item-1/report');
    assert.equal(JSON.parse(init.body).reason, 'Недостоверная информация');
    return new Promise((done) => { resolve = done; });
  });
  const send = button(render('ListingReportButton'), 'Отправить жалобу').props.onClick;
  send();
  send();
  assert.equal(calls, 1);
  assert(button(render('ListingReportButton'), 'Отправляем…').props.disabled);
  resolve({ ok: true, data: {} });
  await new Promise((done) => setImmediate(done));
  assert(nodes(render('ListingReportButton')).includes('Жалоба отправлена на рассмотрение.'));
});

test('cancelling native share does not copy the URL', async () => {
  let copies = 0;
  const error = new Error('cancelled');
  error.name = 'AbortError';
  const render = harness(null, { share: async () => { throw error; }, clipboard: { writeText: async () => { copies++; } } });
  const trigger = button(render('ListingShareButton'), 'Поделиться');
  assert.equal(trigger.props['aria-label'], 'Поделиться');
  trigger.props.onClick();
  await new Promise((done) => setImmediate(done));
  assert.equal(copies, 0);
});

test('blocked clipboard opens a manual link instead of silently failing', async () => {
  const render = harness(null, { clipboard: { writeText: async () => { throw new Error('blocked'); } } });
  button(render('ListingShareButton'), 'Поделиться').props.onClick();
  await new Promise((done) => setImmediate(done));
  assert.equal(render('ListingShareButton').props.open, true);
});

test('listing price preserves billing period and zero, login preserves destination', () => {
  assert.equal(formatListingPrice(3500, 'per_shift'), '3\u00a0500 ₽ за смену');
  assert.equal(formatListingPrice(0), '0 ₽');
  assert.equal(formatListingPrice(null, 'per_month'), 'Цена договорная');
  assert.equal(new URL(listingLoginHref('abc'), 'https://example.test').searchParams.get('next'), '/listing/abc');
});
