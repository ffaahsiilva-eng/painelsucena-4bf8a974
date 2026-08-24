import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ResiduoRecord {
  id: string;
  ano: number;
  mes: number;
  tipo: string;
  kg: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const TIPOS_RESIDUO = [
  { key: "papel", label: "PAPEL(KG)" },
  { key: "plastico", label: "PLÁSTICO(KG)" },
  { key: "nao_reciclavel", label: "NÃO RECICLÁVEL(KG)" },
  { key: "metal", label: "METAL(KG)" },
  { key: "organico", label: "ORGÂNICO(KG)" },
];

export const TIPO_EFLUENTE = { key: "efluente_sanitario", label: "Efluentes Sanitários (m³)" };

export function useResiduosEfluentes(ano: number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["residuos_efluentes", ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residuos_efluentes" as any)
        .select("*")
        .eq("ano", ano)
        .order("mes")
        .order("tipo");
      if (error) throw error;
      return (data || []) as unknown as ResiduoRecord[];
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ mes, tipo, kg }: { mes: number; tipo: string; kg: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("residuos_efluentes" as any)
        .select("id, kg")
        .eq("ano", ano)
        .eq("mes", mes)
        .eq("tipo", tipo)
        .maybeSingle();

      if ((existing as any)?.id) {
        const newKg = Math.round(kg * 1000) / 1000;
        const { error } = await supabase
          .from("residuos_efluentes" as any)
          .update({ kg: newKg, updated_at: new Date().toISOString() } as any)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("residuos_efluentes" as any)
          .insert({ ano, mes, tipo, kg, created_by: user.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residuos_efluentes", ano] });
    },
  });

  const remove = useMutation({
    mutationFn: async ({ mes, tipo }: { mes: number; tipo: string }) => {
      const { error } = await supabase
        .from("residuos_efluentes" as any)
        .delete()
        .eq("ano", ano)
        .eq("mes", mes)
        .eq("tipo", tipo);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residuos_efluentes", ano] });
    },
  });

  const removeAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("residuos_efluentes" as any)
        .delete()
        .eq("ano", ano);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residuos_efluentes", ano] });
    },
  });

  return { ...query, upsert, remove, removeAll };
}
