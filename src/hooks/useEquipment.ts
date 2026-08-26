import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EquipmentType } from "@/components/equipamentos/VehicleIcons";
import { useEnvironment } from "@/hooks/useEnvironment";
import { subscribeToTable } from "@/lib/realtimeManager";

export type StopReason = "none" | "maintenance" | "waiting" | "rain" | "end_of_shift" | "end_of_day" | "almoco" | "manutencao_fora" | "manutencao_externa" | "oficina_externa" | "trabalho_externo";

export type MobilizationStatus = "mobilizando" | "mobilizado" | "desmobilizando" | "desmobilizado";

export const MOBILIZATION_STATUS_LABELS: Record<MobilizationStatus, string> = {
  mobilizando: "Mobilizando",
  mobilizado: "Mobilizado",
  desmobilizando: "Desmobilizando",
  desmobilizado: "Desmobilizado",
};

export interface Equipment {
  id: string;
  name: string;
  plate: string;
  driver: string;
  helper: string;
  equipment_type: EquipmentType;
  start_hour: number;
  end_hour: number;
  stop_reason: StopReason;
  stop_start_time: string | null;
  image_url?: string | null;
  mobilization_status: MobilizationStatus;
  created_at: string;
  updated_at: string;
}

export interface EquipmentStopHistory {
  id: string;
  equipment_id: string;
  stop_reason: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  defect_description: string | null;
  changed_by_driver: string | null;
  created_at: string;
}

export function useEquipment(options: { includeDesmobilized?: boolean } = {}) {
  const { includeDesmobilized = false } = options;
  const { environment: env } = useEnvironment();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to equipment changes
    const unsubEquipment = subscribeToTable(
      { event: "*", table: "equipment" },
      () => {
        queryClient.invalidateQueries({ queryKey: ["equipment"] });
      }
    );

    // Subscribe to shift record changes (helps detect when someone claimed a vehicle via shift start)
    const unsubShifts = subscribeToTable(
      { event: "*", table: "daily_shift_records" },
      () => {
        queryClient.invalidateQueries({ queryKey: ["equipment"] });
      }
    );

    return () => {
      unsubEquipment();
      unsubShifts();
    };
  }, [queryClient, env]);

  return useQuery({
    queryKey: ["equipment", { includeDesmobilized, env }],
    queryFn: async () => {
      const cacheKey = `cached_equipment_${env || "default"}`;
      try {
        let query = supabase
          .from("equipment")
          .select("id, name, plate, driver, helper, equipment_type, stop_reason, stop_start_time, mobilization_status, image_url, environment")
          .order("created_at", { ascending: true });
        if (env) query = query.eq("environment", env);
        
        // Set a small timeout for the fetch if we know we are offline, or let it fail
        const { data, error } = await query;

        if (error) throw error;
        const rows = (data as Equipment[]).map((r) => ({
          ...r,
          mobilization_status: (r.mobilization_status ?? "mobilizado") as MobilizationStatus,
        }));
        
        const finalRows = includeDesmobilized
          ? rows
          : rows.filter((r) => r.mobilization_status !== "desmobilizado");
          
        localStorage.setItem(cacheKey, JSON.stringify(finalRows));
        return finalRows;
      } catch (err) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          return JSON.parse(cached) as Equipment[];
        }
        throw err;
      }
    },
  });
}

