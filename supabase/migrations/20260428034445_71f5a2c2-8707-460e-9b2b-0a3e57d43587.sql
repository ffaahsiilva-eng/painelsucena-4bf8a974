ALTER TABLE public.wapi_config
ADD COLUMN IF NOT EXISTS auto_send_planning_alerts boolean NOT NULL DEFAULT false;