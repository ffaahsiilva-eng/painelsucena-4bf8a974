// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useIsAdmin } from "./useUserRole";
import { getBrazilNorthMonthYear } from "@/lib/timezone";

export const useMatrixProgress = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current month in YYYY-MM format using Brazil North timezone
  const getCurrentMonthYear = useCallback(() => {
    return getBrazilNorthMonthYear();
  }, []);

  // Fetch completed tasks for the current month (all users - global visibility)
  const fetchCompletedTasks = useCallback(async () => {
    if (!user) {
      setCompletedTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      const monthYear = getCurrentMonthYear();
      
      // Fetch ALL task completions for this month (from all users)
      const { data, error } = await supabase
        .from("matrix_task_completions")
        .select("task_id")
        .eq("month_year", monthYear);

      if (error) throw error;

      // Get unique task_ids (a task is considered complete if ANY user completed it)
      const uniqueTaskIds = [...new Set(data?.map((item) => item.task_id) || [])];
      setCompletedTasks(uniqueTaskIds);
    } catch (error) {
      console.error("Error fetching matrix progress:", error);
      setCompletedTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, getCurrentMonthYear]);

  // Toggle task completion
  const toggleTask = useCallback(async (taskId: string) => {
    if (!user) return;

    const monthYear = getCurrentMonthYear();
    const isCompleted = completedTasks.includes(taskId);

    try {
      if (isCompleted) {
        // Admin removes ALL completions for this task (global unmark);
        // regular users only remove their own
        let query = supabase
          .from("matrix_task_completions")
          .delete()
          .eq("task_id", taskId)
          .eq("month_year", monthYear);

        if (!isAdmin) {
          query = query.eq("user_id", user.id);
        }

        const { error } = await query;

        if (error) throw error;

        setCompletedTasks((prev) => prev.filter((id) => id !== taskId));
      } else {
        // Add completion
        const { error } = await supabase
          .from("matrix_task_completions")
          .insert({
            user_id: user.id,
            task_id: taskId,
            month_year: monthYear,
          });

        if (error) throw error;

        setCompletedTasks((prev) => [...prev, taskId]);
      }
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  }, [user, completedTasks, getCurrentMonthYear, isAdmin]);

  // Check if a task is completed
  const isCompleted = useCallback((taskId: string) => {
    return completedTasks.includes(taskId);
  }, [completedTasks]);

  // Load data on mount
  useEffect(() => {
    fetchCompletedTasks();
  }, [fetchCompletedTasks]);

  return {
    completedTasks,
    isLoading,
    toggleTask,
    isCompleted,
    refetch: fetchCompletedTasks,
  };
};
