
CREATE TABLE public.wapi_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text,
  kind text,
  target_type text,
  message text,
  image_url text,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wapi_broadcasts TO authenticated;
GRANT ALL ON public.wapi_broadcasts TO service_role;

ALTER TABLE public.wapi_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_wapi_broadcasts"
  ON public.wapi_broadcasts FOR SELECT
  TO authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.wapi_broadcasts;
ALTER TABLE public.wapi_broadcasts REPLICA IDENTITY FULL;

CREATE INDEX idx_wapi_broadcasts_created_at ON public.wapi_broadcasts (created_at DESC);

CREATE OR REPLACE FUNCTION public.fn_wapi_broadcast_on_outbox()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só notifica broadcasts automáticos direcionados a GRUPO (evita spam de mensagens pessoais como chat/reminder)
  IF NEW.target_type <> 'group' THEN
    RETURN NEW;
  END IF;

  -- Origens manuais/pessoais que NÃO devem gerar popup
  IF NEW.origin IN ('chat_notification','billing','new-user-signup','manual_resend') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.wapi_broadcasts (origin, kind, target_type, message, image_url, caption)
  VALUES (NEW.origin, NEW.kind, NEW.target_type, NEW.message, NEW.image_url, NEW.caption);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wapi_broadcast_on_outbox
AFTER INSERT ON public.wapi_outbox
FOR EACH ROW
EXECUTE FUNCTION public.fn_wapi_broadcast_on_outbox();

-- Cleanup diário: remove broadcasts com mais de 24h (opcional, mantém tabela leve)
CREATE OR REPLACE FUNCTION public.fn_cleanup_wapi_broadcasts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.wapi_broadcasts WHERE created_at < now() - interval '24 hours';
$$;
