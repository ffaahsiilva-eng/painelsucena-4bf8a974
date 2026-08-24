-- Helper para aplicar isolamento padrão em uma tabela
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'overtime_records',
    'overtime_summaries',
    'reminder_history',
    'reminder_snoozes',
    'rh_efetivo',
    'tigrinho_bets'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- 1. Adiciona coluna environment com default
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT ''barcarena''', t);

    -- 2. Index para filtros rápidos
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (environment)', t || '_environment_idx', t);

    -- 3. Trigger BEFORE INSERT que sobrescreve com o ambiente atual do header
    EXECUTE format('DROP TRIGGER IF EXISTS set_environment_trigger ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_environment_trigger BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert()', t);

    -- 4. Política RLS RESTRICTIVE: só vê/escreve no ambiente atual
    EXECUTE format('DROP POLICY IF EXISTS "Filter by environment" ON public.%I', t);
    EXECUTE format($p$
      CREATE POLICY "Filter by environment" ON public.%I
        AS RESTRICTIVE
        FOR ALL
        TO authenticated
        USING (environment = public.current_environment())
        WITH CHECK (environment = public.current_environment())
    $p$, t);
  END LOOP;
END $$;