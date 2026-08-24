-- Add more quantity unit options
ALTER TYPE public.quantity_unit ADD VALUE IF NOT EXISTS 'par';
ALTER TYPE public.quantity_unit ADD VALUE IF NOT EXISTS 'rolo';
ALTER TYPE public.quantity_unit ADD VALUE IF NOT EXISTS 'saco';
ALTER TYPE public.quantity_unit ADD VALUE IF NOT EXISTS 'galao';
ALTER TYPE public.quantity_unit ADD VALUE IF NOT EXISTS 'balde';
ALTER TYPE public.quantity_unit ADD VALUE IF NOT EXISTS 'metro_quadrado';
ALTER TYPE public.quantity_unit ADD VALUE IF NOT EXISTS 'metro_cubico';

-- Add quantity change tracking columns to order_history
ALTER TABLE public.order_history 
ADD COLUMN IF NOT EXISTS previous_quantity DECIMAL,
ADD COLUMN IF NOT EXISTS new_quantity DECIMAL,
ADD COLUMN IF NOT EXISTS previous_unit TEXT,
ADD COLUMN IF NOT EXISTS new_unit TEXT,
ADD COLUMN IF NOT EXISTS change_type TEXT DEFAULT 'status';