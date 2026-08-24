
ALTER TABLE public.user_environment_access DROP CONSTRAINT IF EXISTS user_environment_access_environment_check;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype='c'
      AND pg_get_constraintdef(oid) ILIKE '%barcarena%'
      AND pg_get_constraintdef(oid) ILIKE '%paragominas%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END $$;
