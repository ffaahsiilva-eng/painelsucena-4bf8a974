
-- adubo_estoque: saldo por ambiente
CREATE TABLE public.adubo_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL UNIQUE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.adubo_estoque TO authenticated;
GRANT ALL ON public.adubo_estoque TO service_role;
ALTER TABLE public.adubo_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adubo_estoque_select" ON public.adubo_estoque FOR SELECT TO authenticated USING (true);
CREATE POLICY "adubo_estoque_admin_write" ON public.adubo_estoque FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- adubo_movimentos: entradas e saídas
CREATE TABLE public.adubo_movimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada','saida')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  previous_quantity NUMERIC NOT NULL DEFAULT 0,
  new_quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  reason TEXT,
  withdrawer_name TEXT,
  signature_data_url TEXT,
  registered_by UUID NOT NULL,
  registered_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.adubo_movimentos TO authenticated;
GRANT ALL ON public.adubo_movimentos TO service_role;
ALTER TABLE public.adubo_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adubo_mov_select" ON public.adubo_movimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "adubo_mov_insert" ON public.adubo_movimentos FOR INSERT TO authenticated
  WITH CHECK (
    registered_by = auth.uid()
    AND (
      movement_type = 'saida'
      OR (movement_type = 'entrada' AND public.is_admin(auth.uid()))
    )
  );
CREATE POLICY "adubo_mov_delete_admin" ON public.adubo_movimentos FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR registered_by = auth.uid());

CREATE INDEX idx_adubo_mov_env_created ON public.adubo_movimentos(environment, created_at DESC);

-- wapi_config: adicionar grupo/toggle para Adubo
ALTER TABLE public.wapi_config
  ADD COLUMN IF NOT EXISTS group_id_adubo TEXT,
  ADD COLUMN IF NOT EXISTS auto_send_adubo_alert BOOLEAN NOT NULL DEFAULT false;
