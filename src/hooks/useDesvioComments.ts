import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export interface DesvioComment {
  id: string;
  desvio_id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  content: string;
  created_at: string;
}

export function useDesvioComments(desvioId: string | null) {
  return useQuery({
    queryKey: ["desvio-comments", desvioId],
    enabled: !!desvioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("desvio_comments" as any)
        .select("*")
        .eq("desvio_id", desvioId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as DesvioComment[];
    },
  });
}

export function useCreateDesvioComment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ desvioId, content }: { desvioId: string; content: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("desvio_comments" as any)
        .insert({
          desvio_id: desvioId,
          user_id: user.id,
          user_name: profile?.full_name || "Usuário",
          user_avatar_url: profile?.avatar_url || null,
          content: content.trim(),
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["desvio-comments", vars.desvioId] });
    },
    onError: () => {
      toast.error("Erro ao enviar comentário");
    },
  });
}

export function useDeleteDesvioComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, desvioId }: { commentId: string; desvioId: string }) => {
      const { error } = await supabase
        .from("desvio_comments" as any)
        .delete()
        .eq("id", commentId);
      if (error) throw error;
      return desvioId;
    },
    onSuccess: (desvioId) => {
      qc.invalidateQueries({ queryKey: ["desvio-comments", desvioId] });
    },
  });
}
