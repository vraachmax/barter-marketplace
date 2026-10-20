import test from 'node:test';
import assert from 'node:assert/strict';
import { getChatThumbnailSource } from '../src/lib/chat-thumbnail.ts';

test('the chat thumbnail comes from its linked listing only', () => {
  assert.equal(getChatThumbnailSource({
    previewImageUrl: '/uploads/real-item.webp',
    category: { title: 'Недвижимость' },
  }), '/uploads/real-item.webp');
});
test('missing photos never use category artwork', () => {
  assert.equal(getChatThumbnailSource({ category: { title: 'Велосипеды' } }), null);
  assert.equal(getChatThumbnailSource({ previewImageUrl: null, category: { title: 'Недвижимость' } }), null);
  assert.equal(getChatThumbnailSource({ previewImageUrl: '   ' }), null);
  assert.equal(getChatThumbnailSource(null), null);
});
