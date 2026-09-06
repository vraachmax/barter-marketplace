import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAvailableCatalogCategories } from '../src/lib/catalog-categories.ts';

describe('catalog category navigation', () => {
  const tiles = [
    { slug: 'all', name: 'Все' },
    { slug: 'home', name: 'Для\u00a0дома и дачи' },
    { slug: 'sport', name: 'Спорт и туризм' },
    { slug: 'travel', name: 'Жильё для путешествий' },
  ];
  const categories = [
    { id: 'home-id', slug: 'home', title: 'Дом', parentId: null },
  ];

  it('uses the stable slug, independently of wording and whitespace', () => {
    assert.deepEqual(getAvailableCatalogCategories(tiles, categories), [
      { ...tiles[0], categoryId: '' },
      { ...tiles[1], categoryId: 'home-id' },
    ]);
  });

  it('never renders a missing category as an unfiltered link', () => {
    const available = getAvailableCatalogCategories(tiles, categories);
    assert.ok(available.every((tile) => tile.slug === 'all' || tile.categoryId));
    assert.ok(!available.some((tile) => ['sport', 'travel'].includes(tile.slug)));
  });

  it('only keeps the all-categories link when the API has no categories', () => {
    assert.deepEqual(getAvailableCatalogCategories(tiles, []), [
      { ...tiles[0], categoryId: '' },
    ]);
  });

  it('does not guess a category from a matching title', () => {
    assert.deepEqual(getAvailableCatalogCategories(tiles.slice(1), [
      { id: 'unrelated', slug: 'unrelated', title: 'Для дома и дачи', parentId: null },
    ]), []);
  });

  it('offers a category automatically once its slug exists in the API', () => {
    const result = getAvailableCatalogCategories(tiles, [
      ...categories,
      { id: 'sport-id', slug: 'sport', title: 'Спорт', parentId: null },
    ]);
    assert.equal(result.at(-1).categoryId, 'sport-id');
    assert.deepEqual(result.map((tile) => tile.slug), ['all', 'home', 'sport']);
  });

  it('does not mutate the source tiles or categories', () => {
    const sourceTiles = structuredClone(tiles);
    const sourceCategories = structuredClone(categories);
    getAvailableCatalogCategories(tiles, categories);
    assert.deepEqual(tiles, sourceTiles);
    assert.deepEqual(categories, sourceCategories);
  });
});
