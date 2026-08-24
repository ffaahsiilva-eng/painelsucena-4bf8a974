-- Add equipment_type column
ALTER TABLE public.equipment 
ADD COLUMN equipment_type TEXT NOT NULL DEFAULT 'pipa' 
CHECK (equipment_type IN ('pipa', 'munk', 'camionete'));