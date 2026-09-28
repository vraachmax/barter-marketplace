ALTER TABLE "CategoryAttributeOption" ADD COLUMN "parentOptionId" TEXT;
CREATE INDEX "CategoryAttributeOption_parentOptionId_idx" ON "CategoryAttributeOption"("parentOptionId");
ALTER TABLE "CategoryAttributeOption" ADD CONSTRAINT "CategoryAttributeOption_parentOptionId_fkey"
FOREIGN KEY ("parentOptionId") REFERENCES "CategoryAttributeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
