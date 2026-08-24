
ALTER TABLE public.music_tracks DROP COLUMN IF EXISTS title;
ALTER TABLE public.music_tracks DROP COLUMN IF EXISTS artist;
ALTER TABLE public.music_tracks DROP COLUMN IF EXISTS duration_seconds;
ALTER TABLE public.music_tracks DROP COLUMN IF EXISTS sort_order;
ALTER TABLE public.music_tracks ADD COLUMN time_slot INTEGER NOT NULL DEFAULT 0;

-- Add constraint for valid hours
ALTER TABLE public.music_tracks ADD CONSTRAINT valid_time_slot CHECK (time_slot >= 0 AND time_slot <= 23);

-- Index for quick lookup by time slot
CREATE INDEX idx_music_tracks_time_slot ON public.music_tracks (time_slot);
