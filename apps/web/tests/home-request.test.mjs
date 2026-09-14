import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHomeRequest, HOME_REQUEST_TIMEOUT_MS } from '../src/lib/home-request.ts';
import { catalogErrorMessage } from '../src/lib/catalog-mode.ts';

test('home shares one deadline across parallel reads and recommendation fallback', async () => {
  const controller = new AbortController();
  const paths = [];
  const request = createHomeRequest(async (path, init) => {
    assert.equal(init.signal, controller.signal);
    paths.push(path);
    if (path === '/similar') throw new Error('unavailable');
    return path;
  }, controller.signal);
  const result = await Promise.all([
    request('/categories'),
    request('/similar').catch(() => request('/recommendations')),
  ]);
  assert.deepEqual(result, ['/categories', '/recommendations']);
  assert.deepEqual(paths, ['/categories', '/similar', '/recommendations']);
  assert.equal(HOME_REQUEST_TIMEOUT_MS, 8000);
});

test('an expired deadline does not start another fallback request', async () => {
  const controller = new AbortController();
  const reason = new DOMException('deadline', 'TimeoutError');
  let calls = 0;
  const request = createHomeRequest(async () => {
    calls++;
    controller.abort(reason);
    throw new Error('wrapped network failure');
  }, controller.signal);
  await assert.rejects(request('/similar').catch(() => request('/recommendations')), error => error === reason);
  assert.equal(calls, 1);
});

test('a pending network read is cancelled and preserves the timeout message', async () => {
  const controller = new AbortController();
  const request = createHomeRequest(async (_path, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('wrapped network failure')), { once: true });
  }), controller.signal);
  const pending = request('/listings');
  const reason = new DOMException('deadline', 'TimeoutError');
  controller.abort(reason);
  await assert.rejects(pending, error => error === reason);
  assert.match(catalogErrorMessage(reason), /Сервер отвечает дольше обычного/);
});

test('a categories failure does not discard a successful feed or mask non-timeout errors', async () => {
  const error = new Error('barter_filter_unavailable');
  const request = createHomeRequest(async path => {
    if (path === '/categories') throw error;
    return { items: [{ id: '1' }] };
  }, new AbortController().signal);
  const [categories, feed] = await Promise.allSettled([request('/categories'), request('/listings')]);
  assert.equal(categories.reason, error);
  assert.equal(feed.status, 'fulfilled');
  assert.deepEqual(feed.value.items, [{ id: '1' }]);
  assert.match(catalogErrorMessage(error), /после обновления сервера/);
});
