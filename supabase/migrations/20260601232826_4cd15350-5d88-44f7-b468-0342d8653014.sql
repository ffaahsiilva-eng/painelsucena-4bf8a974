-- Function to get all public tables
CREATE OR REPLACE FUNCTION public.get_tables_info()
RETURNS TABLE (table_name TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.table_name::TEXT
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tables_info() TO service_role;

-- Schedule the daily backup at 2 AM
-- Requires pg_net extension to be enabled (usually it is in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'daily-database-backup',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://fcaxyvptfwnwfctxkqre.supabase.co/functions/v1/database-backup',
      headers:='{"Content-Type": "application/json", "x-backup-secret": "daily-backup-secure-token-2026"}'::jsonb,
      body:='{}'::jsonb
    );
  $$
);
