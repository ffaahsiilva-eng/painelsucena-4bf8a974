import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export interface ChecklistItem {
  numero: number;
  pergunta: string;
  resposta: "C" | "NC" | "NA" | "";
}

export interface PlanoAcaoItem {
  item_nc: string;
  acao: string;
  responsavel: string;
  prazo: string;
}

export interface PosChuvaInspection {
  id: string;
  created_by: string;
  empresa: string | null;
  data: string;
  projeto: string | null;
  responsavel: string | null;
  local_inspecao: string | null;
  atividade: string | null;
  checklist: ChecklistItem[];
  plano_acao: PlanoAcaoItem[];
  avaliacao_1_data: string | null;
  avaliacao_1_horario: string | null;
  avaliacao_1_sig_encarregado: string | null;
  avaliacao_1_sig_tecnico: string | null;
  avaliacao_2_data: string | null;
  avaliacao_2_horario: string | null;
  avaliacao_2_sig_encarregado: string | null;
  avaliacao_2_sig_tecnico: string | null;
  avaliacao_3_data: string | null;
  avaliacao_3_horario: string | null;
  avaliacao_3_sig_encarregado: string | null;
  avaliacao_3_sig_tecnico: string | null;
  observacoes: string | null;
  chuva_inicio: string | null;
  chuva_fim: string | null;
  created_at: string;
  updated_at: string;
}

export const CHECKLIST_PERGUNTAS = [
  "Uma inspeção em cenários de chuva para retomada das atividades?",
  "Foi feito a verificação da integridade dos acessos?",
  "Os isolamentos da área estão devidamente nos seus lugares?",
  "O caminho seguro está sem obstruções e devidamente sinalizado?",
  "Será necessário realizar melhorias nos acessos comprometidas pela ação da chuva?",
  "A área de trabalho está devidamente organizada para retorno ao trabalho?",
  "Os colaboradores realizaram o sinal verde para a retomada das atividades?",
  "Os EPIs dos colaboradores estão devidamente limpos e secos para retorno ao trabalho?",
  "O canteiro de apoio, na frente de trabalho, se encontra adequado para retorno ao trabalho?",
  "A área de trabalho em geral está segura para retorno ao trabalho?",
  "As ferramentas, máquinas e equipamentos estão seguros para retorno ao trabalho?",
  "A área de trabalho está segura contra riscos elétricos?",
  "A área de trabalho está segura para retorno quanto ao risco de queimadura química (risco operacional)?",
  "Os colaboradores estão cientes do ponto de encontro?",
];

export const usePosChuvaInspections = () => {
  return useQuery({
    queryKey: ["pos-chuva-inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_chuva_inspections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        checklist: (d.checklist || []) as ChecklistItem[],
        plano_acao: (d.plano_acao || []) as PlanoAcaoItem[],
      })) as PosChuvaInspection[];
    },
  });
};

export const useCreatePosChuva = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (inspection: Omit<PosChuvaInspection, "id" | "created_by" | "created_at" | "updated_at">) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { error } = await supabase.from("pos_chuva_inspections").insert({
        ...inspection,
        created_by: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-chuva-inspections"] });
    },
  });
};

export const useDeletePosChuva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_chuva_inspections").delete().eq("id", id);
      if (error) {
        console.error("Erro ao excluir no Supabase:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Inspeção excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pos-chuva-inspections"] });
      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: ["pos-chuva-inspections"] });
    },
    onError: (error) => {
      console.error("Erro na mutação de exclusão:", error);
      toast.error("Erro ao excluir inspeção.");
    }
  });
};
