-- 1. Create the trigger function to prevent duplicates
CREATE OR REPLACE FUNCTION public.prevent_duplicate_wapi_outbox()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if an identical message already exists in the queue or was recently sent
    -- We consider a message a duplicate if it has the same phone, message, caption, and image_url
    -- and its status is 'pending', 'processing', or it was 'sent' in the last 60 seconds.
    IF EXISTS (
        SELECT 1 FROM public.wapi_outbox
        WHERE phone = NEW.phone
          AND (message IS NOT DISTINCT FROM NEW.message)
          AND (caption IS NOT DISTINCT FROM NEW.caption)
          AND (image_url IS NOT DISTINCT FROM NEW.image_url)
          AND (
            status IN ('pending', 'processing')
            OR (status = 'sent' AND sent_at > (now() - interval '60 seconds'))
          )
          AND id <> NEW.id -- Should not happen on insert but good practice
    ) THEN
        -- If it's a duplicate, we return NULL to skip the insertion
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to the wapi_outbox table
CREATE TRIGGER trg_prevent_duplicate_wapi_outbox
BEFORE INSERT ON public.wapi_outbox
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_wapi_outbox();

-- 3. Cleanup existing duplicates in the queue (status = 'pending')
-- We keep only the first (oldest) message of each duplicate set
DELETE FROM public.wapi_outbox a
USING public.wapi_outbox b
WHERE a.status = 'pending'
  AND b.status = 'pending'
  AND a.id > b.id -- Keep the one with the smallest ID (oldest)
  AND a.phone = b.phone
  AND (a.message IS NOT DISTINCT FROM b.message)
  AND (a.caption IS NOT DISTINCT FROM b.caption)
  AND (a.image_url IS NOT DISTINCT FROM b.image_url);
