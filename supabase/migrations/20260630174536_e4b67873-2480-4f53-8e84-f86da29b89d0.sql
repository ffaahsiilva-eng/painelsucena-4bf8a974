CREATE OR REPLACE FUNCTION public.get_environment_tables()
RETURNS TABLE(table_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.table_name::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.column_name = 'environment';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_environment_tables() TO service_role, authenticated;