-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  plate TEXT NOT NULL,
  driver TEXT NOT NULL,
  helper TEXT NOT NULL,
  start_hour INTEGER NOT NULL DEFAULT 8,
  end_hour INTEGER NOT NULL DEFAULT 16,
  stop_reason TEXT DEFAULT 'none' CHECK (stop_reason IN ('none', 'maintenance', 'waiting', 'rain')),
  stop_start_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment stop history table
CREATE TABLE public.equipment_stop_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  stop_reason TEXT NOT NULL CHECK (stop_reason IN ('maintenance', 'waiting', 'rain')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_stop_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment (public read, authenticated write)
CREATE POLICY "Anyone can view equipment" 
ON public.equipment 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert equipment" 
ON public.equipment 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update equipment" 
ON public.equipment 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete equipment" 
ON public.equipment 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for equipment_stop_history
CREATE POLICY "Anyone can view stop history" 
ON public.equipment_stop_history 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert stop history" 
ON public.equipment_stop_history 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stop history" 
ON public.equipment_stop_history 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.equipment (name, plate, driver, helper, start_hour, end_hour)
VALUES ('Caminhão Pipa 01', 'ABC-1234', 'João Silva', 'Carlos Santos', 8, 16);