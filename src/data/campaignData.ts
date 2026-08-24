export interface Campaign {
  name: string;
  color: string;
  colorName: string;
  description: string;
}

export interface MonthCampaign {
  month: number;
  monthName: string;
  campaigns: Campaign[];
}

export const campaignData: MonthCampaign[] = [
  {
    month: 1,
    monthName: "Janeiro",
    campaigns: [
      {
        name: "Janeiro Branco",
        color: "#FFFFFF",
        colorName: "Branco",
        description: "Conscientização sobre a saúde mental, estimulando o cuidado emocional e psicológico."
      },
      {
        name: "Janeiro Roxo",
        color: "#8B5CF6",
        colorName: "Roxo",
        description: "Prevenção e tratamento à hanseníase, doença infecciosa crônica e curável."
      }
    ]
  },
  {
    month: 2,
    monthName: "Fevereiro",
    campaigns: [
      {
        name: "Fevereiro Roxo",
        color: "#8B5CF6",
        colorName: "Roxo",
        description: "Conscientização sobre lúpus, fibromialgia e mal de Alzheimer."
      },
      {
        name: "Fevereiro Laranja",
        color: "#F97316",
        colorName: "Laranja",
        description: "Campanha de sensibilização sobre a leucemia."
      }
    ]
  },
  {
    month: 3,
    monthName: "Março",
    campaigns: [
      {
        name: "Março Azul",
        color: "#3B82F6",
        colorName: "Azul",
        description: "Prevenção ao câncer colorretal, um dos tipos mais comuns de câncer."
      }
    ]
  },
  {
    month: 4,
    monthName: "Abril",
    campaigns: [
      {
        name: "Abril Verde",
        color: "#22C55E",
        colorName: "Verde",
        description: "Conscientização sobre a importância da segurança no trabalho."
      },
      {
        name: "Abril Azul",
        color: "#3B82F6",
        colorName: "Azul",
        description: "Debate e conscientização sobre o Transtorno do Espectro Autista (TEA)."
      }
    ]
  },
  {
    month: 5,
    monthName: "Maio",
    campaigns: [
      {
        name: "Maio Amarelo",
        color: "#EAB308",
        colorName: "Amarelo",
        description: "Prevenção dos acidentes de trânsito e promoção da segurança viária."
      }
    ]
  },
  {
    month: 6,
    monthName: "Junho",
    campaigns: [
      {
        name: "Junho Vermelho",
        color: "#EF4444",
        colorName: "Vermelho",
        description: "Importância da doação de sangue e incentivo aos doadores."
      },
      {
        name: "Junho Laranja",
        color: "#F97316",
        colorName: "Laranja",
        description: "Conscientização sobre a anemia e a leucemia."
      }
    ]
  },
  {
    month: 7,
    monthName: "Julho",
    campaigns: [
      {
        name: "Julho Amarelo",
        color: "#EAB308",
        colorName: "Amarelo",
        description: "Conscientização sobre hepatites virais e câncer ósseo."
      },
      {
        name: "Julho Verde",
        color: "#22C55E",
        colorName: "Verde",
        description: "Sensibilização e combate ao câncer de cabeça e pescoço."
      }
    ]
  },
  {
    month: 8,
    monthName: "Agosto",
    campaigns: [
      {
        name: "Agosto Dourado",
        color: "#F59E0B",
        colorName: "Dourado",
        description: "Informação sobre aleitamento materno, especialmente na Semana Mundial da Amamentação."
      }
    ]
  },
  {
    month: 9,
    monthName: "Setembro",
    campaigns: [
      {
        name: "Setembro Amarelo",
        color: "#EAB308",
        colorName: "Amarelo",
        description: "Prevenção ao suicídio e promoção da saúde mental."
      },
      {
        name: "Setembro Verde",
        color: "#22C55E",
        colorName: "Verde",
        description: "Doação de órgãos e prevenção ao câncer de intestino."
      },
      {
        name: "Setembro Vermelho",
        color: "#EF4444",
        colorName: "Vermelho",
        description: "Prevenção de doenças cardiovasculares."
      }
    ]
  },
  {
    month: 10,
    monthName: "Outubro",
    campaigns: [
      {
        name: "Outubro Rosa",
        color: "#EC4899",
        colorName: "Rosa",
        description: "Conscientização sobre o câncer de mama, a campanha mais conhecida mundialmente."
      }
    ]
  },
  {
    month: 11,
    monthName: "Novembro",
    campaigns: [
      {
        name: "Novembro Azul",
        color: "#3B82F6",
        colorName: "Azul",
        description: "Combate ao câncer de próstata e conscientização sobre o diabetes."
      },
      {
        name: "Novembro Dourado",
        color: "#F59E0B",
        colorName: "Dourado",
        description: "Conscientização sobre o câncer infantojuvenil."
      }
    ]
  },
  {
    month: 12,
    monthName: "Dezembro",
    campaigns: [
      {
        name: "Dezembro Vermelho",
        color: "#EF4444",
        colorName: "Vermelho",
        description: "Prevenção contra a AIDS e conscientização sobre o HIV."
      },
      {
        name: "Dezembro Laranja",
        color: "#F97316",
        colorName: "Laranja",
        description: "Combate ao câncer de pele e proteção solar."
      }
    ]
  }
];

export const getCurrentMonthCampaigns = (): MonthCampaign | undefined => {
  const currentMonth = new Date().getMonth() + 1;
  return campaignData.find(m => m.month === currentMonth);
};

export const getCampaignColors = (month: number): string[] => {
  const monthData = campaignData.find(m => m.month === month);
  if (!monthData) return [];
  return monthData.campaigns.map(c => c.color);
};
