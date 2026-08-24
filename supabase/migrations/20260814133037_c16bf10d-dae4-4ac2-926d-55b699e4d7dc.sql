DO $$ 
DECLARE
    last_order_id uuid;
    last_order_photo_urls text[];
    last_outbox_id uuid;
BEGIN
    SELECT id, photo_urls INTO last_order_id, last_order_photo_urls 
    FROM public.orders 
    ORDER BY created_at DESC 
    LIMIT 1;

    SELECT id INTO last_outbox_id
    FROM public.wapi_outbox
    WHERE origin = 'order'
    ORDER BY created_at DESC
    LIMIT 1;

    IF last_outbox_id IS NOT NULL THEN
        UPDATE public.wapi_outbox
        SET 
            status = 'pending',
            attempts = 0,
            last_error = NULL,
            dedupe_key = 'order|' || last_order_id || '|manual-retry-' || extract(epoch from now())::text,
            image_url = CASE 
                WHEN (last_order_photo_urls IS NOT NULL AND array_length(last_order_photo_urls, 1) > 0) 
                THEN last_order_photo_urls[1] 
                ELSE image_url 
            END,
            kind = CASE 
                WHEN (last_order_photo_urls IS NOT NULL AND array_length(last_order_photo_urls, 1) > 0) 
                THEN 'image' 
                ELSE kind 
            END
        WHERE id = last_outbox_id;
    END IF;
END $$;
