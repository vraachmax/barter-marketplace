import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import { listingPlaceholderArt, usablePhotoUrls } from '../src/lib/listing-placeholder.ts';

describe('listing image fallback', () => {
  it('uses the approved illustration library for all core categories', () => {
    for (const slug of ['electronics', 'home', 'clothes', 'kids', 'auto', 'hobby', 'realty', 'job', 'services']) {
      const art = listingPlaceholderArt('', slug);
      assert.match(art, /^\/visual-refresh\/placeholders\/[a-z-]+\.webp$/);
      assert.ok(existsSync(new URL(`../public${art}`, import.meta.url)));
    }
  });
  it('supports old APIs without category slugs', () => {
    assert.equal(listingPlaceholderArt('Электроника'), '/visual-refresh/placeholders/laptops.webp');
    assert.equal(listingPlaceholderArt('Детские товары'), '/visual-refresh/placeholders/miscellaneous.webp');
    assert.equal(listingPlaceholderArt('Недвижимость'), '/visual-refresh/placeholders/real-estate.webp');
  });
  it('falls back to a neutral package instead of guessing a product', () => {
    assert.equal(listingPlaceholderArt(), '/visual-refresh/placeholders/miscellaneous.webp');
    assert.equal(listingPlaceholderArt('Другое', '../../uploads'), '/visual-refresh/placeholders/miscellaneous.webp');
  });
  it('supports services and special equipment without inventing a specific model', () => {
    assert.equal(listingPlaceholderArt('Услуги'), '/visual-refresh/placeholders/services.webp');
    assert.equal(listingPlaceholderArt('Автокраны'), '/visual-refresh/placeholders/heavy-machinery.webp');
    assert.equal(listingPlaceholderArt('Экскаваторы'), '/visual-refresh/placeholders/heavy-machinery.webp');
  });
  it('removes empty/duplicate URLs without inserting generated product photos', () => {
    assert.deepEqual(usablePhotoUrls(null), []);
    assert.deepEqual(usablePhotoUrls([null, {}, { url: null }]), []);
    assert.deepEqual(usablePhotoUrls([{ url: ' ' }, { url: '/photo.webp' }, { url: ' /photo.webp ' }]), ['/photo.webp']);
  });
});
