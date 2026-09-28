-- Shared catalog starts with Barter's existing auto vocabulary. No third-party database copied.
-- categorySlug intentionally does not seed Category: empty installations retain the normal category bootstrap.
CREATE TABLE "CatalogField" ("id" TEXT PRIMARY KEY, "categorySlug" TEXT NOT NULL, "key" TEXT NOT NULL, "label" TEXT NOT NULL, "dependsOnKey" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX "CatalogField_categorySlug_key_key" ON "CatalogField" ("categorySlug", "key");
CREATE TABLE "CatalogOption" ("id" TEXT PRIMARY KEY, "fieldId" TEXT NOT NULL REFERENCES "CatalogField"("id") ON DELETE CASCADE ON UPDATE CASCADE, "value" TEXT NOT NULL, "label" TEXT NOT NULL, "parentValue" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX "CatalogOption_fieldId_value_key" ON "CatalogOption" ("fieldId","value");
INSERT INTO "CatalogField" ("id","categorySlug","key","label","sortOrder") VALUES ('auto-fuel','auto','fuel','Топливо',0);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-fuel-petrol','auto-fuel','petrol','Бензин',0);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-fuel-diesel','auto-fuel','diesel','Дизель',1);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-fuel-hybrid','auto-fuel','hybrid','Гибрид',2);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-fuel-electric','auto-fuel','electric','Электро',3);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-fuel-gas','auto-fuel','gas','Газ',4);
INSERT INTO "CatalogField" ("id","categorySlug","key","label","sortOrder") VALUES ('auto-transmission','auto','transmission','Коробка передач',1);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-transmission-manual','auto-transmission','manual','Механика',0);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-transmission-automatic','auto-transmission','automatic','Автомат',1);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-transmission-robot','auto-transmission','robot','Робот',2);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-transmission-variator','auto-transmission','variator','Вариатор',3);
INSERT INTO "CatalogField" ("id","categorySlug","key","label","sortOrder") VALUES ('auto-body_type','auto','body_type','Кузов',2);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-body_type-sedan','auto-body_type','sedan','Седан',0);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-body_type-hatch','auto-body_type','hatch','Хэтчбек',1);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-body_type-wagon','auto-body_type','wagon','Универсал',2);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-body_type-suv','auto-body_type','suv','Кроссовер / SUV',3);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-body_type-coupe','auto-body_type','coupe','Купе',4);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-body_type-van','auto-body_type','van','Минивэн',5);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-body_type-pickup','auto-body_type','pickup','Пикап',6);
INSERT INTO "CatalogField" ("id","categorySlug","key","label","sortOrder") VALUES ('auto-drive','auto','drive','Привод',3);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-drive-fwd','auto-drive','fwd','Передний',0);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-drive-rwd','auto-drive','rwd','Задний',1);
INSERT INTO "CatalogOption" ("id","fieldId","value","label","sortOrder") VALUES ('auto-drive-awd','auto-drive','awd','Полный',2);
