-- Add column for external presenter name (when presenter is not a system user)
ALTER TABLE public.dds_schedule 
ADD COLUMN external_presenter_name text NULL;

-- Make presenter_user_id nullable to allow external presenters
ALTER TABLE public.dds_schedule 
ALTER COLUMN presenter_user_id DROP NOT NULL;

-- Add a check constraint to ensure either presenter_user_id OR external_presenter_name is set
ALTER TABLE public.dds_schedule 
ADD CONSTRAINT dds_schedule_presenter_check 
CHECK (
  (presenter_user_id IS NOT NULL) OR (external_presenter_name IS NOT NULL AND external_presenter_name != '')
);