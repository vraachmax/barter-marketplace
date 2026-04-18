import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PresenceService } from '../presence/presence.service';
import { ChatsService } from './chats.service';

function getCookieToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map((x) => x.trim());
  for (const p of parts) {
    if (p.startsWith('token=')) return decodeURIComponent(p.slice('token='.length));
  }
  return null;
}

type AuthedSocket = Socket & { data: { userId?: string } };

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private jwt: JwtService,
    private chats: ChatsService,
    private presence: PresenceService,
  ) {}

  handleConnection(client: AuthedSocket) {
    try {
      const token = getCookieToken(client.handshake.headers.cookie);
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwt.verify<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      });
      const userId = payload.sub;
      client.data.userId = userId;
      this.presence.addOnline(userId);
      const snap = this.presence.getSnapshot();
      client.emit('presence-snapshot', snap);
      this.server.emit('presence-changed', { userId, online: true });
    } catch {
      client.disconnect();
    }
  }

  /** После сообщения пользователя — при необходимости добавить блок помощника в чат. */
  async broadcastDealAssistantMessages(chatId: string) {
    try {
      const msgs = await this.chats.maybePostDealAssistantFlow(chatId);
      for (const m of msgs) {
        this.server.to(`chat:${chatId}`).emit('message-created', {
          chatId,
          ...m,
        });
      }
    } catch (e) {
      console.error('[ChatsGateway] deal assistant flow failed', e);
    }
  }

  /** Если у продавца включён автоответ — постит его на первое сообщение покупателя. */
  async broadcastSellerAutoReply(chatId: string, senderUserId: string) {
    try {
      const msgs = await this.chats.maybePostSellerAutoReply(chatId, senderUserId);
      for (const m of msgs) {
        this.server.to(`chat:${chatId}`).emit('message-created', {
          chatId,
          ...m,
        });
      }
    } catch (e) {
      console.error('[ChatsGateway] seller auto-reply failed', e);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    const userId = client.data.userId;
    if (!userId) return;
    const stillConnected = Array.from(this.server.sockets.sockets.values()).some(
      (s) => (s as AuthedSocket).id !== client.id && (s as AuthedSocket).data.userId === userId,
    );
    if (stillConnected) return;
    this.presence.setOffline(userId);
    const lastSeenAt = this.presence.getLastSeenAt(userId) ?? new Date().toISOString();
    this.server.emit('presence-changed', { userId, online: false, lastSeenAt });
  }

  @SubscribeMessage('join-chat')
  async joinChat(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { chatId: string }) {
    const userId = client.data.userId;
    if (!userId || !body?.chatId) return { ok: false };
    await this.chats.assertParticipant(body.chatId, userId);
    await client.join(`chat:${body.chatId}`);
    return { ok: true };
  }

  @SubscribeMessage('send-message')
  async sendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { chatId: string; text: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !body?.chatId || !body?.text?.trim()) return { ok: false };
    const message = await this.chats.sendMessage(body.chatId, userId, body.text.trim());
    this.server.to(`chat:${body.chatId}`).emit('message-created', {
      chatId: body.chatId,
      ...message,
    });
    await this.broadcastSellerAutoReply(body.chatId, userId);
    await this.broadcastDealAssistantMessages(body.chatId);
    return { ok: true };
  }

  @SubscribeMessage('typing')
  async typing(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { chatId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId || !body?.chatId) return { ok: false };
    await this.chats.assertParticipant(body.chatId, userId);
    this.server.to(`chat:${body.chatId}`).emit('typing-changed', {
      chatId: body.chatId,
      userId,
      isTyping: Boolean(body.isTyping),
    });
    return { ok: true };
  }

  @SubscribeMessage('read-chat')
  async readChat(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { chatId: string }) {
    const userId = client.data.userId;
    if (!userId || !body?.chatId) return { ok: false };
    const { readAt } = await this.chats.markRead(body.chatId, userId);
    this.server.to(`chat:${body.chatId}`).emit('chat-read', {
      chatId: body.chatId,
      userId,
      readAt,
    });
    return { ok: true };
  }
}

