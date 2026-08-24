import { bermaLabel } from "@/lib/bermaLabel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MudaPlantio {
  id: string;
  especie: string;
  quantidade: number;
  faixa: string | null;
  berma: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useMudasPlantio = () => {
  return useQuery({
    queryKey: ["mudas-plantio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mudas_plantio")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MudaPlantio[];
    },
  });
};

export const useMudasPlantioByDate = (date: string) => {
  return useQuery({
    queryKey: ["mudas-plantio", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mudas_plantio")
        .select("*")
        .gte("created_at", `${date}T00:00:00`)
        .lt("created_at", `${date}T23:59:59.999`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MudaPlantio[];
    },
    enabled: !!date,
  });
};

export const formatMudasPlantadasForRDO = (mudas: MudaPlantio[] | null | undefined): string => {
  if (!mudas || mudas.length === 0) return "";
  const lines: string[] = [];
  mudas.forEach((m) => {
    let local = "";
    if (m.faixa) local += ` - ${m.faixa}`;
    if (m.berma) local += ` (${bermaLabel(m.berma)})`;
    lines.push(`* Mudas Plantadas: ${m.especie} - ${m.quantidade} unidade(s)${local}`);
  });
  return lines.join("\n");
};

export const useAddMudaPlantio = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (muda: { especie: string; quantidade: number; faixa?: string; berma?: number; data_plantio?: string }) => {
      const insertData: any = {
        especie: muda.especie,
        quantidade: muda.quantidade,
        faixa: muda.faixa || null,
        berma: muda.berma || null,
        created_by: user?.id || "",
      };
      if (muda.data_plantio) {
        insertData.created_at = `${muda.data_plantio}T12:00:00.000Z`;
      }
      const { data, error } = await supabase
        .from("mudas_plantio")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mudas-plantio"] });
    },
  });
};

export const useDeleteMudaPlantio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mudas_plantio").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mudas-plantio"] });
    },
  });
};
