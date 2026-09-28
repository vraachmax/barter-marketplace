CREATE TABLE "CategoryAttributeOption" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoryAttributeOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoryAttributeOption_categoryId_fieldKey_value_key"
ON "CategoryAttributeOption"("categoryId", "fieldKey", "value");
CREATE INDEX "CategoryAttributeOption_categoryId_fieldKey_sortOrder_idx"
ON "CategoryAttributeOption"("categoryId", "fieldKey", "sortOrder");
ALTER TABLE "CategoryAttributeOption" ADD CONSTRAINT "CategoryAttributeOption_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
