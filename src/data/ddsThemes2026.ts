// Planejamento de DDS 2026 - Temas por semana/período
// Fonte: Gerência Geral de Saúde e Segurança

export interface DDSWeekTheme {
  semana: number;
  inicio: string; // formato YYYY-MM-DD
  fim: string;
  feriado?: string;
  semanaPromocao?: string;
  temas: string[];
}

export const ddsThemes2026: DDSWeekTheme[] = [
  {
    semana: 1,
    inicio: "2026-01-05",
    fim: "2026-01-11",
    temas: ["DDS Saúde Mental / Prevenção de Estresse (Janeiro Branco)"]
  },
  {
    semana: 2,
    inicio: "2026-01-12",
    fim: "2026-01-18",
    semanaPromocao: "Semana de Segurança de Mãos e Dedos",
    temas: [
      "DDS's do capítulo 'Segurança das Mãos e Dedos' (208 a 255)",
      "DDS Espaço Confinado, Acidente Fatal (227 a 229)"
    ]
  },
  {
    semana: 3,
    inicio: "2026-01-19",
    fim: "2026-01-25",
    semanaPromocao: "Semana de segurança com eletricidade",
    temas: [
      "DDS's do capítulo 'Perigos da Eletricidade (empregados em geral)'",
      "DDS's do capítulo 'Segurança em Eletricidade (para eletricistas)' (116 a 133)",
      "Gestão dos Resíduos Sólidos na Alunorte (285 e 292)"
    ]
  },
  {
    semana: 4,
    inicio: "2026-01-26",
    fim: "2026-02-01",
    semanaPromocao: "Semana de Promoção de Gestão de Resíduos",
    temas: [
      "Classificação do resíduos, por quê é importante? (287)",
      "Segregação de resíduos sólidos, parte 1 e parte 2 (288 a 290)",
      "Rotulagem dos Acondicionadores (291)",
      "Guia Educativo de Resíduos Sólidos (292)"
    ]
  },
  {
    semana: 7,
    inicio: "2026-02-09",
    fim: "2026-02-15",
    semanaPromocao: "Saúde e Segurança no período do Carnaval",
    temas: [
      "DDS Saúde e Segurança no Carnaval (76 a 78)",
      "DDS Orientações para locais com aglomeração (252)"
    ]
  },
  {
    semana: 8,
    inicio: "2026-02-16",
    fim: "2026-02-22",
    feriado: "16 a 18-fev (Carnaval)",
    semanaPromocao: "Segurança Pessoal (carnaval)",
    temas: [
      "Segurança pessoal (251 a 253)",
      "Atenção redobrada para evitar distrações na Folia (77)"
    ]
  },
  {
    semana: 9,
    inicio: "2026-02-23",
    fim: "2026-03-01",
    semanaPromocao: "Semana de Promoção de EBTV - Controle de Energia",
    temas: [
      "Capítulo 'EBTV - Controle de Energia' (104 a 115)",
      "DDS Trabalho seguro com luvas (41)"
    ]
  },
  {
    semana: 10,
    inicio: "2026-03-02",
    fim: "2026-03-08",
    temas: ["DDS Uso de EPIs e Orientações para Substituições (40)"]
  },
  {
    semana: 11,
    inicio: "2026-03-09",
    fim: "2026-03-15",
    semanaPromocao: "Semana de Promoção: Reporte de Quase Acidentes",
    temas: [
      "DDS's do capítulo 'Registro de Quase Acidente' (46 a 49)",
      "22-Mar - DDS Dia Mundial da Água (293)"
    ]
  },
  {
    semana: 12,
    inicio: "2026-03-16",
    fim: "2026-03-22",
    semanaPromocao: "Semana de Conscientização sobre Gestão Hídrica",
    temas: ["Recursos Hídricos (293 a 296)"]
  },
  {
    semana: 13,
    inicio: "2026-03-23",
    fim: "2026-03-29",
    temas: [
      "DDS Limpeza e Organização do Ambiente de Trabalho (42)",
      "DDS Segurança no uso de Maçarico (somente para maçariqueiros) (236)",
      "DDS Operações de içamento de cargas (Geral) (180)"
    ]
  },
  {
    semana: 14,
    inicio: "2026-03-30",
    fim: "2026-04-05",
    feriado: "Sexta-feira Santa",
    temas: [
      "DDS Segurança na Manutenção de Bombas (somente áreas aplicáveis) (153)",
      "Conhecendo os nossos Depósitos de Resíduos Sólidos (297 a 299)"
    ]
  },
  {
    semana: 15,
    inicio: "2026-04-06",
    fim: "2026-04-12",
    semanaPromocao: "Semana de Saúde",
    temas: ["6-abr DDS Dia Mundial da Atividade Física (264)"]
  },
  {
    semana: 16,
    inicio: "2026-04-13",
    fim: "2026-04-19",
    semanaPromocao: "Semana de Promoção do Cuidado Ativo Genuíno",
    temas: [
      "Cuidado Ativo Genuíno (50 a 53)",
      "DDS Sinal Verde (85)"
    ]
  },
  {
    semana: 17,
    inicio: "2026-04-20",
    fim: "2026-04-26",
    feriado: "21-abr - Tiradentes",
    temas: [
      "LAIA e Controles Ambientais (301 a 302)",
      "DDS Registros Preventivos de Meio Ambiente (303)"
    ]
  },
  {
    semana: 18,
    inicio: "2026-04-27",
    fim: "2026-05-03",
    feriado: "1-mai - Dia do Trabalhador",
    temas: [
      "DDS Proibição de uso de adornos (31)",
      "Proteção Auditiva (274)"
    ]
  },
  {
    semana: 19,
    inicio: "2026-05-04",
    fim: "2026-05-10",
    semanaPromocao: "Maio Amarelo - Segurança no trânsito (Semana 1)",
    temas: [
      "DDS's do capítulo 'Segurança no trânsito (geral)' (156 a 164)",
      "DDS's do capítulo 'Segurança no trânsito (externo)' (165 a 167)"
    ]
  },
  {
    semana: 20,
    inicio: "2026-05-11",
    fim: "2026-05-17",
    semanaPromocao: "Maio Amarelo - Segurança no trânsito (Semana 2)",
    temas: [
      "DDS Segurança na operação de Equipamentos Móveis (168 a 175)",
      "17-mai DDS Dia Internacional de Combate a Hipertensão Arterial (265)",
      "DDS Programa de Segurança para Novatos (32)"
    ]
  },
  {
    semana: 21,
    inicio: "2026-05-18",
    fim: "2026-05-24",
    temas: ["DDS Intervenção em Proteções de Máquinas e Equipamentos (152)"]
  },
  {
    semana: 22,
    inicio: "2026-05-25",
    fim: "2026-05-31",
    semanaPromocao: "Semana de Promoção de Análise de Risco",
    temas: ["DDS's do capítulo 'Análise de Risco' (99 a 103)"]
  },
  {
    semana: 23,
    inicio: "2026-06-01",
    fim: "2026-06-07",
    feriado: "04-jun - Corpus Christi",
    temas: [
      "DDS Preservação do cenário de um acidente (33)",
      "Trabalhos a quente (230 a 236)"
    ]
  },
  {
    semana: 24,
    inicio: "2026-06-08",
    fim: "2026-06-14",
    semanaPromocao: "Semana do Meio Ambiente",
    temas: ["Material a ser divulgado pela Comunicação"]
  },
  {
    semana: 25,
    inicio: "2026-06-15",
    fim: "2026-06-21",
    semanaPromocao: "Semana de Prevenção de Queimaduras Químicas",
    temas: [
      "DDS's do capítulo 'Prevenção de Queimaduras Químicas - Parte 1' (191 a 207)",
      "DDS Cor Proibida (45)"
    ]
  },
  {
    semana: 26,
    inicio: "2026-06-22",
    fim: "2026-06-28",
    temas: ["DDS Saída/Retorno de Feriados, Férias e Folgas (80)"]
  },
  {
    semana: 27,
    inicio: "2026-06-29",
    fim: "2026-07-05",
    semanaPromocao: "Semana de Prevenção de quedas de mesmo nível",
    temas: ["DDS's do capítulo 'Prevenção de quedas de mesmo nível, abaixo de 2,0 metros, escorregões e tropeços' (140 a 145)"]
  },
  {
    semana: 28,
    inicio: "2026-07-06",
    fim: "2026-07-12",
    temas: [
      "DDS Uso de calçado de segurança com tamanho adequado (34)",
      "DDS Segurança pessoal em via pública (253)"
    ]
  },
  {
    semana: 29,
    inicio: "2026-07-13",
    fim: "2026-07-19",
    semanaPromocao: "Semana de Prevenção contra quedas de materiais",
    temas: [
      "DDS's do capítulo 'Prevenção contra quedas de materiais' (147 a 150)",
      "DDS Monitoramento Ambiental no Programa Meio biótico (304 a 307)"
    ]
  },
  {
    semana: 30,
    inicio: "2026-07-20",
    fim: "2026-07-26",
    temas: ["DDS Preenchimento correto de Checklists (36)"]
  },
  {
    semana: 31,
    inicio: "2026-07-27",
    fim: "2026-08-02",
    semanaPromocao: "Semana de Segurança de Mãos e Dedos",
    temas: [
      "Segurança das Mãos e Dedos (208 a 225)",
      "8-ago DDS Dia Nacional de Combate ao Colesterol (266)"
    ]
  },
  {
    semana: 32,
    inicio: "2026-08-03",
    fim: "2026-08-09",
    temas: [
      "Alunorte Baixo Carbono: redução dos gases de efeito estufa (GEE) (309 a 312)",
      "DDS's do capítulo 'Operações de Içamento de cargas (para operadores de equipamentos de içamento)' (181 a 190)"
    ]
  },
  {
    semana: 33,
    inicio: "2026-08-10",
    fim: "2026-08-16",
    feriado: "Adesão do Pará à Independência",
    semanaPromocao: "Semana de Promoção de Higiene Ocupacional",
    temas: [
      "DDS's do capítulo 'Higiene Ocupacional' (273 a 281)",
      "DDS Caminho seguro (35)"
    ]
  },
  {
    semana: 34,
    inicio: "2026-08-17",
    fim: "2026-08-23",
    temas: [
      "DDS Gestão Atmosférica – Emissões de Fontes Difusas (312)",
      "DDS Tamu Junto (86)"
    ]
  },
  {
    semana: 35,
    inicio: "2026-08-24",
    fim: "2026-08-30",
    temas: [
      "DDS's do capítulo 'Prevenção de Queimaduras Químicas' – (Fazer DDS Prático com Diphoterine) (191 a 207)",
      "1-set DDS Setembro Amarelo: Prevenção do Suicídio (267)",
      "5-set – Dia da Amazônia (314)"
    ]
  },
  {
    semana: 36,
    inicio: "2026-08-31",
    fim: "2026-09-06",
    semanaPromocao: "Semana de Percepção de Riscos",
    temas: [
      "DDS Percepção de Riscos (88 a 98)",
      "DDS Comunicação Imediata de Acidentes mesmo com lesões 'leves' (39)",
      "DDS Proteção de Máquinas, Acidente Fatal (154 a 155)"
    ]
  },
  {
    semana: 37,
    inicio: "2026-09-07",
    fim: "2026-09-13",
    feriado: "Independência do Brasil",
    semanaPromocao: "Segurança Empresarial",
    temas: ["DDS's do capítulo 'Segurança Empresarial' (237 a 241)"]
  },
  {
    semana: 38,
    inicio: "2026-09-14",
    fim: "2026-09-20",
    semanaPromocao: "SIPAT - Semana Interna de Prevenção de Acidentes do Trabalho",
    temas: ["Material a ser divulgado pela Comunicação"]
  },
  {
    semana: 39,
    inicio: "2026-09-21",
    fim: "2026-09-27",
    temas: [
      "23-set DDS Dia Mundial do Combate ao Estresse (268)",
      "DDS Dia da Amazônia e Dia da Árvore (313 e 315)",
      "21-set – Dia da árvore (315)"
    ]
  },
  {
    semana: 40,
    inicio: "2026-09-28",
    fim: "2026-10-04",
    temas: [
      "1-out DDS Outubro Rosa (270)",
      "29-set DDS Dia Mundial do Coração (269)",
      "DDS Segurança no trânsito para pedestres (163)"
    ]
  },
  {
    semana: 41,
    inicio: "2026-10-05",
    fim: "2026-10-11",
    semanaPromocao: "Semana de Promoção: Emergências",
    temas: ["DDS's do capítulo 'Emergências' (242 a 250)"]
  },
  {
    semana: 42,
    inicio: "2026-10-12",
    fim: "2026-10-18",
    feriado: "12-out - Senhora Aparecida",
    temas: [
      "DDS Segurança com motocicletas (177 a 178)",
      "DDS Gerenciamento Ambiental de Produtos Químicos (319 a 323)"
    ]
  },
  {
    semana: 43,
    inicio: "2026-10-19",
    fim: "2026-10-25",
    semanaPromocao: "Semana de Prevenção de Quedas (acima de 2,0 metros)",
    temas: ["DDS's do capítulo 'Prevenção de Quedas (acima de 2,0 metros)' (134 a 142)"]
  },
  {
    semana: 44,
    inicio: "2026-10-26",
    fim: "2026-11-01",
    temas: ["1-nov DDS Novembro Azul (271)"]
  },
  {
    semana: 45,
    inicio: "2026-11-02",
    fim: "2026-11-08",
    feriado: "02-nov - Finados",
    temas: [
      "DDS Violações de Segurança (30)",
      "DDS Intervenção em Proteções de Máquinas e Equipamentos (152)"
    ]
  },
  {
    semana: 46,
    inicio: "2026-11-09",
    fim: "2026-11-15",
    feriado: "15-nov - Proclamação da República",
    semanaPromocao: "Semana de Aplicações práticas da MDHO",
    temas: ["DDS's do capítulo 'Aplicações práticas da MDHO - Melhoria no Desempenho Humano e Organizacional' (61 a 74)"]
  },
  {
    semana: 47,
    inicio: "2026-11-16",
    fim: "2026-11-22",
    feriado: "20-nov - Consciência Negra",
    semanaPromocao: "Semana de promoção 'Programa Avante'",
    temas: ["Programa Avante (257 a 262)"]
  },
  {
    semana: 48,
    inicio: "2026-11-23",
    fim: "2026-11-29",
    temas: [
      "Pare e Busque Ajuda (65)",
      "Comunicação de 3 vias (66)"
    ]
  },
  {
    semana: 49,
    inicio: "2026-11-30",
    fim: "2026-12-06",
    feriado: "Feriado Municipal",
    temas: [
      "1-dez DDS Dezembro Vermelho (Mês de Luta Contra a AIDS) (272)",
      "DDS Segurança nas férias (79)",
      "Biota Aquática, Solos e Água Subterrânea (324)"
    ]
  },
  {
    semana: 50,
    inicio: "2026-12-07",
    fim: "2026-12-13",
    semanaPromocao: "Semana 'A Vida em Primeiro Lugar': Temas críticos de Segurança + Regras de Ouro",
    temas: ["DDS's do capítulo 'A vida em primeiro lugar: Temas críticos de segurança & Regras de Ouro' (54 a 60)"]
  },
  {
    semana: 51,
    inicio: "2026-12-14",
    fim: "2026-12-20",
    temas: [
      "DDS Vai pegar a estrada nos feriados? (82)",
      "DDS Confraternizações de fim de ano com saúde (83)"
    ]
  },
  {
    semana: 52,
    inicio: "2026-12-21",
    fim: "2026-12-27",
    feriado: "24 e 25-dez - Natal",
    temas: [
      "DDS Segurança na reta final do ano (81)",
      "Novas Visões de Segurança (28)"
    ]
  },
  {
    semana: 53,
    inicio: "2026-12-28",
    fim: "2027-01-03",
    feriado: "31-dez e 01-jan",
    temas: ["DDS Perigos de Acidentes em Áreas Isoladas (38)"]
  }
];

// Função para obter os temas de uma data específica
export function getThemesForDate(date: Date): DDSWeekTheme | undefined {
  const dateStr = date.toISOString().split('T')[0];
  return ddsThemes2026.find(week => {
    return dateStr >= week.inicio && dateStr <= week.fim;
  });
}

// Função para obter todos os temas de um mês
export function getThemesForMonth(year: number, month: number): DDSWeekTheme[] {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  return ddsThemes2026.filter(week => {
    return week.inicio.startsWith(monthStr) || week.fim.startsWith(monthStr);
  });
}
