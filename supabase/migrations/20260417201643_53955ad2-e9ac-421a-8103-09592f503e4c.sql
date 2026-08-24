-- Isolar tabela reminders por ambiente
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'barcarena';
CREATE INDEX IF NOT EXISTS reminders_environment_idx ON public.reminders (environment);

DROP TRIGGER IF EXISTS set_environment_trigger ON public.reminders;
CREATE TRIGGER set_environment_trigger
  BEFORE INSERT ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();

DROP POLICY IF EXISTS "Filter by environment" ON public.reminders;
CREATE POLICY "Filter by environment" ON public.reminders
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (environment = public.current_environment())
  WITH CHECK (environment = public.current_environment());

-- Limpar lembretes do Paragominas (deve estar vazio agora pois tudo nasceu como barcarena)
DELETE FROM public.reminders WHERE environment = 'paragominas';