import { bermaLabel } from "@/lib/bermaLabel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EMOJI_PIN } from "@/lib/whatsappEmojis";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getBrazilNorthTodayString } from "@/lib/timezone";

export interface JardinagemReport {
  id: string;
  created_by: string;
  report_date: string;
  local_faixa: string;
  rocagem_m2: number | null;
  rocagem_berma: string | null;
  rocagem_faixa: string | null;
  podagem_unidade: number | null;
  podagem_berma: string | null;
  podagem_faixa: string | null;
  cova_unidade: number | null;
  cova_berma: string | null;
  cova_faixa: string | null;
  coroamento_unidade: number | null;
  coroamento_berma: string | null;
  coroamento_faixa: string | null;
  adubagem_unidade: number | null;
  adubagem_berma: string | null;
  adubagem_faixa: string | null;
  plantio_unidade: number | null;
  plantio_berma: string | null;
  plantio_faixa: string | null;
  plantio_especie: string | null;
  limpeza_manual_m2: number | null;
  limpeza_manual_berma: string | null;
  limpeza_manual_faixa: string | null;
  limpeza_assoprador_m2: number | null;
  limpeza_assoprador_berma: string | null;
  limpeza_assoprador_faixa: string | null;
  manutencao_canteiro: string | null;
  controle_invasoras_unidade: number | null;
  controle_invasoras_nome: string | null;
  controle_invasoras_berma: string | null;
  controle_invasoras_faixa: string | null;
  retirada_mudas_unidade: number | null;
  retirada_mudas_berma: string | null;
  retirada_mudas_faixa: string | null;
  manutencao_canteiro_berma: string | null;
  manutencao_canteiro_faixa: string | null;
  irrigacao_pipas: boolean | null;
  irrigacao_carretel: boolean | null;
  irrigacao_carretel_bermas: number[] | null;
  plantio_grama_m2: number | null;
  plantio_grama_faixa: string | null;
  plantio_grama_berma: string | null;
  atividades_manuais: string | null;
  atividades_manuais_berma: string | null;
  atividades_manuais_faixa: string | null;
  photo_urls: string[] | null;
  extra_entries: Record<string, { value: string; faixa: string; berma: string }[]> | null;
  created_at: string;
  updated_at: string;
}

export interface JardinagemReportInsert {
  report_date?: string;
  local_faixa: string;
  rocagem_m2?: number | null;
  rocagem_berma?: string | null;
  rocagem_faixa?: string | null;
  podagem_unidade?: number | null;
  podagem_berma?: string | null;
  podagem_faixa?: string | null;
  cova_unidade?: number | null;
  cova_berma?: string | null;
  cova_faixa?: string | null;
  coroamento_unidade?: number | null;
  coroamento_berma?: string | null;
  coroamento_faixa?: string | null;
  adubagem_unidade?: number | null;
  adubagem_berma?: string | null;
  adubagem_faixa?: string | null;
  plantio_unidade?: number | null;
  plantio_berma?: string | null;
  plantio_faixa?: string | null;
  plantio_especie?: string | null;
  limpeza_manual_m2?: number | null;
  limpeza_manual_berma?: string | null;
  limpeza_manual_faixa?: string | null;
  limpeza_assoprador_m2?: number | null;
  limpeza_assoprador_berma?: string | null;
  limpeza_assoprador_faixa?: string | null;
  manutencao_canteiro?: string | null;
  controle_invasoras_unidade?: number | null;
  controle_invasoras_nome?: string | null;
  controle_invasoras_berma?: string | null;
  controle_invasoras_faixa?: string | null;
  retirada_mudas_unidade?: number | null;
  retirada_mudas_berma?: string | null;
  retirada_mudas_faixa?: string | null;
  manutencao_canteiro_berma?: string | null;
  manutencao_canteiro_faixa?: string | null;
  irrigacao_pipas?: boolean | null;
  irrigacao_carretel?: boolean | null;
  irrigacao_carretel_bermas?: number[] | null;
  plantio_grama_m2?: number | null;
  plantio_grama_faixa?: string | null;
  plantio_grama_berma?: string | null;
  atividades_manuais?: string | null;
  atividades_manuais_faixa?: string | null;
  atividades_manuais_berma?: string | null;
  photo_urls?: string[] | null;
  extra_entries?: Record<string, { value: string; faixa: string; berma: string }[]> | null;
}

