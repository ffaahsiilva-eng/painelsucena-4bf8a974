-- 1. Correct the wapi-order-notify logic if it were possible via SQL, but it's an edge function.
-- Since I can't edit the edge function code via SQL, I'll focus on the data state.
-- The user says the image is NOT being sent. I've reset it once, but maybe the photo_urls was NULL or empty in the outbox row.

-- 2. Force a manual entry into wapi_outbox with the exact photo from the last order to be 100% sure.
DO $$ 
DECLARE
    last_order_id uuid;
    last_order_num text;
    last_order_requester text;
    last_order_photo_urls text[];
    last_order_notes text;
    target_group_id text;
    items_summary text;
    full_message text;
BEGIN
    -- Get data from the last order
    SELECT id, order_number, requester_name, photo_urls, notes 
    INTO last_order_id, last_order_num, last_order_requester, last_order_photo_urls, last_order_notes
    FROM public.orders 
    ORDER BY created_at DESC 
    LIMIT 1;

    -- Get target group for orders
    SELECT group_id_orders INTO target_group_id FROM public.wapi_config LIMIT 1;
    IF target_group_id IS NULL OR target_group_id = '' THEN
        SELECT group_id INTO target_group_id FROM public.wapi_config LIMIT 1;
    END IF;

    -- Aggregate items
    SELECT string_agg('• ' || quantity || ' ' || quantity_unit || ' — ' || product_name, chr(10))
    INTO items_summary
    FROM public.order_items
    WHERE order_id = last_order_id;

    full_message := '📦 *NOVO PEDIDO RECEBIDO*' || chr(10) ||
                    '━━━━━━━━━━━━━━━━━━━━' || chr(10) || chr(10) ||
                    '*Pedido:* Nº ' || COALESCE(last_order_num, '—') || chr(10) ||
                    '*Solicitante:* ' || COALESCE(last_order_requester, '—') || chr(10) ||
                    chr(10) || '*Itens:*' || chr(10) || COALESCE(items_summary, '—') || chr(10) ||
                    CASE WHEN last_order_notes IS NOT NULL THEN chr(10) || '*Observações:* ' || last_order_notes || chr(10) ELSE '' END ||
                    chr(10) || '━━━━━━━━━━━━━━━━━━━━' || chr(10) ||
                    '🔔 Novo pedido aberto no sistema.';

    -- Insert fresh outbox item as image if photo exists
    IF last_order_photo_urls IS NOT NULL AND array_length(last_order_photo_urls, 1) > 0 THEN
        INSERT INTO public.wapi_outbox (
            kind, 
            target_type, 
            phone, 
            image_url, 
            caption, 
            origin, 
            status, 
            dedupe_key
        ) VALUES (
            'image',
            'group',
            target_group_id,
            last_order_photo_urls[1],
            full_message,
            'order',
            'pending',
            'order|' || last_order_id || '|manual-force-photo-' || extract(epoch from now())::text
        );
    ELSE
        -- Fallback to text if no photo found
        INSERT INTO public.wapi_outbox (
            kind, 
            target_type, 
            phone, 
            message, 
            origin, 
            status, 
            dedupe_key
        ) VALUES (
            'text',
            'group',
            target_group_id,
            full_message,
            'order',
            'pending',
            'order|' || last_order_id || '|manual-force-text-' || extract(epoch from now())::text
        );
    END IF;
END $$;
