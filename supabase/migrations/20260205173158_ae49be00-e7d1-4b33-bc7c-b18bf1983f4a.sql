-- Create table to track maintenance plan for each equipment
CREATE TABLE public.equipment_maintenance_plan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  equipment_name TEXT NOT NULL,
  base_horimeter NUMERIC NOT NULL DEFAULT 0,
  target_hours NUMERIC NOT NULL DEFAULT 700,
  last_maintenance_date TIMESTAMP WITH TIME ZONE,
  last_maintenance_horimeter NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(equipment_id)
);

-- Enable RLS
ALTER TABLE public.equipment_maintenance_plan ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view maintenance plan"
  ON public.equipment_maintenance_plan
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert maintenance plan"
  ON public.equipment_maintenance_plan
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance plan"
  ON public.equipment_maintenance_plan
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete maintenance plan"
  ON public.equipment_maintenance_plan
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_equipment_maintenance_plan_updated_at
  BEFORE UPDATE ON public.equipment_maintenance_plan
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for maintenance plan table
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_maintenance_plan;