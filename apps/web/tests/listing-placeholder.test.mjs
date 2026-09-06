import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import { listingPlaceholderArt, usablePhotoUrls } from '../src/lib/listing-placeholder.ts';

describe('listing image fallback', () => {
  it('uses existing category illustrations for all nine categories', () => {
    for (const slug of ['electronics', 'home', 'clothes', 'kids', 'auto', 'hobby', 'realty', 'job', 'services']) {
      const art = listingPlaceholderArt('', slug);
      assert.equal(art, `/categories/${slug}.webp`);
      assert.ok(existsSync(new URL(`../public${art}`, import.meta.url)));
    }
  });
  it('supports old APIs without category slugs', () => {
    assert.equal(listingPlaceholderArt('Электроника'), '/categories/electronics.webp');
    assert.equal(listingPlaceholderArt('Детские товары'), '/categories/kids.webp');
    assert.equal(listingPlaceholderArt('Недвижимость'), '/categories/realty.webp');
  });
  it('falls back to a neutral package instead of guessing a product', () => {
    assert.equal(listingPlaceholderArt(), null);
    assert.equal(listingPlaceholderArt('Другое', '../../uploads'), null);
  });
  it('removes empty/duplicate URLs without inserting generated product photos', () => {
    assert.deepEqual(usablePhotoUrls(null), []);
    assert.deepEqual(usablePhotoUrls([null, {}, { url: null }]), []);
    assert.deepEqual(usablePhotoUrls([{ url: ' ' }, { url: '/photo.webp' }, { url: ' /photo.webp ' }]), ['/photo.webp']);
  });
});
