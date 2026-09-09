import test from 'node:test';
import assert from 'node:assert/strict';
import { filterChatList } from '../src/lib/chat-list.ts';

const chats = [
  { id: 'buy', myRole: 'buyer', unreadCount: 2, peer: { name: 'Анна' }, listing: { title: 'Велосипед' }, lastMessage: { text: 'Можно завтра' } },
  { id: 'sell', myRole: 'seller', unreadCount: 0, peer: { email: 'buyer@example.com' }, listing: { title: 'Диван' } },
  { id: 'neutral', myRole: 'neutral', unreadCount: 1, peer: null, listing: null, lastMessage: null },
];

test('all chats retain their original order', () => {
  assert.deepEqual(filterChatList(chats, '', 'all'), chats);
});
test('purchase and sale tabs follow the current user role', () => {
  assert.deepEqual(filterChatList(chats, '', 'buyer').map(c => c.id), ['buy']);
  assert.deepEqual(filterChatList(chats, '', 'seller').map(c => c.id), ['sell']);
});
test('unread tab includes only unread conversations', () => {
  assert.deepEqual(filterChatList(chats, '', 'unread').map(c => c.id), ['buy', 'neutral']);
});
test('search matches names, listings, contact details and message text', () => {
  for (const query of [' АННА ', 'велосипед', 'ЗАВТРА']) assert.equal(filterChatList(chats, query, 'all')[0]?.id, 'buy');
  assert.equal(filterChatList(chats, 'example.com', 'all')[0]?.id, 'sell');
});
test('query and tab are combined without mutating the source', () => {
  assert.deepEqual(filterChatList(chats, 'диван', 'unread'), []);
  assert.equal(chats.length, 3);
  assert.deepEqual(filterChatList(chats, 'не найдено', 'all'), []);
});
