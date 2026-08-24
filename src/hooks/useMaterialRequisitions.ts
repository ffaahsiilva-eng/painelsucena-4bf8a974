import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface MaterialRequisition {
  id: string;
  data: string;
  autorizado_por: string;
  matricula_autorizador: string | null;
  motivo: string;
  funcionario_nome: string;
  funcionario_funcao: string | null;
  funcionario_matricula: string | null;
  materiais: Array<{ id: string; name: string; qty: number }>;
  area_destino: string;
  photo_urls: string[];
  assinatura_funcionario: string | null;
  assinatura_autorizador: string | null;
  created_by: string;
  created_at: string;
}

export function useMaterialRequisitions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requisitions = [], isLoading } = useQuery({
    queryKey: ["material-requisitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_requisitions")
        .select("id, data, autorizado_por, motivo, funcionario_nome, area_destino, created_at, created_by")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MaterialRequisition[];
    },
    enabled: !!user,
  });

  const createRequisition = useMutation({
    mutationFn: async (values: Omit<MaterialRequisition, "id" | "created_at" | "created_by">) => {
      const { data, error } = await supabase
        .from("material_requisitions")
        .insert({ ...values, created_by: user!.id } as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as MaterialRequisition;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<MaterialRequisition[]>(["material-requisitions"], (prev) => {
        const list = prev || [];
        if (list.some((r) => r.id === created.id)) return list;
        return [created, ...list];
      });
      queryClient.invalidateQueries({ queryKey: ["material-requisitions"] });
      // Notificação removida a pedido do usuário
      console.log("Requisição de material registrada com sucesso!");
    },
    onError: () => toast.error("Erro ao registrar requisição de material"),
  });

  const updateRequisition = useMutation({
    mutationFn: async ({ id, ...values }: Partial<MaterialRequisition> & { id: string }) => {
      const { data, error } = await supabase
        .from("material_requisitions")
        .update(values as any)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as MaterialRequisition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requisitions"] });
      toast.success("Requisição de material atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar requisição"),
  });

  const deleteRequisition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("material_requisitions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requisitions"] });
      toast.success("Requisição excluída!");
    },
    onError: () => toast.error("Erro ao excluir requisição"),
  });

  return { requisitions, isLoading, createRequisition, updateRequisition, deleteRequisition };
}
