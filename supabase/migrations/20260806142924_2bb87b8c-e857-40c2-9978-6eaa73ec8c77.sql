-- Migration: fix_berma_persistence_jardinagem
-- Goal: Change berma columns in daily_jardinagem_reports from integer to text to allow special strings like 'gabiao-1', 'mirante', etc.
-- And remove the restrictive check constraints that prevent values outside 28-56.

-- 1. Drop the check constraints
ALTER TABLE public.daily_jardinagem_reports DROP CONSTRAINT IF EXISTS check_rocagem_berma;
ALTER TABLE public.daily_jardinagem_reports DROP CONSTRAINT IF EXISTS check_podagem_berma;
ALTER TABLE public.daily_jardinagem_reports DROP CONSTRAINT IF EXISTS check_coroamento_berma;
ALTER TABLE public.daily_jardinagem_reports DROP CONSTRAINT IF EXISTS check_plantio_berma;
ALTER TABLE public.daily_jardinagem_reports DROP CONSTRAINT IF EXISTS check_limpeza_manual_berma;
ALTER TABLE public.daily_jardinagem_reports DROP CONSTRAINT IF EXISTS check_limpeza_assoprador_berma;
ALTER TABLE public.daily_jardinagem_reports DROP CONSTRAINT IF EXISTS check_controle_invasoras_berma;

-- 2. Change column types to text
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN rocagem_berma TYPE text USING rocagem_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN podagem_berma TYPE text USING podagem_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN coroamento_berma TYPE text USING coroamento_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN plantio_berma TYPE text USING plantio_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN limpeza_manual_berma TYPE text USING limpeza_manual_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN limpeza_assoprador_berma TYPE text USING limpeza_assoprador_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN controle_invasoras_berma TYPE text USING controle_invasoras_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN adubagem_berma TYPE text USING adubagem_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN plantio_grama_berma TYPE text USING plantio_grama_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN cova_berma TYPE text USING cova_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN retirada_mudas_berma TYPE text USING retirada_mudas_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN manutencao_canteiro_berma TYPE text USING manutencao_canteiro_berma::text;
ALTER TABLE public.daily_jardinagem_reports ALTER COLUMN atividades_manuais_berma TYPE text USING atividades_manuais_berma::text;

-- 3. Update comments to reflect change
COMMENT ON COLUMN public.daily_jardinagem_reports.rocagem_berma IS 'Berma number or special location name (mirante, gabiao-1, etc)';

-- 4. Re-grant permissions
GRANT ALL ON public.daily_jardinagem_reports TO authenticated;
GRANT ALL ON public.daily_jardinagem_reports TO service_role;
