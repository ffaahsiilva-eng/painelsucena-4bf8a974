import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InspectionSchedule {
  id: string;
  next_inspection_date: string;
  next_inspection_time: string;
  created_by: string;
  updated_at: string;
  created_at: string;
}

export function useInspectionSchedule() {
  const queryClient = useQueryClient();

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["inspection-schedule"],
    queryFn: async (): Promise<InspectionSchedule | null> => {
      const { data, error } = await supabase
        .from("site_inspection_schedule")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as InspectionSchedule | null;
    },
  });

  const upsertSchedule = useMutation({
    mutationFn: async ({ date, time, userId }: { date: string; time: string; userId: string }) => {
      // Delete existing and insert new
      await supabase.from("site_inspection_schedule").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase
        .from("site_inspection_schedule")
        .insert({ next_inspection_date: date, next_inspection_time: time, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-schedule"] });
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_inspection_schedule")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-schedule"] });
    },
  });

  return { schedule, isLoading, upsertSchedule, deleteSchedule };
}
