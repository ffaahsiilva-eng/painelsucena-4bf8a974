import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AbastecimentoRecord {
  id: string;
  ano: number;
  mes: number;
  semana: number;
  kg: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useAbastecimentoCaixaDagua(ano: number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["abastecimento_caixa_dagua", ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abastecimento_caixa_dagua" as any)
        .select("*")
        .eq("ano", ano)
        .order("mes")
        .order("semana");
      if (error) throw error;
      return (data || []) as unknown as AbastecimentoRecord[];
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ mes, semana, kg }: { mes: number; semana: number; kg: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("abastecimento_caixa_dagua" as any)
        .select("id")
        .eq("ano", ano)
        .eq("mes", mes)
        .eq("semana", semana)
        .maybeSingle();

      if ((existing as any)?.id) {
        const { error } = await supabase
          .from("abastecimento_caixa_dagua" as any)
          .update({ kg, updated_at: new Date().toISOString() } as any)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("abastecimento_caixa_dagua" as any)
          .insert({ ano, mes, semana, kg, created_by: user.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abastecimento_caixa_dagua", ano] });
    },
  });

  const remove = useMutation({
    mutationFn: async ({ mes, semana }: { mes: number; semana: number }) => {
      const { error } = await supabase
        .from("abastecimento_caixa_dagua" as any)
        .delete()
        .eq("ano", ano)
        .eq("mes", mes)
        .eq("semana", semana);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abastecimento_caixa_dagua", ano] });
    },
  });

  return { ...query, upsert, remove };
}
