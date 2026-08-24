ALTER TABLE public.aspersores_annotations DROP CONSTRAINT IF EXISTS aspersores_annotations_env_date_unique;
ALTER TABLE public.aspersores_annotations ADD CONSTRAINT aspersores_annotations_env_date_page_unique UNIQUE (environment, report_date, page);
GRANT ALL ON public.aspersores_annotations TO authenticated;
GRANT ALL ON public.aspersores_annotations TO service_role;