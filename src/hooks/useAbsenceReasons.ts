import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import type { Tables } from "@/integrations/supabase/types";
import { useEffect } from "react";

export type AbsenceReason =
  | "Falta"
  | "Atestado"
  | "Treinamento"
  | "Folga por Exame"
  | "Folga"
  | "Afastado"
  | "Licença Maternidade/Paternidade"
  | "INSS"
  | "Folga de Campo"
  | "Licença Casamento"
  | "Licença Morte"
  | "Trabalho Externo";

export const ABSENCE_REASONS: AbsenceReason[] = [
  "Falta",
  "Atestado",
  "Treinamento",
  "Folga por Exame",
  "Folga",
  "Afastado",
  "Licença Maternidade/Paternidade",
  "INSS",
  "Folga de Campo",
  "Licença Casamento",
  "Licença Morte",
  "Trabalho Externo",
];

export const REASON_COLORS: Record<AbsenceReason, string> = {
  "Falta": "bg-destructive/20 text-destructive border-destructive/40",
  "Atestado": "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40",
  "Treinamento": "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40",
  "Folga por Exame": "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40",
  "Folga": "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  "Afastado": "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40",
  "Licença Maternidade/Paternidade": "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/40",
  "INSS": "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40",
  "Folga de Campo": "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40",
  "Licença Casamento": "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40",
  "Licença Morte": "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40",
  "Trabalho Externo": "bg-blue-600/20 text-blue-700 dark:text-blue-300 border-blue-600/40",
};

export type AbsenceRow = Tables<"attendance_absence_reasons">;

interface UseAbsenceReasonsParams {
  year: number;
  month: number; // 1-12
}

export const useAbsenceReasons = ({ year, month }: UseAbsenceReasonsParams) => {
  const queryClient = useQueryClient();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

  const query = useQuery({
    queryKey: ["absence_reasons", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_absence_reasons")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return (data || []) as AbsenceRow[];
    },
  });

  useEffect(() => {
    return subscribeToTable(
      { event: "*", table: "attendance_absence_reasons" },
      () => queryClient.invalidateQueries({ queryKey: ["absence_reasons", year, month] })
    );
  }, [year, month, queryClient]);

  return query;
};

export const useUpsertAbsence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      employeeKey: string; // employee_id (text key, e.g. matricula or numeric id)
      date: string; // YYYY-MM-DD
      reason: AbsenceReason;
      daysCount?: number;
      cid?: string | null;
      notes?: string | null;
    }) => {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;

      const dates: string[] = [];
      const days = params.daysCount && params.daysCount > 0 ? params.daysCount : 1;
      const base = new Date(params.date + "T00:00:00");
      for (let i = 0; i < days; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }

      // Delete previously existing rows for these dates+employee
      await supabase
        .from("attendance_absence_reasons")
        .delete()
        .eq("employee_id", params.employeeKey)
        .in("date", dates);

      const rows = dates.map((d) => ({
        employee_id: params.employeeKey,
        date: d,
        reason: params.reason,
        days_count: days,
        cid: params.cid ?? null,
        notes: params.notes ?? null,
        created_by: userId ?? null,
      }));

      const { error } = await supabase
        .from("attendance_absence_reasons")
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence_reasons"] });
    },
  });
};

export const useDeleteAbsence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { employeeKey: string; date: string }) => {
      const { error } = await supabase
        .from("attendance_absence_reasons")
        .delete()
        .eq("employee_id", params.employeeKey)
        .eq("date", params.date);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence_reasons"] });
    },
  });
};
