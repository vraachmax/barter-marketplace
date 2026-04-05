import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserBehaviorEventType } from '@prisma/client';
import { extractJwtFromRequest } from '../auth/extract-jwt-from-request';
import { PrismaService } from '../prisma/prisma.service';
import { BehaviorEventTypeInput } from './dto/track-events.dto';

export type TrackEventInput = {
  type: UserBehaviorEventType;
  listingId: string;
  occurredAt?: Date;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  tryResolveUserId(req: { cookies?: any; headers?: any }): string | null {
    const raw = extractJwtFromRequest(req);
    if (!raw) return null;
    try {
      const payload = this.jwt.verify<{ sub: string }>(raw, {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      });
      return typeof payload?.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }

  private static readonly typeMap: Record<BehaviorEventTypeInput, UserBehaviorEventType> = {
    [BehaviorEventTypeInput.view_item]: 'VIEW_ITEM',
    [BehaviorEventTypeInput.click_item]: 'CLICK_ITEM',
    [BehaviorEventTypeInput.add_to_favorites]: 'ADD_TO_FAVORITES',
    [BehaviorEventTypeInput.send_message]: 'SEND_MESSAGE',
  };

  private mapType(t: BehaviorEventTypeInput): UserBehaviorEventType {
    return AnalyticsService.typeMap[t];
  }

  /**
   * Пакетная запись событий (клиент). Нужны sessionId и (anonymousId или авторизованный user).
   */
  async trackFromRequest(
    req: { cookies?: any; headers?: any },
    body: {
      sessionId: string;
      anonymousId?: string;
      events: Array<{ type: BehaviorEventTypeInput; listingId: string; occurredAt?: string }>;
    },
  ) {
    const userId = this.tryResolveUserId(req);
    const sessionId = body.sessionId.trim();
    const anonymousId = body.anonymousId?.trim() || null;

    if (!sessionId) throw new BadRequestException('session_id_required');
    if (!userId && !anonymousId) throw new BadRequestException('anonymous_id_or_auth_required');

    return this.track({
      sessionId,
      userId,
      anonymousId,
      events: body.events.map((e) => ({
        type: this.mapType(e.type),
        listingId: e.listingId,
        occurredAt: e.occurredAt ? new Date(e.occurredAt) : undefined,
      })),
    });
  }

  /**
   * Запись с сервера (избранное, чат и т.д.): как минимум userId или anonymousId, sessionId.
   */
  async trackServerEvent(params: {
    type: UserBehaviorEventType;
    listingId: string;
    sessionId: string;
    userId?: string | null;
    anonymousId?: string | null;
    occurredAt?: Date;
  }) {
    const sessionId = params.sessionId.trim();
    const anonymousId = params.anonymousId?.trim() || null;
    const userId = params.userId ?? null;
    if (!sessionId) return { ok: false as const, reason: 'no_session' };
    if (!userId && !anonymousId) return { ok: false as const, reason: 'no_actor' };

    return this.track({
      sessionId,
      userId,
      anonymousId,
      events: [
        {
          type: params.type,
          listingId: params.listingId,
          occurredAt: params.occurredAt,
        },
      ],
    });
  }

  async track(params: {
    sessionId: string;
    userId?: string | null;
    anonymousId?: string | null;
    events: TrackEventInput[];
  }) {
    const listingIds = [...new Set(params.events.map((e) => e.listingId))];
    if (listingIds.length === 0) return { ok: true as const, inserted: 0 };

    const existing = await this.prisma.listing.findMany({
      where: { id: { in: listingIds }, status: 'ACTIVE' },
      select: { id: true },
    });
    const ok = new Set(existing.map((x) => x.id));

    const rows = params.events
      .filter((e) => ok.has(e.listingId))
      .map((e) => ({
        type: e.type,
        listingId: e.listingId,
        sessionId: params.sessionId,
        userId: params.userId ?? null,
        anonymousId: params.anonymousId?.trim() || null,
        createdAt: e.occurredAt ?? new Date(),
      }));

    if (rows.length === 0) return { ok: true as const, inserted: 0 };

    await this.prisma.userBehaviorEvent.createMany({ data: rows });

    const clickIds = [...new Set(rows.filter((r) => r.type === 'CLICK_ITEM').map((r) => r.listingId))];
    for (const id of clickIds) {
      void this.prisma.listing
        .updateMany({
          where: { id },
          data: { clicksCount: { increment: 1 } },
        })
        .catch(() => undefined);
    }

    return { ok: true as const, inserted: rows.length };
  }
}
