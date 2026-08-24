
-- Add location columns to equipment table
ALTER TABLE public.equipment
ADD COLUMN latitude double precision DEFAULT NULL,
ADD COLUMN longitude double precision DEFAULT NULL,
ADD COLUMN location_updated_at timestamp with time zone DEFAULT NULL;
