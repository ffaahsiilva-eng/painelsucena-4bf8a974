-- Create table for security files
CREATE TABLE public.security_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_files ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone authenticated can view security files"
ON public.security_files
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload security files"
ON public.security_files
FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Admins or uploaders can delete security files"
ON public.security_files
FOR DELETE
USING (auth.uid() = uploaded_by OR is_admin(auth.uid()));

-- Create storage bucket for security files
INSERT INTO storage.buckets (id, name, public) VALUES ('security-files', 'security-files', true);

-- Storage policies
CREATE POLICY "Anyone can view security files storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'security-files');

CREATE POLICY "Authenticated users can upload security files storage"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'security-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete security files storage"
ON storage.objects FOR DELETE
USING (bucket_id = 'security-files' AND auth.uid() IS NOT NULL);