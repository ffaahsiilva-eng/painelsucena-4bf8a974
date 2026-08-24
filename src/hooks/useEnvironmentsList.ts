import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EnvironmentRow {
  id: string;
  label: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

const BUILTIN = new Set(["barcarena", "paragominas"]);

export function useEnvironmentsList() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["environments-list"],
    queryFn: async (): Promise<EnvironmentRow[]> => {
      const { data, error } = await supabase
        .from("environments")
        .select("id, label, description, created_at, created_by")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EnvironmentRow[];
    },
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async ({ label }: { label: string }) => {
      const slug = label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      if (!slug || slug.length < 2) throw new Error("Nome inválido");
      const { data, error } = await supabase.rpc("create_environment", {
        _id: slug,
        _label: label.trim(),
        _description: null,
      });
      if (error) throw error;
      return data as EnvironmentRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments-list"] });
      queryClient.invalidateQueries({ queryKey: ["my-environment-access"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await supabase.rpc("delete_environment", { _id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments-list"] });
      queryClient.invalidateQueries({ queryKey: ["my-environment-access"] });
    },
  });

  return {
    environments: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    isBuiltin: (id: string) => BUILTIN.has(id),
    createEnvironment: createMutation,
    deleteEnvironment: deleteMutation,
  };
}
