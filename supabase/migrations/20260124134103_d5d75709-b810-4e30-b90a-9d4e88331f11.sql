-- Add defect_description column to equipment_stop_history table
ALTER TABLE public.equipment_stop_history 
ADD COLUMN defect_description TEXT;