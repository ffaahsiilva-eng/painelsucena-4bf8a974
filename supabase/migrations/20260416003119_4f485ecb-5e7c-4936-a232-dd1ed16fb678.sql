
ALTER TABLE public.radio_now_playing
  ADD COLUMN queue jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN played_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
