-- Create table for sling/belt equipment
CREATE TABLE public.sling_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('red', 'blue', 'yellow', 'green')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create table for sling inspections
CREATE TABLE public.sling_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sling_id UUID NOT NULL REFERENCES public.sling_equipment(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'inspected', 'cancelled')) DEFAULT 'pending',
  inspected_by UUID,
  inspected_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sling_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sling_inspections ENABLE ROW LEVEL SECURITY;

-- Policies for sling_equipment
CREATE POLICY "Anyone authenticated can view sling equipment"
ON public.sling_equipment FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sling equipment"
ON public.sling_equipment FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update sling equipment"
ON public.sling_equipment FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can delete sling equipment"
ON public.sling_equipment FOR DELETE
USING (is_admin(auth.uid()));

-- Policies for sling_inspections
CREATE POLICY "Anyone authenticated can view sling inspections"
ON public.sling_inspections FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sling inspections"
ON public.sling_inspections FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sling inspections"
ON public.sling_inspections FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can delete sling inspections"
ON public.sling_inspections FOR DELETE
USING (is_admin(auth.uid()));

-- Insert initial sling equipment data
INSERT INTO public.sling_equipment (tag, description, color, created_by) VALUES
-- Red slings
('E-SUC-001', 'CINTA 4T - 4M', 'red', '00000000-0000-0000-0000-000000000000'),
('E-SUC-002', 'CINTA 4T - 4M', 'red', '00000000-0000-0000-0000-000000000000'),
('E-SUC-010', 'CINTA 2T - 2M', 'red', '00000000-0000-0000-0000-000000000000'),
('E-SUC-011', 'CINTA 2T - 2M', 'red', '00000000-0000-0000-0000-000000000000'),
-- Blue slings
('E-SUC-003', 'CINTA 4T - 4M', 'blue', '00000000-0000-0000-0000-000000000000'),
('E-SUC-004', 'CINTA 4T - 4M', 'blue', '00000000-0000-0000-0000-000000000000'),
('E-SUC-012', 'CINTA 2T - 2M', 'blue', '00000000-0000-0000-0000-000000000000'),
('E-SUC-013', 'CINTA 2T - 2M', 'blue', '00000000-0000-0000-0000-000000000000'),
-- Yellow slings
('E-SUC-005', 'CINTA 4T - 4M', 'yellow', '00000000-0000-0000-0000-000000000000'),
('E-SUC-006', 'CINTA 4T - 4M', 'yellow', '00000000-0000-0000-0000-000000000000'),
('E-SUC-014', 'CINTA 2T - 6M', 'yellow', '00000000-0000-0000-0000-000000000000'),
('E-SUC-015', 'CINTA 2T - 6M', 'yellow', '00000000-0000-0000-0000-000000000000'),
-- Green slings
('E-SUC-008', 'CINTA 6T - 4M', 'green', '00000000-0000-0000-0000-000000000000'),
('E-SUC-009', 'CINTA 6T - 4M', 'green', '00000000-0000-0000-0000-000000000000'),
('E-SUC-016', 'CINTA 2T - 6M', 'green', '00000000-0000-0000-0000-000000000000'),
('E-SUC-017', 'CINTA 2T - 6M', 'green', '00000000-0000-0000-0000-000000000000');