-- Adiciona environment em page_customizations para permitir customizações independentes por ambiente
ALTER TABLE public.page_customizations
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'barcarena';

-- Substitui o unique constraint antigo por um composto com environment
DO $$
DECLARE
  cons_name text;
BEGIN
  SELECT conname INTO cons_name
  FROM pg_constraint
  WHERE conrelid = 'public.page_customizations'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(page_key, element_key)%'
    AND pg_get_constraintdef(oid) NOT ILIKE '%environment%';
  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.page_customizations DROP CONSTRAINT %I', cons_name);
  END IF;
END $$;

-- Cria novo unique incluindo environment (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.page_customizations'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%(page_key, element_key, environment)%'
  ) THEN
    ALTER TABLE public.page_customizations
      ADD CONSTRAINT page_customizations_page_element_env_unique
      UNIQUE (page_key, element_key, environment);
  END IF;
END $$;

-- Index para filtros rápidos
CREATE INDEX IF NOT EXISTS page_customizations_environment_idx
  ON public.page_customizations (environment);

-- Trigger BEFORE INSERT que sobrescreve com o ambiente atual do header
DROP TRIGGER IF EXISTS set_environment_trigger ON public.page_customizations;
CREATE TRIGGER set_environment_trigger
  BEFORE INSERT ON public.page_customizations
  FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();

-- Política RLS RESTRICTIVE: só vê/escreve no ambiente atual
DROP POLICY IF EXISTS "Filter by environment" ON public.page_customizations;
CREATE POLICY "Filter by environment" ON public.page_customizations
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (environment = public.current_environment())
  WITH CHECK (environment = public.current_environment());