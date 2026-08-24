// Emoji-based icon library organized in categories. Extendable to SVG/PNG later.
export interface IconDef {
  kind: string;
  label: string;
  emoji: string;
  category: "irrigacao" | "geral" | "direcoes" | "numeracao";
  defaultLayer: "aspersores" | "tubulacao" | "rotas" | "anotacoes";
}

export const ICON_CATEGORIES: { id: IconDef["category"]; label: string }[] = [
  { id: "irrigacao", label: "Irrigação" },
  { id: "geral", label: "Geral" },
  { id: "direcoes", label: "Direções" },
  { id: "numeracao", label: "Numeração" },
];

export const ICON_LIBRARY: IconDef[] = [
  // Irrigação
  { kind: "aspersor_360", label: "Aspersor 360°", emoji: "💦", category: "irrigacao", defaultLayer: "aspersores" },
  { kind: "aspersor_180", label: "Aspersor 180°", emoji: "🌀", category: "irrigacao", defaultLayer: "aspersores" },
  { kind: "microaspersor", label: "Microaspersor", emoji: "🚿", category: "irrigacao", defaultLayer: "aspersores" },
  { kind: "difusor", label: "Difusor", emoji: "🌫️", category: "irrigacao", defaultLayer: "aspersores" },
  { kind: "aspersor_danificado", label: "Aspersor Danificado", emoji: "🔴", category: "irrigacao", defaultLayer: "aspersores" },
  { kind: "registro", label: "Registro", emoji: "🔩", category: "irrigacao", defaultLayer: "tubulacao" },
  { kind: "valvula", label: "Válvula", emoji: "🛑", category: "irrigacao", defaultLayer: "tubulacao" },
  { kind: "bomba", label: "Bomba", emoji: "⚙️", category: "irrigacao", defaultLayer: "tubulacao" },
  { kind: "caixa", label: "Caixa", emoji: "🪣", category: "irrigacao", defaultLayer: "tubulacao" },
  { kind: "tubulacao", label: "Tubulação", emoji: "🧵", category: "irrigacao", defaultLayer: "tubulacao" },
  { kind: "filtro", label: "Filtro", emoji: "🧪", category: "irrigacao", defaultLayer: "tubulacao" },

  // Geral
  { kind: "local", label: "Local", emoji: "📍", category: "geral", defaultLayer: "anotacoes" },
  { kind: "casa", label: "Casa", emoji: "🏠", category: "geral", defaultLayer: "anotacoes" },
  { kind: "empresa", label: "Empresa", emoji: "🏢", category: "geral", defaultLayer: "anotacoes" },
  { kind: "deposito", label: "Depósito", emoji: "🏭", category: "geral", defaultLayer: "anotacoes" },
  { kind: "poste", label: "Poste", emoji: "🪵", category: "geral", defaultLayer: "anotacoes" },
  { kind: "arvore", label: "Árvore", emoji: "🌳", category: "geral", defaultLayer: "anotacoes" },
  { kind: "obstaculo", label: "Obstáculo", emoji: "⚠️", category: "geral", defaultLayer: "anotacoes" },
  { kind: "portao", label: "Portão", emoji: "🚧", category: "geral", defaultLayer: "anotacoes" },
  { kind: "cerca", label: "Cerca", emoji: "🚧", category: "geral", defaultLayer: "anotacoes" },
  { kind: "entrada", label: "Entrada", emoji: "⬇️", category: "geral", defaultLayer: "anotacoes" },
  { kind: "saida", label: "Saída", emoji: "⬆️", category: "geral", defaultLayer: "anotacoes" },

  // Direções
  { kind: "seta", label: "Seta", emoji: "➡️", category: "direcoes", defaultLayer: "rotas" },
  { kind: "seta_dupla", label: "Seta dupla", emoji: "↔️", category: "direcoes", defaultLayer: "rotas" },
  { kind: "seta_curva", label: "Seta curva", emoji: "↪️", category: "direcoes", defaultLayer: "rotas" },
  { kind: "seta_circular", label: "Seta circular", emoji: "🔄", category: "direcoes", defaultLayer: "rotas" },
  { kind: "seta_grande", label: "Seta grande", emoji: "➤", category: "direcoes", defaultLayer: "rotas" },
  { kind: "seta_pequena", label: "Seta pequena", emoji: "›", category: "direcoes", defaultLayer: "rotas" },
];

export function getIcon(kind: string): IconDef | undefined {
  return ICON_LIBRARY.find((i) => i.kind === kind);
}
