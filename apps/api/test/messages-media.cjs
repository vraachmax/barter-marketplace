const assert = require('node:assert/strict');
const { readFile, access } = require('node:fs/promises');
const { resolve } = require('node:path');
require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const { ValidationPipe, Logger } = require('@nestjs/common');
const { AuthGuard } = require('@nestjs/passport');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { ChatsService } = require('../dist/chats/chats.service');
const { ChatsController } = require('../dist/chats/chats.controller');
const { ChatsGateway } = require('../dist/chats/chats.gateway');
const { MediaStorageService } = require('../dist/storage/media-storage.service');

const { getUploadsRoot } = require('../dist/storage/uploads-path');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.pathname, '/barter_message_ci');
  assert.equal(process.env.MEDIA_STORAGE_DRIVER, 'local');
  assert.ok(!process.env.BLOB_READ_WRITE_TOKEN);
  const local = new MediaStorageService();
  const uploaded = [], deleted = [], warnings = [];
  let rejectUpload = false, rejectSave = false, rejectDelete = false, attempts = 0;
  const originalWarn = Logger.prototype.warn;
  Logger.prototype.warn = function (...args) { warnings.push(args[0]); return originalWarn.apply(this, args); };
  const diskPath = url => { assert.ok(url.startsWith('/uploads/chat-media/')); return resolve(getUploadsRoot(), url.slice('/uploads/'.length)); };
  const db = new PrismaClient();
  let app;
  const users = [], chats = [];
  const events = [], replies = [], assistants = [];
  try {
    for (let i = 0; i < 3; i++) users.push(await db.user.create({ data: { name: 'Isolated fixture ' + i } }));
    for (let i = 0; i < 1; i++) chats.push(await db.chat.create({ data: { users: { create: users.slice(0, 2).map(u => ({ userId: u.id })) } } }));
    const service = new ChatsService(db, { trackServerEvent: async () => {} }, {});
    const save = service.sendMediaMessage.bind(service);
    service.sendMediaMessage = (...args) => { if (rejectSave) throw new Error('fixture persistence failure'); return save(...args); };
    const storage = {
      async upload(...args) { attempts++; if (rejectUpload) throw new Error('fixture upload failure'); const value = await local.upload(...args); uploaded.push(value.url); return value; },
      async delete(url) { deleted.push(url); if (rejectDelete) throw new Error('fixture cleanup failure'); await local.delete(url); },
    };
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
        { provide: MediaStorageService, useValue: storage },
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
    // Own the listener for the whole suite; concurrent Supertest requests must not close it.
    await app.listen(0, '127.0.0.1');
    const c = chats[0], u = users[0];
    const post = (user = u) => {
      const req = request(app.getHttpServer()).post('/chats/' + c.id + '/media');
      return user ? req.set('x-fixture-user', user.id) : req;
    };
    const attach = req => req.attach('file', png, { filename: 'photo.png', contentType: 'image/png' });
    const count = () => db.message.count({ where: { chatId: c.id } });
    const first = await attach(post().field('text', ' Caption ')).expect(201);
    assert.equal(first.body.text, 'Caption');
    assert.equal(first.body.mediaType, 'IMAGE');
    const row = await db.message.findUniqueOrThrow({ where: { id: first.body.id } });
    assert.equal(row.mediaUrl, uploaded[0]);
    assert.deepEqual(await readFile(diskPath(row.mediaUrl)), png);
    assert.equal(events[0].value.id, row.id);
    console.log('PASS multipart image persists bytes, caption and message');

    // Synthetic bytes exercise declared MIME classification, not video decoding/playback.
    const video = await post().attach('file', Buffer.from('fixture video'), { filename: 'clip.mp4', contentType: 'video/mp4' }).expect(201);
    assert.equal(video.body.mediaType, 'VIDEO');
    assert.equal(video.body.text, 'Видео');
    assert.equal(await count(), 2);
    console.log('PASS declared video MIME and fallback caption');

    const beforeAttempts = attempts;
    await post().field('text', 'Missing').expect(400);
    await post().attach('file', Buffer.alloc(0), { filename: 'empty.png', contentType: 'image/png' }).expect(400);
    await post().attach('file', Buffer.from('<svg/>'), { filename: 'bad.svg', contentType: 'image/svg+xml' }).expect(400);
    await attach(post().field('text', 'x'.repeat(4001))).expect(400);
    await attach(post().field('text', ['one', 'two'])).expect(400);
    assert.equal(attempts, beforeAttempts);
    console.log('PASS missing, empty, unsupported file and malformed caption rejected before storage');

    await attach(post(users[2])).expect(403);
    await attach(post(null)).expect(403);
    assert.equal(attempts, beforeAttempts);
    assert.equal(await count(), 2);
    assert.equal(events.length, 2);
    console.log('PASS nonparticipant and unauthenticated requests cannot upload');

    await post().attach('file', Buffer.alloc(40 * 1024 * 1024 + 1), { filename: 'large.png', contentType: 'image/png' }).expect(413);
    assert.equal(attempts, beforeAttempts);
    console.log('PASS multipart size limit rejects before storage');

    rejectUpload = true;
    await attach(post()).expect(500);
    rejectUpload = false;
    assert.equal(uploaded.length, 2);
    assert.equal(deleted.length, 0);
    assert.equal(await count(), 2);
    assert.equal(events.length, 2);
    console.log('PASS storage failure creates no message or event');

    rejectSave = true;
    await attach(post()).expect(500);
    const removed = uploaded.at(-1);
    assert.equal(deleted.at(-1), removed);
    await assert.rejects(access(diskPath(removed)), { code: 'ENOENT' });
    assert.equal(await count(), 2);
    assert.equal(events.length, 2);
    console.log('PASS persistence failure deletes uploaded file without message/event');

    rejectDelete = true;
    await attach(post()).expect(500);
    assert.equal(deleted.at(-1), uploaded.at(-1));
    assert.ok(warnings.includes('Failed to clean up chat media after message persistence failure'));
    assert.equal(await count(), 2);
    assert.equal(events.length, 2);
    rejectSave = false; rejectDelete = false;
    await attach(post().field('text', 'x'.repeat(4000))).expect(201);
    assert.equal(await count(), 3);
    assert.equal(events.length, 3);
    console.log('PASS cleanup failure is observable and fresh request succeeds after recovery');
  } finally {
    Logger.prototype.warn = originalWarn;
    if (app) await app.close();
    for (const url of uploaded) await local.delete(url);
    await db.message.deleteMany({ where: { chatId: { in: chats.map(c => c.id) } } });
    await db.chatUser.deleteMany({ where: { chatId: { in: chats.map(c => c.id) } } });
    await db.chat.deleteMany({ where: { id: { in: chats.map(c => c.id) } } });
    await db.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
