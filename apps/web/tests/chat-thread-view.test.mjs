import test from 'node:test';
import assert from 'node:assert/strict';
import { collectThreadAlbums, isNewThreadDay, threadDayLabel } from '../src/lib/chat-thread-view.ts';
const m = (id, senderId, mediaType, text='Фото', minute=0) => ({
  id, senderId, mediaType, text, mediaUrl: mediaType === 'IMAGE' ? '/uploads/'+id+'.jpg' : null,
  createdAt: new Date(Date.UTC(2026,9,20,9,minute)).toISOString(), sender:{id:senderId,name:senderId},
});
test('gallery shows only true consecutive photos by the same sender', () => {
  const msgs=[m('a','person','IMAGE'),m('b','person','IMAGE','Фото',1),m('c','other','IMAGE','Фото',2),m('d','other','IMAGE','Фото',3),m('e','other',null,'Привет',4)];
  const grouped=collectThreadAlbums(msgs);
  assert.deepEqual([...grouped.starts.get('a')].map(x=>x.id),['a','b']);
  assert.deepEqual([...grouped.starts.get('c')].map(x=>x.id),['c','d']);
  assert.deepEqual([...grouped.hidden].sort(),['b','d']);
});
test('different timestamps, captioned photos and text break album grouping',()=>{
  const msgs=[m('a','s','IMAGE'),m('b','s','IMAGE','Смотрите на экран',1),m('c','s','IMAGE','Фото',2),m('d','s','IMAGE','Фото',25)];
  assert.equal(collectThreadAlbums(msgs).starts.size,0);
});
test('relative dates label today/yesterday correctly and date boundaries are recognized',()=>{
  const t=new Date('2026-10-20T12:00:00');
  assert.equal(threadDayLabel('2026-10-20T09:00:00',t),'Сегодня');
  assert.equal(threadDayLabel('2026-10-19T09:00:00',t),'Вчера');
  assert.equal(isNewThreadDay('2026-10-20T00:00:00','2026-10-19T23:59:59'),true);
  assert.equal(isNewThreadDay('2026-10-20T01:00:00','2026-10-20T00:00:00'),false);
});
