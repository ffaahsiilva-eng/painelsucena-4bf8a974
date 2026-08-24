ALTER TABLE public.wapi_config 
ADD COLUMN IF NOT EXISTS auto_send_desvios boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS group_id_desvios text;