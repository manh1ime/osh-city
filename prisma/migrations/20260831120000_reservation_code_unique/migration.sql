-- Prisma schema declares Reservation.code as @unique. Keep existing databases
-- correct when the schema was previously applied without the generated index.
-- Normalize legacy reservation phones before enabling the active-slot index.
UPDATE "Reservation"
SET "guestPhone" = CASE
  WHEN regexp_replace("guestPhone", '\\D', '', 'g') ~ '^8[0-9]{10}$'
    THEN '+7' || substring(regexp_replace("guestPhone", '\\D', '', 'g') from 2)
  WHEN regexp_replace("guestPhone", '\\D', '', 'g') ~ '^7[0-9]{10}$'
    THEN '+' || regexp_replace("guestPhone", '\\D', '', 'g')
  WHEN regexp_replace("guestPhone", '\\D', '', 'g') ~ '^[0-9]{10}$'
    THEN '+7' || regexp_replace("guestPhone", '\\D', '', 'g')
  ELSE "guestPhone"
END
WHERE regexp_replace("guestPhone", '\\D', '', 'g') ~ '^(8[0-9]{10}|7[0-9]{10}|[0-9]{10})$';

CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_code_key"
  ON "Reservation" ("code");

-- Database-level idempotency for an active reservation slot.
CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_branchId_guestPhone_reservedAt_status_uniq"
  ON "Reservation" ("branchId", "guestPhone", "reservedAt")
  WHERE "status" IN ('PENDING', 'CONFIRMED');
