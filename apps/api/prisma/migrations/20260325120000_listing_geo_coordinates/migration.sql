-- Geo search (Haversine на стороне приложения; координаты для фильтра «в радиусе»)
ALTER TABLE "Listing" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

CREATE INDEX "Listing_latitude_longitude_idx" ON "Listing" ("latitude", "longitude");
