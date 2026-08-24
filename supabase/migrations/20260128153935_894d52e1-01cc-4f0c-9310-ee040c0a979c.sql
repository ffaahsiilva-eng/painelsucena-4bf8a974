-- Add area column to employees table
ALTER TABLE public.employees 
ADD COLUMN area text DEFAULT 'jardinagem' CHECK (area IN ('gabiao', 'jardinagem'));