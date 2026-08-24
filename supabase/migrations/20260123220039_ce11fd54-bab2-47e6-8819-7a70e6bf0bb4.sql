-- Create a table for DDS (Diálogo Diário de Segurança) schedule
CREATE TABLE public.dds_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  scheduled_date DATE NOT NULL,
  presenter_user_id UUID NOT NULL,
  theme TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month_year, scheduled_date)
);

-- Enable Row Level Security
ALTER TABLE public.dds_schedule ENABLE ROW LEVEL SECURITY;

-- Everyone can view the DDS schedule
CREATE POLICY "Anyone can view DDS schedule"
ON public.dds_schedule
FOR SELECT
USING (true);

-- Only tecnico_seguranca can insert/update/delete
CREATE POLICY "Tecnico seguranca can insert DDS schedule"
ON public.dds_schedule
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND cargo IN ('tecnico_seguranca_i', 'tecnico_seguranca_ii')
  )
);

CREATE POLICY "Tecnico seguranca can update DDS schedule"
ON public.dds_schedule
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND cargo IN ('tecnico_seguranca_i', 'tecnico_seguranca_ii')
  )
);

CREATE POLICY "Tecnico seguranca can delete DDS schedule"
ON public.dds_schedule
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND cargo IN ('tecnico_seguranca_i', 'tecnico_seguranca_ii')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_dds_schedule_updated_at
BEFORE UPDATE ON public.dds_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for DDS notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.dds_schedule;