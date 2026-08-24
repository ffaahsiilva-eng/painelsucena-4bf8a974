ALTER TABLE public.wapi_config
  ADD COLUMN IF NOT EXISTS auto_send_pos_chuva boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_id_pos_chuva text;