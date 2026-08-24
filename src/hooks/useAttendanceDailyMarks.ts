import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useAuth } from "@/hooks/useAuth";
import type { AttendanceArea } from "@/hooks/useAttendanceAreaAssignments";

export interface AttendanceDailyMark {
  id: string;
  date: string;
  area: AttendanceArea;
  absent_employee_ids: number[];
  external_work_employee_ids: number[];
  environment: string;
}

export const useAttendanceDailyMarks = (date: string) => {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  const { user } = useAuth();
  const env = environment ?? "barcarena";

  const query = useQuery({
    queryKey: ["attendance-daily-marks", env, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_daily_marks")
        .select("*")
        .eq("environment", env)
        .eq("date", date);
      if (error) throw error;
      return (data ?? []) as AttendanceDailyMark[];
    },
    enabled: !!date,
  });

  useEffect(() => {
    return subscribeToTable(
      { event: "*", table: "attendance_daily_marks" },
      () => queryClient.invalidateQueries({ queryKey: ["attendance-daily-marks", env, date] })
    );
  }, [queryClient, env, date]);

  const saveMutation = useMutation({
    mutationFn: async (params: {
      area: AttendanceArea;
      absentIds: number[];
      externalWorkIds?: number[];
    }) => {
      const { error } = await supabase
        .from("attendance_daily_marks")
        .upsert(
          {
            date,
            area: params.area,
            absent_employee_ids: params.absentIds,
            external_work_employee_ids: params.externalWorkIds ?? [],
            created_by: user?.id ?? null,
          },
          { onConflict: "date,area,environment" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attendance-daily-marks", env, date],
      });
    },
  });

  const getAbsentIds = (area: AttendanceArea): Set<number> => {
    const row = (query.data ?? []).find((m) => m.area === area);
    return new Set(row?.absent_employee_ids ?? []);
  };

  const getExternalWorkIds = (area: AttendanceArea): Set<number> => {
    const row = (query.data ?? []).find((m) => m.area === area);
    return new Set(row?.external_work_employee_ids ?? []);
  };

  return { ...query, getAbsentIds, getExternalWorkIds, saveMutation };
};
