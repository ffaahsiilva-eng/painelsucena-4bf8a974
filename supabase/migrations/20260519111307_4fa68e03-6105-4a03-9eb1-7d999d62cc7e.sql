ALTER TABLE public.wapi_config
  ADD COLUMN IF NOT EXISTS auto_send_driver_app_reminder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_id_driver_app_reminder text;