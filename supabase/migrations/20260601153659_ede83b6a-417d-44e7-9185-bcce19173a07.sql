ALTER TABLE public.wapi_config 
ADD COLUMN IF NOT EXISTS auto_send_planned_activities boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS group_id_planned_activities text;

COMMENT ON COLUMN public.wapi_config.auto_send_planned_activities IS 'Habilita o envio automático de Atividades Previstas (Gabião/Jardinagem) via WhatsApp.';
COMMENT ON COLUMN public.wapi_config.group_id_planned_activities IS 'ID do grupo do WhatsApp para envio das Atividades Previstas (sobrescreve o grupo padrão).';