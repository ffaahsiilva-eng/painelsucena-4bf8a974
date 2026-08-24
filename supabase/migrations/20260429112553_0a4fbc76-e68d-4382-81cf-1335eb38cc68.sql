ALTER TABLE public.wapi_config
ADD COLUMN IF NOT EXISTS auto_send_dds_photo boolean NOT NULL DEFAULT false;