
-- Índices para acelerar queries lentas
CREATE INDEX IF NOT EXISTS idx_epi_exchanges_created_at_desc
  ON public.epi_exchanges (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_env_published
  ON public.announcements (environment, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_user
  ON public.announcement_reads (user_id);

CREATE INDEX IF NOT EXISTS idx_rdo_reports_updated_at_desc
  ON public.rdo_reports (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_instacena_posts_env_created
  ON public.instacena_posts (environment, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_instacena_posts_created_desc
  ON public.instacena_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rh_efetivo_env_imported
  ON public.rh_efetivo (environment, imported_at DESC);

CREATE INDEX IF NOT EXISTS idx_desvios_created_at_desc
  ON public.desvios (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen
  ON public.user_presence (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_matrix_task_completions_month
  ON public.matrix_task_completions (month_year);

CREATE INDEX IF NOT EXISTS idx_orders_requester_status_date
  ON public.orders (requester_id, status, expected_date);

-- Corrige trigger anti-duplicata para não abortar transações (evita rollbacks acumulados)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_wapi_outbox()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    -- Se já existe uma mensagem equivalente pendente/em processo,
    -- silenciosamente ignora o INSERT retornando NULL. Não gera erro
    -- (rollback) porque trigger BEFORE INSERT retornando NULL apenas
    -- pula a linha, sem abortar a transação.
    IF EXISTS (
        SELECT 1 FROM public.wapi_outbox
        WHERE phone = NEW.phone
          AND (message IS NOT DISTINCT FROM NEW.message)
          AND (caption IS NOT DISTINCT FROM NEW.caption)
          AND (image_url IS NOT DISTINCT FROM NEW.image_url)
          AND (
            status IN ('pending', 'processing')
            OR (status = 'sent' AND sent_at > (now() - interval '60 seconds'))
          )
    ) THEN
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$function$;

-- Atualiza estatísticas para o planner usar os novos índices
ANALYZE public.epi_exchanges;
ANALYZE public.announcements;
ANALYZE public.announcement_reads;
ANALYZE public.rdo_reports;
ANALYZE public.instacena_posts;
ANALYZE public.rh_efetivo;
ANALYZE public.desvios;
ANALYZE public.user_presence;
ANALYZE public.matrix_task_completions;
ANALYZE public.orders;
