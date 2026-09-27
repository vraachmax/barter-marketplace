-- Preserve the one Listing identity and the previous opt-in. Existing listings
-- were available in Market, so none are silently converted to exchange-only.
ALTER TABLE "Listing"
  ADD COLUMN "saleEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "barterEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Listing" AS l SET "barterEnabled" = true
FROM "Category" AS c
WHERE c.id = l."categoryId"
  AND c.slug IN ('auto', 'realty', 'services', 'electronics', 'home', 'clothes', 'kids', 'hobby')
  AND l.attributes->'isBarter' = 'true'::jsonb;

ALTER TABLE "Listing" ADD CONSTRAINT "Listing_has_trade_mode"
  CHECK ("saleEnabled" OR "barterEnabled");

-- Keep old API writers compatible during deployment. New API writes both the
-- canonical flags and the alias. Never turn exchange-only into a sale implicitly.
CREATE FUNCTION barter_sync_listing_modes() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.attributes->'isBarter' = 'true'::jsonb THEN
      NEW."barterEnabled" := true;
    END IF;
  ELSIF NEW."barterEnabled" IS NOT DISTINCT FROM OLD."barterEnabled"
    AND NEW.attributes->'isBarter' IS DISTINCT FROM OLD.attributes->'isBarter'
    AND jsonb_typeof(NEW.attributes->'isBarter') = 'boolean' THEN
    NEW."barterEnabled" := (NEW.attributes->>'isBarter')::boolean;
  END IF;
  NEW.attributes := jsonb_set(
    CASE WHEN jsonb_typeof(NEW.attributes) = 'object' THEN NEW.attributes ELSE '{}'::jsonb END,
    '{isBarter}', to_jsonb(NEW."barterEnabled")
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listing_modes_sync BEFORE INSERT OR UPDATE OF "saleEnabled", "barterEnabled", attributes
ON "Listing" FOR EACH ROW EXECUTE FUNCTION barter_sync_listing_modes();
