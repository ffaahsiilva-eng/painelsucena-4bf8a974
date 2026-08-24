-- Create RDO reports table for history
CREATE TABLE public.rdo_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  
  -- Weather conditions
  weather_morning TEXT NOT NULL DEFAULT 'Sol',
  weather_afternoon TEXT NOT NULL DEFAULT 'Sol',
  
  -- Activities
  jardinagem_location TEXT,
  jardinagem_activities TEXT,
  gabiao_location TEXT,
  gabiao_activities TEXT,
  
  -- Difficulties
  difficulties TEXT,
  
  -- Photo URLs (array)
  photo_urls TEXT[] DEFAULT '{}',
  
  -- Generated report text
  report_text TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rdo_reports ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all RDO reports
CREATE POLICY "Authenticated users can view all RDO reports"
ON public.rdo_reports
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Authenticated users can create RDO reports
CREATE POLICY "Authenticated users can create RDO reports"
ON public.rdo_reports
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update their own reports
CREATE POLICY "Users can update their own RDO reports"
ON public.rdo_reports
FOR UPDATE
USING (auth.uid() = created_by);

-- Users can delete their own reports
CREATE POLICY "Users can delete their own RDO reports"
ON public.rdo_reports
FOR DELETE
USING (auth.uid() = created_by);

-- Create index for faster date queries
CREATE INDEX idx_rdo_reports_date ON public.rdo_reports(report_date DESC);
CREATE INDEX idx_rdo_reports_created_by ON public.rdo_reports(created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_rdo_reports_updated_at
BEFORE UPDATE ON public.rdo_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for RDO photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rdo-photos', 'rdo-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for RDO photos
CREATE POLICY "Authenticated users can upload RDO photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'rdo-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view RDO photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'rdo-photos');

CREATE POLICY "Users can delete their own RDO photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'rdo-photos' AND auth.uid()::text = (storage.foldername(name))[1]);