import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListingStatus,
  Prisma,
  ProSubscriptionStatus,
  PromotionType,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PromoteFromWalletDto, SubscribeProDto, TopupDto } from './dto';

const KOPECKS_PER_RUB = 100;

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  /// Гарантирует наличие кошелька у пользователя.
  /// Используется при первой оплате/пополнении.
  async ensureWallet(userId: string) {
    return this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balanceKopecks: 0 },
    });
  }

  async getBalance(userId: string) {
    const wallet = await this.ensureWallet(userId);
    return {
      balanceRub: Math.floor(wallet.balanceKopecks / KOPECKS_PER_RUB),
      balanceKopecks: wallet.balanceKopecks,
      updatedAt: wallet.updatedAt,
    };
  }

  async listTransactions(userId: string, limit = 50) {
    const wallet = await this.ensureWallet(userId);
    const items = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
      select: {
        id: true,
        createdAt: true,
        amountKopecks: true,
        balanceAfterKopecks: true,
        type: true,
        status: true,
        description: true,
        listingPromotion: {
          select: {
            id: true,
            type: true,
            endsAt: true,
            listing: { select: { id: true, title: true } },
          },
        },
        proSubscription: {
          select: {
            id: true,
            endsAt: true,
            plan: { select: { code: true, title: true } },
          },
        },
      },
    });

    return items.map((it) => ({
      id: it.id,
      createdAt: it.createdAt,
      amountRub: it.amountKopecks / KOPECKS_PER_RUB,
      amountKopecks: it.amountKopecks,
      balanceAfterRub: it.balanceAfterKopecks / KOPECKS_PER_RUB,
      type: it.type,
      status: it.status,
      description: it.description,
      promotion: it.listingPromotion
        ? {
            id: it.listingPromotion.id,
            type: it.listingPromotion.type,
            endsAt: it.listingPromotion.endsAt,
            listing: it.listingPromotion.listing,
          }
        : null,
      proSubscription: it.proSubscription
        ? {
            id: it.proSubscription.id,
            endsAt: it.proSubscription.endsAt,
            plan: it.proSubscription.plan,
          }
        : null,
    }));
  }

  /// Mock-пополнение: моментально зачисляет на баланс. Для alpha без реальной платёжки.
  async topup(userId: string, dto: TopupDto) {
    const amountKopecks = dto.amountRub * KOPECKS_PER_RUB;

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balanceKopecks: 0 },
      });

      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceKopecks: { increment: amountKopecks } },
      });

      const txn = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          amountKopecks,
          balanceAfterKopecks: updated.balanceKopecks,
          type: WalletTransactionType.TOPUP,
          description: `Пополнение баланса на ${dto.amountRub.toLocaleString('ru-RU')} ₽`,
          externalId: dto.externalId ?? `mock_${Date.now()}`,
        },
        select: { id: true, createdAt: true, amountKopecks: true, balanceAfterKopecks: true },
      });

      return {
        ok: true,
        balanceRub: updated.balanceKopecks / KOPECKS_PER_RUB,
        transaction: {
          id: txn.id,
          createdAt: txn.createdAt,
          amountRub: txn.amountKopecks / KOPECKS_PER_RUB,
          balanceAfterRub: txn.balanceAfterKopecks / KOPECKS_PER_RUB,
        },
      };
    });
  }

  /// Покупка промо-пакета из каталога с автосоздание ListingPromotion
  async promoteFromWallet(userId: string, dto: PromoteFromWalletDto) {
    const pkg = await this.prisma.promotionPackage.findUnique({
      where: { code: dto.packageCode },
    });
    if (!pkg || !pkg.isActive) throw new NotFoundException('promotion_package_not_found');

    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { id: true, ownerId: true, status: true, title: true },
    });
    if (!listing) throw new NotFoundException('listing_not_found');
    if (listing.ownerId !== userId) throw new ForbiddenException('not_listing_owner');
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('listing_not_active_for_promotion');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balanceKopecks: 0 },
      });

      if (wallet.balanceKopecks < pkg.priceKopecks) {
        throw new BadRequestException('insufficient_balance');
      }

      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceKopecks: { decrement: pkg.priceKopecks } },
      });

      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + pkg.durationSec * 1000);

      const promotion = await tx.listingPromotion.create({
        data: {
          listingId: listing.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: pkg.promotionType as any,
          startsAt,
          endsAt,
          weight: this.computeWeight(pkg.promotionType, pkg.weightMultiplier),
          packageId: pkg.id,
          priceKopecks: pkg.priceKopecks,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      const txn = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          amountKopecks: -pkg.priceKopecks,
          balanceAfterKopecks: updated.balanceKopecks,
          type: WalletTransactionType.PROMOTION,
          description: `${pkg.title} — «${listing.title}»`,
          listingPromotionId: promotion.id,
        },
        select: { id: true },
      });

      return {
        ok: true,
        balanceRub: updated.balanceKopecks / KOPECKS_PER_RUB,
        promotion: {
          id: promotion.id,
          type: promotion.type,
          startsAt: promotion.startsAt,
          endsAt: promotion.endsAt,
        },
        transactionId: txn.id,
      };
    });
  }

  /// Подписка на Barter Pro (списание + создание/продление UserProSubscription)
  async subscribePro(userId: string, dto: SubscribeProDto) {
    const plan = await this.prisma.proPlan.findUnique({
      where: { code: dto.planCode },
    });
    if (!plan || !plan.isActive) throw new NotFoundException('pro_plan_not_found');

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balanceKopecks: 0 },
      });

      if (wallet.balanceKopecks < plan.priceKopecksPerMonth) {
        throw new BadRequestException('insufficient_balance');
      }

      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceKopecks: { decrement: plan.priceKopecksPerMonth } },
      });

      const now = new Date();
      const monthSec = 30 * 24 * 60 * 60 * 1000;

      // Если уже есть активная подписка, продлеваем endsAt; иначе создаём от now
      const existing = await tx.userProSubscription.findUnique({ where: { userId } });
      const baseStart = existing && existing.endsAt > now ? existing.endsAt : now;
      const newEndsAt = new Date(baseStart.getTime() + monthSec);

      const subscription = existing
        ? await tx.userProSubscription.update({
            where: { id: existing.id },
            data: {
              planId: plan.id,
              status: ProSubscriptionStatus.ACTIVE,
              startsAt: existing.startsAt,
              endsAt: newEndsAt,
            },
          })
        : await tx.userProSubscription.create({
            data: {
              userId,
              planId: plan.id,
              startsAt: now,
              endsAt: newEndsAt,
              status: ProSubscriptionStatus.ACTIVE,
            },
          });

      const txn = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          amountKopecks: -plan.priceKopecksPerMonth,
          balanceAfterKopecks: updated.balanceKopecks,
          type: WalletTransactionType.PRO_SUBSCRIPTION,
          description: `Barter Pro — ${plan.title} (1 мес)`,
          proSubscriptionId: subscription.id,
        },
        select: { id: true },
      });

      return {
        ok: true,
        balanceRub: updated.balanceKopecks / KOPECKS_PER_RUB,
        subscription: {
          id: subscription.id,
          planCode: plan.code,
          planTitle: plan.title,
          startsAt: subscription.startsAt,
          endsAt: subscription.endsAt,
          status: subscription.status,
        },
        transactionId: txn.id,
      };
    });
  }

  async listPackages(audience?: 'PERSONAL' | 'BUSINESS') {
    const where: Prisma.PromotionPackageWhereInput = { isActive: true };
    if (audience) where.audience = audience;
    const items = await this.prisma.promotionPackage.findMany({
      where,
      orderBy: [{ audience: 'asc' }, { sortOrder: 'asc' }],
    });
    return items.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.description,
      audience: p.audience,
      promotionType: p.promotionType,
      weightMultiplier: p.weightMultiplier,
      durationSec: p.durationSec,
      priceRub: p.priceKopecks / KOPECKS_PER_RUB,
      priceKopecks: p.priceKopecks,
      isBundle: p.isBundle,
      sortOrder: p.sortOrder,
    }));
  }

  async listProPlans() {
    const items = await this.prisma.proPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return items.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      listingsLimit: p.listingsLimit,
      priceRubPerMonth: p.priceKopecksPerMonth / KOPECKS_PER_RUB,
      priceKopecksPerMonth: p.priceKopecksPerMonth,
    }));
  }

  async getProSubscription(userId: string) {
    const sub = await this.prisma.userProSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) return null;
    const isExpired = sub.endsAt < new Date();
    return {
      id: sub.id,
      status: isExpired ? ProSubscriptionStatus.EXPIRED : sub.status,
      autoRenew: sub.autoRenew,
      startsAt: sub.startsAt,
      endsAt: sub.endsAt,
      plan: {
        code: sub.plan.code,
        title: sub.plan.title,
        listingsLimit: sub.plan.listingsLimit,
        priceRubPerMonth: sub.plan.priceKopecksPerMonth / KOPECKS_PER_RUB,
      },
    };
  }

  /// Сидирование каталога пакетов промо и тарифов Pro из pricing.mdc.
  /// Идемпотентно: апсерт по уникальному code.
  async ensureSeed() {
    const packages: Array<{
      code: string;
      title: string;
      description: string;
      audience: 'PERSONAL' | 'BUSINESS';
      promotionType: PromotionType;
      weightMultiplier: number;
      durationSec: number;
      priceKopecks: number;
      isBundle?: boolean;
      sortOrder: number;
    }> = [
      // === Физлица ===
      { code: 'personal_lift_x2', title: 'Поднятие x2', description: 'В 2 раза больше показов на 1 день', audience: 'PERSONAL', promotionType: PromotionType.LIFT, weightMultiplier: 2, durationSec: 86400, priceKopecks: 1900, sortOrder: 10 },
      { code: 'personal_lift_x5', title: 'Поднятие x5', description: 'В 5 раз больше показов на 1 день', audience: 'PERSONAL', promotionType: PromotionType.LIFT, weightMultiplier: 5, durationSec: 86400, priceKopecks: 2900, sortOrder: 11 },
      { code: 'personal_lift_x10', title: 'Поднятие x10', description: 'В 10 раз больше показов на 1 день', audience: 'PERSONAL', promotionType: PromotionType.LIFT, weightMultiplier: 10, durationSec: 86400, priceKopecks: 4900, sortOrder: 12 },
      { code: 'personal_color', title: 'Выделение цветом', description: 'Объявление выделено цветом 7 дней', audience: 'PERSONAL', promotionType: PromotionType.COLOR, weightMultiplier: 1, durationSec: 7 * 86400, priceKopecks: 3000, sortOrder: 20 },
      { code: 'personal_xl', title: 'XL-объявление', description: 'Большая карточка в ленте 7 дней', audience: 'PERSONAL', promotionType: PromotionType.XL, weightMultiplier: 1, durationSec: 7 * 86400, priceKopecks: 6000, sortOrder: 30 },
      { code: 'personal_vip', title: 'VIP-размещение', description: 'VIP-блок наверху ленты 7 дней', audience: 'PERSONAL', promotionType: PromotionType.VIP, weightMultiplier: 1, durationSec: 7 * 86400, priceKopecks: 9900, sortOrder: 40 },
      { code: 'personal_turbo', title: 'Турбо', description: 'Поднятие x10 + XL + VIP на 7 дней', audience: 'PERSONAL', promotionType: PromotionType.VIP, weightMultiplier: 10, durationSec: 7 * 86400, priceKopecks: 14900, isBundle: true, sortOrder: 50 },

      // === Бизнес ===
      { code: 'business_lift_x2', title: 'Поднятие x2', description: 'В 2 раза больше показов на 1 день', audience: 'BUSINESS', promotionType: PromotionType.LIFT, weightMultiplier: 2, durationSec: 86400, priceKopecks: 2900, sortOrder: 10 },
      { code: 'business_lift_x5', title: 'Поднятие x5', description: 'В 5 раз больше показов на 1 день', audience: 'BUSINESS', promotionType: PromotionType.LIFT, weightMultiplier: 5, durationSec: 86400, priceKopecks: 5900, sortOrder: 11 },
      { code: 'business_lift_x10', title: 'Поднятие x10', description: 'В 10 раз больше показов на 1 день', audience: 'BUSINESS', promotionType: PromotionType.LIFT, weightMultiplier: 10, durationSec: 86400, priceKopecks: 9900, sortOrder: 12 },
      { code: 'business_color', title: 'Выделение цветом', description: 'Объявление выделено цветом 7 дней', audience: 'BUSINESS', promotionType: PromotionType.COLOR, weightMultiplier: 1, durationSec: 7 * 86400, priceKopecks: 8500, sortOrder: 20 },
      { code: 'business_xl', title: 'XL-объявление', description: 'Большая карточка в ленте 7 дней', audience: 'BUSINESS', promotionType: PromotionType.XL, weightMultiplier: 1, durationSec: 7 * 86400, priceKopecks: 8500, sortOrder: 30 },
      { code: 'business_vip', title: 'VIP-размещение', description: 'VIP-блок наверху ленты 7 дней', audience: 'BUSINESS', promotionType: PromotionType.VIP, weightMultiplier: 1, durationSec: 7 * 86400, priceKopecks: 14900, sortOrder: 40 },
      { code: 'business_turbo', title: 'Турбо', description: 'Поднятие x10 + XL + VIP на 7 дней', audience: 'BUSINESS', promotionType: PromotionType.VIP, weightMultiplier: 10, durationSec: 7 * 86400, priceKopecks: 24900, isBundle: true, sortOrder: 50 },
    ];

    for (const p of packages) {
      await this.prisma.promotionPackage.upsert({
        where: { code: p.code },
        update: {
          title: p.title,
          description: p.description,
          audience: p.audience,
          promotionType: p.promotionType,
          weightMultiplier: p.weightMultiplier,
          durationSec: p.durationSec,
          priceKopecks: p.priceKopecks,
          isBundle: p.isBundle ?? false,
          sortOrder: p.sortOrder,
          isActive: true,
        },
        create: {
          code: p.code,
          title: p.title,
          description: p.description,
          audience: p.audience,
          promotionType: p.promotionType,
          weightMultiplier: p.weightMultiplier,
          durationSec: p.durationSec,
          priceKopecks: p.priceKopecks,
          isBundle: p.isBundle ?? false,
          sortOrder: p.sortOrder,
        },
      });
    }

    const plans: Array<{
      code: string;
      title: string;
      listingsLimit: number | null;
      priceKopecksPerMonth: number;
      sortOrder: number;
    }> = [
      { code: 'start', title: 'Старт', listingsLimit: 25, priceKopecksPerMonth: 99000, sortOrder: 10 },
      { code: 'pro', title: 'Профи', listingsLimit: 200, priceKopecksPerMonth: 299000, sortOrder: 20 },
      { code: 'business', title: 'Бизнес', listingsLimit: null, priceKopecksPerMonth: 599000, sortOrder: 30 },
    ];
    for (const pl of plans) {
      await this.prisma.proPlan.upsert({
        where: { code: pl.code },
        update: {
          title: pl.title,
          listingsLimit: pl.listingsLimit,
          priceKopecksPerMonth: pl.priceKopecksPerMonth,
          sortOrder: pl.sortOrder,
          isActive: true,
        },
        create: {
          code: pl.code,
          title: pl.title,
          listingsLimit: pl.listingsLimit,
          priceKopecksPerMonth: pl.priceKopecksPerMonth,
          sortOrder: pl.sortOrder,
        },
      });
    }
  }

  private computeWeight(type: PromotionType, multiplier: number): number {
    // Базовые веса синхронны с listings.service.ts → promotionWeightByType
    const base: Record<PromotionType, number> = {
      VIP: 100,
      TOP: 60,
      XL: 30,
      COLOR: 10,
      LIFT: 5,
    };
    return base[type] * Math.max(1, multiplier);
  }
}
