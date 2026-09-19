const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AuthGuard } = require('@nestjs/passport');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { ChatsService } = require('../dist/chats/chats.service');
const { ChatsController } = require('../dist/chats/chats.controller');
const { ChatsGateway } = require('../dist/chats/chats.gateway');
const { MediaStorageService } = require('../dist/storage/media-storage.service');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.pathname, '/barter_message_ci');
  const db = new PrismaClient();
  let app;
  const users = [], chats = [];
  const events = [], replies = [], assistants = [];
  try {
    for (let i = 0; i < 3; i++) users.push(await db.user.create({ data: { name: 'Isolated fixture ' + i } }));
    for (let i = 0; i < 2; i++) chats.push(await db.chat.create({ data: { users: { create: users.slice(0, 2).map(u => ({ userId: u.id })) } } }));
    const service = new ChatsService(db, { trackServerEvent: async () => {} }, {});
    const gateway = {
      server: { to: room => ({ emit: (name, value) => events.push({ room, name, value }) }) },
      broadcastSellerAutoReply: async (...args) => replies.push(args),
      broadcastDealAssistantMessages: async (...args) => assistants.push(args),
    };
    const module = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [
        { provide: ChatsService, useValue: service },
        { provide: ChatsGateway, useValue: gateway },
        { provide: MediaStorageService, useValue: {} },
      ],
    }).overrideGuard(AuthGuard('jwt')).useValue({
      canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const user = users.find(u => u.id === req.headers['x-fixture-user']);
        if (!user) return false;
        req.user = user;
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    const send = (chat, user, body) => request(app.getHttpServer()).post('/chats/' + chat.id + '/messages').set('x-fixture-user', user.id).send(body);
    const c = chats[0], u = users[0];
    const key = randomUUID(), body = { text: 'Lost acknowledgement', clientMessageId: key };
    // Discard the first HTTP result as a client with a lost acknowledgement would.
    await send(c, u, body).expect(201);
    const row = await db.message.findFirstOrThrow({ where: { chatId: c.id, senderId: u.id } });
    const before = await db.chat.findUniqueOrThrow({ where: { id: c.id } });
    const readBefore = await db.chatUser.findUniqueOrThrow({ where: { chatId_userId: { chatId: c.id, userId: u.id } } });
    const replay = await send(c, u, body).expect(201);
    assert.equal(replay.body.id, row.id);
    assert.equal(await db.message.count({ where: { chatId: c.id } }), 1);
    assert.equal((await db.chat.findUniqueOrThrow({ where: { id: c.id } })).updatedAt.toISOString(), before.updatedAt.toISOString());
    assert.equal((await db.chatUser.findUniqueOrThrow({ where: { chatId_userId: { chatId: c.id, userId: u.id } } })).lastReadAt.toISOString(), readBefore.lastReadAt.toISOString());
    assert.equal(events.length, 1); assert.equal(replies.length, 1); assert.equal(assistants.length, 1);
    console.log('PASS lost acknowledgement and no repeated side effects');

    const parallel = { text: 'Concurrent', clientMessageId: randomUUID() };
    const results = await Promise.all(Array.from({ length: 20 }, () => send(c, u, parallel).expect(201)));
    assert.equal(new Set(results.map(r => r.body.id)).size, 1);
    assert.equal(await db.message.count({ where: { chatId: c.id, text: parallel.text } }), 1);
    assert.equal(events.length, 2); assert.equal(replies.length, 2); assert.equal(assistants.length, 2);
    console.log('PASS 20 concurrent HTTP requests create one row/event');

    const conflict = await send(c, u, { ...body, text: 'Different payload' }).expect(409);
    assert.equal(conflict.body.message, 'message_key_reused');
    assert.equal((await db.message.findUniqueOrThrow({ where: { id: row.id } })).text, body.text);
    console.log('PASS key/payload conflict is explicit');

    const otherChat = await send(chats[1], u, body).expect(201);
    const otherUser = await send(c, users[1], body).expect(201);
    assert.notEqual(otherChat.body.id, row.id); assert.notEqual(otherUser.body.id, row.id);
    await send(c, users[2], body).expect(403);
    await request(app.getHttpServer()).post('/chats/' + c.id + '/messages').send(body).expect(403);
    console.log('PASS chat/user scope and participant access');

    for (const value of [null, '', 'invalid', 17]) await send(c, u, { text: 'Invalid', clientMessageId: value }).expect(400);
    await send(c, u, { text: ' ', clientMessageId: randomUUID() }).expect(400);
    await send(c, u, { text: 'x'.repeat(4001), clientMessageId: randomUUID() }).expect(400);
    console.log('PASS malformed keys and text rejected');

    const upper = await send(c, u, { ...body, clientMessageId: key.toUpperCase() }).expect(201);
    assert.equal(upper.body.id, row.id);
    const fresh = await send(c, u, { ...body, clientMessageId: randomUUID() }).expect(201);
    assert.notEqual(fresh.body.id, row.id);
    const legacy1 = await send(c, u, { text: 'Legacy' }).expect(201);
    const legacy2 = await send(c, u, { text: 'Legacy' }).expect(201);
    assert.notEqual(legacy1.body.id, legacy2.body.id);
    console.log('PASS canonical key, fresh operation and legacy compatibility');
  } finally {
    if (app) await app.close();
    await db.message.deleteMany({ where: { chatId: { in: chats.map(c => c.id) } } });
    await db.chatUser.deleteMany({ where: { chatId: { in: chats.map(c => c.id) } } });
    await db.chat.deleteMany({ where: { id: { in: chats.map(c => c.id) } } });
    await db.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
