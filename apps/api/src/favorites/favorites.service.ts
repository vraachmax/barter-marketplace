import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
  ) {}

  async list(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        listing: {
          select: {
            id: true,
            title: true,
            priceRub: true,
            city: true,
            createdAt: true,
            category: { select: { id: true, title: true } },
          },
        },
      },
    });
  }

  async add(
    userId: string,
    listingId: string,
    ctx?: { sessionId?: string; anonymousId?: string },
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException('listing_not_found');

    await this.prisma.favorite.upsert({
      where: { userId_listingId: { userId, listingId } },
      update: {},
      create: { userId, listingId },
    });

    const sessionId = ctx?.sessionId?.trim() || `user:${userId}`;
    void this.analytics
      .trackServerEvent({
        type: 'ADD_TO_FAVORITES',
        listingId,
        sessionId,
        userId,
        anonymousId: ctx?.anonymousId?.trim() || null,
      })
      .catch(() => undefined);

    return { ok: true };
  }

  async remove(userId: string, listingId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, listingId } });
    return { ok: true };
  }
}

