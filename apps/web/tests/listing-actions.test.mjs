import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createActionGate, actionErrorMessage, createListingActionRunner } from '../src/lib/action-gate.ts';
import { ApiRequestError } from '../src/lib/api-error.ts';

test('duplicate actions are blocked before render, then allowed after completion', async () => {
  const gate = createActionGate();
  let finish;
  let calls = 0;
  const first = gate.run(() => { calls++; return new Promise((resolve) => { finish = resolve; }); });
  assert.equal(await gate.run(async () => { calls++; }), false);
  assert.equal(calls, 1);
  finish();
  assert.equal(await first, true);
  assert.equal(await gate.run(async () => { calls++; }), true);
  assert.equal(calls, 2);
});

test('a rejected action releases the lock for retry', async () => {
  const gate = createActionGate();
  await assert.rejects(gate.run(async () => { throw new Error('network'); }));
  assert.equal(await gate.run(async () => {}), true);
});

test('action errors distinguish login, access, missing item, validation and uncertain results', () => {
  assert.match(actionErrorMessage(401), /Войдите/);
  assert.match(actionErrorMessage(403), /прав/);
  assert.match(actionErrorMessage(404), /недоступно/);
  assert.match(actionErrorMessage(422), /поля/);
  assert.match(actionErrorMessage(429), /Подождите/);
  for (const status of [0, 500, 502]) assert.match(actionErrorMessage(status), /перед повторной/);
});

test('HTTP status remains typed rather than inferred from an error string', () => {
  const error = new ApiRequestError(404, '/listings/missing');
  assert.ok(error instanceof Error);
  assert.equal(error.status, 404);
  assert.equal(new ApiRequestError(500, '/listings/missing').status, 500);
});

test('confirmed action closes editor, refreshes once and reports success', async () => {
  const states = [];
  const calls = [];
  const saved = await createListingActionRunner()({
    request: async () => { calls.push('request'); return { ok: true }; },
    onSuccess: () => calls.push('close'),
    refresh: async () => { calls.push('refresh'); return true; },
    onState: (state) => states.push(state),
  });
  assert.equal(saved, true);
  assert.deepEqual(calls, ['request', 'close', 'refresh']);
  assert.equal(states[0].busy, true);
  assert.deepEqual(states.at(-1), { busy: false, notice: 'Изменения сохранены.', error: false, needsLogin: false });
});

test('HTTP rejection preserves editor and identifies expired login', async () => {
  for (const status of [401, 403, 404, 422, 429, 500, 0]) {
    const states = [];
    const saved = await createListingActionRunner()({
      request: async () => ({ ok: false, status }),
      onSuccess: () => assert.fail('must not close editor'),
      refresh: async () => assert.fail('must not refresh after failed mutation'),
      onState: (state) => states.push(state),
    });
    assert.equal(saved, false);
    assert.equal(states.at(-1).busy, false);
    assert.equal(states.at(-1).error, true);
    assert.equal(states.at(-1).needsLogin, status === 401);
    assert.equal(states.at(-1).notice, actionErrorMessage(status));
  }
});

test('failed refresh cannot turn a confirmed mutation into a retryable failed save', async () => {
  for (const throws of [false, true]) {
    const states = [];
    let closed = 0;
    const saved = await createListingActionRunner()({
      request: async () => ({ ok: true }),
      onSuccess: () => closed++,
      refresh: async () => { if (throws) throw new Error('offline'); return false; },
      onState: (state) => states.push(state),
    });
    assert.equal(saved, true);
    assert.equal(closed, 1);
    assert.equal(states.at(-1).error, true);
    assert.equal(states.at(-1).busy, false);
    assert.match(states.at(-1).notice, /сохранены, но список не загрузился/);
  }
});

test('action runner blocks duplicates until refresh finishes', async () => {
  const run = createListingActionRunner();
  let finish;
  let requestCount = 0;
  const pending = new Promise((resolve) => { finish = resolve; });
  const options = {
    request: async () => { requestCount++; return { ok: true }; },
    refresh: () => pending,
    onState: () => {},
  };
  const first = run(options);
  assert.equal(await run(options), false);
  assert.equal(requestCount, 1);
  finish(true);
  assert.equal(await first, true);
  assert.equal(await run({ ...options, refresh: async () => true }), true);
  assert.equal(requestCount, 2);
});

test('network rejection reports uncertain result, releases lock and clears login error on retry', async () => {
  const run = createListingActionRunner();
  const states = [];
  const base = { onState: (state) => states.push(state), refresh: async () => true };
  assert.equal(await run({ ...base, request: async () => ({ ok: false, status: 401 }) }), false);
  assert.equal(states.at(-1).needsLogin, true);
  assert.equal(await run({ ...base, request: async () => { throw new Error('timeout'); } }), false);
  assert.equal(states.at(-1).needsLogin, false);
  assert.equal(states.at(-1).busy, false);
  assert.match(states.at(-1).notice, /перед повторной/);
  assert.equal(await run({ ...base, request: async () => ({ ok: true }) }), true);
  assert.equal(states.at(-1).error, false);
});