export function useUpdateEquipmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      stop_reason,
      stop_start_time,
      previousStopReason,
      previousStopStartTime,
      defect_description,
      changed_by_driver,
    }: {
      id: string;
      stop_reason: StopReason;
      stop_start_time: string | null;
      previousStopReason?: StopReason;
      previousStopStartTime?: string | null;
      defect_description?: string | null;
      changed_by_driver?: string | null;
    }) => {
      const now = new Date();
      const nowIso = now.toISOString();

      // Ensure we always persist a valid stop_start_time for non-operating statuses.
      // Some callers were sending null, which breaks proper closing of the last open history row.
      const effectiveStopStartTime =
        stop_reason === "none" ? null : stop_start_time ?? nowIso;

      // Close the latest open stop (ended_at IS NULL) before writing the new status.
      // Track if we're returning from preventive maintenance to reset the maintenance plan
      let wasPreventiveMaintenance = false;
      {
        const { data: openStop, error: openStopError } = await supabase
          .from("equipment_stop_history")
          .select("id, started_at, stop_reason")
          .eq("equipment_id", id)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (openStopError) throw openStopError;

        if (openStop) {
          const startedAt = new Date(openStop.started_at);
          const durationMinutes = Math.max(
            0,
            Math.floor((now.getTime() - startedAt.getTime()) / 60000)
          );

          // Check if we're returning from preventive maintenance
          if (openStop.stop_reason === "manutencao_preventiva" && stop_reason === "none") {
            wasPreventiveMaintenance = true;
          }

          const { error: closeError } = await supabase
            .from("equipment_stop_history")
            .update({ ended_at: nowIso, duration_minutes: durationMinutes })
            .eq("id", openStop.id);

          if (closeError) throw closeError;

          // Safety net: close any other dangling open rows (shouldn't exist, but may due to older bugs)
          const { error: closeOthersError } = await supabase
            .from("equipment_stop_history")
            .update({ ended_at: nowIso })
            .eq("equipment_id", id)
            .is("ended_at", null);

          if (closeOthersError) throw closeOthersError;
        }
      }

      // NOTE: previousStopReason/previousStopStartTime are intentionally not relied upon anymore.
      // We close the latest open row directly to avoid leaving dangling "in progress" history.

      // Always create a history entry for status changes, including "none" (Operando)
      // This ensures "Movimentações de Hoje" shows all status transitions including return to operation
      const { error: insertHistoryError } = await supabase
        .from("equipment_stop_history")
        .insert({
        equipment_id: id,
        stop_reason: stop_reason === "none" ? "operando" : stop_reason,
        started_at: stop_reason === "none" ? nowIso : (effectiveStopStartTime as string),
        ended_at: stop_reason === "none" ? nowIso : null, // Operando entries are instant
        duration_minutes: stop_reason === "none" ? 0 : null,
        defect_description: (stop_reason === "maintenance" || (stop_reason as any) === "servico") ? defect_description : null,
        changed_by_driver: changed_by_driver || null,
      });

      if (insertHistoryError) throw insertHistoryError;

      // If returning from preventive maintenance, reset the maintenance plan
      if (wasPreventiveMaintenance) {
        // Get latest horimeter reading
        const { data: latestShift } = await supabase
          .from("daily_shift_records")
          .select("final_horimeter, initial_horimeter")
          .eq("equipment_id", id)
          .order("shift_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const currentHorimeter = latestShift?.final_horimeter ?? latestShift?.initial_horimeter;

        if (currentHorimeter != null) {
          // Update the maintenance plan to reset the counter
          await supabase
            .from("equipment_maintenance_plan")
            .update({
              base_horimeter: currentHorimeter,
              last_maintenance_date: nowIso,
              last_maintenance_horimeter: currentHorimeter,
            })
            .eq("equipment_id", id);
        }
      }

      const { data, error } = await supabase
        .from("equipment")
        .update({ stop_reason, stop_start_time: effectiveStopStartTime })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-stop-history"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      plate?: string;
      driver?: string;
      helper?: string;
      name?: string;
      equipment_type?: EquipmentType;
      image_url?: string | null;
      mobilization_status?: MobilizationStatus;
    }) => {
      const { data, error } = await supabase
        .from("equipment")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipment: Partial<Omit<Equipment, "id" | "created_at" | "updated_at" | "stop_reason" | "stop_start_time">> & { name: string; plate: string; equipment_type: EquipmentType }) => {
      const env = typeof window !== "undefined"
        ? (localStorage.getItem("selected_environment") ?? sessionStorage.getItem("selected_environment"))
        : null;
      const payload: any = { ...equipment };
      if (env && !payload.environment) payload.environment = env;
      const { data, error } = await supabase
        .from("equipment")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useEquipmentStopHistory(equipmentId?: string) {
  return useQuery({
    queryKey: ["equipment-stop-history", equipmentId],
    queryFn: async () => {
      let query = supabase
        .from("equipment_stop_history")
        .select("id, equipment_id, stop_reason, started_at, ended_at, duration_minutes, defect_description, changed_by_driver, created_at")
        .order("started_at", { ascending: false });

      if (equipmentId) {
        query = query.eq("equipment_id", equipmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EquipmentStopHistory[];
    },
    enabled: !!equipmentId || equipmentId === undefined,
  });
}
