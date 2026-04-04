import { Injectable } from '@nestjs/common';

/**
 * Кто сейчас с открытым приложением (WebSocket с валидным JWT).
 * In-memory — для одного инстанса API достаточно.
 */
@Injectable()
export class PresenceService {
  private readonly onlineUsers = new Set<string>();
  private readonly lastSeenByUser = new Map<string, string>();

  addOnline(userId: string) {
    this.onlineUsers.add(userId);
  }

  /** Убрать из онлайна; зафиксировать lastSeen (ISO). */
  setOffline(userId: string) {
    this.onlineUsers.delete(userId);
    this.lastSeenByUser.set(userId, new Date().toISOString());
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getLastSeenAt(userId: string): string | null {
    return this.lastSeenByUser.get(userId) ?? null;
  }

  getSnapshot() {
    return {
      onlineUserIds: Array.from(this.onlineUsers),
      lastSeenByUser: Object.fromEntries(this.lastSeenByUser),
    };
  }
}
