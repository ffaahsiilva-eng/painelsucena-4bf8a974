// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MatrixCustomTask {
  id: string;
  cargo_id: string;
  name: string;
  created_by: string | null;
}

export function useMatrixCustomTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MatrixCustomTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("matrix_custom_tasks")
      .select("id, cargo_id, name, created_by")
      .order("created_at", { ascending: true });
    if (!error) setTasks((data as any) || []);
    setIsLoading(false);
  }, []);

  const addTask = useCallback(
    async (cargoId: string, name: string) => {
      if (!user || !name.trim()) return null;
      const { data, error } = await supabase
        .from("matrix_custom_tasks")
        .insert({ cargo_id: cargoId, name: name.trim(), created_by: user.id })
        .select("id, cargo_id, name, created_by")
        .single();
      if (error) throw error;
      setTasks((p) => [...p, data as any]);
      return data;
    },
    [user]
  );

  const removeTask = useCallback(async (id: string) => {
    const { error } = await supabase.from("matrix_custom_tasks").delete().eq("id", id);
    if (error) throw error;
    setTasks((p) => p.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, isLoading, addTask, removeTask, refetch: fetchTasks };
}
