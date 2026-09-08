import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const profile = readFileSync(new URL('../src/app/profile/profile-content.tsx', import.meta.url), 'utf8');
const wallet = readFileSync(new URL('../src/app/wallet/page.tsx', import.meta.url), 'utf8');

test('profile preserves the wallet route without a fake balance or top-up modal', () => {
  assert.match(profile, /href="\/wallet"/);
  assert.doesNotMatch(profile, /1,500 ₽|showTopUp|setTopUpAmount|Handle top-up logic/);
});

test('wallet has no mock top-up request or promise of instant credit', () => {
  assert.doesNotMatch(wallet, /\/wallet\/topup|Зачислено|мокаются|TOPUP_PRESETS/);
  assert.match(wallet, /Пополнение пока недоступно/);
  assert.match(wallet, /\/wallet\/balance/);
  assert.match(wallet, /\/wallet\/transactions/);
});

test('wallet distinguishes failed history and subscription requests from empty results', () => {
  assert.match(wallet, /setHistoryError\(!tx.ok\)/);
  assert.match(wallet, /setSubscriptionError\(!sub.ok\)/);
  assert.match(wallet, /Не удалось загрузить историю/);
  assert.match(wallet, /Не удалось загрузить подписку/);
  assert.match(wallet, /next=%2Fwallet/);
});
