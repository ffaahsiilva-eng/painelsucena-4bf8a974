ALTER TABLE public.instacena_posts
ADD COLUMN IF NOT EXISTS environment text;

-- Backfill posts antigos como barcarena
UPDATE public.instacena_posts SET environment = 'barcarena' WHERE environment IS NULL;