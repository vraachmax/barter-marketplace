import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCatalogAttrs, searchFilterHref } from '../src/lib/search-navigation.ts';

test('applying filters preserves query, city and mode and clears the old page', () => {
  const href = searchFilterHref('q=велосипед&city=Краснодар&page=4', { categoryId: 'sport', priceMin: '0', priceMax: '5000', sort: 'cheap' }, 'barter');
  const params = new URL(href, 'https://example.test').searchParams;
  assert.deepEqual(Object.fromEntries(params), { q: 'велосипед', city: 'Краснодар', categoryId: 'sport', priceMin: '0', priceMax: '5000', sort: 'cheap', mode: 'barter' });
});

test('reset removes only filters and keeps the search context', () => {
  const href = searchFilterHref('q=телефон&city=Москва&categoryId=phones&priceMin=10&priceMax=100&sort=new', { categoryId: '', priceMin: '', priceMax: '', sort: 'relevant' }, 'market');
  assert.deepEqual(Object.fromEntries(new URL(href, 'https://example.test').searchParams), { q: 'телефон', city: 'Москва', mode: 'market' });
});

test('query is safely encoded and replacing one filter preserves the others', () => {
  const href = searchFilterHref('priceMin=10&priceMax=100', { q: '  a & b # c  ', priceMin: '' }, 'market');
  assert.deepEqual(Object.fromEntries(new URL(href, 'https://example.test').searchParams), { q: 'a & b # c', priceMax: '100', mode: 'market' });
});

test('catalog choices survive sorting and mode, but clear when category changes', () => {
  const attrs = JSON.stringify({ fuel: 'electric' });
  const initial = `categoryId=auto&attrs=${encodeURIComponent(attrs)}&page=3`;
  assert.equal(new URL(searchFilterHref(initial, { sort: 'new' }, 'barter'), 'https://example.test').searchParams.get('attrs'), attrs);
  assert.equal(new URL(searchFilterHref(initial, { categoryId: 'job' }, 'market'), 'https://example.test').searchParams.has('attrs'), false);
});

test('invalid attribute links cannot crash the filter sheet', () => {
  assert.deepEqual(parseCatalogAttrs('{"fuel":"petrol"}'), { fuel: 'petrol' });
  assert.deepEqual(parseCatalogAttrs('{not json'), {});
  assert.deepEqual(parseCatalogAttrs('[]'), {});
});
