// Centralized cargo formatting utilities

export const CARGO_LABELS: Record<string, string> = {
  moderador: "Moderador",
  preposto: "Preposto",
  encarregado_geral: "Encarregado Geral",
  encarregado_i: "Encarregado I",
  encarregado_ii: "Encarregado II",
  tecnico_seguranca_i: "Técnico Segurança I",
  tecnico_seguranca_ii: "Técnico Segurança II",
  tecnico_meio_ambiente: "Técnico Meio Ambiente",
  aux_administrativo: "Aux. Administrativo",
  aux_almoxarifado: "Aux. Almoxarifado",
  planejador: "Planejador",
  engenheiro_civil: "Engenheiro Civil",
  engenheiro_planejamento: "Engenheiro de Planejamento",
  tecnico_planejamento: "Técnico de Planejamento",
  engenheiro_seguranca: "Engenheiro de Segurança",
  motorista_pipa: "Motorista de Pipa",
  motorista_munk: "Motorista Operador de Munk",
  visualizador: "Visualizador",
};

// Short labels for compact displays
export const CARGO_LABELS_SHORT: Record<string, string> = {
  moderador: "Moderador",
  preposto: "Preposto",
  encarregado_geral: "Enc. Geral",
  encarregado_i: "Enc. I",
  encarregado_ii: "Enc. II",
  tecnico_seguranca_i: "TST I",
  tecnico_seguranca_ii: "TST II",
  tecnico_meio_ambiente: "TMA",
  aux_administrativo: "Aux. Adm.",
  aux_almoxarifado: "Aux. Almox.",
  planejador: "Planejador",
  engenheiro_civil: "Eng. Civil",
  engenheiro_planejamento: "Eng. Planej.",
  tecnico_planejamento: "Téc. Planej.",
  engenheiro_seguranca: "Eng. Seg.",
  motorista_pipa: "Mot. Pipa",
  motorista_munk: "Mot. Munk",
  visualizador: "Visualiz.",
};

/**
 * Formats a cargo value to its human-readable label
 * @param cargo - The cargo value from database
 * @param short - Whether to use short labels (default: false)
 * @returns Formatted cargo label or the original value if not found
 */
export const formatCargoLabel = (cargo?: string | null, short = false): string => {
  if (!cargo) return "Membro";
  const labels = short ? CARGO_LABELS_SHORT : CARGO_LABELS;
  return labels[cargo] || cargo;
};
