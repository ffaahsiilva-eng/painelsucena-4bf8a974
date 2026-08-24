DO $$
DECLARE
  t text;
  newly_isolated text[] := ARRAY[
    'security_files',
    'sling_equipment',
    'sling_inspections',
    'vehicle_inspections',
    'site_inspections',
    'site_inspection_tasks',
    'site_inspection_schedule',
    'rdo_reports',
    'rdo_report_locks',
    'pluviometria_records',
    'pos_chuva_inspections',
    'residuos_efluentes',
    'product_images'
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

-- Limpar TUDO que estiver marcado como paragominas nessas tabelas + as já isoladas mencionadas
DO $$
DECLARE
  t text;
  all_listed text[] := ARRAY[
    'security_files',
    'sling_equipment',
    'sling_inspections',
    'vehicle_inspections',
    'site_inspections',
    'site_inspection_tasks',
    'site_inspection_schedule',
    'rdo_reports',
    'rdo_report_locks',
    'pluviometria_records',
    'pos_chuva_inspections',
    'residuos_efluentes',
    'product_images',
    'daily_jardinagem_reports',
    'daily_gabiao_reports',
    'mudas_para_plantar',
    'mudas_plantio',
    'abastecimento_caixa_dagua'
  ];
BEGIN
  FOREACH t IN ARRAY all_listed LOOP
    EXECUTE format('DELETE FROM public.%I WHERE environment = ''paragominas''', t);
  END LOOP;
END $$;