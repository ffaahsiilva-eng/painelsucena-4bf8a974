-- Create table for jardinagem equipment with status tracking
CREATE TABLE public.jardinagem_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'entrou' CHECK (status IN ('entrou', 'saiu')),
  status_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status_changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jardinagem_equipment ENABLE ROW LEVEL SECURITY;

-- Anyone can view jardinagem equipment
CREATE POLICY "Anyone can view jardinagem equipment" 
ON public.jardinagem_equipment 
FOR SELECT 
USING (true);

-- Authorized users can update jardinagem equipment (Preposto, Encarregado Geral, Encarregado I, Admins)
CREATE POLICY "Authorized users can update jardinagem equipment" 
ON public.jardinagem_equipment 
FOR UPDATE 
USING (
  is_admin(auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('preposto', 'encarregado_geral', 'encarregado_i')
  ))
);

-- Admins can insert jardinagem equipment
CREATE POLICY "Admins can insert jardinagem equipment" 
ON public.jardinagem_equipment 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Admins can delete jardinagem equipment
CREATE POLICY "Admins can delete jardinagem equipment" 
ON public.jardinagem_equipment 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Insert initial equipment data
INSERT INTO public.jardinagem_equipment (name, status) VALUES
  ('Roçadeira 70', 'entrou'),
  ('Roçadeira 71', 'entrou'),
  ('Roçadeira 72', 'entrou'),
  ('Roçadeira 73', 'entrou'),
  ('Roçadeira 75', 'entrou'),
  ('Motopoda 01', 'entrou'),
  ('Assoprador 01', 'entrou'),
  ('Assoprador 02', 'entrou'),
  ('Perfurador 01', 'entrou'),
  ('Perfurador 02', 'entrou');

-- Add trigger to update updated_at
CREATE TRIGGER update_jardinagem_equipment_updated_at
BEFORE UPDATE ON public.jardinagem_equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for announcements when status changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.jardinagem_equipment;