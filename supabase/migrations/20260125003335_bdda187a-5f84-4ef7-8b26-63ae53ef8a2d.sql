-- Create enum for document types
CREATE TYPE public.document_type AS ENUM ('pt', 'analise_risco', 'aso', 'treinamento', 'certificado', 'licenca', 'outro');

-- Create enum for document status
CREATE TYPE public.document_status AS ENUM ('pending', 'updated', 'cancelled');

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  document_type document_type NOT NULL DEFAULT 'outro',
  description TEXT,
  expiry_date DATE NOT NULL,
  status document_status NOT NULL DEFAULT 'pending',
  file_url TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone authenticated can view documents"
ON public.documents
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create documents"
ON public.documents
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update documents"
ON public.documents
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Creator or admin can delete documents"
ON public.documents
FOR DELETE
USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();