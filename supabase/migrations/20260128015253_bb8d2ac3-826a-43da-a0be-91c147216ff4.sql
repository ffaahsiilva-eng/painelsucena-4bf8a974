-- Create storage bucket for DDS planning documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('dds-documents', 'dds-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to dds-documents bucket
CREATE POLICY "Authenticated users can upload DDS documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dds-documents');

-- Allow anyone to view DDS documents
CREATE POLICY "Anyone can view DDS documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'dds-documents');

-- Allow authenticated users to update DDS documents
CREATE POLICY "Authenticated users can update DDS documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'dds-documents');

-- Allow authenticated users to delete DDS documents
CREATE POLICY "Authenticated users can delete DDS documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'dds-documents');

-- Create table to track the current DDS planning document
CREATE TABLE IF NOT EXISTS public.dds_planning_document (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dds_planning_document ENABLE ROW LEVEL SECURITY;

-- Anyone can view the DDS planning document
CREATE POLICY "Anyone can view DDS planning document"
ON public.dds_planning_document FOR SELECT
TO public
USING (true);

-- Authenticated users can manage DDS planning document
CREATE POLICY "Authenticated users can insert DDS planning document"
ON public.dds_planning_document FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update DDS planning document"
ON public.dds_planning_document FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete DDS planning document"
ON public.dds_planning_document FOR DELETE
TO authenticated
USING (true);