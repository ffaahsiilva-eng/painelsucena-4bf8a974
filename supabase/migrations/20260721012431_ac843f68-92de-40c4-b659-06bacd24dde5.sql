
CREATE OR REPLACE FUNCTION public.delete_environment(_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _tbl record;
  _total_deleted bigint := 0;
  _deleted bigint;
  _tables_affected text[] := ARRAY[]::text[];
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF NOT public.is_admin(_caller) THEN
    RAISE EXCEPTION 'Apenas admin pode excluir ambientes';
  END IF;
  IF _id IS NULL OR _id = 'barcarena' THEN
    RAISE EXCEPTION 'Ambiente Barcarena não pode ser excluído';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.environments WHERE id = _id) THEN
    RAISE EXCEPTION 'Ambiente não encontrado';
  END IF;

  -- Apaga dados de todas as tabelas que têm coluna environment
  FOR _tbl IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'environment'
  LOOP
    EXECUTE format('DELETE FROM public.%I WHERE environment = %L', _tbl.table_name, _id);
    GET DIAGNOSTICS _deleted = ROW_COUNT;
    IF _deleted > 0 THEN
      _total_deleted := _total_deleted + _deleted;
      _tables_affected := array_append(_tables_affected, _tbl.table_name || ' (' || _deleted || ')');
    END IF;
  END LOOP;

  -- Remove acessos ao ambiente
  DELETE FROM public.user_environment_access WHERE environment = _id;

  -- Remove ambiente
  DELETE FROM public.environments WHERE id = _id;

  RETURN jsonb_build_object(
    'deleted', _id,
    'rows_deleted', _total_deleted,
    'tables', _tables_affected
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_environment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_environment(text) TO authenticated;
