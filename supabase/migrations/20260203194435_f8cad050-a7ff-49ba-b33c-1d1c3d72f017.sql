-- Drop the existing check constraint on equipment_stop_history
ALTER TABLE public.equipment_stop_history DROP CONSTRAINT IF EXISTS equipment_stop_history_stop_reason_check;

-- Add the new check constraint with "abastecimento" and "operando" included
ALTER TABLE public.equipment_stop_history ADD CONSTRAINT equipment_stop_history_stop_reason_check 
CHECK (stop_reason IN ('none', 'maintenance', 'waiting', 'rain', 'end_of_shift', 'end_of_day', 'abastecimento', 'operando'));