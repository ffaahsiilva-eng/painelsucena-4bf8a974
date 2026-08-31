-- RPC para qualquer usuário autenticado enfileirar uma imagem no wapi_outbox.
-- Roda com SECURITY DEFINER para contornar o RLS (só admins podem INSERT direto).
-- Ideal para o painel do motorista enviar o PNG da Parte Diária sem depender
-- de deploy da Edge Function.

CREATE OR REPLACE FUNCTION public.rpc_enqueue_wapi_image(
  p_phone       text,
  p_image_url   text,
  p_caption     text DEFAULT NULL,
  p_origin      text DEFAULT 'driver-status',
  p_external_kind text DEFAULT NULL,
  p_external_id text DEFAULT NULL,
  p_dedupe_key  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _id uuid;
  _cfg record;
BEGIN
  -- Verifica se o WhatsApp está habilitado
  SELECT enabled, instance_url, instance_token, instance_id
    INTO _cfg
    FROM public.wapi_config
   LIMIT 1;

  IF _cfg IS NULL OR _cfg.enabled IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  IF _cfg.instance_url IS NULL OR _cfg.instance_token IS NULL OR _cfg.instance_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Dedup: se já existe imagem com mesmo dedupe_key pendente/enviada, não duplica
  IF p_dedupe_key IS NOT NULL THEN
    PERFORM 1 FROM public.wapi_outbox
     WHERE dedupe_key = p_dedupe_key
       AND (
         status IN ('pending', 'processing')
         OR (status = 'sent' AND sent_at > (now() - interval '120 seconds'))
       );
    IF FOUND THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.wapi_outbox (kind, target_type, phone, image_url, caption, origin, external_kind, external_id, dedupe_key)
  VALUES ('image', 'group', p_phone, p_image_url, p_caption, p_origin, p_external_kind, p_external_id, p_dedupe_key)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- Qualquer usuário autenticado pode chamar esta função
GRANT EXECUTE ON FUNCTION public.rpc_enqueue_wapi_image TO authenticated;
