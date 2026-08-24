-- Create a sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1;

-- Add order_number column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;

-- Create function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := LPAD(nextval('public.order_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate order number on insert
DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_number();

-- Update existing orders without order_number
UPDATE public.orders 
SET order_number = LPAD((SELECT nextval('public.order_number_seq'))::TEXT, 5, '0')
WHERE order_number IS NULL;