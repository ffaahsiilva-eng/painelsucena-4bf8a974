ALTER TABLE public.daily_jardinagem_reports 
ADD COLUMN IF NOT EXISTS controle_invasoras_faixa TEXT,
ADD COLUMN IF NOT EXISTS retirada_mudas_faixa TEXT,
ADD COLUMN IF NOT EXISTS retirada_mudas_berma INTEGER,
ADD COLUMN IF NOT EXISTS manutencao_canteiro_faixa TEXT,
ADD COLUMN IF NOT EXISTS manutencao_canteiro_berma INTEGER,
ADD COLUMN IF NOT EXISTS atividades_manuais_faixa TEXT,
ADD COLUMN IF NOT EXISTS atividades_manuais_berma INTEGER;
