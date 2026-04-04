-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'PENDING';
ALTER TYPE "ListingStatus" ADD VALUE 'BLOCKED';

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "duplicateImageFlag" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ListingImage" ADD COLUMN "sha256" TEXT;

-- CreateIndex
CREATE INDEX "ListingImage_sha256_idx" ON "ListingImage"("sha256");

-- CreateTable
CREATE TABLE "ListingReport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "ListingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingReport_listingId_reporterId_key" ON "ListingReport"("listingId", "reporterId");

-- CreateIndex
CREATE INDEX "ListingReport_listingId_idx" ON "ListingReport"("listingId");

-- AddForeignKey
ALTER TABLE "ListingReport" ADD CONSTRAINT "ListingReport_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingReport" ADD CONSTRAINT "ListingReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
