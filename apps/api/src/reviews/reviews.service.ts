import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSellerReviewDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async boostMe(sellerId: string) {
    const listings = await this.prisma.listing.findMany({
      where: { ownerId: sellerId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true },
    });
    if (listings.length === 0) {
      throw new BadRequestException('create_listing_first');
    }

    const demoUsersData = [
      { email: 'demo-buyer-1@barter.local', name: 'Покупатель Анна' },
      { email: 'demo-buyer-2@barter.local', name: 'Покупатель Илья' },
      { email: 'demo-buyer-3@barter.local', name: 'Покупатель Олег' },
    ];

    const reviewers: Array<{ id: string }> = [];
    for (const demo of demoUsersData) {
      const user =
        (await this.prisma.user.findUnique({ where: { email: demo.email }, select: { id: true } })) ??
        (await this.prisma.user.create({
          data: {
            email: demo.email,
            name: demo.name,
            passwordHash: await bcrypt.hash('password123', 10),
          },
          select: { id: true },
        }));
      if (user.id !== sellerId) reviewers.push(user);
    }

    const comments = [
      'Все отлично, сделка прошла быстро.',
      'Вежливый продавец, рекомендую.',
      'Описание соответствовало, все честно.',
      'Быстрый ответ и удобная встреча.',
    ];

    const writes = listings.flatMap((listing, idx) =>
      reviewers.map((author, jdx) =>
        this.prisma.sellerReview.upsert({
          where: {
            authorId_listingId: { authorId: author.id, listingId: listing.id },
          },
          update: {
            sellerId,
            rating: idx % 3 === 0 && jdx === 2 ? 4 : 5,
            text: comments[(idx + jdx) % comments.length],
          },
          create: {
            authorId: author.id,
            sellerId,
            listingId: listing.id,
            rating: idx % 3 === 0 && jdx === 2 ? 4 : 5,
            text: comments[(idx + jdx) % comments.length],
          },
        }),
      ),
    );

    await this.prisma.$transaction(writes);

    const summary = await this.prisma.sellerReview.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    return {
      ok: true,
      rating: {
        avg: summary._avg.rating,
        count: summary._count._all,
      },
    };
  }

  async eligibility(authorId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerId: true },
    });
    if (!listing) {
      return { canReview: false, reason: 'listing_not_found' as const };
    }
    const sellerId = listing.ownerId;
    if (authorId === sellerId) {
      return { canReview: false, reason: 'is_owner' as const, sellerId };
    }

    const existing = await this.prisma.sellerReview.findUnique({
      where: { authorId_listingId: { authorId, listingId } },
      select: { id: true },
    });
    if (existing) {
      return { canReview: false, reason: 'already_reviewed' as const, sellerId, hasExistingReview: true };
    }

    const chat = await this.prisma.chat.findFirst({
      where: {
        listingId,
        users: { some: { userId: authorId } },
        AND: [{ users: { some: { userId: sellerId } } }],
      },
      select: { id: true },
    });
    if (!chat) {
      return { canReview: false, reason: 'no_chat' as const, sellerId };
    }

    const [nAuthor, nSeller] = await Promise.all([
      this.prisma.message.count({ where: { chatId: chat.id, senderId: authorId } }),
      this.prisma.message.count({ where: { chatId: chat.id, senderId: sellerId } }),
    ]);
    if (nAuthor < 1 || nSeller < 1) {
      return { canReview: false, reason: 'need_mutual_messages' as const, sellerId };
    }

    return { canReview: true, reason: 'ok' as const, sellerId };
  }

  async my(userId: string) {
    const [given, received] = await Promise.all([
      this.prisma.sellerReview.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          rating: true,
          text: true,
          createdAt: true,
          listing: { select: { id: true, title: true } },
          seller: { select: { id: true, name: true } },
        },
      }),
      this.prisma.sellerReview.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          rating: true,
          text: true,
          createdAt: true,
          listing: { select: { id: true, title: true } },
          author: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { given, received };
  }

  async create(authorId: string, sellerId: string, dto: CreateSellerReviewDto) {
    if (authorId === sellerId) throw new BadRequestException('cannot_review_yourself');

    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { id: true, ownerId: true },
    });
    if (!listing) throw new NotFoundException('listing_not_found');
    if (listing.ownerId !== sellerId) throw new BadRequestException('listing_not_owned_by_seller');

    const chat = await this.prisma.chat.findFirst({
      where: {
        listingId: dto.listingId,
        users: { some: { userId: authorId } },
        AND: [{ users: { some: { userId: sellerId } } }],
      },
      select: { id: true },
    });
    if (!chat) {
      throw new ForbiddenException('review_requires_chat_on_listing');
    }

    const [nAuthor, nSeller] = await Promise.all([
      this.prisma.message.count({ where: { chatId: chat.id, senderId: authorId } }),
      this.prisma.message.count({ where: { chatId: chat.id, senderId: sellerId } }),
    ]);
    if (nAuthor < 1 || nSeller < 1) {
      throw new ForbiddenException('review_requires_mutual_messages');
    }

    return this.prisma.sellerReview.upsert({
      where: {
        authorId_listingId: {
          authorId,
          listingId: dto.listingId,
        },
      },
      update: {
        rating: dto.rating,
        text: dto.text?.trim() || null,
        sellerId,
      },
      create: {
        authorId,
        sellerId,
        listingId: dto.listingId,
        rating: dto.rating,
        text: dto.text?.trim() || null,
      },
      select: {
        id: true,
        rating: true,
        text: true,
        createdAt: true,
      },
    });
  }
}

