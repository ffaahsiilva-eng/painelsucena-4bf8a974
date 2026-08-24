ALTER TABLE public.rdo_reports
  ADD COLUMN IF NOT EXISTS temperature numeric,
  ADD COLUMN IF NOT EXISTS apparent_temp numeric,
  ADD COLUMN IF NOT EXISTS humidity numeric,
  ADD COLUMN IF NOT EXISTS temperature_captured_at timestamptz;