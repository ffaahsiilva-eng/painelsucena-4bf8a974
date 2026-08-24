-- Trigger que seta environment automaticamente no INSERT se não vier preenchido
CREATE OR REPLACE FUNCTION public.set_environment_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.environment IS NULL OR NEW.environment = 'barcarena' THEN
    NEW.environment := public.current_environment();
  END IF;
  RETURN NEW;
END;
$$;

-- Aplicar trigger + policy de filtro em todas as tabelas operacionais
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'employees','employee_nrs','attendance_records','attendance_report_locks',
    'equipment','equipment_movements','equipment_stop_history','equipment_maintenance_plan',
    'daily_shift_records','daily_gabiao_reports','daily_jardinagem_reports',
    'documents','document_history',
    'inventory_items','inventory_movements','storage_locations',
    'orders','order_items','order_history',
    'desvios','desvio_comments',
    'dds_schedule','dds_participation','dds_participation_locks',
    'mudas_para_plantar','mudas_plantio',
    'abastecimento_caixa_dagua',
    'epi_exchanges','material_requisitions',
    'matrix_task_completions',
    'jardinagem_equipment',
    'notas_fiscais'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Trigger BEFORE INSERT pra setar environment automaticamente
    EXECUTE format('DROP TRIGGER IF EXISTS set_environment_trigger ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_environment_trigger
        BEFORE INSERT ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert()',
      t
    );

    -- Policy permissiva de filtro: aplica sempre AND environment = current_environment()
    EXECUTE format('DROP POLICY IF EXISTS "Filter by environment" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Filter by environment" ON public.%I
        AS RESTRICTIVE
        FOR ALL
        TO authenticated, anon
        USING (environment = public.current_environment())
        WITH CHECK (environment = public.current_environment())',
      t
    );
  END LOOP;
END $$;

-- Atualizar current_environment para usar search_path seguro
CREATE OR REPLACE FUNCTION public.current_environment()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.headers', true)::json->>'x-environment', ''),
    'barcarena'
  );
$$;

CREATE OR REPLACE FUNCTION public.set_environment_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.environment IS NULL THEN
    NEW.environment := public.current_environment();
  END IF;
  RETURN NEW;
END;
$$;