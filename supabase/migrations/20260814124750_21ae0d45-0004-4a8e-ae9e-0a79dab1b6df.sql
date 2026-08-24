-- Corrige a mensagem com erro na fila para tentar novamente com o novo worker
UPDATE public.wapi_outbox 
SET status = 'pending', attempts = 0, last_error = null 
WHERE id = '97ee0fd7-4ea9-4e16-9030-87825b816d68';