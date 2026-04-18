/**
 * Временный shim до локальной генерации Prisma Client на Linux в sandbox.
 * На реальном CI/прод-сборке `prisma generate` сгенерирует эти же типы,
 * и этот shim останется как надстройка-ноуп (объединение типов).
 */

import type { PrismaClient } from '@prisma/client';

declare module '@prisma/client' {
  // ── Расширяем enum PromotionType ──
  const PromotionType: {
    readonly TOP: 'TOP';
    readonly VIP: 'VIP';
    readonly XL: 'XL';
    readonly COLOR: 'COLOR';
    readonly LIFT: 'LIFT';
  };
  type PromotionType = 'TOP' | 'VIP' | 'XL' | 'COLOR' | 'LIFT';

  // ── Новые enum-ы ──
  const PromotionAudience: {
    readonly PERSONAL: 'PERSONAL';
    readonly BUSINESS: 'BUSINESS';
  };
  type PromotionAudience = 'PERSONAL' | 'BUSINESS';

  const WalletTransactionType: {
    readonly TOPUP: 'TOPUP';
    readonly PROMOTION: 'PROMOTION';
    readonly PRO_SUBSCRIPTION: 'PRO_SUBSCRIPTION';
    readonly REFUND: 'REFUND';
    readonly BONUS: 'BONUS';
    readonly ADJUSTMENT: 'ADJUSTMENT';
  };
  type WalletTransactionType =
    | 'TOPUP'
    | 'PROMOTION'
    | 'PRO_SUBSCRIPTION'
    | 'REFUND'
    | 'BONUS'
    | 'ADJUSTMENT';

  const WalletTransactionStatus: {
    readonly PENDING: 'PENDING';
    readonly SUCCESS: 'SUCCESS';
    readonly FAILED: 'FAILED';
    readonly REFUNDED: 'REFUNDED';
  };
  type WalletTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

  const ProSubscriptionStatus: {
    readonly ACTIVE: 'ACTIVE';
    readonly CANCELED: 'CANCELED';
    readonly EXPIRED: 'EXPIRED';
  };
  type ProSubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'EXPIRED';

  // ── Дополнительные типы Prisma.* ──
  namespace Prisma {
    type PromotionPackageWhereInput = {
      audience?: PromotionAudience;
      isActive?: boolean;
      [k: string]: unknown;
    };
  }
}

/**
 * Расширяем PrismaClient дополнительными делегатами.
 * Эти делегаты принимают/возвращают `any`, чтобы не дублировать полную схему.
 * В проде prisma generate предоставит полноценные типы — это merge-in будет no-op.
 */
declare module '.prisma/client' {
  // alias to @prisma/client
}

declare global {
  // noop
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface PrismaDelegateStub {
  findMany(args?: any): Promise<any[]>;
  findUnique(args: any): Promise<any>;
  findFirst(args?: any): Promise<any>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  upsert(args: any): Promise<any>;
  delete(args: any): Promise<any>;
  deleteMany(args?: any): Promise<any>;
  updateMany(args: any): Promise<any>;
  count(args?: any): Promise<number>;
  aggregate(args?: any): Promise<any>;
}

declare module '@prisma/client' {
  interface PrismaClient {
    wallet: PrismaDelegateStub;
    walletTransaction: PrismaDelegateStub;
    promotionPackage: PrismaDelegateStub;
    proPlan: PrismaDelegateStub;
    userProSubscription: PrismaDelegateStub;
  }
}
