-- Nullable and additive: existing messages and older application versions remain valid.
ALTER TABLE "Message" ADD COLUMN "mediaFingerprint" TEXT;
