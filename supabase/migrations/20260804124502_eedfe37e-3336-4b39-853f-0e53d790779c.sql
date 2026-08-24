-- The previous migration created a unique index, but upsert in PostgREST (Supabase) 
-- requires a physical UNIQUE constraint or a primary key to match the ON CONFLICT specification.

-- First, remove any potential duplicate if it exists (though unlikely with the index)
-- to ensure the constraint can be applied.
DELETE FROM public.aspersores_annotations a
USING public.aspersores_annotations b
WHERE a.id < b.id 
  AND a.environment = b.environment 
  AND a.report_date = b.report_date
  AND a.report_date IS NOT NULL;

-- Add a physical unique constraint that matches the environment + report_date combination
ALTER TABLE public.aspersores_annotations 
ADD CONSTRAINT aspersores_annotations_env_date_unique 
UNIQUE (environment, report_date);

-- Ensure RLS is still properly handled (though it should be already)
GRANT ALL ON public.aspersores_annotations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aspersores_annotations TO authenticated;
