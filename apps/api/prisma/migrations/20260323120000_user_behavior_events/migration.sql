-- CreateEnum
CREATE TYPE "UserBehaviorEventType" AS ENUM ('VIEW_ITEM', 'CLICK_ITEM', 'ADD_TO_FAVORITES', 'SEND_MESSAGE');

-- CreateTable
CREATE TABLE "UserBehaviorEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "UserBehaviorEventType" NOT NULL,
    "listingId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,

    CONSTRAINT "UserBehaviorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBehaviorEvent_listingId_createdAt_idx" ON "UserBehaviorEvent"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehaviorEvent_userId_createdAt_idx" ON "UserBehaviorEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehaviorEvent_anonymousId_createdAt_idx" ON "UserBehaviorEvent"("anonymousId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehaviorEvent_sessionId_createdAt_idx" ON "UserBehaviorEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehaviorEvent_type_createdAt_idx" ON "UserBehaviorEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "UserBehaviorEvent" ADD CONSTRAINT "UserBehaviorEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBehaviorEvent" ADD CONSTRAINT "UserBehaviorEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
