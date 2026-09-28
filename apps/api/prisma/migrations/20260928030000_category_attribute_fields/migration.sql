ALTER TABLE "Category" ADD COLUMN "catalogRevision" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "CategoryAttributeField" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "sectionTitle" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'select',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CategoryAttributeField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoryAttributeField_categoryId_key_key"
ON "CategoryAttributeField"("categoryId", "key");
CREATE INDEX "CategoryAttributeField_categoryId_sectionId_sortOrder_idx"
ON "CategoryAttributeField"("categoryId", "sectionId", "sortOrder");
ALTER TABLE "CategoryAttributeField" ADD CONSTRAINT "CategoryAttributeField_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
