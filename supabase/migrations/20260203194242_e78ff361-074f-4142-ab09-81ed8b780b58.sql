-- Drop the existing check constraint
ALTER TABLE public.equipment DROP CONSTRAINT IF EXISTS equipment_stop_reason_check;

-- Add the new check constraint with "abastecimento" included
ALTER TABLE public.equipment ADD CONSTRAINT equipment_stop_reason_check 
CHECK (stop_reason IS NULL OR stop_reason IN ('none', 'maintenance', 'waiting', 'rain', 'end_of_shift', 'end_of_day', 'abastecimento', 'operando'));