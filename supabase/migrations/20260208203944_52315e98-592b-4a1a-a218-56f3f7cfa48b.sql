
-- Create presentations table
CREATE TABLE public.presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

-- Users can view their own presentations
CREATE POLICY "Users can view their own presentations"
ON public.presentations FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own presentations
CREATE POLICY "Users can create presentations"
ON public.presentations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own presentations
CREATE POLICY "Users can update their own presentations"
ON public.presentations FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own presentations
CREATE POLICY "Users can delete their own presentations"
ON public.presentations FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all presentations"
ON public.presentations FOR SELECT
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_presentations_updated_at
BEFORE UPDATE ON public.presentations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
