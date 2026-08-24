-- Create document_history table to track changes
CREATE TABLE public.document_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL,
  changed_by_name TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'status_change',
  previous_status document_status,
  new_status document_status,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view document history"
  ON public.document_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert document history"
  ON public.document_history
  FOR INSERT
  WITH CHECK (auth.uid() = changed_by);

-- Add index for faster queries
CREATE INDEX idx_document_history_document_id ON public.document_history(document_id);
CREATE INDEX idx_document_history_created_at ON public.document_history(created_at DESC);