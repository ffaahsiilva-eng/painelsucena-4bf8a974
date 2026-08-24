-- Drop the existing check constraint
ALTER TABLE public.equipment_stop_history 
DROP CONSTRAINT IF EXISTS equipment_stop_history_stop_reason_check;

-- Add new check constraint with all valid stop reasons
ALTER TABLE public.equipment_stop_history 
ADD CONSTRAINT equipment_stop_history_stop_reason_check 
CHECK (stop_reason IN ('none', 'maintenance', 'waiting', 'rain', 'end_of_day', 'end_of_shift'));