export const useJardinagemReports = (filterDate?: string) => {
  return useQuery({
    queryKey: ["jardinagem-reports", filterDate],
    queryFn: async () => {
      let query = supabase
        .from("daily_jardinagem_reports")
        .select("id, report_date, local_faixa, created_at")
        .order("report_date", { ascending: false });

      if (filterDate) {
        query = query.eq("report_date", filterDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as JardinagemReport[];
    },
  });
};

export const useTodayJardinagemReport = () => {
  const todayStr = getBrazilNorthTodayString();
  return useQuery({
    queryKey: ["jardinagem-report-today", todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_jardinagem_reports")
        .select("*")
        .eq("report_date", todayStr)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as JardinagemReport | null;
    },
  });
};

export const useJardinagemReportByDate = (date: string) => {
  return useQuery({
    queryKey: ["jardinagem-report", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_jardinagem_reports")
        .select("*")
        .eq("report_date", date)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as JardinagemReport | null;
    },
    enabled: !!date,
  });
};

export const useSaveJardinagemReport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: JardinagemReportInsert) => {
      if (!user?.id) throw new Error("User not authenticated");

      const reportDate = report.report_date || getBrazilNorthTodayString();

      // Separate extra_entries since it may not be in the auto-generated types yet
      const { extra_entries, ...restReport } = report;
      const payload = {
        ...restReport,
        report_date: reportDate,
        ...(extra_entries !== undefined ? { extra_entries: extra_entries as any } : {}),
      };

      // Check if report for this date already exists
      const { data: existing } = await supabase
        .from("daily_jardinagem_reports")
        .select("id")
        .eq("report_date", reportDate)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("daily_jardinagem_reports")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("daily_jardinagem_reports")
          .insert({
            ...payload,
            created_by: user.id,
          } as any)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jardinagem-reports"] });
      queryClient.invalidateQueries({ queryKey: ["jardinagem-report"] });
      queryClient.invalidateQueries({ queryKey: ["jardinagem-report-today"] });
    },
  });
};

export const useDeleteJardinagemReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("daily_jardinagem_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jardinagem-reports"] });
      queryClient.invalidateQueries({ queryKey: ["jardinagem-report"] });
      queryClient.invalidateQueries({ queryKey: ["jardinagem-report-today"] });
    },
  });
};

// Helper function to format jardinagem report for RDO
// Helper to append extra entries for a given activity key
const appendExtraLines = (
  lines: string[],
  extras: Record<string, { value: string; faixa: string; berma: string; especie?: string }[]> | null | undefined,
  key: string,
  label: string,
  unit: string,
) => {
  if (!extras || !extras[key]) return;
  extras[key].forEach((entry) => {
    const v = parseFloat(entry.value);
    if (!v || v <= 0) return;
    const especieText = entry.especie ? ` (${entry.especie})` : "";
    const bermaText = entry.berma ? ` (${bermaLabel(entry.berma)})` : "";
    const faixaText = entry.faixa ? ` - ${entry.faixa}` : "";
    lines.push(`* ${label}${especieText} - ${entry.value} ${unit}${bermaText}${faixaText}`);
  });
};

