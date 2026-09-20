const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AuthGuard } = require('@nestjs/passport');
const { JwtService } = require('@nestjs/jwt');
const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const { io } = createRequire(resolve(__dirname, '../../web/package.json'))('socket.io-client');
const { ChatsService } = require('../dist/chats/chats.service');
const { ChatsController } = require('../dist/chats/chats.controller');
const { ChatsGateway } = require('../dist/chats/chats.gateway');
const { PresenceService } = require('../dist/presence/presence.service');
const { MediaStorageService } = require('../dist/storage/media-storage.service');

function event(socket, name, predicate = () => true, ms = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, handler); reject(new Error('Timed out: ' + name)); }, ms);
    function handler(value) {
      if (!predicate(value)) return;
      clearTimeout(timer); socket.off(name, handler); resolve(value);
    }
    socket.on(name, handler);
  });
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const database = new URL(process.env.DATABASE_URL);
  assert.equal(database.hostname, '127.0.0.1');
  assert.equal(database.pathname, '/barter_message_ci');
  assert(process.env.JWT_SECRET?.startsWith('isolated-'));
  const db = new PrismaClient();
  const jwt = new JwtService();
  const presence = new PresenceService();
  const sockets = [], users = [], chats = [];
  let app;
  try {
    for (let i = 0; i < 3; i++) users.push(await db.user.create({ data: { name: 'Socket fixture ' + i } }));
    chats.push(await db.chat.create({ data: { users: { create: users.slice(0, 2).map(u => ({ userId: u.id })) } } }));
    const chat = chats[0];
    const service = new ChatsService(db, { trackServerEvent: async () => {} }, {});
    // Keep bot provisioning out of the fixture. All conversation reads/writes use PostgreSQL.
    service.getAssistantUserId = async () => null;
    const module = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [
        ChatsGateway,
        { provide: ChatsService, useValue: service },
        { provide: JwtService, useValue: jwt },
        { provide: PresenceService, useValue: presence },
        { provide: MediaStorageService, useValue: {} },
      ],
    }).overrideGuard(AuthGuard('jwt')).useValue({
      canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const user = users.find(u => u.id === req.headers['x-fixture-user']);
        if (!user) return false;
        req.user = user; return true;
      },
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const token = (payload, options = {}) => jwt.sign(payload, { secret: process.env.JWT_SECRET, expiresIn: '5m', ...options });
    function client(cookie) {
      const socket = io(base, {
        transports: ['websocket'], autoConnect: false, reconnection: false,
        extraHeaders: cookie === undefined ? {} : { Cookie: cookie },
      });
      sockets.push(socket); return socket;
    }
    async function authenticated(user) {
      const socket = client('token=' + token({ sub: user.id }));
      const ready = event(socket, 'presence-snapshot');
      socket.connect(); await ready; return socket;
    }
    const a = await authenticated(users[0]);
    const b = await authenticated(users[1]);
    const outsider = await authenticated(users[2]);
    for (const socket of [a, b]) assert.deepEqual(await socket.timeout(4000).emitWithAck('join-chat', { chatId: chat.id }), { ok: true });
    console.log('SOCKET_PASS authenticated clients join their conversation');

    for (const cookie of [undefined, 'token=not-a-jwt', 'token=' + token({ sub: users[0].id }, { expiresIn: -1 }), 'token=%ZZ', 'token=' + token({}), 'token=' + token({ sub: 12 })]) {
      const denied = client(cookie);
      let exposed = false;
      denied.on('presence-snapshot', () => { exposed = true; });
      const disconnected = event(denied, 'disconnect');
      denied.connect(); await disconnected;
      assert.equal(exposed, false);
      assert.equal(denied.connected, false);
    }
    console.log('SOCKET_PASS missing invalid expired malformed and subjectless JWT rejected');

    const outsiderMessages = [], outsiderTyping = [], outsiderReads = [];
    outsider.on('message-created', x => outsiderMessages.push(x));
    outsider.on('typing-changed', x => outsiderTyping.push(x));
    outsider.on('chat-read', x => outsiderReads.push(x));
    for (const [name, body] of [
      ['join-chat', { chatId: chat.id }],
      ['send-message', { chatId: chat.id, text: 'Forbidden' }],
      ['typing', { chatId: chat.id, isTyping: true }],
      ['read-chat', { chatId: chat.id }],
    ]) {
      const denied = event(outsider, 'exception');
      outsider.emit(name, body); await denied;
    }
    assert.equal(await db.message.count({ where: { chatId: chat.id } }), 0);
    console.log('SOCKET_PASS nonparticipant cannot join send type or mark read');

    const send = body => request(app.getHttpServer()).post('/chats/' + chat.id + '/messages').set('x-fixture-user', users[0].id).send(body);
    const received = [];
    b.on('message-created', x => received.push(x));
    const body = { text: 'HTTP to socket delivery', clientMessageId: randomUUID() };
    const delivered = event(b, 'message-created', x => x.text === body.text);
    const response = await send(body).expect(201);
    assert.equal((await delivered).id, response.body.id);
    await send(body).expect(201);
    await pause(150); // Bounded negative observation, not a delivery guarantee.
    assert.equal(received.filter(x => x.id === response.body.id).length, 1);
    assert.equal(await db.message.count({ where: { chatId: chat.id } }), 1);
    console.log('SOCKET_PASS HTTP creation delivered once and retry does not rebroadcast');

    const typing = event(a, 'typing-changed', x => x.userId === users[1].id);
    assert.deepEqual(await b.timeout(4000).emitWithAck('typing', { chatId: chat.id, isTyping: true }), { ok: true });
    assert.equal((await typing).isTyping, true);
    const read = event(a, 'chat-read', x => x.userId === users[1].id);
    assert.deepEqual(await b.timeout(4000).emitWithAck('read-chat', { chatId: chat.id }), { ok: true });
    const receipt = await read;
    const participant = await db.chatUser.findUniqueOrThrow({ where: { chatId_userId: { chatId: chat.id, userId: users[1].id } } });
    assert.equal(participant.lastReadAt.toISOString(), receipt.readAt);
    const history = await request(app.getHttpServer()).get('/chats/' + chat.id + '/messages').set('x-fixture-user', users[0].id).expect(200);
    assert.equal(history.body.find(x => x.id === response.body.id).isReadByPeer, true);
    console.log('SOCKET_PASS typing and read receipt agree with persisted history');

    const legacyDelivery = event(a, 'message-created', x => x.text === 'Socket reply');
    assert.deepEqual(await b.timeout(4000).emitWithAck('send-message', { chatId: chat.id, text: 'Socket reply' }), { ok: true });
    const legacy = await legacyDelivery;
    assert.equal((await db.message.findUniqueOrThrow({ where: { id: legacy.id } })).senderId, users[1].id);
    console.log('SOCKET_PASS legacy socket send persists and reaches peer');

    const offline = event(a, 'presence-changed', x => x.userId === users[1].id && !x.online);
    b.disconnect(); await offline;
    const whileOffline = await send({ text: 'While peer offline', clientMessageId: randomUUID() }).expect(201);
    const reconnected = event(b, 'presence-snapshot');
    b.connect(); await reconnected;
    assert.deepEqual(await b.timeout(4000).emitWithAck('join-chat', { chatId: chat.id }), { ok: true });
    const recovered = await request(app.getHttpServer()).get('/chats/' + chat.id + '/messages').set('x-fixture-user', users[1].id).expect(200);
    assert(recovered.body.some(x => x.id === whileOffline.body.id));
    const afterReconnect = event(b, 'message-created', x => x.text === 'After reconnect');
    await send({ text: 'After reconnect', clientMessageId: randomUUID() }).expect(201);
    await afterReconnect;
    assert.deepEqual(outsiderMessages, []); assert.deepEqual(outsiderTyping, []); assert.deepEqual(outsiderReads, []);
    console.log('SOCKET_PASS reconnect rejoin history recovery and room isolation');
  } finally {
    for (const socket of sockets) socket.disconnect();
    if (app) await app.close();
    await db.message.deleteMany({ where: { chatId: { in: chats.map(c => c.id) } } });
    await db.chatUser.deleteMany({ where: { chatId: { in: chats.map(c => c.id) } } });
    await db.chat.deleteMany({ where: { id: { in: chats.map(c => c.id) } } });
    await db.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
