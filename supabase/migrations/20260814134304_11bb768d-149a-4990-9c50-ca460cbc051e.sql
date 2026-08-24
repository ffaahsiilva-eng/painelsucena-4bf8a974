DO $$ 
DECLARE
    v_order_id UUID;
BEGIN
    SELECT id INTO v_order_id FROM public.orders WHERE order_number = '00106' LIMIT 1;
    
    IF v_order_id IS NOT NULL THEN
        -- Marca notificações anteriores como falhas para evitar supressão de duplicados
        UPDATE public.wapi_outbox 
        SET status = 'failed', last_error = 'manual-retry-forced'
        WHERE (dedupe_key LIKE 'order|' || v_order_id || '%') AND status != 'failed';

        -- Insere uma nova entrada na fila com uma chave única para forçar o envio
        INSERT INTO public.wapi_outbox (
            kind,
            target_type,
            phone,
            image_url,
            caption,
            origin,
            status,
            dedupe_key
        )
        SELECT 
            'image',
            'group',
            (SELECT COALESCE(group_id_orders, group_id) FROM public.wapi_config LIMIT 1),
            (SELECT photo_urls[1] FROM public.orders WHERE id = v_order_id), -- Pega a primeira foto
            '📦 *NOVO PEDIDO RECEBIDO (REENVIO)*' || chr(10) || 
            '━━━━━━━━━━━━━━━━━━━━' || chr(10) || chr(10) || 
            '*Pedido:* Nº 00106' || chr(10) || 
            '*Solicitante:* ' || requester_name || chr(10) || 
            chr(10) || '*Itens:*' || chr(10) || '• 6 un — Rastelo Vassoura' || chr(10) || 
            chr(10) || '━━━━━━━━━━━━━━━━━━━━' || chr(10) || 
            '🔔 Reenvio forçado para garantir a imagem.',
            'order',
            'pending',
            'order|' || v_order_id || '|manual-retry-' || extract(epoch from now())::text
        FROM public.orders 
        WHERE id = v_order_id;
    END IF;
END $$;