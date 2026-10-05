import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyExchangePreferences, exchangePreferencesError, supportsStructuredWishes } from '../src/lib/exchange-preferences.ts';

test('specific wishes replace the need for broad categories or free text', () => {
  const value = { ...emptyExchangePreferences(), anyOffer: false, wantedItems: [{ categoryId: 'cars', attributes: { auto_make: 'bmw' } }] };
  assert.equal(exchangePreferencesError(value), null);
  assert(exchangePreferencesError({ ...value, wantedItems: [{ categoryId: 'cars', attributes: {} }] }));
  assert(exchangePreferencesError({ ...value, wantedItems: [...value.wantedItems, ...value.wantedItems] }));
  assert(exchangePreferencesError({ ...value, wantedItems: Array(6).fill(value.wantedItems[0]) }));
  assert(exchangePreferencesError({ ...value, wantedItems: [] }));
});

test('old API may accept old wishes but cannot silently ignore new writes or clearing', () => {
  assert(supportsStructuredWishes({}, emptyExchangePreferences()));
  assert(!supportsStructuredWishes({}, { ...emptyExchangePreferences(), wantedItems: [] }));
  assert(supportsStructuredWishes({ structuredWishesVersion: 1 }, { ...emptyExchangePreferences(), wantedItems: [] }));
  assert(!supportsStructuredWishes({ structuredWishesVersion: 2 }, { ...emptyExchangePreferences(), wantedItems: [] }));
});
