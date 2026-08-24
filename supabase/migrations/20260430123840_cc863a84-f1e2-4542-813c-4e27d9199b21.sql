ALTER TABLE public.wapi_config
ADD COLUMN IF NOT EXISTS auto_send_low_stock_alert boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS group_id_low_stock text;