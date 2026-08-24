
ALTER TABLE public.wapi_config
  ADD COLUMN IF NOT EXISTS auto_send_training_alert boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_id_training text;
