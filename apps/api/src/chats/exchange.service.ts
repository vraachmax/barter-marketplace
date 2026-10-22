import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PLATFORM_ASSISTANT_EMAIL, PLATFORM_ASSISTANT_NAME } from '../platform.constants';
import { ChatsService } from './chats.service';
import { getJwtSecret } from '../config/security';
import { CreateExchangeDto, ExchangeActionDto } from './exchange.dto';

function fingerprint(l: { title: string; description: string; priceRub: number | null; ownerId: string; city: string; categoryId: string; attributes: unknown; exchangePreferences: unknown; images: { url: string }[] }) {
  return createHash('sha256').update(JSON.stringify([l.title, l.description, l.priceRub, l.ownerId, l.city, l.categoryId, l.attributes, l.exchangePreferences, l.images.map(i => i.url)])).digest('hex');
}
const include = { items: true, confirmations: true } as const;
@Injectable()
export class ExchangeService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private readonly logger = new Logger(ExchangeService.name);
  onModuleInit() {
    this.timer = setInterval(() => { void this.transaction(tx => this.expire(tx)).catch(() => this.logger.warn('Exchange expiration sweep will retry')); }, 60000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  constructor(private prisma: PrismaService, private chats: ChatsService) {}
  // Serializable transactions protect competing acceptance, edits and confirmations.
  private async transaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try { return await this.prisma.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) {
        throw new ConflictException('Условия изменились или вещь уже зарезервирована. Обновите предложения.');
      }
      throw error;
    }
  }
  private async expire(tx: Prisma.TransactionClient) {
    const expired = await tx.exchangeOffer.findMany({ where: { status: { in: ['PENDING', 'ACCEPTED'] }, confirmations: { none: {} }, expiresAt: { lte: new Date() } }, select: { id: true, chatId: true } });
    if (!expired.length) return;
    const ids = expired.map(o => o.id);
    await tx.exchangeOffer.updateMany({ where: { id: { in: ids } }, data: { status: 'EXPIRED', version: { increment: 1 } } });
    await tx.exchangeReservation.deleteMany({ where: { offerId: { in: ids } } });
    await tx.exchangeAudit.createMany({ data: ids.map(offerId => ({ offerId, userId: 'system', action: 'expire' })) });
    const assistant = await tx.user.upsert({ where: { email: PLATFORM_ASSISTANT_EMAIL }, create: { email: PLATFORM_ASSISTANT_EMAIL, name: PLATFORM_ASSISTANT_NAME }, update: {}, select: { id: true } });
    const assistantId = assistant.id;
    await tx.message.createMany({ data: expired.map(o => ({ chatId: o.chatId, senderId: assistantId, text: 'Срок предложения обмена истёк. Резерв вещей снят.' })) });
    await tx.chat.updateMany({ where: { id: { in: expired.map(o => o.chatId) } }, data: { updatedAt: new Date() } });
  }
  async list(chatId: string, userId: string) {
    await this.chats.assertParticipant(chatId, userId);
    return this.transaction(async tx => {
      await this.expire(tx);
      return tx.exchangeOffer.findMany({ where: { chatId }, include, orderBy: { createdAt: 'asc' } });
    });
  }
  async choices(chatId: string, userId: string) {
    await this.chats.assertParticipant(chatId, userId);
    const peer = await this.prisma.chatUser.findFirst({ where: { chatId, userId: { not: userId } } });
    if (!peer) throw new NotFoundException();
    const reserved = await this.prisma.exchangeReservation.findMany({ select: { listingId: true } });
    return this.prisma.listing.findMany({ where: { ownerId: { in: [userId, peer.userId] }, status: 'ACTIVE', barterEnabled: true, id: { notIn: reserved.map(r => r.listingId) } }, select: { id: true, ownerId: true, title: true, priceRub: true, images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } } }, take: 200 });
  }

  /**
   * A short-lived, recipient-bound handoff key. Not a receipt or proof that goods
   * were delivered. Only the exchange proposer can display it after confirming
   * their own receipt; the other authenticated party must scan AND consent.
   */
  private handoffSignature(
    offer: { id: string; chatId: string; senderId: string; recipientId: string; version: number },
    expires: number,
  ) {
    const purposeKey = createHash('sha256').update('barter:exchange-handoff:v1:').update(getJwtSecret()).digest();
    return createHmac('sha256', purposeKey)
      .update(JSON.stringify([offer.id, offer.chatId, offer.senderId, offer.recipientId, offer.version, expires]))
      .digest('hex');
  }

  async handoffQr(chatId: string, offerId: string, userId: string) {
    await this.chats.assertParticipant(chatId, userId);
    const offer = await this.prisma.exchangeOffer.findUnique({ where: { id: offerId }, include });
    if (!offer || offer.chatId !== chatId) throw new NotFoundException();
    if (offer.senderId !== userId) throw new ForbiddenException('QR показывает только предложивший обмен');
    if (offer.status !== 'ACCEPTED') throw new ConflictException('Согласуйте обмен перед подтверждением');
    if (!offer.confirmations.some(c => c.userId === userId))
      throw new ConflictException('Сначала подтвердите получение вещей со своей стороны');
    if (offer.confirmations.some(c => c.userId === offer.recipientId))
      throw new ConflictException('Вторая сторона уже подтвердила передачу');
    const expires = Math.min(Math.floor(offer.expiresAt.getTime() / 1000), Math.floor(Date.now() / 1000) + 120);
    if (expires <= Math.floor(Date.now() / 1000)) throw new ConflictException('Срок предложения истёк');
    return { code: `BX1.${offer.id}.${expires}.${this.handoffSignature(offer, expires)}`, expiresAt: new Date(expires * 1000).toISOString() };
  }

  private validateHandoffQr(
    offer: { id: string; chatId: string; senderId: string; recipientId: string; version: number; expiresAt: Date; confirmations: { userId: string }[] },
    userId: string,
    code: string | undefined,
  ) {
    if (userId !== offer.recipientId) throw new ForbiddenException('Этот QR предназначен другому участнику');
    if (!offer.confirmations.some(c => c.userId === offer.senderId))
      throw new ConflictException('Предложивший обмен ещё не подтвердил свою сторону');
    const parts = code?.split('.');
    if (!parts || parts.length !== 4 || parts[0] !== 'BX1' || parts[1] !== offer.id ||
      !/^\\d{10}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3]))
      throw new BadRequestException('Недействительный QR-код обмена');
    const expires = Number(parts[2]);
    const now = Math.floor(Date.now() / 1000);
    if (expires <= now || expires > now + 120 || expires > Math.floor(offer.expiresAt.getTime() / 1000))
      throw new ConflictException('QR-код обмена истёк. Попросите обновить его');
    const expected = Buffer.from(this.handoffSignature(offer, expires), 'hex');
    const actual = Buffer.from(parts[3], 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new BadRequestException('QR-код не принадлежит этой сделке');
  }

  async create(chatId: string, userId: string, dto: CreateExchangeDto) {
    await this.chats.assertCanSend(chatId, userId);
    return this.transaction(async tx => {
      await this.expire(tx);
      const replay = await tx.exchangeOffer.findUnique({ where: { senderId_clientKey: { senderId: userId, clientKey: dto.clientKey } }, include });
      if (replay) {
        const give = replay.items.filter(i => i.ownerId === userId).map(i => i.listingId).sort();
        const receive = replay.items.filter(i => i.ownerId !== userId).map(i => i.listingId).sort();
        if (replay.chatId !== chatId || replay.terms !== dto.terms || replay.cashKopecks !== dto.cashKopecks || (replay.previousId ?? undefined) !== dto.previousId || JSON.stringify(give) !== JSON.stringify([...dto.giveIds].sort()) || JSON.stringify(receive) !== JSON.stringify([...dto.receiveIds].sort())) throw new ConflictException('Ключ предложения уже использован');
        return replay;
      }
      const peer = await tx.chatUser.findFirst({ where: { chatId, userId: { not: userId } } });
      if (!peer) throw new BadRequestException('Нет собеседника');
      if (dto.previousId) {
        const previous = await tx.exchangeOffer.findUnique({ where: { id: dto.previousId } });
        if (!previous || previous.chatId !== chatId || previous.recipientId !== userId || previous.status !== 'PENDING') throw new ConflictException('Предложение уже изменилось');
        await tx.exchangeOffer.update({ where: { id: previous.id }, data: { status: 'SUPERSEDED', version: { increment: 1 } } });
        await tx.exchangeAudit.create({ data: { offerId: previous.id, userId, action: 'counteroffer' } });
      }
      const ids = [...dto.giveIds, ...dto.receiveIds];
      if (new Set(ids).size !== ids.length) throw new BadRequestException('Повторяющиеся вещи');
      const listings = await tx.listing.findMany({ where: { id: { in: ids }, status: 'ACTIVE', barterEnabled: true }, include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } });
      if (listings.length !== ids.length || listings.some(l => l.ownerId !== (dto.giveIds.includes(l.id) ? userId : peer.userId))) throw new BadRequestException('Вещь недоступна или принадлежит другому пользователю');
      if (await tx.exchangeReservation.count({ where: { listingId: { in: ids } } })) throw new ConflictException('Вещь уже зарезервирована');
      const offer = await tx.exchangeOffer.create({ data: {
        chatId, senderId: userId, recipientId: peer.userId, clientKey: dto.clientKey,
        previousId: dto.previousId, cashKopecks: dto.cashKopecks, terms: dto.terms,
        expiresAt: new Date(Date.now() + dto.validDays * 86400000),
        items: { create: listings.map(l => ({ listingId: l.id, ownerId: l.ownerId, snapshot: { title: l.title, priceRub: l.priceRub, imageUrl: l.images[0]?.url ?? null, fingerprint: fingerprint(l) } })) },
        events: { create: { userId, action: 'create' } },
      }, include });
      await tx.message.create({ data: { id: `exchange_offer_${offer.id}`, chatId, senderId: userId, text: 'Предложение обмена' } });
      await tx.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
      return offer;
    });
  }
  async act(chatId: string, offerId: string, userId: string, dto: ExchangeActionDto) {
    await this.chats.assertParticipant(chatId, userId);
    if (dto.action === 'accept' || dto.action === 'confirm') await this.chats.assertCanSend(chatId, userId);
    return this.transaction(async tx => {
      await this.expire(tx);
      const offer = await tx.exchangeOffer.findUnique({ where: { id: offerId }, include });
      if (!offer || offer.chatId !== chatId) throw new NotFoundException();
      if (![offer.senderId, offer.recipientId].includes(userId)) throw new ForbiddenException();
      // One participant's retry can never confirm the other participant's side.
      if (dto.action === 'confirm' && offer.confirmations.some(c => c.userId === userId)) return offer;
      if (offer.version !== dto.version) throw new ConflictException('Предложение изменилось. Обновите страницу.');
      // A peer can only complete the exchange by scanning the signer's fresh
      // QR key in their own account. A plain confirm request must be rejected.
      if (dto.action === 'confirm' && offer.recipientId === userId)
        this.validateHandoffQr(offer, userId, dto.qrToken);
      let status: string;
      if (dto.action === 'accept' || dto.action === 'decline') {
        if (offer.recipientId !== userId) throw new ForbiddenException();
        if (offer.status !== 'PENDING') throw new ConflictException('Предложение уже закрыто');
        status = dto.action === 'accept' ? 'ACCEPTED' : 'DECLINED';
        if (dto.action === 'accept') {
          await tx.$queryRaw(Prisma.sql`SELECT id FROM "Listing" WHERE id IN (${Prisma.join(offer.items.map(i => i.listingId))}) ORDER BY id FOR UPDATE`);
          const listings = await tx.listing.findMany({ where: { id: { in: offer.items.map(i => i.listingId) } }, include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } });
          if (listings.length !== offer.items.length || listings.some(l => {
            const item = offer.items.find(i => i.listingId === l.id)!;
            return l.status !== 'ACTIVE' || !l.barterEnabled || l.ownerId !== item.ownerId || fingerprint(l) !== (item.snapshot as any).fingerprint;
          })) throw new ConflictException('Объявление изменилось. Создайте новое предложение.');
          await tx.exchangeReservation.createMany({ data: offer.items.map(i => ({ listingId: i.listingId, offerId, expiresAt: new Date(Date.now() + 7 * 86400000) })) });
        }
      } else if (dto.action === 'cancel') {
        if (!['PENDING', 'ACCEPTED'].includes(offer.status)) throw new ConflictException('Предложение уже закрыто');
        if (offer.confirmations.length) throw new ConflictException('Передача уже подтверждена одной стороной. Обратитесь в поддержку.');
        status = 'CANCELLED';
      } else {
        if (offer.status !== 'ACCEPTED') throw new ConflictException('Сначала согласуйте условия');
        const unavailable = await tx.listing.count({ where: { id: { in: offer.items.map(i => i.listingId) }, status: { not: 'ACTIVE' } } });
        if (unavailable) throw new ConflictException('Объявление недоступно. Обратитесь в поддержку.');
        await tx.exchangeConfirmation.create({ data: { offerId, userId } });
        status = offer.confirmations.length === 1 ? 'COMPLETED' : 'ACCEPTED';
        if (status === 'COMPLETED') {
          // Reservation must still belong to this exact accepted revision.
          if (await tx.exchangeReservation.count({ where: { offerId } }) !== offer.items.length) throw new ConflictException('Резерв утрачен');
          await tx.exchangeReservation.deleteMany({ where: { offerId } });
          await tx.listing.updateMany({ where: { id: { in: offer.items.map(i => i.listingId) } }, data: { status: 'SOLD' } });
        }
      }
      if (['CANCELLED', 'COMPLETED', 'DECLINED'].includes(status)) await tx.exchangeReservation.deleteMany({ where: { offerId } });
      await tx.exchangeAudit.create({ data: { offerId, userId, action: dto.action } });
      const text = { accept: 'Условия обмена согласованы. Вещи зарезервированы.', decline: 'Предложение обмена отклонено.', cancel: 'Обмен отменён. Резерв снят.', confirm: status === 'COMPLETED' ? 'Обе стороны подтвердили передачу. Обмен завершён.' : 'Передача подтверждена одной стороной. Ожидаем вторую.' }[dto.action];
      await tx.message.create({ data: { chatId, senderId: userId, text } });
      await tx.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
      return tx.exchangeOffer.update({ where: { id: offerId }, data: { status, version: { increment: 1 }, ...(dto.action === 'accept' ? { expiresAt: new Date(Date.now() + 7 * 86400000) } : {}) }, include });
    });
  }
}
