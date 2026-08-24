// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useMatrixHiddenTasks() {
  const { user } = useAuth();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from("matrix_hidden_tasks").select("task_id");
    setHiddenIds((data || []).map((d: any) => d.task_id));
    setIsLoading(false);
  }, []);

  const hideTask = useCallback(
    async (taskId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("matrix_hidden_tasks")
        .insert({ task_id: taskId, hidden_by: user.id });
      if (error && !error.message.includes("duplicate")) throw error;
      setHiddenIds((p) => [...p, taskId]);
    },
    [user]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { hiddenIds, isLoading, hideTask, refetch: fetch };
}
