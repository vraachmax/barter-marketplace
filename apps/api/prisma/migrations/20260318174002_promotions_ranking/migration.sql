-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('TOP', 'VIP', 'XL');

-- CreateTable
CREATE TABLE "ListingPromotion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "type" "PromotionType" NOT NULL,
    "weight" INTEGER NOT NULL,
    "listingId" TEXT NOT NULL,

    CONSTRAINT "ListingPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingPromotion_listingId_idx" ON "ListingPromotion"("listingId");

-- CreateIndex
CREATE INDEX "ListingPromotion_endsAt_idx" ON "ListingPromotion"("endsAt");

-- AddForeignKey
ALTER TABLE "ListingPromotion" ADD CONSTRAINT "ListingPromotion_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
