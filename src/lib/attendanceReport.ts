import type { Colaborador } from "@/data/efetivoData";
import type { AttendanceArea } from "@/hooks/useAttendanceAreaAssignments";

export const toTitleCase = (name: string) =>
  name
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

export const AREA_HEADERS: Record<AttendanceArea, string> = {
  gabiao: "✳️  ÁREA GABIÃO  ✳️",
  jardinagem: "🌿  ÁREA JARDINAGEM  🌿",
  adm: "🏢  ÁREA ADM  🏢",
  transporte: "🚚  ÁREA TRANSPORTE  🚚",
  custom: "🏷️  ÁREA PERSONALIZADA  🏷️",
};

export const SUPPORT_ROLES = [
  "TECNICO DE SEGURANÇA DO TRABALHO",
  "ENGENHEIRO DE SEGURANÇA DO TRABALHO",
  "ENCARREGADO GERAL",
  "ENCARREGADO DE FRENTE DE SERVIÇO",
];

export const EXECUTION_ORDER = [
  "OFICIAL POLIVALENTE",
  "POLIVALENTE",
  "MEIO OFICIAL",
  "MEIA OFICIAL",
  "AJUDANTE",
  "JARDINEIRO",
  "MOTORISTA DE CAMINHÃO PIPA",
  "MOTORISTA DE CAMINHÃO MUNCK",
  "SINALEIRO RIGGER",
  "SINALEIRO",
  "MECANICO",
  "MECÂNICO MONTADOR",
  "ELETRICISTA",
  "AJUDANTE DE ELETRICISTA",
  "AUXILIAR DE ELÉTRICA",
  "APONTADOR",
  "PLANEJADOR",
  "ENGENHEIRO FLORESTAL",
  "TECNICO DE MEIO AMBIENTE",
  "AUXILIAR DE ALMOXARIFE",
];

export const ROLE_LABELS: Record<string, string> = {
  "OFICIAL POLIVALENTE": "OFICIAL POLIVALENTE",
  POLIVALENTE: "POLIVALENTES",
  "MEIO OFICIAL": "MEIA OFICIAL",
  "MEIA OFICIAL": "MEIA OFICIAL",
  AJUDANTE: "AJUDANTE",
  JARDINEIRO: "JARDINEIRO",
  "MOTORISTA DE CAMINHÃO PIPA": "MOTORISTA DO PIPA",
  "MOTORISTA DE CAMINHÃO MUNCK": "MOTORISTA DO MUNCK",
  "SINALEIRO RIGGER": "SINALEIRO",
  SINALEIRO: "SINALEIRO",
  MECANICO: "MECÂNICO",
  "MECÂNICO MONTADOR": "MECÂNICO MONTADOR",
  ELETRICISTA: "ELETRICISTA",
  "AJUDANTE DE ELETRICISTA": "AJUDANTE DE ELÉTRICA",
  "AUXILIAR DE ELÉTRICA": "AUXILIAR DE ELÉTRICA",
  APONTADOR: "APONTADOR",
  PLANEJADOR: "PLANEJADOR",
  "ENGENHEIRO FLORESTAL": "ENGENHEIRO FLORESTAL",
  "TECNICO DE MEIO AMBIENTE": "TÉCNICO DE MEIO AMBIENTE",
  "AUXILIAR DE ALMOXARIFE": "AUXILIAR DE ALMOXARIFE",
};

/**
 * Constrói o texto formatado de uma área a partir dos colaboradores
 * atribuídos e da lista de ausentes. Apenas presentes (sem ❌) aparecem.
 *
 * @param options.includeStats Inclui linha de totais ao final
 * @param options.onlyExecution Só inclui equipe de execução (sem suporte)
 * @param options.skipPresentMark Não adiciona ✅ no final dos nomes
 */
export function buildAreaPresenceText(
  area: AttendanceArea,
  areaEmployees: Colaborador[],
  absentIds: Set<number>,
  options: {
    includeStats?: boolean;
    includeHeader?: boolean;
    onlyPresent?: boolean;
    skipPresentMark?: boolean;
    includeSupport?: boolean;
  } = {}
): string {
  const {
    includeStats = false,
    includeHeader = true,
    onlyPresent = false,
    skipPresentMark = false,
    includeSupport = true,
  } = options;

  const isPresent = (c: Colaborador) => !absentIds.has(c.id);
  const visible = onlyPresent ? areaEmployees.filter(isPresent) : areaEmployees;

  const lines: string[] = [];
  if (includeHeader) {
    lines.push(AREA_HEADERS[area]);
    lines.push("");
  }

  // Suporte
  const tst = includeSupport
    ? visible.find(
        (c) =>
          (c.funcao === "TECNICO DE SEGURANÇA DO TRABALHO" ||
            c.funcao === "ENGENHEIRO DE SEGURANÇA DO TRABALHO") &&
          isPresent(c)
      )
    : undefined;
  const encGeral = includeSupport
    ? visible.find(
        (c) =>
          (c.funcao || "").toUpperCase().startsWith("ENCARREGADO GERAL") &&
          isPresent(c)
      )
    : undefined;
  const enc = includeSupport
    ? visible.find((c) => {
        const f = (c.funcao || "").toUpperCase();
        return (
          f.startsWith("ENCARREGADO") &&
          !f.startsWith("ENCARREGADO GERAL") &&
          isPresent(c)
        );
      })
    : undefined;

  if (tst || encGeral || enc) {
    lines.push("✴️EQUIPE DE SUPORTE✴️");
    lines.push("");
    if (tst) {
      lines.push(`🙋 TST : ${toTitleCase(tst.nome)}`);
      lines.push("");
    }
    if (encGeral) {
      lines.push(`🙋 ENC GERAL: ${toTitleCase(encGeral.nome)}`);
      lines.push("");
    }
    if (enc) {
      lines.push(`🙋 ENC: ${toTitleCase(enc.nome)}`);
      lines.push("");
    }
  }

  // Execução
  const exec = visible.filter((c) => {
    const f = (c.funcao || "").toUpperCase();
    if (SUPPORT_ROLES.includes(f)) return false;
    if (f.startsWith("ENCARREGADO")) return false;
    return true;
  });
  if (exec.length > 0) {
    lines.push("✴️EQUIPE DE EXECUÇÃO✴️");
    lines.push("");
    const groups = new Map<string, Colaborador[]>();
    exec.forEach((c) => {
      const role = (c.funcao || "").toUpperCase();
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role)!.push(c);
    });
    const orderedRoles = [
      ...EXECUTION_ORDER.filter((r) => groups.has(r)),
      ...Array.from(groups.keys()).filter((r) => !EXECUTION_ORDER.includes(r)),
    ];
    orderedRoles.forEach((role) => {
      const items = groups.get(role)!;
      const label = ROLE_LABELS[role] || role;
      lines.push(`👷 ${label}:`);
      lines.push("");
      items.forEach((c) => {
        if (onlyPresent || skipPresentMark) {
          lines.push(toTitleCase(c.nome));
        } else {
          const mark = isPresent(c) ? "✅" : "❌";
          lines.push(`${toTitleCase(c.nome)} ${mark}`);
        }
        lines.push("");
      });
    });
  }

  if (includeStats) {
    const ausentes = areaEmployees.filter((c) => !isPresent(c));
    const presentes = areaEmployees.length - ausentes.length;
    lines.push("───────────────────────────");
    lines.push(
      `✅ Presentes: ${presentes}  |  ❌ Ausentes: ${ausentes.length}  |  👥 Total: ${areaEmployees.length}`
    );
  }

  return lines.join("\n").trim();
}
