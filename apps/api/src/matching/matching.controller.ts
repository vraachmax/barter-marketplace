import { Controller, ForbiddenException, Get, NotFoundException, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { learnCategoryAffinity, matchListings, MatchEvent, MatchListing } from './match-engine';

@Controller('match')
export class MatchingController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recommendations are only for the listing owner. Exchange offers remain
   * a separate two-party consent workflow. No automatic deal activation.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('listings/:id')
  async forListing(@Param('id') id: string, @Req() req: any, @Query('limit') rawLimit?: string) {
    const userId: string = req.user.id;
    const mine = await this.prisma.listing.findUnique({
      where: { id },
      select: {
        id: true, ownerId: true, categoryId: true, title: true, city: true,
        barterEnabled: true, status: true, priceRub: true,
        exchangePreferences: true, attributes: true,
      },
    });
    if (!mine) throw new NotFoundException('listing_not_found');
    if (mine.ownerId !== userId) throw new ForbiddenException('not_listing_owner');
    const limit = Number.isFinite(Number(rawLimit)) ?
      Math.max(1, Math.min(50, Math.trunc(Number(rawLimit)) || 20)) : 20;
    if (mine.status !== 'ACTIVE' || !mine.barterEnabled) {
      return { listingId: id, matches: [], totalCandidatesChecked: 0 };
    }
    const cutoff = new Date(Date.now() - 90 * 86400000);
    const [candidates, user, recent] = await Promise.all([
      this.prisma.listing.findMany({
        where: { status: 'ACTIVE', barterEnabled: true, ownerId: { not: userId }, id: { not: id } },
        select: {
          id: true, ownerId: true, categoryId: true, title: true, city: true,
          barterEnabled: true, status: true, priceRub: true,
          exchangePreferences: true, attributes: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 1000,
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
      this.prisma.userBehaviorEvent.findMany({
        where: { userId, createdAt: { gte: cutoff } },
        select: { type: true, createdAt: true, listing: { select: { categoryId: true } } },
        orderBy: { createdAt: 'desc' }, take: 1000,
      }),
    ]);
    const typeSet = new Set(['VIEW_ITEM', 'CLICK_ITEM', 'ADD_TO_FAVORITES', 'SEND_MESSAGE']);
    // Exclude synthetic demo actors from personalization and real metrics.
    const training: MatchEvent[] = user?.email?.endsWith('@example.invalid') ? [] :
      recent.filter(row => typeSet.has(row.type)).map(row => ({
        userId, categoryId: row.listing.categoryId, createdAt: row.createdAt,
        type: row.type as MatchEvent['type'],
      }));
    const toMatch = (row: typeof mine): MatchListing => ({...row,
      exchangePreferences: row.exchangePreferences, attributes: row.attributes});
    const results = matchListings(toMatch(mine), candidates.map(toMatch),
      learnCategoryAffinity(training,userId),limit);
    const matchingIds = results.map(row => row.listingId);
    const cards = await this.prisma.listing.findMany({
      where: { id: { in: matchingIds } },
      select: { id: true, title: true, priceRub: true, city: true,
        saleEnabled: true, barterEnabled: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 4, select: { url: true, sortOrder: true } },
        category: { select: { id: true, title: true } },
        owner: { select: { id: true, name: true } },
      },
    });
    const cardById = new Map(cards.map(row=>[row.id,row]));
    return {listingId:id, matches:results.map(result=>({
      ...result, listing: cardById.get(result.listingId) ?? null,
    })), totalCandidatesChecked:candidates.length, algorithmVersion:'match-v2-heuristic'};
  }
}
