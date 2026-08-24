ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS mobilization_status text NOT NULL DEFAULT 'mobilizado';

ALTER TABLE public.equipment
  DROP CONSTRAINT IF EXISTS equipment_mobilization_status_check;

ALTER TABLE public.equipment
  ADD CONSTRAINT equipment_mobilization_status_check
  CHECK (mobilization_status IN ('mobilizando','mobilizado','desmobilizando','desmobilizado'));