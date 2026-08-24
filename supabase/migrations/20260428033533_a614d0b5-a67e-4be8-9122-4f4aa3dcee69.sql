ALTER TABLE public.wapi_config
ADD COLUMN IF NOT EXISTS auto_send_order_alerts boolean NOT NULL DEFAULT false;