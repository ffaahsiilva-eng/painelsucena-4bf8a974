-- Remove the existing check constraint and add a new one that includes 'onibus'
ALTER TABLE public.equipment DROP CONSTRAINT IF EXISTS equipment_equipment_type_check;

ALTER TABLE public.equipment ADD CONSTRAINT equipment_equipment_type_check 
CHECK (equipment_type IN ('pipa', 'munk', 'camionete', 'onibus'));