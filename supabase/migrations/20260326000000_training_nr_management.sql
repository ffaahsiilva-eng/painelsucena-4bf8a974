-- NR Catalog for global management
CREATE TABLE public.nr_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nr_code text NOT NULL UNIQUE, -- e.g. "NR-10"
    nr_name text NOT NULL,        -- e.g. "Segurança em Instalações e Serviços em Eletricidade"
    description text,
    created_at timestamptz DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr_catalog TO authenticated;
GRANT ALL ON public.nr_catalog TO service_role;

-- Enable RLS
ALTER TABLE public.nr_catalog ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can select NRs" ON public.nr_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage NRs" ON public.nr_catalog FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Populate with standard NRs
INSERT INTO public.nr_catalog (nr_code, nr_name) VALUES
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
('NR-35', 'Trabalho em Altura');

-- Update rh_efetivo table to store NR files if needed (or we use bucket)
-- We will use a dedicated bucket for NR documents
