-- Create table to store daily shift records with telemetry data
CREATE TABLE public.daily_shift_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  plate TEXT NOT NULL,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  driver_name TEXT NOT NULL,
  helper_name TEXT,
  
  -- Telemetry - Start of shift
  initial_horimeter NUMERIC,
  initial_km NUMERIC,
  initial_fuel_level TEXT,
  shift_start_time TIMESTAMP WITH TIME ZONE,
  
  -- Telemetry - End of shift
  final_horimeter NUMERIC,
  final_km NUMERIC,
  final_fuel_level TEXT,
  shift_end_time TIMESTAMP WITH TIME ZONE,
  
  -- Water refueling points (for Pipa)
  refueling_points JSONB DEFAULT '[]'::jsonb,
  
  -- Status changes throughout the day
  status_history JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one record per equipment per day
  CONSTRAINT unique_equipment_shift_per_day UNIQUE (equipment_id, shift_date)
);

-- Enable RLS
ALTER TABLE public.daily_shift_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view daily shift records"
ON public.daily_shift_records
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert daily shift records"
ON public.daily_shift_records
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update daily shift records"
ON public.daily_shift_records
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete daily shift records"
ON public.daily_shift_records
FOR DELETE
USING (is_admin(auth.uid()));

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_shift_records;

-- Create trigger for updated_at
CREATE TRIGGER update_daily_shift_records_updated_at
BEFORE UPDATE ON public.daily_shift_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();