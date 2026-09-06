import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertCatalogMode, catalogModeHref, modeFromCookie, parseCatalogMode } from '../src/lib/catalog-mode.ts';

describe('catalog mode contract', () => {
  it('defaults old cosmetic choices and invalid values to Market', () => {
    for (const value of [undefined, null, '', 'all', 'unknown']) assert.equal(parseCatalogMode(value), 'market');
    assert.equal(parseCatalogMode('barter'), 'barter');
    assert.equal(modeFromCookie('barter_mode=barter'), 'market');
    assert.equal(modeFromCookie('city=Москва; barter_catalog_mode=barter; theme=dark'), 'barter');
  });
  it('keeps explicit filters including an empty city, but resets pages/recommendations', () => {
    const url = new URL(catalogModeHref('/search', { q: 'айфон 14', city: '', categoryId: 'electronics', priceMin: '0', priceMax: '50000', sort: 'cheap', page: '3', reco: '1', lat: '0', lon: '0', radiusKm: '25' }, 'barter'), 'https://example.test');
    assert.equal(url.pathname, '/search');
    assert.deepEqual(Object.fromEntries(url.searchParams), { q: 'айфон 14', city: '', categoryId: 'electronics', priceMin: '0', priceMax: '50000', sort: 'cheap', lat: '0', lon: '0', radiusKm: '25', mode: 'barter' });
  });
  it('supports older API responses only in Market', () => {
    const old = { items: [{ id: '1' }] };
    assert.equal(assertCatalogMode(old, 'market'), old);
    assert.throws(() => assertCatalogMode(old, 'barter'), /barter_filter_unavailable/);
  });
  it('accepts verified barter rows and a genuinely empty filtered response', () => {
    for (const response of [{ appliedMode: 'barter', items: [], vipStrip: [] }, { appliedMode: 'barter', items: [{ isBarter: true }], vipStrip: [{ isBarter: true }] }]) {
      assert.equal(assertCatalogMode(response, 'barter'), response);
    }
  });
  it('rejects mismatched mode and ineligible regular or promoted rows', () => {
    for (const response of [{ appliedMode: 'market', items: [] }, { appliedMode: 'barter', items: [{ isBarter: false }] }, { appliedMode: 'barter', items: [], vipStrip: [{}] }, { appliedMode: 'barter', items: [null] }]) {
      assert.throws(() => assertCatalogMode(response, 'barter'), /barter_filter_unavailable/);
    }
  });
});
