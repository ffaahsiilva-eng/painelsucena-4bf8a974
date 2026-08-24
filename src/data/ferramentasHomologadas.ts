export interface FerramentaHomologada {
  id: number;
  nome: string;
  categoria: string;
  caracteristicas: string;
  riscos: string[];
  medidasPreventivas: string[];
  epis: string[];
  cas: string[];
  nivelRisco: "Controlado" | "Moderado" | "Alto";
  foto?: string;
}

export const ferramentasHomologadas: FerramentaHomologada[] = [
  {
    id: 1,
    nome: "Marreta 2kg",
    categoria: "Martelagem",
    foto: "/ferramentas/marreta-2kg.jpg",
    caracteristicas: "Cabeça forjada em aço de alta qualidade, cabo em fibra com reforço pultrudado e proteção em borracha contra batidas em falso. Batentes temperados por indução.",
    riscos: [
      "Golpear acidentalmente mãos, pés ou outras partes do corpo",
      "Rebatidas ou ricochete em superfícies duras",
      "Fragmentos podem se desprender e atingir olhos",
      "Escorregamento da ferramenta por cabo mal fixado ou luvas molhadas",
      "Quebra do cabo causando perda de equilíbrio"
    ],
    medidasPreventivas: [
      "Utilize sempre com dispositivo de segurança de proteção de mãos e dedos",
      "Não golpeie em falso com a marreta com cabo em fibra",
      "Não altere a forma original da marreta",
      "Realize o check-list de liberação antes de sua utilização",
      "Não exponha/armazene em ambientes ácidos, úmidos ou salinos",
      "Após o uso limpe para prolongar a vida útil"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Moderado"
  },
  {
    id: 2,
    nome: "Marreta 5kg",
    categoria: "Martelagem",
    foto: "/ferramentas/marreta-5kg.jpg",
    caracteristicas: "Cabeça forjada em aço de alta qualidade, cabo em fibra com reforço pultrudado no centro e proteção em borracha contra batidas em falso. Ferramenta desenvolvida para atividades extrapesadas. O cabo em fibra propicia alta resistência mecânica, térmica e à corrosão.",
    riscos: [
      "Golpear acidentalmente mãos, pés ou outras partes do corpo",
      "Rebatidas ou ricochete em superfícies duras",
      "Fragmentos podem se desprender e atingir olhos",
      "Escorregamento da ferramenta",
      "Quebra do cabo causando perda de equilíbrio"
    ],
    medidasPreventivas: [
      "Utilize sempre com dispositivo de segurança de proteção de mãos e dedos",
      "Não golpeie em falso com a marreta com cabo em fibra",
      "Não altere a forma original da marreta",
      "Realize o check-list de liberação antes de sua utilização",
      "Não exponha/armazene em ambientes ácidos, úmidos ou salinos",
      "Após o uso limpe para prolongar a vida útil"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Moderado"
  },
  {
    id: 3,
    nome: "Martelo de Borracha",
    categoria: "Martelagem",
    foto: "/ferramentas/martelo-borracha.jpg",
    caracteristicas: "Martelo desenvolvido para aplicação de pisos de cerâmica. Cabo feito em Fibra de Vidro com empunhadura de borracha termoplástica.",
    riscos: [
      "Golpear acidentalmente mãos, pés ou outras partes do corpo",
      "Rebatidas ou ricochete em superfícies duras",
      "Fragmentos podem atingir olhos",
      "Escorregamento da ferramenta",
      "Quebra do cabo"
    ],
    medidasPreventivas: [
      "Utilize sempre com dispositivo de segurança de proteção de mãos e dedos",
      "Não golpeie em falso",
      "Não altere a forma original",
      "Realize o check-list de liberação antes de sua utilização",
      "Não exponha/armazene em ambientes ácidos, úmidos ou salinos",
      "Após o uso limpe para prolongar a vida útil"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Controlado"
  },
  {
    id: 4,
    nome: "Martelo Unha",
    categoria: "Martelagem",
    foto: "/ferramentas/martelo-unha.jpg",
    caracteristicas: "Martelo com garra para extração de pregos. Cabo em fibra de vidro com empunhadura ergonômica.",
    riscos: [
      "Golpear acidentalmente mãos, pés ou outras partes do corpo",
      "Rebatidas ou ricochete em superfícies duras",
      "Fragmentos podem atingir olhos",
      "Escorregamento da ferramenta",
      "Quebra do cabo"
    ],
    medidasPreventivas: [
      "Utilize sempre com dispositivo de segurança de proteção de mãos e dedos",
      "Não golpeie em falso",
      "Não altere a forma original",
      "Realize o check-list de liberação antes de sua utilização",
      "Não exponha/armazene em ambientes ácidos, úmidos ou salinos",
      "Após o uso limpe para prolongar a vida útil"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Moderado"
  },
  {
    id: 5,
    nome: "Batedor de Bronze",
    categoria: "Martelagem",
    foto: "/ferramentas/batedor-bronze.jpg",
    caracteristicas: "Batedor de bronze utilizado em atividade de ajuste de rolamento de bombas e subconjuntos. O bronze sendo mais macio reduz o risco de danificar os rolamentos. Uso exclusivo da oficina central.",
    riscos: [
      "Golpear superfície incorretamente",
      "Projeção de fragmentos",
      "Lesões por impacto em mãos"
    ],
    medidasPreventivas: [
      "Não golpeie em falso com o batedor",
      "Não golpeie superfície com dureza superior a 46 HRC",
      "Não altere a forma original do batedor",
      "Não exponha/armazene em ambientes ácidos, úmidos ou salinos",
      "Preencha o check-list antes do início da atividade",
      "Após o uso limpe para prolongar a vida útil"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Controlado"
  },
  {
    id: 6,
    nome: "Talhadeira",
    categoria: "Corte",
    foto: "/ferramentas/talhadeira.jpg",
    caracteristicas: "Ferramenta manual para corte e remoção de materiais. Ponta afiada em aço temperado.",
    riscos: [
      "Golpear acidentalmente mãos, pés ou outras partes do corpo",
      "Rebatidas ou ricochete em superfícies duras",
      "Fragmentos podem atingir olhos",
      "Escorregamento da ferramenta",
      "Esmagamento ou cortes em mãos e dedos"
    ],
    medidasPreventivas: [
      "O uso de luva resistente a impacto é obrigatório",
      "Utilize sempre óculos de segurança",
      "Verifique se a talhadeira está em boas condições",
      "Certifique-se de que a ponta esteja afiada e adequada",
      "Segure com firmeza mas sem força excessiva"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Moderado"
  },
  {
    id: 7,
    nome: "Estilete para Geomembrana",
    categoria: "Corte",
    foto: "/ferramentas/estilete-geomembrana.jpg",
    caracteristicas: "Estilete para corte de geomembrana. Lâmina trapezoidal retraída para cortes precisos em plástico e outros materiais. Cabo em liga de alumínio, leve e resistente.",
    riscos: [
      "Lesão em mãos, dedos e outras partes do corpo",
      "Perfuração da pele por força excessiva",
      "Lâmina mal fixada pode causar desprendimento",
      "Perda de controle com luva molhada ou oleosa",
      "Cortar em direção ao corpo"
    ],
    medidasPreventivas: [
      "Preencha o check-list antes da utilização",
      "Verifique se a lâmina está bem fixada",
      "Substitua lâminas cegas para evitar força excessiva",
      "Corte sempre para fora do corpo",
      "Apoie o material em superfície firme e estável",
      "Obrigatório a utilização de luvas anticorte"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Luva anticorte",
      "Mangote fios de aço inox",
      "Capacete branco",
      "Protetor auditivo tipo concha"
    ],
    cas: ["CA 27118", "CA 19072", "CA 27971", "CA 39062", "CA 498"],
    nivelRisco: "Moderado"
  },
  {
    id: 8,
    nome: "Estilete Convencional",
    categoria: "Corte",
    foto: "/ferramentas/estilete-convencional.jpg",
    caracteristicas: "Lâmina trapezoidal retraída para cortes precisos. Cabo em liga de alumínio, leve e resistente. Sistema de trava de segurança.",
    riscos: [
      "Lesão em mãos, dedos e outras partes do corpo",
      "Perfuração da pele por força excessiva",
      "Lâmina mal fixada pode causar desprendimento",
      "Perda de controle com luva molhada ou oleosa",
      "Cortar em direção ao corpo"
    ],
    medidasPreventivas: [
      "Preencha o check-list antes da utilização",
      "Verifique se a lâmina está bem fixada",
      "Substitua lâminas cegas para evitar força excessiva",
      "Corte sempre para fora do corpo",
      "Apoie o material em superfície firme e estável",
      "Obrigatório a utilização de luvas anticorte"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Luva anticorte",
      "Mangote fios de aço inox",
      "Capacete branco",
      "Protetor auditivo tipo concha"
    ],
    cas: ["CA 27118", "CA 19072", "CA 27971", "CA 39062", "CA 498"],
    nivelRisco: "Moderado"
  },
  {
    id: 9,
    nome: "Estilete Circular de Segurança",
    categoria: "Corte",
    foto: "/ferramentas/estilete-circular.jpg",
    caracteristicas: "Lâmina circular interna evita acidentes e protege o operador. Bico abridor inteligente para abrir caixas sem danificar conteúdo. Corpo em ABS de alta resistência. Formato ergonômico.",
    riscos: [
      "Lesão em mãos, dedos e outras partes do corpo",
      "Perfuração por uso inadequado",
      "Perda de controle com luva molhada ou oleosa"
    ],
    medidasPreventivas: [
      "Preencha o check-list antes da utilização",
      "Verifique se a lâmina está bem fixada",
      "Substitua lâminas cegas para evitar força excessiva",
      "Corte sempre para fora do corpo",
      "Apoie o material em superfície firme e estável",
      "Obrigatório a utilização de luvas anticorte"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Luva anticorte",
      "Mangote fios de aço inox",
      "Capacete branco",
      "Protetor auditivo tipo concha"
    ],
    cas: ["CA 27118", "CA 19072", "CA 27971", "CA 39062", "CA 498"],
    nivelRisco: "Controlado"
  },
  {
    id: 10,
    nome: "Esmerilhadeira com AFT",
    categoria: "Elétrica",
    foto: "/ferramentas/esmerilhadeira-aft.jpg",
    caracteristicas: "Punho tipo D ideal para trabalhos pesados. Tecnologia AFT que previne contragolpe. Freio instantâneo. Função antireinício. Partida suave. Gatilho Homem Morto não permite travamento. Punho traseiro antivibração e giratório. Velocidade constante.",
    riscos: [
      "Projeção de partículas do disco ou material cortado",
      "Ruptura do disco por inadequação ou fissuras",
      "Choque elétrico por isolamento danificado",
      "Cortes e lacerações por contato com disco em movimento",
      "Perda de controle da ferramenta"
    ],
    medidasPreventivas: [
      "Preencha o check-list antes da utilização",
      "Utilize com proteção do disco instalada e em bom estado",
      "Verifique se o disco está adequado para o material e rotação",
      "Nunca use discos trincados ou danificados",
      "Utilize sempre com as duas mãos",
      "Nunca remova a proteção do disco",
      "Aguarde o disco parar antes de apoiar ou guardar",
      "Desconecte da tomada antes de trocar discos"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Vestimenta tipo blusão raspa",
      "Protetor facial",
      "Capacete branco",
      "Perneira raspa"
    ],
    cas: ["CA 19072", "CA 27971", "CA 13990", "CA 31752", "CA 498", "CA 36980"],
    nivelRisco: "Alto"
  },
  {
    id: 11,
    nome: "Esmerilhadeira Convencional",
    categoria: "Elétrica",
    foto: "/ferramentas/esmerilhadeira-convencional.jpg",
    caracteristicas: "Esmerilhadeira para trabalhos em indústrias. Proteção do disco e punho ergonômico.",
    riscos: [
      "Projeção de partículas do disco ou material cortado",
      "Ruptura do disco por inadequação ou fissuras",
      "Choque elétrico por isolamento danificado",
      "Cortes e lacerações por contato com disco em movimento",
      "Perda de controle da ferramenta"
    ],
    medidasPreventivas: [
      "Preencha o check-list antes da utilização",
      "Utilize com proteção do disco instalada e em bom estado",
      "Verifique se o disco está adequado para o material e rotação",
      "Nunca use discos trincados ou danificados",
      "Utilize sempre com as duas mãos",
      "Nunca remova a proteção do disco",
      "Aguarde o disco parar antes de apoiar ou guardar",
      "Desconecte da tomada antes de trocar discos"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Vestimenta tipo blusão raspa",
      "Protetor facial",
      "Capacete branco",
      "Perneira raspa"
    ],
    cas: ["CA 19072", "CA 27971", "CA 13990", "CA 31752", "CA 498", "CA 36980"],
    nivelRisco: "Alto"
  },
  {
    id: 12,
    nome: "Cortador de Vergalhão",
    categoria: "Corte",
    caracteristicas: "Ferramenta para corte de vergalhões e barras de aço. Lâminas em aço temperado de alta dureza.",
    riscos: [
      "Corte nas mãos por escorregamento",
      "Projeção de fragmentos ao cortar",
      "Lesões por esforço repetitivo",
      "Queda de pedaços cortados"
    ],
    medidasPreventivas: [
      "Preencha o check-list antes da utilização",
      "Verifique o estado das lâminas",
      "Use sempre os dois braços da ferramenta",
      "Posicione corretamente o material",
      "Use EPIs adequados"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Moderado"
  },
  {
    id: 13,
    nome: "Dispositivo de Extração de Anel de Vedação",
    categoria: "Dispositivo",
    foto: "/ferramentas/dispositivo-extracao-anel.jpg",
    caracteristicas: "Para a fabricação do dispositivo, foi utilizada a parte flexível do saca-gaxeta já existente no mercado, devido à sua alta flexibilidade. Além disso, foi adicionado um prolongamento em raio de aço, fixado por rosca, cuja função é engatar no furo do anel para possibilitar sua remoção.",
    riscos: [
      "Risco de prensamento de mãos e dedos"
    ],
    medidasPreventivas: [
      "Utilize luva de segurança adequada para atividade"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva tátil",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 31492", "CA 498"],
    nivelRisco: "Controlado"
  },
  {
    id: 14,
    nome: "Alça Pegador de Água",
    categoria: "Dispositivo",
    foto: "/ferramentas/alca-pegador-agua.jpg",
    caracteristicas: "Fabricada em Ferro Zincado, evita corrosão. Alça firme de ferro para segurança no transporte. Produto higiênico, não coloca a mão no gargalo. Alça de PVC para proteção da mão. Suporta galões de 10 e 20 litros.",
    riscos: [
      "Postura inadequada na utilização",
      "Queda do mesmo nível",
      "Galão pode escorregar das mãos causando impacto"
    ],
    medidasPreventivas: [
      "Utilize luva de segurança adequada",
      "Avalie o trajeto antes garantindo que esteja livre de obstáculos",
      "Mantenha a coluna ereta e dobre os joelhos para levantar",
      "Carregue somente 1 galão por vez"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva tátil",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 31492"],
    nivelRisco: "Controlado"
  },
  {
    id: 15,
    nome: "Pegador de Grampo",
    categoria: "Dispositivo",
    foto: "/ferramentas/pegador-grampo.jpg",
    caracteristicas: "Fabricado com ferro para fixação de geomembrana no DRS. Retira as mãos do raio de ação no momento da fixação do grampo.",
    riscos: [
      "Escorregar o grampo causando acidente",
      "Projeção do prego se golpeado incorretamente",
      "Comprometimento da precisão do golpe se muito pesado",
      "Fadiga ou lesões musculares por uso prolongado"
    ],
    medidasPreventivas: [
      "Verifique se a pinça possui boa aderência",
      "Posicione o grampo firmemente antes de martelar",
      "Mantenha a pinça alinhada com a superfície",
      "Nunca segure muito próxima à cabeça do grampo",
      "Substitua pinças danificadas ou deformadas",
      "Limpe regularmente para evitar acúmulo de resíduos"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Moderado"
  },
  {
    id: 16,
    nome: "Pinça Plástica/Metal para Pregos",
    categoria: "Dispositivo",
    foto: "/ferramentas/pinca-plastica-metal.jpg",
    caracteristicas: "Alicate de plástico rígido de alta qualidade. Suporte para pregos com design escalonado possui 11 furos de tamanhos diferentes. Pesa apenas 83 gramas.",
    riscos: [
      "Escorregar o alicate causando acidente",
      "Projeção do prego se golpeado incorretamente",
      "Comprometimento da precisão se muito pesado"
    ],
    medidasPreventivas: [
      "Verifique se o alicate possui boa aderência",
      "Posicione o prego firmemente antes de martelar",
      "Mantenha alinhado com a superfície",
      "Substitua se danificado ou deformado",
      "Limpe regularmente"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333"],
    nivelRisco: "Controlado"
  },
  {
    id: 17,
    nome: "Dispositivo de Ancoragem Transportável",
    categoria: "Dispositivo",
    foto: "/ferramentas/dispositivo-ancoragem.jpg",
    caracteristicas: "Dispositivo de ancoragem tipo B para atividades em taludes. Conector inox 304. Haste de 1,5m em aço CA50 zincado a fogo. Inclui kit batedor e kit extrator.",
    riscos: [
      "Não fixar o dispositivo corretamente",
      "Utilizar dispositivo danificado causando queda",
      "Queda de talude"
    ],
    medidasPreventivas: [
      "Realizar check-list do dispositivo antes do uso",
      "Seguir todas orientações do fabricante",
      "Somente pessoas treinadas podem utilizar",
      "A fixação depende de liberação por PLH",
      "Não exceder o limite estabelecido pelo fabricante",
      "Após utilização armazenar em local seguro",
      "Não utilizar dispositivo danificado"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco",
      "Cinturão de segurança"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498", "CA 39991"],
    nivelRisco: "Alto"
  },
  {
    id: 18,
    nome: "Marreta Smart Mini",
    categoria: "Martelagem",
    foto: "/ferramentas/marretas-smart.jpg",
    caracteristicas: "Ferramenta desenvolvida para atividades de impacto, eliminando o uso de marretas convencionais. Pistão de acionamento manual gera impacto frontal potente e preciso. Sistema antirreflexo evita retorno da força às mãos.",
    riscos: [
      "Não fixar o dispositivo corretamente",
      "Utilizar dispositivo danificado gerando acidentes"
    ],
    medidasPreventivas: [
      "Realizar check-list do dispositivo antes do uso",
      "Seguir todas orientações do fabricante",
      "Somente pessoas treinadas podem utilizar",
      "Após utilização armazenar em local seguro",
      "Não utilizar dispositivo danificado"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Controlado"
  },
  {
    id: 19,
    nome: "Marreta Smart Pequena",
    categoria: "Martelagem",
    foto: "/ferramentas/marretas-smart.jpg",
    caracteristicas: "Ferramenta desenvolvida para atividades de impacto, eliminando o uso de marretas convencionais. Pistão de acionamento manual gera impacto frontal potente e preciso. Sistema antirreflexo evita retorno da força às mãos. Possibilidade de adaptação de ponteiras como talhadeiras e saca-pinos.",
    riscos: [
      "Não fixar o dispositivo corretamente",
      "Utilizar dispositivo danificado gerando acidentes"
    ],
    medidasPreventivas: [
      "Realizar check-list do dispositivo antes do uso",
      "Seguir todas orientações do fabricante",
      "Somente pessoas treinadas podem utilizar",
      "Após utilização armazenar em local seguro",
      "Não utilizar dispositivo danificado"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Controlado"
  },
  {
    id: 20,
    nome: "Marreta Smart Média",
    categoria: "Martelagem",
    foto: "/ferramentas/marretas-smart.jpg",
    caracteristicas: "Ferramenta desenvolvida para atividades de impacto, eliminando o uso de marretas convencionais. Pistão de acionamento manual gera impacto frontal potente e preciso. Sistema antirreflexo evita retorno da força às mãos. Possibilidade de adaptação de ponteiras como talhadeiras, saca-pinos e chaves de boca.",
    riscos: [
      "Não fixar o dispositivo corretamente",
      "Utilizar dispositivo danificado gerando acidentes"
    ],
    medidasPreventivas: [
      "Realizar check-list do dispositivo antes do uso",
      "Seguir todas orientações do fabricante",
      "Somente pessoas treinadas podem utilizar",
      "Após utilização armazenar em local seguro",
      "Não utilizar dispositivo danificado"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Controlado"
  },
  {
    id: 21,
    nome: "Marreta Smart Grande",
    categoria: "Martelagem",
    foto: "/ferramentas/marretas-smart.jpg",
    caracteristicas: "Ferramenta desenvolvida para atividades de impacto extrapesadas. Pistão de acionamento manual gera impacto frontal potente e preciso. Sistema antirreflexo evita retorno da força às mãos. Possibilidade de adaptação de diversas ponteiras.",
    riscos: [
      "Não fixar o dispositivo corretamente",
      "Utilizar dispositivo danificado gerando acidentes"
    ],
    medidasPreventivas: [
      "Realizar check-list do dispositivo antes do uso",
      "Seguir todas orientações do fabricante",
      "Somente pessoas treinadas podem utilizar",
      "Após utilização armazenar em local seguro",
      "Não utilizar dispositivo danificado"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Protetor auditivo tipo concha",
      "Luva anti impacto",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Moderado"
  },
  {
    id: 22,
    nome: "Calço Ergonômico HD AGMOV",
    categoria: "Dispositivo",
    foto: "/ferramentas/calco-ergonomico.jpg",
    caracteristicas: "Desenvolvido para calçar veículos de carga com total ergonomia e segurança. Design permite que o operador posicione e ajuste o calço em pé, evitando riscos de posturas inadequadas e atropelamentos. Conta com caixa de bloqueio compatível com sistemas de EBTV.",
    riscos: [
      "Não fixar o dispositivo da maneira correta",
      "Utilizar dispositivo danificado comprometendo a eficiência",
      "Risco de atropelamento no momento do posicionamento do calço"
    ],
    medidasPreventivas: [
      "Realizar check-list do dispositivo antes do uso",
      "Seguir todas orientações do fabricante",
      "Somente pessoas treinadas podem utilizar",
      "Após utilização armazenar em local seguro",
      "Não utilizar dispositivo danificado",
      "Realizar a utilização com veículo totalmente desligado",
      "Não se posicionar próximo de veículos para posicionamento do calço"
    ],
    epis: [
      "Óculos de segurança ampla visão",
      "Luva anti impacto",
      "Protetor auditivo tipo concha",
      "Capacete branco"
    ],
    cas: ["CA 19072", "CA 27971", "CA 44333", "CA 498"],
    nivelRisco: "Moderado"
  }
];

export const categoriasFerramentas = [...new Set(ferramentasHomologadas.map(f => f.categoria))].sort();

export const niveisRisco = ["Controlado", "Moderado", "Alto"] as const;
