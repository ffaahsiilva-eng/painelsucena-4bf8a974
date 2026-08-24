import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AbsenceReason = "falta" | "atestado" | "treinamento" | "exame" | "folga" | "afastado";

export interface DDSParticipationRecord {
  id: string;
  dds_date: string;
  employee_name: string;
  present: boolean;
  absence_reason: AbsenceReason | null;
  saved_by: string;
  created_at: string;
  updated_at: string;
}

export const useDDSParticipation = (date: string) => {
  return useQuery({
    queryKey: ["dds-participation", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dds_participation")
        .select("*")
        .eq("dds_date", date);
      if (error) throw error;
      return (data || []) as DDSParticipationRecord[];
    },
    enabled: !!date,
  });
};

// Fetch all participation dates for a month (yyyy-MM)
export const useDDSParticipationMonth = (monthYear: string) => {
  const startDate = `${monthYear}-01`;
  const endDate = `${monthYear}-31`;
  return useQuery({
    queryKey: ["dds-participation-month", monthYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dds_participation")
        .select("dds_date")
        .gte("dds_date", startDate)
        .lte("dds_date", endDate);
      if (error) throw error;
      const dates = new Set((data || []).map((r: { dds_date: string }) => r.dds_date));
      return dates;
    },
    enabled: !!monthYear,
  });
};

export const useSaveDDSParticipation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      participants,
      userId,
    }: {
      date: string;
      participants: { name: string; present: boolean; absence_reason?: AbsenceReason | null }[];
      userId: string;
    }) => {
      // Delete existing records for this date then insert new ones
      await supabase.from("dds_participation").delete().eq("dds_date", date);

      const rows = participants.map((p) => ({
        dds_date: date,
        employee_name: p.name,
        present: p.present,
        absence_reason: p.present ? null : (p.absence_reason || null),
        saved_by: userId,
      }));

      if (rows.length > 0) {
        const { error } = await supabase.from("dds_participation").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["dds-participation", vars.date] });
    },
  });
};