export const formatJardinagemForRDO = (report: JardinagemReport | null): string => {
  if (!report) return "";

  const lines: string[] = [];
  const extras = report.extra_entries;
  
  
  
  const formatBerma = (berma: string | number | null | undefined): string => {
    return berma ? ` (${bermaLabel(berma)})` : "";
  };
  
  if (report.rocagem_m2 && report.rocagem_m2 > 0) {
    const faixaText = report.rocagem_faixa ? ` - ${report.rocagem_faixa}` : "";
    lines.push(`* Roçagem - ${report.rocagem_m2} m²${formatBerma(report.rocagem_berma)}${faixaText}`);
  }
  appendExtraLines(lines, extras, "rocagem", "Roçagem", "m²");
  appendExtraLines(lines, extras, "rocagemUnidade", "Roçagem Aspersores", "unidade(s)");


  if (report.podagem_unidade && report.podagem_unidade > 0) {
    const faixaText = report.podagem_faixa ? ` - ${report.podagem_faixa}` : "";
    lines.push(`* Podagem - ${report.podagem_unidade} unidade(s)${formatBerma(report.podagem_berma)}${faixaText}`);
  }
  appendExtraLines(lines, extras, "podagem", "Podagem", "unidade(s)");

  if (report.cova_unidade && report.cova_unidade > 0) {
    const faixaText = report.cova_faixa ? ` - ${report.cova_faixa}` : "";
    lines.push(`* Cova - ${report.cova_unidade} unidade(s)${formatBerma(report.cova_berma)}${faixaText}`);
  }
  appendExtraLines(lines, extras, "cova", "Cova", "unidade(s)");


  if (report.coroamento_unidade && report.coroamento_unidade > 0) {
    const faixaText = report.coroamento_faixa ? ` - ${report.coroamento_faixa}` : "";
    lines.push(`* Coroamento - ${report.coroamento_unidade} unidade(s)${formatBerma(report.coroamento_berma)}${faixaText}`);
  }
  appendExtraLines(lines, extras, "coroamento", "Coroamento", "unidade(s)");

  if (report.adubagem_unidade && report.adubagem_unidade > 0) {
    const faixaText = report.adubagem_faixa ? ` - ${report.adubagem_faixa}` : "";
    lines.push(`* Adubagem - ${report.adubagem_unidade} unidade(s)${formatBerma(report.adubagem_berma)}${faixaText}`);
  }
  appendExtraLines(lines, extras, "adubagem", "Adubagem", "unidade(s)");

  if (report.plantio_unidade && report.plantio_unidade > 0) {
    const faixaText = report.plantio_faixa ? ` - ${report.plantio_faixa}` : "";
    const especieText = report.plantio_especie ? ` (${report.plantio_especie})` : "";
    lines.push(`* Plantio${especieText} - ${report.plantio_unidade} unidade(s)${formatBerma(report.plantio_berma)}${faixaText}`);
  }
  appendExtraLines(lines, extras, "plantio", "Plantio", "unidade(s)");

  if (report.limpeza_manual_m2 && report.limpeza_manual_m2 > 0) {
    const faixaText = report.limpeza_manual_faixa ? ` - ${report.limpeza_manual_faixa}` : "";
    lines.push(`* Limpeza Manual - ${report.limpeza_manual_m2} m²${formatBerma(report.limpeza_manual_berma)}${faixaText}`);
  }
  appendExtraLines(lines, extras, "limpezaManual", "Limpeza Manual", "m²");

  if (report.limpeza_assoprador_m2 && report.limpeza_assoprador_m2 > 0) {
    const faixaText = report.limpeza_assoprador_faixa ? ` - ${report.limpeza_assoprador_faixa}` : "";
    lines.push(`* Limpeza com Soprador - ${report.limpeza_assoprador_m2} m²${formatBerma(report.limpeza_assoprador_berma)}${faixaText}`);
  }
  appendExtraLines(lines, extras, "limpezaAssoprador", "Limpeza com Soprador", "m²");
  
  // Handle invasoras
  if (report.controle_invasoras_nome && report.controle_invasoras_nome.startsWith("[")) {
    try {
      const invasoras = JSON.parse(report.controle_invasoras_nome) as { nome: string; unidade: string }[];
      invasoras.forEach(inv => {
        if (inv.unidade && parseInt(inv.unidade) > 0) {
          const nomeInvasora = inv.nome ? ` (${inv.nome})` : "";
          lines.push(`* Controle de Invasoras${nomeInvasora} - ${inv.unidade} unidade(s)${formatBerma(report.controle_invasoras_berma)}`);
        }
      });
    } catch {
      if (report.controle_invasoras_unidade && report.controle_invasoras_unidade > 0) {
        const nomeInvasora = report.controle_invasoras_nome ? ` (${report.controle_invasoras_nome})` : "";
        lines.push(`* Controle de Invasoras${nomeInvasora} - ${report.controle_invasoras_unidade} unidade(s)${formatBerma(report.controle_invasoras_berma)}`);
      }
    }
  } else if (report.controle_invasoras_unidade && report.controle_invasoras_unidade > 0) {
    const nomeInvasora = report.controle_invasoras_nome ? ` (${report.controle_invasoras_nome})` : "";
    const faixaText = report.controle_invasoras_faixa ? ` - ${report.controle_invasoras_faixa}` : "";
    lines.push(`* Controle de Invasoras${nomeInvasora} - ${report.controle_invasoras_unidade} unidade(s)${formatBerma(report.controle_invasoras_berma)}${faixaText}`);
  }
  
  if (report.retirada_mudas_unidade && report.retirada_mudas_unidade > 0) {
    const faixaText = report.retirada_mudas_faixa ? ` - ${report.retirada_mudas_faixa}` : "";
    lines.push(`* Retirada de Mudas (Árvores) - ${report.retirada_mudas_unidade} unidade(s)${formatBerma(report.retirada_mudas_berma)}${faixaText}`);
  }
  
  if (report.plantio_grama_m2 && report.plantio_grama_m2 > 0) {
    const faixaText = report.plantio_grama_faixa ? ` - ${report.plantio_grama_faixa}` : "";
    const bermaText = report.plantio_grama_berma ? ` (${bermaLabel(report.plantio_grama_berma)})` : "";
    lines.push(`* Plantio de Grama - ${report.plantio_grama_m2} m²${bermaText}${faixaText}`);
  }
  appendExtraLines(lines, extras, "plantioGrama", "Plantio de Grama", "m²");
  
  if (report.atividades_manuais) {
    const faixaText = report.atividades_manuais_faixa ? ` - ${report.atividades_manuais_faixa}` : "";
    const location = `${formatBerma(report.atividades_manuais_berma)}${faixaText}`;
    report.atividades_manuais.split("\n").forEach((l) => {
      const t = l.trim();
      if (t) lines.push(`* ${t}${location}`);
    });
  }
  
  if (report.manutencao_canteiro) {
    const faixaText = report.manutencao_canteiro_faixa ? ` - ${report.manutencao_canteiro_faixa}` : "";
    const location = `${formatBerma(report.manutencao_canteiro_berma)}${faixaText}`;
    lines.push(`* Manutenção de Canteiro: ${report.manutencao_canteiro}${location}`);
  }
  
  if (report.irrigacao_pipas) {
    lines.push(`* Irrigação com Pipas nas Faixas 3 e 4 e Mirante`);
  }
  if (report.irrigacao_carretel && report.irrigacao_carretel_bermas && report.irrigacao_carretel_bermas.length > 0) {
    const bermasText = report.irrigacao_carretel_bermas.sort((a, b) => a - b).join(", ");
    lines.push(`* Irrigação com Carretel (Bermas: ${bermasText})`);
  } else if (report.irrigacao_carretel) {
    lines.push(`* Irrigação com Carretel`);
  }

  return lines.join("\n");
};
