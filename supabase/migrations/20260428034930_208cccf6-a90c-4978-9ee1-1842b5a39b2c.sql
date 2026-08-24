
-- Fila persistente para envios W-API (throttle global)
CREATE TABLE IF NOT EXISTS public.wapi_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('text','image')),
  target_type text NOT NULL CHECK (target_type IN ('group','contact')),
  phone text NOT NULL,
  message text,
  image_url text,
  caption text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  origin text,
  recipient_user_id uuid,
  recipient_name text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wapi_outbox_pending ON public.wapi_outbox (status, scheduled_at) WHERE status = 'pending';

ALTER TABLE public.wapi_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage wapi_outbox"
ON public.wapi_outbox FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_wapi_outbox_updated
BEFORE UPDATE ON public.wapi_outbox
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coluna para rastrear última saída (calcula próxima janela de envio)
ALTER TABLE public.wapi_config
  ADD COLUMN IF NOT EXISTS last_dispatched_at timestamptz;
