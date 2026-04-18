-- Phase 2.1 — Монетизация: Wallet, WalletTransaction, PromotionPackage, ProPlan, UserProSubscription
-- Плюс расширение PromotionType (COLOR, LIFT) и связи с ListingPromotion

-- ===================== Enums =====================
ALTER TYPE "PromotionType" ADD VALUE IF NOT EXISTS 'COLOR';
ALTER TYPE "PromotionType" ADD VALUE IF NOT EXISTS 'LIFT';

CREATE TYPE "PromotionAudience" AS ENUM ('PERSONAL', 'BUSINESS');
CREATE TYPE "WalletTransactionType" AS ENUM ('TOPUP', 'PROMOTION', 'PRO_SUBSCRIPTION', 'REFUND', 'BONUS', 'ADJUSTMENT');
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE "ProSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED');

-- ===================== Wallet =====================
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "balanceKopecks" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

ALTER TABLE "Wallet"
    ADD CONSTRAINT "Wallet_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===================== PromotionPackage =====================
CREATE TABLE "PromotionPackage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audience" "PromotionAudience" NOT NULL DEFAULT 'PERSONAL',
    "promotionType" "PromotionType" NOT NULL,
    "weightMultiplier" INTEGER NOT NULL DEFAULT 1,
    "durationSec" INTEGER NOT NULL,
    "priceKopecks" INTEGER NOT NULL,
    "isBundle" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PromotionPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromotionPackage_code_key" ON "PromotionPackage"("code");
CREATE INDEX "PromotionPackage_audience_isActive_idx" ON "PromotionPackage"("audience", "isActive");
CREATE INDEX "PromotionPackage_sortOrder_idx" ON "PromotionPackage"("sortOrder");

-- ===================== ListingPromotion: packageId + priceKopecks =====================
ALTER TABLE "ListingPromotion"
    ADD COLUMN "packageId" TEXT,
    ADD COLUMN "priceKopecks" INTEGER;

CREATE INDEX "ListingPromotion_packageId_idx" ON "ListingPromotion"("packageId");

ALTER TABLE "ListingPromotion"
    ADD CONSTRAINT "ListingPromotion_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "PromotionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===================== ProPlan =====================
CREATE TABLE "ProPlan" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "listingsLimit" INTEGER,
    "priceKopecksPerMonth" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProPlan_code_key" ON "ProPlan"("code");
CREATE INDEX "ProPlan_isActive_idx" ON "ProPlan"("isActive");
CREATE INDEX "ProPlan_sortOrder_idx" ON "ProPlan"("sortOrder");

-- ===================== UserProSubscription =====================
CREATE TABLE "UserProSubscription" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "ProSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "UserProSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProSubscription_userId_key" ON "UserProSubscription"("userId");
CREATE INDEX "UserProSubscription_status_idx" ON "UserProSubscription"("status");
CREATE INDEX "UserProSubscription_endsAt_idx" ON "UserProSubscription"("endsAt");

ALTER TABLE "UserProSubscription"
    ADD CONSTRAINT "UserProSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "UserProSubscription_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "ProPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===================== WalletTransaction =====================
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountKopecks" INTEGER NOT NULL,
    "balanceAfterKopecks" INTEGER NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'SUCCESS',
    "description" TEXT NOT NULL,
    "externalId" TEXT,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingPromotionId" TEXT,
    "proSubscriptionId" TEXT,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletTransaction_listingPromotionId_key" ON "WalletTransaction"("listingPromotionId");
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

ALTER TABLE "WalletTransaction"
    ADD CONSTRAINT "WalletTransaction_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "WalletTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "WalletTransaction_listingPromotionId_fkey"
    FOREIGN KEY ("listingPromotionId") REFERENCES "ListingPromotion"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "WalletTransaction_proSubscriptionId_fkey"
    FOREIGN KEY ("proSubscriptionId") REFERENCES "UserProSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
