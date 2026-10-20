import test from 'node:test';
import assert from 'node:assert/strict';
import { getChatThumbnailFallback } from '../src/lib/chat-thumbnail.ts';
test('fallbacks distinguish a bicycle from an apartment', () => {
  assert.equal(getChatThumbnailFallback({ title: 'Горный велосипед Trek' }), '/visual-refresh/premium/categories/sports.webp');
  assert.equal(getChatThumbnailFallback({ title: 'Сдам 1-комн. квартиру', category: { title: 'Недвижимость' } }), '/visual-refresh/premium/categories/realty.webp');
});
test('fallbacks retain distinct catalog category illustrations', () => {
  assert.equal(getChatThumbnailFallback({ title: 'XCMG', category: { title: 'Спецтехника' } }), '/visual-refresh/premium/categories/special_equipment.webp');
  assert.equal(getChatThumbnailFallback({ title: 'iPhone 15 Pro' }), '/visual-refresh/premium/categories/electronics.webp');
  assert.equal(getChatThumbnailFallback({ title: 'Оператор 5/2', category: { title: 'Работа' } }), '/visual-refresh/premium/categories/job.webp');
  assert.equal(getChatThumbnailFallback(null), '/visual-refresh/premium/categories/all.webp');
});
