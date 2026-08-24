ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS environment_selection_background_url TEXT;

-- Forçar atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';