ALTER TABLE public.wapi_config
  ADD COLUMN IF NOT EXISTS auto_send_orders_to_group boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_id_orders text;