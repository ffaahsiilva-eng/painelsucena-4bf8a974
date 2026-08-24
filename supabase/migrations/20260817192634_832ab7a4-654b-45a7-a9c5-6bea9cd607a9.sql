DO $$
BEGIN
    -- Drop the restrictive constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aspersores_annotations_environment_page_key') THEN
        ALTER TABLE public.aspersores_annotations DROP CONSTRAINT aspersores_annotations_environment_page_key;
    END IF;

    -- Drop others if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aspersores_annotations_env_date_unique') THEN
        ALTER TABLE public.aspersores_annotations DROP CONSTRAINT aspersores_annotations_env_date_unique;
    END IF;

    -- The one I created in the previous turn
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aspersores_annotations_env_date_page_unique') THEN
        ALTER TABLE public.aspersores_annotations ADD CONSTRAINT aspersores_annotations_env_date_page_unique UNIQUE (environment, report_date, page);
    END IF;
END $$;

-- Create partial index for map config (NULL date)
DROP INDEX IF EXISTS aspersores_annotations_map_config_unique;
CREATE UNIQUE INDEX aspersores_annotations_map_config_unique ON public.aspersores_annotations (environment, page) WHERE report_date IS NULL;

GRANT ALL ON public.aspersores_annotations TO authenticated;
GRANT ALL ON public.aspersores_annotations TO service_role;