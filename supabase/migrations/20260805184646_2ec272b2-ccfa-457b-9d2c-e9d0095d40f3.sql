
CREATE TABLE IF NOT EXISTS public.nr_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nr_code text NOT NULL UNIQUE,
    nr_name text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr_catalog TO authenticated;
GRANT ALL ON public.nr_catalog TO service_role;

ALTER TABLE public.nr_catalog ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone authenticated can select NRs' AND tablename = 'nr_catalog') THEN
        CREATE POLICY "Anyone authenticated can select NRs" ON public.nr_catalog FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage NRs' AND tablename = 'nr_catalog') THEN
        CREATE POLICY "Admins can manage NRs" ON public.nr_catalog FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

INSERT INTO public.nr_catalog (nr_code, nr_name) 
VALUES
('NR-01', 'Disposições Gerais e Gerenciamento de Riscos Ocupacionais'),
('NR-04', 'Serviços Especializados em Engenharia de Segurança e em Medicina do Trabalho'),
('NR-05', 'Comissão Interna de Prevenção de Acidentes'),
('NR-06', 'Equipamento de Proteção Individual'),
('NR-07', 'Programa de Controle Médico de Saúde Ocupacional'),
('NR-09', 'Avaliação e Controle das Exposições Ocupacionais a Agentes Físicos, Químicos e Biológicos'),
('NR-10', 'Segurança em Instalações e Serviços em Eletricidade'),
('NR-11', 'Transporte, Movimentação, Armazenagem e Manuseio de Materiais'),
('NR-12', 'Segurança no Trabalho em Máquinas e Equipamentos'),
('NR-13', 'Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos de Armazenamento'),
('NR-15', 'Atividades e Operações Insalubres'),
('NR-17', 'Ergonomia'),
('NR-18', 'Segurança e Saúde no Trabalho na Indústria da Construção'),
('NR-20', 'Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis'),
('NR-23', 'Proteção Contra Incêndios'),
('NR-25', 'Resíduos Industriais'),
('NR-26', 'Sinalização de Segurança'),
('NR-28', 'Fiscalização e Penalidades'),
('NR-33', 'Segurança e Saúde nos Trabalhos em Espaços Confinados'),
('NR-34', 'Condições e Meio Ambiente de Trabalho na Indústria da Construção, Reparação e Desmonte Naval'),
('NR-35', 'Trabalho em Altura')
ON CONFLICT (nr_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.nr_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id uuid REFERENCES public.rh_efetivo(id) ON DELETE CASCADE,
    nr_id uuid REFERENCES public.nr_catalog(id) ON DELETE CASCADE,
    issue_date date,
    expiry_date date,
    document_url text,
    environment text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(collaborator_id, nr_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr_records TO authenticated;
GRANT ALL ON public.nr_records TO service_role;

ALTER TABLE public.nr_records ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone authenticated can select records' AND tablename = 'nr_records') THEN
        CREATE POLICY "Anyone authenticated can select records" ON public.nr_records FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage records' AND tablename = 'nr_records') THEN
        CREATE POLICY "Admins can manage records" ON public.nr_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;
