-- Existing listings have no declared wishes; do not infer consent from old barter opt-in.
ALTER TABLE "Listing" ADD COLUMN "exchangePreferences" JSONB;
