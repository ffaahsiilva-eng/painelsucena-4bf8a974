import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PluviometriaRecord {
  id: string;
  setor: string;
  ano: number;
  mes: number;
  dia: number;
  mm: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function usePluviometriaYear(setor: string, ano: number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["pluviometria", setor, ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pluviometria_records" as any)
        .select("*")
        .eq("setor", setor)
        .eq("ano", ano)
        .order("mes")
        .order("dia");
      if (error) throw error;
      return (data || []) as unknown as PluviometriaRecord[];
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ mes, dia, mm }: { mes: number; dia: number; mm: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("pluviometria_records" as any)
        .select("id")
        .eq("setor", setor)
        .eq("ano", ano)
        .eq("mes", mes)
        .eq("dia", dia)
        .maybeSingle();

      if ((existing as any)?.id) {
        const { error } = await supabase
          .from("pluviometria_records" as any)
          .update({ mm, updated_at: new Date().toISOString() } as any)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pluviometria_records" as any)
          .insert({ setor, ano, mes, dia, mm, created_by: user.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pluviometria", setor, ano] });
    },
  });

  const remove = useMutation({
    mutationFn: async ({ mes, dia }: { mes: number; dia: number }) => {
      const { error } = await supabase
        .from("pluviometria_records" as any)
        .delete()
        .eq("setor", setor)
        .eq("ano", ano)
        .eq("mes", mes)
        .eq("dia", dia);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pluviometria", setor, ano] });
    },
  });

  return { ...query, upsert, remove };
}
