ALTER TABLE public.wapi_config 
ADD COLUMN IF NOT EXISTS auto_send_sling_inspection_alert boolean NOT NULL DEFAULT false;