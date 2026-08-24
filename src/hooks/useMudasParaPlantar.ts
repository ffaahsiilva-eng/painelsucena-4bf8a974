import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MudaParaPlantar {
  id: string;
  especie: string;
  quantidade: number;
  faixa: string | null;
  berma: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useMudasParaPlantar = () => {
  return useQuery({
    queryKey: ["mudas-para-plantar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mudas_para_plantar")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MudaParaPlantar[];
    },
  });
};

export const useAddMudaParaPlantar = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (muda: { especie: string; quantidade: number; faixa?: string; berma?: number }) => {
      const { data, error } = await supabase
        .from("mudas_para_plantar")
        .insert({
          especie: muda.especie,
          quantidade: muda.quantidade,
          faixa: muda.faixa || null,
          berma: muda.berma || null,
          created_by: user?.id || "",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mudas-para-plantar"] });
    },
  });
};

export const useUpdateMudaParaPlantar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantidade }: { id: string; quantidade: number }) => {
      if (quantidade <= 0) {
        const { error } = await supabase.from("mudas_para_plantar").delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mudas_para_plantar")
          .update({ quantidade })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mudas-para-plantar"] });
    },
  });
};

export const useDeleteMudaParaPlantar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mudas_para_plantar").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mudas-para-plantar"] });
    },
  });
};
