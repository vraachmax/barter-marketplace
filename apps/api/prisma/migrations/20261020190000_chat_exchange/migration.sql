-- AlterEnum
ALTER TYPE "MessageMediaType" ADD VALUE 'AUDIO';

-- AlterTable
ALTER TABLE "ChatUser" ADD COLUMN     "muted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ExchangeOffer" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "previousId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "cashKopecks" INTEGER NOT NULL DEFAULT 0,
    "terms" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeItem" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "ExchangeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeReservation" (
    "listingId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeReservation_pkey" PRIMARY KEY ("listingId")
);

-- CreateTable
CREATE TABLE "ExchangeConfirmation" (
    "offerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeConfirmation_pkey" PRIMARY KEY ("offerId","userId")
);

-- CreateTable
CREATE TABLE "ExchangeAudit" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeOffer_previousId_key" ON "ExchangeOffer"("previousId");

-- CreateIndex
CREATE INDEX "ExchangeOffer_chatId_createdAt_idx" ON "ExchangeOffer"("chatId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeOffer_senderId_clientKey_key" ON "ExchangeOffer"("senderId", "clientKey");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeItem_offerId_listingId_key" ON "ExchangeItem"("offerId", "listingId");

-- AddForeignKey
ALTER TABLE "ExchangeOffer" ADD CONSTRAINT "ExchangeOffer_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeItem" ADD CONSTRAINT "ExchangeItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ExchangeOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeReservation" ADD CONSTRAINT "ExchangeReservation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ExchangeOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeConfirmation" ADD CONSTRAINT "ExchangeConfirmation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ExchangeOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeAudit" ADD CONSTRAINT "ExchangeAudit_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ExchangeOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "ExchangeOffer" ADD CONSTRAINT "exchange_status_valid" CHECK ("status" IN ('PENDING','ACCEPTED','DECLINED','CANCELLED','EXPIRED','SUPERSEDED','COMPLETED'));
ALTER TABLE "ExchangeOffer" ADD CONSTRAINT "exchange_distinct_participants" CHECK ("senderId" <> "recipientId");
-- The service locks Listing rows before accepting. Listing writes acquire the same
-- row locks, then this trigger prevents a reserved item changing underneath a deal.
CREATE FUNCTION protect_exchange_listing() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ExchangeReservation" WHERE "listingId" = OLD.id) THEN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'exchange_listing_reserved'; END IF;
    IF ROW(NEW.title, NEW.description, NEW."ownerId", NEW."priceRub", NEW.status, NEW."barterEnabled", NEW."saleEnabled", NEW."categoryId", NEW.city, NEW.attributes, NEW."exchangePreferences") IS DISTINCT FROM ROW(OLD.title, OLD.description, OLD."ownerId", OLD."priceRub", OLD.status, OLD."barterEnabled", OLD."saleEnabled", OLD."categoryId", OLD.city, OLD.attributes, OLD."exchangePreferences") THEN
      RAISE EXCEPTION 'exchange_listing_reserved';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_exchange_listing BEFORE UPDATE OR DELETE ON "Listing" FOR EACH ROW EXECUTE FUNCTION protect_exchange_listing();

CREATE INDEX "ExchangeOffer_status_expiresAt_idx" ON "ExchangeOffer"("status", "expiresAt");
CREATE FUNCTION protect_exchange_image() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN item_id := OLD."listingId"; ELSE item_id := NEW."listingId"; END IF;
  PERFORM id FROM "Listing" WHERE id = item_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM "ExchangeReservation" WHERE "listingId" = item_id) THEN
    RAISE EXCEPTION 'exchange_listing_reserved';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_exchange_image BEFORE INSERT OR UPDATE OR DELETE ON "ListingImage" FOR EACH ROW EXECUTE FUNCTION protect_exchange_image();
