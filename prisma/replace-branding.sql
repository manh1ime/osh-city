BEGIN;

-- Канонические значения кафе «Ош-Сити».
-- История заказов не удаляется, QR-токены столов не меняются.
UPDATE "Restaurant"
SET "name" = 'Ош-Сити',
    "slug" = 'osh-city',
    "address" = 'Ленинский проспект, 148',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" <> 'osh-city' OR "name" <> 'Ош-Сити' OR "address" IS DISTINCT FROM 'Ленинский проспект, 148';

-- Единственный филиал: Ленинский проспект, 148.
INSERT INTO "Branch" (
  "id", "restaurantId", "name", "slug", "address", "phone", "description",
  "openTime", "closeTime", "tablesCount", "seatsPerTable", "isActive",
  "sortOrder", "createdAt", "updatedAt"
)
SELECT
  'osh-city-leninsky', r."id", 'Ленинский проспект, 148', 'leninsky',
  'Ленинский проспект, 148', '+7(931)392-00-02', 'Основной зал кафе. Работаем круглосуточно.',
  '00:00', '23:59', 12, 4, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Restaurant" r
WHERE r."slug" = 'osh-city'
ON CONFLICT ("id") DO UPDATE
SET "restaurantId" = EXCLUDED."restaurantId",
    "name" = EXCLUDED."name",
    "address" = EXCLUDED."address",
    "phone" = EXCLUDED."phone",
    "description" = EXCLUDED."description",
    "openTime" = EXCLUDED."openTime",
    "closeTime" = EXCLUDED."closeTime",
    "isActive" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

-- Все остальные филиалы (остатки прежней конфигурации) убираем из работы.
-- Удалять нельзя: на них ссылаются старые заказы и бронирования.
UPDATE "Branch" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" <> 'leninsky';

UPDATE "Table" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "branchId" IN (SELECT "id" FROM "Branch" WHERE "slug" <> 'leninsky');

COMMIT;
