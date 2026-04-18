import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, type MessageMediaType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { AnalyticsService } from '../analytics/analytics.service';
import { PLATFORM_ASSISTANT_EMAIL, PLATFORM_ASSISTANT_NAME } from '../platform.constants';
import { PrismaService } from '../prisma/prisma.service';
import { SupportService } from '../support/support.service';

const ASSISTANT_DEAL_FLOW_TEXTS = [
  'Здравствуйте! Я виртуальный помощник площадки.\n\nКак у вас прошла сделка по этому объявлению? Состоялась ли она? Напишите «да», «нет» или пару слов — так проще ориентироваться другим пользователям.',
  'Безопасность: не переходите в WhatsApp, Telegram, ВК и другие мессенджеры по просьбе незнакомых людей. Мошенники часто уводят общение с площадки. Договорённости и передачу товара надёжнее вести здесь, в нашем чате.',
  'Когда будете готовы, оцените продавца: на странице объявления откроется блок «Оценка продавца» после переписки здесь — как на Avito и крупных маркетплейсах.',
] as const;

@Injectable()
export class ChatsService {
  private assistantUserIdPromise: Promise<string> | null = null;

  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
    private support: SupportService,
  ) {}

  private async recordSendMessageListingEvent(
    chatId: string,
    userId: string,
    ctx?: { sessionId?: string; anonymousId?: string },
  ) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { listingId: true },
    });
    const listingId = chat?.listingId;
    if (!listingId) return;
    const sessionId = ctx?.sessionId?.trim() || `user:${userId}`;
    void this.analytics
      .trackServerEvent({
        type: 'SEND_MESSAGE',
        listingId,
        sessionId,
        userId,
        anonymousId: ctx?.anonymousId?.trim() || null,
      })
      .catch(() => undefined);
  }

  /** Пользователь-бот для системных подсказок в чате (не участник ChatUser). */
  async getAssistantUserId(): Promise<string> {
    if (!this.assistantUserIdPromise) {
      this.assistantUserIdPromise = (async () => {
        const rnd = randomBytes(24).toString('hex');
        const passwordHash = await bcrypt.hash(rnd, 10);
        const u = await this.prisma.user.upsert({
          where: { email: PLATFORM_ASSISTANT_EMAIL },
          create: {
            email: PLATFORM_ASSISTANT_EMAIL,
            name: PLATFORM_ASSISTANT_NAME,
            passwordHash,
          },
          update: { name: PLATFORM_ASSISTANT_NAME },
          select: { id: true },
        });
        return u.id;
      })();
    }
    return this.assistantUserIdPromise;
  }

  /**
   * После того как покупатель и продавец обменялись сообщениями — один раз добавляет
   * блок помощника: вопрос о сделке, предупреждение о мессенджерах, напоминание про отзыв.
   */
  async maybePostDealAssistantFlow(chatId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        listingId: true,
        assistantDealFlowAt: true,
        listing: { select: { ownerId: true } },
        users: { select: { userId: true } },
      },
    });
    if (!chat?.listingId || !chat.listing || chat.assistantDealFlowAt) return [];

    const sellerId = chat.listing.ownerId;
    const buyerId = chat.users.map((u) => u.userId).find((id) => id !== sellerId);
    if (!buyerId) return [];

    const [fromBuyer, fromSeller] = await Promise.all([
      this.prisma.message.count({ where: { chatId, senderId: buyerId } }),
      this.prisma.message.count({ where: { chatId, senderId: sellerId } }),
    ]);
    if (fromBuyer < 1 || fromSeller < 1) return [];

    const assistantId = await this.getAssistantUserId();
    const select = {
      id: true,
      text: true,
      mediaUrl: true,
      mediaType: true,
      createdAt: true,
      senderId: true,
      sender: { select: { id: true, name: true } },
    } as const;

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.chat.updateMany({
        where: { id: chatId, assistantDealFlowAt: null },
        data: { assistantDealFlowAt: new Date() },
      });
      if (claimed.count !== 1) return [];

      const out: Array<{
        id: string;
        text: string;
        mediaUrl: string | null;
        mediaType: MessageMediaType | null;
        createdAt: Date;
        senderId: string;
        sender: { id: string; name: string | null };
        isAssistant: boolean;
      }> = [];
      for (const text of ASSISTANT_DEAL_FLOW_TEXTS) {
        const m = await tx.message.create({
          data: {
            chatId,
            senderId: assistantId,
            text,
            mediaUrl: null,
            mediaType: null,
          },
          select,
        });
        out.push({ ...m, isAssistant: true });
      }
      return out;
    });
  }

  async assertParticipant(chatId: string, userId: string) {
    const participant = await this.prisma.chatUser.findUnique({
      where: { chatId_userId: { chatId, userId } },
      select: { id: true },
    });
    if (!participant) throw new ForbiddenException('not_chat_participant');
  }

  async getOrCreateByListing(listingId: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerId: true, title: true, status: true },
    });
    if (!listing) throw new NotFoundException('listing_not_found');
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new NotFoundException('listing_not_found');
    }
    if (listing.ownerId === userId) {
      throw new BadRequestException('cannot_chat_with_yourself');
    }

    const existing = await this.prisma.chat.findFirst({
      where: {
        listingId,
        AND: [
          { users: { some: { userId } } },
          { users: { some: { userId: listing.ownerId } } },
        ],
      },
      select: { id: true },
    });
    if (existing) return existing;

    return this.prisma.chat.create({
      data: {
        listingId,
        users: {
          create: [{ userId }, { userId: listing.ownerId }],
        },
      },
      select: { id: true },
    });
  }

  async list(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        users: { some: { userId } },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        updatedAt: true,
        listing: {
          select: {
            id: true,
            title: true,
            priceRub: true,
            city: true,
            ownerId: true,
            images: {
              orderBy: { sortOrder: 'asc' },
              take: 1,
              select: {
                url: true,
              },
            },
          },
        },
        users: {
          select: {
            userId: true,
            lastReadAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            text: true,
            mediaUrl: true,
            mediaType: true,
            createdAt: true,
            senderId: true,
          },
        },
      },
    });

    const unreadByChatId = new Map<string, number>();
    await Promise.all(
      chats.map(async (chat) => {
        const me = chat.users.find((u) => u.userId === userId);
        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
          },
        });
        unreadByChatId.set(chat.id, unreadCount);
      }),
    );

    return chats.map((c) => {
      const peer = c.users.find((u) => u.user.id !== userId)?.user ?? null;
      const myRole: 'buyer' | 'seller' | 'neutral' = c.listing
        ? c.listing.ownerId === userId
          ? 'seller'
          : 'buyer'
        : 'neutral';
      return {
        id: c.id,
        updatedAt: c.updatedAt,
        listing: c.listing
          ? {
              ...c.listing,
              previewImageUrl: c.listing.images?.[0]?.url ?? null,
            }
          : null,
        peer,
        myRole,
        lastMessage: c.messages[0] ?? null,
        unreadCount: unreadByChatId.get(c.id) ?? 0,
      };
    });
  }

  async getMessages(chatId: string, userId: string) {
    await this.assertParticipant(chatId, userId);
    const chatUsers = await this.prisma.chatUser.findMany({
      where: { chatId },
      select: { userId: true, lastReadAt: true },
    });
    const peerLastReadAt = chatUsers.find((u) => u.userId !== userId)?.lastReadAt ?? null;

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        text: true,
        mediaUrl: true,
        mediaType: true,
        createdAt: true,
        senderId: true,
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    const assistantId = await this.getAssistantUserId().catch(() => null);
    await this.markRead(chatId, userId);
    return messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      isAssistant: assistantId != null && m.senderId === assistantId,
      isReadByPeer:
        m.senderId === userId && peerLastReadAt
          ? m.createdAt.getTime() <= peerLastReadAt.getTime()
          : false,
    }));
  }

  async sendMessage(
    chatId: string,
    userId: string,
    text: string,
    ctx?: { sessionId?: string; anonymousId?: string },
  ) {
    await this.assertParticipant(chatId, userId);

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          chatId,
          senderId: userId,
          text,
          mediaUrl: null,
          mediaType: null,
        },
        select: {
          id: true,
          text: true,
          mediaUrl: true,
          mediaType: true,
          createdAt: true,
          senderId: true,
          sender: { select: { id: true, name: true } },
        },
      }),
      this.prisma.chat.update({
        where: { id: chatId },
        data: {},
        select: { id: true },
      }),
      this.prisma.chatUser.updateMany({
        where: { chatId, userId },
        data: { lastReadAt: new Date() },
      }),
    ]);

    void this.recordSendMessageListingEvent(chatId, userId, ctx);
    return message;
  }

  /**
   * Если это первое сообщение покупателя в чате и у продавца включён автоответ —
   * один раз постит автоответ от имени продавца. Возвращает массив сообщений (0 или 1).
   */
  async maybePostSellerAutoReply(chatId: string, senderUserId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        listingId: true,
        listing: { select: { ownerId: true } },
      },
    });
    if (!chat?.listing) return [];
    const sellerId = chat.listing.ownerId;
    if (sellerId === senderUserId) return []; // продавец сам себе не отвечает

    // Только если это первое сообщение от данного покупателя
    const fromBuyer = await this.prisma.message.count({
      where: { chatId, senderId: senderUserId },
    });
    if (fromBuyer !== 1) return [];

    // Не дублируем, если продавец уже что-то писал
    const fromSeller = await this.prisma.message.count({
      where: { chatId, senderId: sellerId },
    });
    if (fromSeller > 0) return [];

    let replyText: string | null = null;
    try {
      replyText = await this.support.resolveSellerAutoReplyText(sellerId);
    } catch {
      replyText = null;
    }
    if (!replyText) return [];

    const select = {
      id: true,
      text: true,
      mediaUrl: true,
      mediaType: true,
      createdAt: true,
      senderId: true,
      sender: { select: { id: true, name: true } },
    } as const;

    const m = await this.prisma.message.create({
      data: {
        chatId,
        senderId: sellerId,
        text: replyText,
        mediaUrl: null,
        mediaType: null,
      },
      select,
    });
    return [{ ...m, isAssistant: false, isAutoReply: true }];
  }

  async sendMediaMessage(
    chatId: string,
    userId: string,
    mediaUrl: string,
    mediaType: MessageMediaType,
    text?: string,
    ctx?: { sessionId?: string; anonymousId?: string },
  ) {
    await this.assertParticipant(chatId, userId);

    const fallbackText = mediaType === 'VIDEO' ? 'Видео' : 'Фото';
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          chatId,
          senderId: userId,
          text: text?.trim() || fallbackText,
          mediaUrl,
          mediaType,
        },
        select: {
          id: true,
          text: true,
          mediaUrl: true,
          mediaType: true,
          createdAt: true,
          senderId: true,
          sender: { select: { id: true, name: true } },
        },
      }),
      this.prisma.chat.update({
        where: { id: chatId },
        data: {},
        select: { id: true },
      }),
      this.prisma.chatUser.updateMany({
        where: { chatId, userId },
        data: { lastReadAt: new Date() },
      }),
    ]);

    void this.recordSendMessageListingEvent(chatId, userId, ctx);
    return message;
  }

  async markRead(chatId: string, userId: string) {
    await this.assertParticipant(chatId, userId);
    const readAt = new Date();
    await this.prisma.chatUser.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadAt: readAt },
    });
    return { readAt: readAt.toISOString() };
  }
}

