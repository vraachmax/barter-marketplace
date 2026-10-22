const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('reflect-metadata');
const { PrismaClient } = require('@prisma/client');
const { ExchangeService } = require('../dist/chats/exchange.service');
const { ReviewsService } = require('../dist/reviews/reviews.service');
const { ChatsService } = require('../dist/chats/chats.service');
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.pathname, '/barter_message_ci');
  const db = new PrismaClient();
  const chats = new ChatsService(db, { trackServerEvent: async () => {} }, {});
  const service = new ExchangeService(db, chats);
  const reviews = new ReviewsService(db);
  const category = await db.category.create({ data: { title: 'Exchange fixture', slug: 'exchange-' + randomUUID() } });
  const users = await Promise.all([0,1,2].map(i => db.user.create({ data: { name: 'Exchange fixture ' + i } })));
  const listings = [];
  const rooms = [];
  try {
    for (const owner of users) listings.push(await db.listing.create({ data: { title: 'Fixture item', description: 'Not public', city: 'Test', barterEnabled: true, ownerId: owner.id, categoryId: category.id, priceRub: 10000 } }));
    for (const user of users.slice(1)) rooms.push(await db.chat.create({ data: { listingId: listings[0].id, users: { create: [{ userId: users[0].id }, { userId: user.id }] } } }));
    const dto = i => ({ clientKey: randomUUID(), giveIds: [listings[i].id], receiveIds: [listings[0].id], cashKopecks: 12345, terms: 'Test terms', validDays: 7 });
    const firstBody = dto(1);
    const first = await service.create(rooms[0].id, users[1].id, firstBody);
    assert.equal((await service.create(rooms[0].id, users[1].id, firstBody)).id, first.id);
    await assert.rejects(service.create(rooms[0].id, users[1].id, { ...firstBody, cashKopecks: 9 }));
    await assert.rejects(service.list(rooms[0].id, users[2].id));
    await assert.rejects(service.create(rooms[0].id, users[1].id, { ...dto(1), giveIds: [listings[2].id] }));
    await assert.rejects(service.act(rooms[0].id, first.id, users[1].id, { action: 'accept', version: 1 }));
    console.log('PASS membership, ownership, recipient and idempotency');
    const counter = await service.create(rooms[0].id, users[0].id, { ...dto(1), giveIds: [listings[0].id], receiveIds: [listings[1].id], previousId: first.id });
    await assert.rejects(service.act(rooms[0].id, first.id, users[0].id, { action: 'accept', version: 1 }));
    const competitor = await service.create(rooms[1].id, users[2].id, dto(2));
    // Traffic counters must not invalidate an immutable terms snapshot.
    await db.listing.update({ where: { id: listings[0].id }, data: { viewsCount: { increment: 1 } } });
    const accepts = await Promise.allSettled([
      service.act(rooms[0].id, counter.id, users[1].id, { action: 'accept', version: 1 }),
      service.act(rooms[1].id, competitor.id, users[0].id, { action: 'accept', version: 1 }),
    ]);
    assert.equal(accepts.filter(r => r.status === 'fulfilled').length, 1);
    const accepted = accepts.find(r => r.status === 'fulfilled').value;
    const room = rooms.find(r => r.id === accepted.chatId);
    assert.equal(await db.exchangeReservation.count({ where: { offerId: accepted.id } }), 2);
    await assert.rejects(db.listing.update({ where: { id: listings[0].id }, data: { priceRub: 20000 } }), /exchange_listing_reserved/);
    await db.$disconnect(); await db.$connect();
    console.log('PASS counteroffer, concurrent acceptance and reserved item edits');
    await assert.rejects(service.handoffQr(room.id, accepted.id, accepted.senderId), /Сначала подтвердите/);
    await assert.rejects(service.handoffQr(room.id, accepted.id, accepted.recipientId));
    const confirmed = await service.act(room.id, accepted.id, accepted.senderId, { action: 'confirm', version: accepted.version });
    const receivedItem = accepted.items.find(i => i.ownerId !== accepted.senderId);
    assert.equal((await reviews.eligibility(accepted.senderId, receivedItem.listingId)).reason, 'exchange_not_completed');
    assert.equal(confirmed.status, 'ACCEPTED'); assert.equal(confirmed.confirmations.length, 1);
    const replay = await service.act(room.id, accepted.id, accepted.senderId, { action: 'confirm', version: accepted.version });
    assert.equal(replay.confirmations.length, 1);
    await assert.rejects(service.act(room.id, accepted.id, accepted.recipientId, { action: 'cancel', version: confirmed.version }));
    // Only the proposer can display the short-lived QR after confirming first.
    const qr = await service.handoffQr(room.id, accepted.id, accepted.senderId);
    assert.match(qr.code, /^BX1\.[^.]+\.[0-9]{10}\.[a-f0-9]{64}$/);
    assert.ok(new Date(qr.expiresAt).getTime() - Date.now() <= 120000);
    await assert.rejects(service.act(room.id, accepted.id, accepted.recipientId, { action: 'confirm', version: confirmed.version }), /QR/);
    await assert.rejects(service.act(room.id, accepted.id, accepted.recipientId, { action: 'confirm', version: confirmed.version, qrToken: qr.code.slice(0, -1) + (qr.code.endsWith('a') ? 'b' : 'a') }), /QR/);
    await assert.rejects(service.act(room.id, accepted.id, accepted.recipientId, { action: 'confirm', version: confirmed.version, qrToken: 'BX1.fake.1111111111.'+'0'.repeat(64) }), /QR/);
    const outsider = users.find(u => u.id !== accepted.senderId && u.id !== accepted.recipientId);
    await assert.rejects(service.handoffQr(room.id, accepted.id, outsider.id));
    const done = await service.act(room.id, accepted.id, accepted.recipientId, { action: 'confirm', version: confirmed.version, qrToken: qr.code });
    assert.equal(done.status, 'COMPLETED'); assert.equal(done.confirmations.length, 2);
    const replayPeer = await service.act(room.id, accepted.id, accepted.recipientId, { action: 'confirm', version: confirmed.version, qrToken: qr.code });
    assert.equal(replayPeer.confirmations.length, 2);
    await assert.rejects(service.handoffQr(room.id, accepted.id, accepted.senderId), /Согласуйте|Сначала/);
    assert.equal(await db.exchangeReservation.count({ where: { offerId: accepted.id } }), 0);
    assert.equal((await db.listing.findUnique({ where: { id: listings[0].id } })).status, 'SOLD');
    assert.equal((await reviews.eligibility(accepted.senderId, receivedItem.listingId)).canReview, true);
    await reviews.create(accepted.senderId, receivedItem.ownerId, { listingId: receivedItem.listingId, rating: 5, text: 'Completed fixture exchange' });
    console.log('PASS independent confirmations, replay, no unilateral cancellation, completion and review eligibility');

    await db.listing.updateMany({ where: { categoryId: category.id }, data: { status: 'ACTIVE' } });
    const stale = await service.create(rooms[0].id, users[1].id, dto(1));
    await db.listing.update({ where: { id: listings[0].id }, data: { description: 'Changed terms' } });
    await assert.rejects(service.act(rooms[0].id, stale.id, users[0].id, { action: 'accept', version: 1 }), /изменилось/);
    const expiring = await service.create(rooms[0].id, users[1].id, dto(1));
    const reserved = await service.act(rooms[0].id, expiring.id, users[0].id, { action: 'accept', version: 1 });
    await db.exchangeOffer.update({ where: { id: reserved.id }, data: { expiresAt: new Date(0) } });
    await service.list(rooms[0].id, users[0].id);
    assert.equal((await db.exchangeOffer.findUnique({ where: { id: reserved.id } })).status, 'EXPIRED');
    assert.equal(await db.exchangeReservation.count({ where: { offerId: reserved.id } }), 0);
    console.log('PASS changed listing rejected, expiration releases reservations and records notification');
    await chats.setting(rooms[0].id, users[0].id, { action: 'block' });
    await assert.rejects(chats.sendMessage(rooms[0].id, users[1].id, 'blocked'));
    assert.equal((await chats.details(rooms[0].id, users[0].id)).blocked, true);
    await chats.setting(rooms[0].id, users[0].id, { action: 'unblock' });
    await chats.sendMessage(rooms[0].id, users[1].id, 'unblocked');
    await chats.setting(rooms[0].id, users[0].id, { action: 'mute' });
    assert.equal((await chats.details(rooms[0].id, users[0].id)).muted, true);
    await chats.setting(rooms[0].id, users[0].id, { action: 'report', reason: 'Fixture report' });
    assert.equal(await db.supportTicket.count({ where: { userId: users[0].id } }), 1);
    console.log('PASS block, unblock, mute and report persistence');
  } catch (error) { console.error('Exchange acceptance failed:', error); throw error; } finally {
    const ids = rooms.map(r => r.id), uids = users.map(u => u.id);
    await db.exchangeOffer.deleteMany({ where: { chatId: { in: ids } } });
    await db.message.deleteMany({ where: { chatId: { in: ids } } });
    await db.chatUser.deleteMany({ where: { chatId: { in: ids } } });
    await db.chat.deleteMany({ where: { id: { in: ids } } });
    await db.sellerReview.deleteMany({ where: { listingId: { in: listings.map(l => l.id) } } });
    await db.listing.deleteMany({ where: { categoryId: category.id } });
    await db.category.delete({ where: { id: category.id } });
    await db.userBlock.deleteMany({ where: { blockerId: { in: uids } } });
    await db.supportTicket.deleteMany({ where: { userId: { in: uids } } });
    await db.user.deleteMany({ where: { id: { in: uids } } });
    await db.$disconnect();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
