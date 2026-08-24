-- Força o reenvio da mensagem do último pedido, garantindo que o status seja processado pelo worker
UPDATE public.wapi_outbox 
SET 
  status = 'pending', 
  attempts = 0, 
  last_error = null,
  image_url = REPLACE(image_url, '.webp', '.jpg')
WHERE id = '97ee0fd7-4ea9-4e16-9030-87825b816d68';