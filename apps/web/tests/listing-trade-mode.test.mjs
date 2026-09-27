import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listingTradeMode, tradeModeFields, tradeModeLabel } from '../src/lib/listing-trade-mode.ts';
import { assertCatalogMode } from '../src/lib/catalog-mode.ts';

test('three modes roundtrip and older listings retain their opt-in', () => {
  for (const mode of ['sale', 'barter', 'both']) assert.equal(listingTradeMode(tradeModeFields(mode)), mode);
  assert.equal(listingTradeMode({}), 'sale');
  assert.equal(listingTradeMode({ attributes: { isBarter: true } }), 'both');
  assert.equal(listingTradeMode({ barterEnabled: false, isBarter: true }), 'sale');
  assert.equal(tradeModeLabel('barter'), 'Только обмен');
});

test('market rejects exchange-only rows including paid VIP placement', () => {
  for (const key of ['items', 'vipStrip']) assert.throws(() => assertCatalogMode({ [key]: [{ saleEnabled: false, barterEnabled: true }] }, 'market'), /market_filter_unavailable/);
});
