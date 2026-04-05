-- Category-specific filters / «item specifics» (Avito, eBay, Amazon-style)
ALTER TABLE "Listing" ADD COLUMN "attributes" JSONB;
