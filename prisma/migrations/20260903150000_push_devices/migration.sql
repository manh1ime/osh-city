-- Устройства сотрудников, подписанные на Web Push.
-- Без этой таблицы уведомление доходит только до открытой вкладки браузера.
CREATE TABLE IF NOT EXISTS "PushDevice" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

-- Один endpoint принадлежит одному устройству: повторная подписка обновляет запись.
CREATE UNIQUE INDEX IF NOT EXISTS "PushDevice_endpoint_key" ON "PushDevice"("endpoint");
CREATE INDEX IF NOT EXISTS "PushDevice_userId_idx" ON "PushDevice"("userId");
CREATE INDEX IF NOT EXISTS "PushDevice_restaurantId_idx" ON "PushDevice"("restaurantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PushDevice_restaurantId_fkey'
  ) THEN
    ALTER TABLE "PushDevice"
      ADD CONSTRAINT "PushDevice_restaurantId_fkey"
      FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PushDevice_userId_fkey'
  ) THEN
    ALTER TABLE "PushDevice"
      ADD CONSTRAINT "PushDevice_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "StaffUser"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
