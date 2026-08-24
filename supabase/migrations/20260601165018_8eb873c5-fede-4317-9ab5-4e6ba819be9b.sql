-- Add lock fields to rdo_reports
ALTER TABLE public.rdo_reports 
ADD COLUMN IF NOT EXISTS planned_gabiao_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS planned_jardinagem_locked BOOLEAN DEFAULT false;

-- The grants for rdo_reports should already exist, but ensuring it's accessible
GRANT UPDATE(planned_gabiao_locked, planned_jardinagem_locked) ON public.rdo_reports TO authenticated;