-- 1. Adicionar coluna environment nas tabelas que ficaram de fora antes
DO $$
DECLARE
  t text;
  newly_isolated text[] := ARRAY[
    'aviator_balances','aviator_bets','aviator_rounds',
    'double_balances','double_bets','double_rounds',
    'checkers_games','checkers_stats',
    'domino_games','domino_stats',
    'game_scores','monthly_game_champions',
    'announcements','announcement_reads',
    'notifications',
    'music_tracks',
    'nav_visibility_rules',
    'dds_planning_document',
    'goals'
  ];
BEGIN
  FOREACH t IN ARRAY newly_isolated LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT ''barcarena''', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (environment)', t || '_environment_idx', t);
    EXECUTE format('DROP TRIGGER IF EXISTS set_environment_trigger ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_environment_trigger
        BEFORE INSERT ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert()',
      t
    );
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

-- 2. Limpar TUDO que estiver marcado como paragominas em todas as tabelas isoladas
DO $$
DECLARE
  t text;
  all_isolated text[] := ARRAY[
    -- operacionais (já tinham environment)
    'employee_nrs','attendance_records','attendance_report_locks',
    'equipment_movements','equipment_stop_history','equipment_maintenance_plan',
    'daily_shift_records','daily_gabiao_reports','daily_jardinagem_reports',
    'document_history','documents',
    'inventory_movements','inventory_items','storage_locations',
    'order_history','order_items','orders',
    'desvio_comments','desvios',
    'dds_participation','dds_participation_locks','dds_schedule',
    'mudas_para_plantar','mudas_plantio',
    'abastecimento_caixa_dagua',
    'epi_exchanges','material_requisitions',
    'matrix_task_completions',
    'jardinagem_equipment',
    'notas_fiscais',
    'employees',
    'equipment',
    -- recém-isoladas
    'aviator_bets','aviator_balances','aviator_rounds',
    'double_bets','double_balances','double_rounds',
    'checkers_games','checkers_stats',
    'domino_games','domino_stats',
    'game_scores','monthly_game_champions',
    'announcement_reads','announcements',
    'notifications',
    'music_tracks',
    'nav_visibility_rules',
    'dds_planning_document',
    'goals'
  ];
BEGIN
  FOREACH t IN ARRAY all_isolated LOOP
    EXECUTE format('DELETE FROM public.%I WHERE environment = ''paragominas''', t);
  END LOOP;
END $$;