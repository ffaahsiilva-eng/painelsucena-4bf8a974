
-- Índices para acelerar as queries mais lentas identificadas em pg_stat_statements
CREATE INDEX IF NOT EXISTS idx_epi_exchanges_created_at_desc ON public.epi_exchanges (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_env_published ON public.announcements (environment, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_instacena_posts_created_at_desc ON public.instacena_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON public.announcement_reads (user_id);
CREATE INDEX IF NOT EXISTS idx_rdo_reports_updated_at_desc ON public.rdo_reports (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_stop_history_eq_started ON public.equipment_stop_history (equipment_id, started_at ASC);
CREATE INDEX IF NOT EXISTS idx_orders_requester_status_expected ON public.orders (requester_id, status, expected_date) WHERE expected_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wapi_outbox_origin_kind_ext ON public.wapi_outbox (origin, external_kind, external_id);
CREATE INDEX IF NOT EXISTS idx_rh_efetivo_env_imported ON public.rh_efetivo (environment, imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_matrix_task_completions_month ON public.matrix_task_completions (month_year);
CREATE INDEX IF NOT EXISTS idx_user_presence_user ON public.user_presence (user_id);
