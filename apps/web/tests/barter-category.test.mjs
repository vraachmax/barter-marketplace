import assert from 'node:assert/strict';
import { it } from 'node:test';
import { canOfferBarter } from '../src/lib/barter-category.ts';

it('supports exchange categories against the older deployed API', () => {
  for (const slug of ['auto', 'realty', 'services', 'electronics', 'home', 'clothes', 'kids', 'hobby']) assert.equal(canOfferBarter({ slug }), true);
});
it('hides exchange for jobs, unknown or unloaded categories', () => {
  for (const category of [null, undefined, { slug: 'job' }, { slug: 'unknown' }]) assert.equal(canOfferBarter(category), false);
});
it('uses the server policy when available, including explicit false', () => {
  assert.equal(canOfferBarter({ slug: 'electronics', barterAllowed: false }), false);
  assert.equal(canOfferBarter({ slug: 'new-approved-category', barterAllowed: true }), true);
});
