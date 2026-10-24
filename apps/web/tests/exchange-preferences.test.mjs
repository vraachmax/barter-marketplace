import assert from 'node:assert/strict';
import test from 'node:test';
import { compatibleHandoffMethods, suggestedHandoffMethod, emptyExchangePreferences, exchangePreferencesError, supportsStructuredWishes } from '../src/lib/exchange-preferences.ts';

test('specific wishes replace the need for broad categories or free text', () => {
  const value = { ...emptyExchangePreferences(), handoffMethods:['MEETING'], anyOffer: false, wantedItems: [{ categoryId: 'cars', attributes: { auto_make: 'bmw' } }] };
  assert.equal(exchangePreferencesError(value), null);
  assert(exchangePreferencesError({ ...value, wantedItems: [{ categoryId: 'cars', attributes: {} }] }));
  assert(exchangePreferencesError({ ...value, wantedItems: [...value.wantedItems, ...value.wantedItems] }));
  assert(exchangePreferencesError({ ...value, wantedItems: Array(6).fill(value.wantedItems[0]) }));
  assert(exchangePreferencesError({ ...value, wantedItems: [] }));
  assert(exchangePreferencesError({ ...value, handoffMethods: [] }));
  assert.equal(exchangePreferencesError({ ...value, handoffMethods: ['MEETING'] }), null);
  assert(exchangePreferencesError({ ...value, handoffMethods: ['MEETING','MEETING'] }));
});

test('old API may accept old wishes but cannot silently ignore new writes or clearing', () => {
  assert(supportsStructuredWishes({}, emptyExchangePreferences()));
  assert(!supportsStructuredWishes({}, { ...emptyExchangePreferences(), wantedItems: [] }));
  assert(supportsStructuredWishes({ structuredWishesVersion: 1 }, { ...emptyExchangePreferences(), wantedItems: [] }));
  assert(!supportsStructuredWishes({ structuredWishesVersion: 2 }, { ...emptyExchangePreferences(), wantedItems: [] }));
});

test('shared handoff only includes methods explicitly permitted by every selected listing', () => {
  const meeting = {handoffMethods:['MEETING']};
  const delivery = {handoffMethods:['DELIVERY']};
  assert.deepEqual(compatibleHandoffMethods([meeting,delivery]),[]);
  assert.deepEqual(compatibleHandoffMethods([]),[]);
  assert.deepEqual(compatibleHandoffMethods([null,delivery]),[]);
  assert.deepEqual(compatibleHandoffMethods([{handoffMethods:['DELIVERY','ONLINE']},{handoffMethods:['DELIVERY']}]),['DELIVERY']);
  assert.deepEqual(compatibleHandoffMethods([{handoffMethods:['MEETING','ONLINE']},{handoffMethods:['ONLINE']}]),['ONLINE']);
});

test('suggestion does not silently assume a meeting when only delivery is offered', () => {
  const delivery={handoffMethods:['DELIVERY']};
  const meeting={handoffMethods:['MEETING']};
  assert.equal(suggestedHandoffMethod([delivery,delivery],delivery),'DELIVERY');
  assert.equal(suggestedHandoffMethod([meeting,delivery],delivery),'DELIVERY');
  assert.equal(suggestedHandoffMethod([meeting,delivery],meeting),'MEETING');
  assert.equal(suggestedHandoffMethod([null],delivery),'DELIVERY');
  assert.equal(suggestedHandoffMethod([null]),'MEETING'); // Suggested only: still requires explicit exception consent.
});
