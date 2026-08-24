import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "@/hooks/useEnvironment";
import type {
  ActivityConfig,
  CustomActivityDefinition,
  CustomActivityDailyReport,
  ActivityEntry,
} from "@/lib/customActivity";

const TABLE = "custom_activity_definitions" as any;
const REPORTS = "custom_activity_daily_reports" as any;

export function useCustomActivities() {
  const qc = useQueryClient();
  const { environment } = useEnvironment();

  const listQuery = useQuery({
    queryKey: ["custom-activities", environment ?? "barcarena"],
    queryFn: async () => {
      const currentEnv = environment || "barcarena";
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("is_active", true)
        .eq("environment", currentEnv)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CustomActivityDefinition[];
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });


  const create = useMutation({
    mutationFn: async (params: {
      title: string;
      icon: string;
      color: string;
      config: ActivityConfig;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert({
          title: params.title,
          icon: params.icon,
          color: params.color,
          config: params.config,
          environment: environment || "barcarena",
          created_by: user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as CustomActivityDefinition;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-activities"] });
    },
  });

  const update = useMutation({
    mutationFn: async (params: {
      id: string;
      title?: string;
      icon?: string;
      color?: string;
      config?: ActivityConfig;
      is_active?: boolean;
    }) => {
      const patch: Record<string, any> = {};
      ["title", "icon", "color", "config", "is_active"].forEach((k) => {
        if ((params as any)[k] !== undefined) patch[k] = (params as any)[k];
      });
      const { error } = await (supabase as any)
        .from(TABLE)
        .update(patch)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-activities"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-activities"] }),
  });

  return {
    definitions: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    create,
    update,
    remove,
  };
}

export function useCustomActivityDefinition(id: string | undefined) {
  const { environment } = useEnvironment();
  return useQuery({
    queryKey: ["custom-activity", id, environment ?? "barcarena"],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as CustomActivityDefinition | null;
    },
  });
}

export function useCustomActivityDailyReport(
  definitionId: string | undefined,
  reportDate: string,
) {
  const qc = useQueryClient();
  const { environment } = useEnvironment();

  const query = useQuery({
    queryKey: ["custom-activity-report", definitionId, reportDate, environment ?? "barcarena"],
    enabled: !!definitionId && !!reportDate,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(REPORTS)
        .select("*")
        .eq("definition_id", definitionId)
        .eq("report_date", reportDate)
        .maybeSingle();
      if (error) throw error;
      return data as CustomActivityDailyReport | null;
    },
  });

  const save = useMutation({
    mutationFn: async (params: { entries: ActivityEntry[]; locked?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const existing = query.data;
      if (existing) {
        const { error } = await (supabase as any)
          .from(REPORTS)
          .update({
            entries: params.entries,
            locked: params.locked ?? existing.locked,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from(REPORTS)
          .insert({
            definition_id: definitionId,
            report_date: reportDate,
            entries: params.entries,
            locked: params.locked ?? false,
            environment: environment || "barcarena",
            created_by: user?.id ?? null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-activity-report"] });
      qc.invalidateQueries({ queryKey: ["custom-activity-reports-by-date"] });
      qc.invalidateQueries({ queryKey: ["custom-activities"] });
    },
  });

  const setLocked = useMutation({
    mutationFn: async (locked: boolean) => {
      const existing = query.data;
      if (!existing) return;
      const { error } = await (supabase as any)
        .from(REPORTS)
        .update({ locked })
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-activity-report", definitionId, reportDate] });
    },
  });

  return { report: query.data ?? null, isLoading: query.isLoading, save, setLocked };
}

export function useCustomActivityReportsByDate(reportDate: string) {
  const { environment } = useEnvironment();
  return useQuery({
    queryKey: ["custom-activity-reports-by-date", reportDate, environment ?? "barcarena"],
    enabled: !!reportDate,
    queryFn: async () => {
      // Não filtra por ambiente aqui: o RDO já percorre apenas as definições
      // do ambiente atual, e registros antigos podem ter ambiente divergente.
      const { data, error } = await (supabase as any)
        .from(REPORTS)
        .select("*")
        .eq("report_date", reportDate);
      if (error) throw error;
      return (data ?? []) as CustomActivityDailyReport[];
    },
    staleTime: 1000 * 60 * 2, // 2 min cache
  });
}

