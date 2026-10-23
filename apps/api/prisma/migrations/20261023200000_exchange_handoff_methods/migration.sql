-- Existing exchanges remain face-to-face to preserve prior QR agreement.
ALTER TABLE "ExchangeOffer" ADD COLUMN "handoffMethod" TEXT NOT NULL DEFAULT 'MEETING';
ALTER TABLE "ExchangeOffer" ADD COLUMN "shipping" JSONB;
ALTER TABLE "ExchangeOffer" ADD CONSTRAINT "ExchangeOffer_handoff_method_check"
  CHECK ("handoffMethod" IN ('MEETING', 'DELIVERY', 'ONLINE'));
