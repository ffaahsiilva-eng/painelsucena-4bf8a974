UPDATE public.wapi_outbox 
SET status = 'pending', 
    attempts = 0, 
    last_error = NULL, 
    sent_at = NULL,
    dedupe_key = 'order|' || id || '|created|retry-' || extract(epoch from now())::text
WHERE origin = 'order' 
  AND (message LIKE '%Pedido: Nº 00106%' OR caption LIKE '%Pedido: Nº 00106%')
  AND status != 'pending';