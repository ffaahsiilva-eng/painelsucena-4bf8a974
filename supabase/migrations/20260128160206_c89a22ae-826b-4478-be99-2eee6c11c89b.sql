-- Create table for storing navigation visibility rules per cargo
CREATE TABLE public.nav_visibility_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nav_item_id TEXT NOT NULL,
  cargo TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(nav_item_id, cargo)
);

-- Enable RLS
ALTER TABLE public.nav_visibility_rules ENABLE ROW LEVEL SECURITY;

-- Anyone can view visibility rules (needed for sidebar)
CREATE POLICY "Anyone can view nav visibility rules"
  ON public.nav_visibility_rules
  FOR SELECT
  USING (true);

-- Only admins can manage visibility rules
CREATE POLICY "Admins can insert nav visibility rules"
  ON public.nav_visibility_rules
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update nav visibility rules"
  ON public.nav_visibility_rules
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete nav visibility rules"
  ON public.nav_visibility_rules
  FOR DELETE
  USING (is_admin(auth.uid()));