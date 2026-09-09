import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createActionGate, actionErrorMessage } from '../src/lib/action-gate.ts';
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
