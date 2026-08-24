-- 1. Função helper que lê o ambiente da sessão (header customizado enviado pelo cliente)
CREATE OR REPLACE FUNCTION public.current_environment()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.headers', true)::json->>'x-environment', ''),
    'barcarena'
  );
$$;

-- 2. Adicionar coluna environment em todas as tabelas operacionais
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
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT ''barcarena''', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (environment)', t || '_environment_idx', t);
  END LOOP;
END $$;