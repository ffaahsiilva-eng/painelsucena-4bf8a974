-- Add berma columns for each activity type
ALTER TABLE public.daily_jardinagem_reports 
ADD COLUMN IF NOT EXISTS rocagem_berma integer NULL,
ADD COLUMN IF NOT EXISTS podagem_berma integer NULL,
ADD COLUMN IF NOT EXISTS coroamento_berma integer NULL,
ADD COLUMN IF NOT EXISTS plantio_berma integer NULL,
ADD COLUMN IF NOT EXISTS limpeza_manual_berma integer NULL,
ADD COLUMN IF NOT EXISTS limpeza_assoprador_berma integer NULL,
ADD COLUMN IF NOT EXISTS controle_invasoras_berma integer NULL;

-- Add check constraints to ensure berma values are between 28 and 56
ALTER TABLE public.daily_jardinagem_reports
ADD CONSTRAINT check_rocagem_berma CHECK (rocagem_berma IS NULL OR (rocagem_berma >= 28 AND rocagem_berma <= 56)),
ADD CONSTRAINT check_podagem_berma CHECK (podagem_berma IS NULL OR (podagem_berma >= 28 AND podagem_berma <= 56)),
ADD CONSTRAINT check_coroamento_berma CHECK (coroamento_berma IS NULL OR (coroamento_berma >= 28 AND coroamento_berma <= 56)),
ADD CONSTRAINT check_plantio_berma CHECK (plantio_berma IS NULL OR (plantio_berma >= 28 AND plantio_berma <= 56)),
ADD CONSTRAINT check_limpeza_manual_berma CHECK (limpeza_manual_berma IS NULL OR (limpeza_manual_berma >= 28 AND limpeza_manual_berma <= 56)),
ADD CONSTRAINT check_limpeza_assoprador_berma CHECK (limpeza_assoprador_berma IS NULL OR (limpeza_assoprador_berma >= 28 AND limpeza_assoprador_berma <= 56)),
ADD CONSTRAINT check_controle_invasoras_berma CHECK (controle_invasoras_berma IS NULL OR (controle_invasoras_berma >= 28 AND controle_invasoras_berma <= 56));