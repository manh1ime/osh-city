BEGIN;

-- Обновляет старый бренд во всех текстовых полях прикладных таблиц PostgreSQL.
-- История заказов не удаляется, QR-токены столов не меняются.
DO $$
DECLARE
  column_record record;
  statement text;
BEGIN
  FOR column_record IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('character varying', 'character', 'text')
      AND table_name <> '_prisma_migrations'
  LOOP
    statement := format(
      'UPDATE %I SET %I = regexp_replace(regexp_replace(%I, %L, %L, %L), %L, %L, %L) WHERE %I ~* %L OR %I ~* %L',
      column_record.table_name,
      column_record.column_name,
      column_record.column_name,
      'учкудук', 'Учкудук', 'gi',
      'uchkuduk|uchkuduk', 'uchkuduk', 'gi',
      column_record.column_name, 'учкудук',
      column_record.column_name, 'uchkuduk|uchkuduk'
    );
    EXECUTE statement;
  END LOOP;
END $$;

-- Канонические значения основного ресторана.
UPDATE "Restaurant"
SET "name" = 'Учкудук', "slug" = 'uchkuduk', "updatedAt" = CURRENT_TIMESTAMP
WHERE lower("name") = 'учкудук' OR lower("slug") = 'uchkuduk';

COMMIT;
