import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useAuth } from "@/hooks/useAuth";
import type { AttendanceArea } from "@/hooks/useAttendanceAreaAssignments";

export interface AttendanceReportLock {
  id: string;
  date: string;
  area: string;
  locked_by: string;
  locked_at: string;
  environment: string;
}

export const useAttendanceReportLocks = (date: string) => {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  const { user } = useAuth();
  const env = environment ?? "barcarena";

  const query = useQuery({
    queryKey: ["attendance-report-locks", env, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_report_locks")
        .select("*")
        .eq("environment", env)
        .eq("date", date);
      if (error) throw error;
      return (data ?? []) as AttendanceReportLock[];
    },
    enabled: !!date,
  });

  useEffect(() => {
    return subscribeToTable(
      { event: "*", table: "attendance_report_locks" },
      () => queryClient.invalidateQueries({ queryKey: ["attendance-report-locks", env, date] })
    );
  }, [queryClient, env, date]);

  const lockMutation = useMutation({
    mutationFn: async (area: AttendanceArea) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("attendance_report_locks")
        .upsert(
          {
            date,
            area,
            locked_by: user.id,
          },
          { onConflict: "date,area" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attendance-report-locks", env, date],
      });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (area: AttendanceArea) => {
      const { error } = await supabase
        .from("attendance_report_locks")
        .delete()
        .eq("date", date)
        .eq("area", area)
        .eq("environment", env);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attendance-report-locks", env, date],
      });
    },
  });

  const isLocked = (area: AttendanceArea) =>
    (query.data ?? []).some((l) => l.area === area);

  return { ...query, isLocked, lockMutation, unlockMutation };
};
