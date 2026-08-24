
-- Create table for seedling planting records
CREATE TABLE public.mudas_plantio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  especie TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  faixa TEXT,
  berma INTEGER,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mudas_plantio ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view mudas_plantio"
ON public.mudas_plantio FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert mudas_plantio"
ON public.mudas_plantio FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update mudas_plantio"
ON public.mudas_plantio FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete mudas_plantio"
ON public.mudas_plantio FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mudas_plantio;
