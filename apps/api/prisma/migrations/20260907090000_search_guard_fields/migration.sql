BEGIN;

ALTER TABLE "Listing"
  ADD COLUMN "searchTokens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "searchAccessory" BOOLEAN NOT NULL DEFAULT false;

CREATE FUNCTION barter_search_tokens(value TEXT) RETURNS TEXT[]
LANGUAGE SQL IMMUTABLE PARALLEL SAFE AS $$
  SELECT COALESCE(array_agg(parts[1]), ARRAY[]::TEXT[])
  FROM regexp_matches(lower(normalize(coalesce(value, ''), NFKC)), '[[:alnum:]]+', 'g') AS parts;
$$;

CREATE FUNCTION barter_search_accessory(value TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE AS $$
DECLARE
  words TEXT[] := barter_search_tokens(value);
  pos INTEGER := 1;
BEGIN
  WHILE words[pos] = ANY(ARRAY[
    'новый','новая','новое','оригинальный','оригинальная','оригинальное',
    'силиконовый','кожаный','защитная','защитное','защитный'
  ]) LOOP
    pos := pos + 1;
  END LOOP;
  RETURN coalesce(words[pos] = ANY(ARRAY[
    'чехол','чехлы','чехла','чехлов','case','cover','кабель','кабели',
    'зарядка','зарядное','пленка','плёнка'
  ]) OR (words[pos] = 'стекло' AND pos > 1 AND words[pos - 1] = 'защитное'), false);
END;
$$;

CREATE FUNCTION barter_refresh_search_guard() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW."searchTokens" := barter_search_tokens(NEW.title || ' ' || NEW.description);
  NEW."searchAccessory" := barter_search_accessory(NEW.title);
  RETURN NEW;
END;
$$;

CREATE TRIGGER listing_search_guard
BEFORE INSERT OR UPDATE OF title, description, "searchTokens", "searchAccessory"
ON "Listing" FOR EACH ROW EXECUTE FUNCTION barter_refresh_search_guard();

-- Backfill existing rows; timestamps and customer text remain unchanged.
UPDATE "Listing" SET "searchTokens" = barter_search_tokens(title || ' ' || description);
CREATE INDEX "Listing_searchTokens_idx" ON "Listing" USING GIN ("searchTokens");

COMMIT;
