import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { favoritesReducer as reduce, initialFavoritesState as initial } from '../src/lib/favorites-state.ts';
import { authReturnPath } from '../src/lib/auth-return.ts';

const items = [{ id: 'fav1', listing: { id: 'one' } }, { id: 'fav2', listing: { id: 'two' } }];
const loaded = () => reduce(initial, { type: 'loaded', items });

describe('favorites state', () => {
  it('distinguishes empty success, network error and login required', () => {
    assert.equal(reduce(initial, { type: 'loaded', items: [] }).phase, 'ready');
    for (const status of [0, 403, 429, 500]) assert.equal(reduce(initial, { type: 'load-failed', status }).phase, 'error');
    assert.equal(reduce(initial, { type: 'load-failed', status: 401 }).phase, 'unauthorized');
  });
  it('keeps a row until confirmed removal and ignores duplicate starts', () => {
    const pending = reduce(loaded(), { type: 'remove-start', id: 'one' });
    assert.deepEqual(pending.items, items);
    assert.equal(reduce(pending, { type: 'remove-start', id: 'one' }), pending);
    const done = reduce(pending, { type: 'remove-done', id: 'one' });
    assert.deepEqual(done.items, [items[1]]);
    assert.deepEqual(done.pending, []);
    assert.ok(done.notice);
  });
  it('keeps failed removal visible, enables retry and clears its error on retry', () => {
    const pending = reduce(loaded(), { type: 'remove-start', id: 'one' });
    const failed = reduce(pending, { type: 'remove-failed', id: 'one', status: 0 });
    assert.deepEqual(failed.items, items);
    assert.deepEqual(failed.pending, []);
    assert.ok(failed.errors.one);
    assert.equal(reduce(failed, { type: 'remove-start', id: 'one' }).errors.one, '');
  });
  it('settles concurrent removals independently', () => {
    let state = reduce(reduce(loaded(), { type: 'remove-start', id: 'one' }), { type: 'remove-start', id: 'two' });
    state = reduce(state, { type: 'remove-failed', id: 'two', status: 500 });
    state = reduce(state, { type: 'remove-done', id: 'one' });
    assert.deepEqual(state.items, [items[1]]);
    assert.ok(state.errors.two);
    assert.deepEqual(state.pending, []);
  });
  it('hides account rows when the session expires', () => {
    const state = reduce(loaded(), { type: 'remove-failed', id: 'one', status: 401 });
    assert.equal(state.phase, 'unauthorized');
    assert.deepEqual(state.items, []);
  });
});

describe('safe return after login', () => {
  it('preserves local path, query and hash', () => {
    for (const path of ['/favorites', '/search?q=test#results', '/listing/123']) assert.equal(authReturnPath(path), path);
  });
  it('rejects external destinations and auth loops', () => {
    for (const path of [null, '', 'https://evil.test', '//evil.test', '/\\evil.test', '/\nevil.test', 'javascript:alert(1)', '/auth', '/auth?next=/favorites', '/auth/yandex', '/x/../auth']) {
      assert.equal(authReturnPath(path), '/', String(path));
    }
  });
});
