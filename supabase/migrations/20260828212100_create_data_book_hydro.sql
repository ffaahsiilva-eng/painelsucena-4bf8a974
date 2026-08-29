-- Migration: Create data_book_hydro table and seed data
CREATE TABLE IF NOT EXISTS public.data_book_hydro (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_number TEXT NOT NULL,
    content TEXT,
    responsible TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.data_book_hydro ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated full access to data_book_hydro'
    ) THEN
        CREATE POLICY "Allow authenticated full access to data_book_hydro"
        ON public.data_book_hydro
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END
$$;

-- Seed Data
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1', 'Seção I – Documentação certificada', '');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.1', 'Contrato e seus aditivos com o Cliente', 'PREPOSTO/PLANEJAMENTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.2', 'Anotação de responsabilidade técnica – ARTs', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.3', 'Plano da Qualidade e Plano de Inspeção e Testes', 'NA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.4', 'Registro de qualificação de mão-de-obra especializada', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.5', 'Procedimentos Operacionais/ Técnicos e de Ensaios/ Testes', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.6', 'EPS – Especificação do Procedimento de Soldagem', 'NA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.7', 'RQPS – Registro de Qualificação do Procedimento de Soldagem', 'NA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.8', 'RQS - Registro de Qualificação de Soldador', 'NA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.9', 'RSQ - Relação de Soldadores Qualificados', 'NA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.10', 'Controle de Desempenho de juntas soldadas', 'NA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.11', 'Controle de Calibração e Certificados de calibração dos equipamentos de inspeção, medição e ensaio utilizados na realização do escopo', 'NA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.12', 'Controle de recebimento de materiais críticos, Notas Fiscais e respectivos Certificados de Qualidade com rastreabilidade incluindo componentes e consumíveis', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.13', 'Não conformidades referente ao período da execução dos serviços prestados', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.14', 'Evidências de treinamentos realizados', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.15', 'Relatórios de auditorias realizadas no decorrer da obra / execução dos serviços', 'NA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.16', 'Registros da Qualidade - Relatórios de Testes, Inspeções e demais registros que garantam que a contratada realizou as atividades conforme especificado (este item será dividido em pastas específicas, normalmente chamadas pastas “TOP-Turn-Over Packages” para os pacotes maiores, onde sua organização será através de áreas ou sistemas e subsistemas)', 'NA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.17', 'Relatórios semanais e mensais (arquivo eletrônico em formato nativo - editável)', 'PLANEJAMENTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.18', 'Diário de Obra', 'PLANEJAMENTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.19', 'Registro das consultas técnicas / Pedidos de informação emitidas durante a obra / execução dos serviços', 'PREPOSTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.20', 'Termos de Aceitação', 'PREPOSTO/PLANEJAMENTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.21', 'Atas de Reuniões', 'PLANEJAMENTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.22', 'Especificação Técnica quando gerada pela Contratada', 'PREPOSTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.23', 'Desenhos “As Built” referente a projetos elaborados pela Contratada', 'PLANEJAMENTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.24', 'Desenhos de origem de outro fornecedor emitidos no status “para Construção” que não tiveram ”Red-Line”, devem ter estampado um carimbo descrevendo “CONSTRUÍDO CONFORME PROJETO”', 'PLANEJAMENTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.1.25', 'Desenho “Red-Line” (originais)', 'PLANEJAMENTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2', 'Seção II – Segurança, Saúde e Meio Ambiente', '');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.1', 'Documentos de ordem ambiental que comprovem extração legal da matéria-prima referente a recursos minerais e florestais', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.2', 'Ata de Reunião inicial de Kick Off, para as contratadas', 'PLANEJAMENTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.3', 'Plano de Meio Ambiente, Segurança e Saúde Ocupacional', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.4', 'Procedimentos de Meio Ambiente', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.5', 'Licenças/Alvarás/Certidões/Outorgas /Cadastro Técnico Federal do IBAMA (CTF)/ Documento de Origem Florestal (DOF) das Madeiras, dos Fornecedores e Prestadores de Serviço', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.6', 'Relatório mensal de Meio Ambiente', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.7', 'Relatório de Inspeção de Meio Ambiente (RIMA)', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.8', 'Planilhas de Monitoramentos e Medições Mensais - (Consumo Hídrico/Geração de Resíduos/Geração de Efluente/Monitoramento de Fumaça Preta e Consumo de Diesel)', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.9', 'Lista de Treinamentos, DDS e Campanhas de Meio Ambiente', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.10', 'Listas de Verificação e Check List de Meio Ambiente', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.11', 'Manifesto de Transporte de Resíduos dos Resíduos Sólidos, Líquidos e Efluentes', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.12', 'Laudos de Potabilidade de Água', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.13', 'Inventário e FISPQ’s dos Produtos Químicos', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.14', 'Anotação de responsabilidade técnica – ARTs', 'PREPOSTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.15', 'Programa de Prevenção de Riscos Ambientais – PGR (arquivo eletrônico em formato nativo - editável)', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.16', 'Programa de Condições e Meio Ambiente de Trabalho na Indústria da Construção Civil – PCMAT (arquivo eletrônico em formato nativo - editável)', 'MA');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.17', 'Programa de Controle Médico de Saúde Ocupacional – PCMSO (arquivo eletrônico em formato nativo - editável)', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.18', 'Perfil Profissiográfico Previdenciário – PPP (arquivo eletrônico em formato nativo - editável)', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.19', 'Programa de Proteção Respiratória – PPR (arquivo eletrônico em formato nativo - editável)', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.20', 'Laudo Ergonômico – PROERGO (arquivo eletrônico em formato nativo - editável)', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.21', 'Programa de Conservação Auditiva – PCA (arquivo eletrônico em formato nativo - editável)', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.22', 'Relatório de Indicadores Pró Ativos e  Indicadores Reativos', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.23', 'Mapa de Risco e suas atualizações', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.24', 'Apresentação dos Quadros III, IV, V, VI da NR 4', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.25', 'Apresentação das Análise de Quase Acidente e Incidentes', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.26', 'Carta do SESMT e suas atualizações', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.27', 'Carta do Representante da CIPA ou o processo da CIPA (arquivo eletrônico em formato nativo - editável)', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.28', 'PAE – Plano de Atendimento a Emergência (arquivo eletrônico em formato nativo - editável)', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.29', 'Cronograma dos DSMS', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.30', 'Cronograma das Campanhas de SSMA', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.31', 'Book das APR’s - Análise Preliminar de Riscos (Digital ao final do Contrato)', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.32', 'Comunicação Prévia de Instalação, junto à DRT', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.33', 'Ordem de serviço (arquivo eletrônico em formato nativo - editável)', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.34', 'Fichas de EPIs atualizadas (arquivo eletrônico em formato nativo - editável)', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.2.35', 'Evidência de treinamentos dos requisitos legais, incluindo PPRA e outros aplicáveis', 'HSE');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.3', 'Seção III - Gerais e Segurança, Saúde e Meio Ambiente (impressos)', '');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.3.1', 'Itens da Construção', 'PLANEJAMENTO');
INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('2.3.2', 'Itens de Segurança, Saúde e Meio Ambiente', 'HSE');
