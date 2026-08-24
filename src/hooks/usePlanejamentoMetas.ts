import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlanejamentoMeta {
  id: string;
  linha: number | null;
  categoria: string | null;
  atividade: string;
  meta: number;
  realizado: number;
  unidade: string | null;
  display_order: number;
  is_section_header: boolean;
  updated_at: string;
}

export function usePlanejamentoMetas() {
  return useQuery({
    queryKey: ["planejamento-metas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planejamento_metas")
        .select("id, linha, categoria, atividade, meta, realizado, unidade, display_order, is_section_header, updated_at")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlanejamentoMeta[];
    },
  });
}

export function useUpdatePlanejamentoMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, meta, realizado }: { id: string; meta?: number; realizado?: number }) => {
      // Read previous state to detect "completion" transition
      const { data: prev } = await supabase
        .from("planejamento_metas")
        .select("meta, realizado")
        .eq("id", id)
        .maybeSingle();

      const patch: Record<string, number> = {};
      if (meta !== undefined) patch.meta = meta;
      if (realizado !== undefined) patch.realizado = realizado;
      const { error } = await supabase.from("planejamento_metas").update(patch).eq("id", id);
      if (error) throw error;

      // Detect transition: from "not completed" to "completed"
      if (prev) {
        const prevMeta = Number(prev.meta) || 0;
        const prevReal = Number(prev.realizado) || 0;
        const newMeta = meta !== undefined ? Number(meta) : prevMeta;
        const newReal = realizado !== undefined ? Number(realizado) : prevReal;

        const wasCompleted = prevMeta > 0 && prevReal >= prevMeta;
        const isCompleted = newMeta > 0 && newReal >= newMeta;

        if (!wasCompleted && isCompleted) {
          // Fire-and-forget WhatsApp notification
          supabase.functions
            .invoke("wapi-planning-notify", {
              body: { eventType: "meta_completed", metaId: id },
            })
            .catch((e) => console.warn("[wapi-planning-notify meta_completed] falhou:", e));
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planejamento-metas"] });
      toast.success("Meta atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
