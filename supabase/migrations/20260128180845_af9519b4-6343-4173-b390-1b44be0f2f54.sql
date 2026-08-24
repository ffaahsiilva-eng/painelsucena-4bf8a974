-- Create enum for movement type
CREATE TYPE public.equipment_movement_type AS ENUM ('entrada', 'saida');

-- Create enum for exit reason
CREATE TYPE public.equipment_exit_reason AS ENUM ('manutencao_corretiva', 'manutencao_preventiva', 'vistoria');

-- Create table for equipment movements
CREATE TABLE public.equipment_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_name TEXT NOT NULL,
  plate TEXT NOT NULL,
  movement_type equipment_movement_type NOT NULL,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  movement_time TIME WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIME,
  exit_reason equipment_exit_reason,
  problem_description TEXT,
  observation TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_movements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone authenticated can view equipment movements"
ON public.equipment_movements
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert equipment movements"
ON public.equipment_movements
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update equipment movements"
ON public.equipment_movements
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete equipment movements"
ON public.equipment_movements
FOR DELETE
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_equipment_movements_updated_at
BEFORE UPDATE ON public.equipment_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_movements;