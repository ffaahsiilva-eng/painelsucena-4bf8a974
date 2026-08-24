-- Create table to store monthly overtime summaries
CREATE TABLE public.overtime_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  cargo text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_records integer NOT NULL DEFAULT 0,
  total_overtime_records integer NOT NULL DEFAULT 0,
  total_hours_worked numeric NOT NULL DEFAULT 0,
  total_overtime_hours numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.overtime_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies - same visibility as overtime_records
CREATE POLICY "Users can view overtime summaries by cargo"
ON public.overtime_summaries
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = ANY (ARRAY['preposto'::cargo_type, 'aux_administrativo'::cargo_type, 'encarregado_geral'::cargo_type])
  ))
  OR is_admin(auth.uid())
  OR (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND (profiles.cargo)::text = overtime_summaries.cargo
  ))
);

-- Allow service role to insert/update (for edge function)
CREATE POLICY "Service role can manage summaries"
ON public.overtime_summaries
FOR ALL
USING (true)
WITH CHECK (true);