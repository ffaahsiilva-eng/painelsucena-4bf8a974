ALTER TABLE public.wapi_config
ADD COLUMN IF NOT EXISTS auto_send_equipment_movements boolean NOT NULL DEFAULT false;