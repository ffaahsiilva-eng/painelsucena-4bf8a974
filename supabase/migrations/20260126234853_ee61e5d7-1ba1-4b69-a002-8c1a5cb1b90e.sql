-- Create table for third-party vehicle inspections
CREATE TABLE public.vehicle_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placa TEXT NOT NULL,
  modelo_veiculo TEXT NOT NULL,
  numero_cracha TEXT NOT NULL,
  validade_cracha DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone authenticated can view vehicle inspections"
ON public.vehicle_inspections FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert vehicle inspections"
ON public.vehicle_inspections FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update vehicle inspections"
ON public.vehicle_inspections FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can delete vehicle inspections"
ON public.vehicle_inspections FOR DELETE
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_vehicle_inspections_updated_at
BEFORE UPDATE ON public.vehicle_inspections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();