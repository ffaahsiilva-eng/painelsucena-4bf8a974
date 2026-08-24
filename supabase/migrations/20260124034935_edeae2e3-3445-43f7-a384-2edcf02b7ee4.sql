-- Add destination fields to inventory_movements table
ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS destination_type TEXT,
ADD COLUMN IF NOT EXISTS destination_id UUID,
ADD COLUMN IF NOT EXISTS destination_name TEXT;

-- Add comments
COMMENT ON COLUMN public.inventory_movements.destination_type IS 'Type: employee, equipment, gabiao, jardinagem';
COMMENT ON COLUMN public.inventory_movements.destination_id IS 'Reference ID for employee or equipment';
COMMENT ON COLUMN public.inventory_movements.destination_name IS 'Display name of the destination';