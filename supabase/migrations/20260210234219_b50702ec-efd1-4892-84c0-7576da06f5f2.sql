
-- Create desvios (safety deviations) table
CREATE TABLE public.desvios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}'::text[],
  correction_photo_urls TEXT[] DEFAULT '{}'::text[],
  mentioned_user_id UUID,
  mentioned_user_name TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'aberto',
  created_by UUID NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.desvios ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view desvios
CREATE POLICY "Authenticated users can view desvios"
ON public.desvios FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can create desvios
CREATE POLICY "Authenticated users can create desvios"
ON public.desvios FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Creator or admin can update desvios (general fields)
CREATE POLICY "Creator or admin can update desvios"
ON public.desvios FOR UPDATE
TO authenticated
USING (auth.uid() = created_by OR auth.uid() = mentioned_user_id OR is_admin(auth.uid()));

-- Admin or creator can delete desvios
CREATE POLICY "Creator or admin can delete desvios"
ON public.desvios FOR DELETE
TO authenticated
USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.desvios;

-- Create storage bucket for deviation photos
INSERT INTO storage.buckets (id, name, public) VALUES ('desvios', 'desvios', true);

-- Storage policies
CREATE POLICY "Anyone can view desvio photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'desvios');

CREATE POLICY "Authenticated users can upload desvio photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'desvios');

CREATE POLICY "Users can delete own desvio photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'desvios');

-- Trigger for updated_at
CREATE TRIGGER update_desvios_updated_at
BEFORE UPDATE ON public.desvios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
