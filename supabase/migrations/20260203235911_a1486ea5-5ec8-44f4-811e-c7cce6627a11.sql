-- Add column to track which driver made the status change
ALTER TABLE public.equipment_stop_history 
ADD COLUMN changed_by_driver TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.equipment_stop_history.changed_by_driver IS 'Name of the driver who made this status change';