import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTables } from "@/lib/realtimeManager";
import { useEffect } from "react";
import { useEnvironment } from "@/hooks/useEnvironment";

export interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string | null;
  file_url: string | null;
  raw_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingMinuteItem {
  id: string;
  minute_id: string;
  item_number: string;
  section: string | null;
  description: string;
  action_by: string | null;
  deadline: string | null;
  original_status: string | null;
  sort_order: number;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

export function useMeetingMinutes() {
  const qc = useQueryClient();
  const { environment } = useEnvironment();
  const env = environment || "barcarena";

  useEffect(() => {
    return subscribeToTables([
      {
        cfg: { event: "*", table: "meeting_minutes" },
        callback: () => qc.invalidateQueries({ queryKey: ["meeting-minutes"] }),
      },
      {
        cfg: { event: "*", table: "meeting_minute_items" },
        callback: () => {
          qc.invalidateQueries({ queryKey: ["meeting-minute-items"] });
          qc.invalidateQueries({ queryKey: ["meeting-minute-items-all"] });
        },
      },
    ]);
  }, [qc]);

  return useQuery({
    queryKey: ["meeting-minutes", env],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("environment", env)
        .order("meeting_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MeetingMinute[];
    },
  });
}

export function useMeetingMinuteItems(minuteId: string | null) {
  return useQuery({
    queryKey: ["meeting-minute-items", minuteId],
    enabled: !!minuteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_minute_items")
        .select("*")
        .eq("minute_id", minuteId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as MeetingMinuteItem[];
    },
  });
}

export function useAllMeetingMinuteItems() {
  const { environment } = useEnvironment();
  const env = environment || "barcarena";
  return useQuery({
    queryKey: ["meeting-minute-items-all", env],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_minute_items")
        .select("id, completed, minute_id")
        .eq("environment", env);
      if (error) throw error;
      return data as { id: string; completed: boolean; minute_id: string }[];
    },

  });
}

export function useToggleMinuteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data: row, error } = await supabase
        .from("meeting_minute_items")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? (u.user?.id ?? null) : null,
        })
        .eq("id", id)
        .select("id, minute_id, completed")
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting-minute-items"] });
      qc.invalidateQueries({ queryKey: ["meeting-minute-items-all"] });
    },
  });
}

export function useDeleteMeetingMinute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meeting_minutes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting-minutes"] });
      qc.invalidateQueries({ queryKey: ["meeting-minute-items-all"] });
    },
  });
}
