import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async publicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        about: true,
        companyName: true,
        companyInfo: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('user_not_found');

    const [reviewsAgg, reviews, activeListings] = await Promise.all([
      this.prisma.sellerReview.aggregate({
        where: { sellerId: userId },
        _avg: { rating: true },
        _count: { id: true },
      }),
      this.prisma.sellerReview.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          rating: true,
          text: true,
          createdAt: true,
          author: { select: { id: true, name: true } },
          listing: { select: { id: true, title: true } },
        },
      }),
      this.prisma.listing.findMany({
        where: { ownerId: userId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          priceRub: true,
          city: true,
          createdAt: true,
          category: { select: { id: true, title: true } },
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { id: true, url: true, sortOrder: true },
          },
        },
      }),
    ]);

    return {
      user,
      rating: {
        avg: reviewsAgg._avg.rating ?? null,
        count: reviewsAgg._count.id,
      },
      reviews,
      activeListings,
    };
  }
}

