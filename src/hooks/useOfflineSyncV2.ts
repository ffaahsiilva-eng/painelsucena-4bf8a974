import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  addToSyncQueue,
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  getSyncQueueCount,
  setMetadata,
  getMetadata,
  initOfflineDB,
  SyncQueueItem,
} from "@/lib/offlineDb";

const MAX_RETRIES = 3;
const SYNC_DEBOUNCE_MS = 2000;

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  syncError: string | null;
  isInitialized: boolean;
}

export function useOfflineSyncV2() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    syncError: null,
    isInitialized: false,
  });

  const syncInProgress = useRef(false);
  const syncDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownOfflineToast = useRef(false);

  // Initialize IndexedDB and load state
  useEffect(() => {
    const initialize = async () => {
      try {
        await initOfflineDB();
        const count = await getSyncQueueCount();
        const lastSync = await getMetadata<string>("lastSyncTime");

        setSyncState((prev) => ({
          ...prev,
          pendingCount: count,
          lastSyncTime: lastSync,
          isInitialized: true,
        }));

        // Auto-sync if online and has pending
        if (navigator.onLine && count > 0) {
          syncPendingActions();
        }
      } catch (error) {
        console.error("Error initializing offline sync:", error);
        setSyncState((prev) => ({ ...prev, isInitialized: true }));
      }
    };

    initialize();
  }, []);

  // Online/offline event handlers
  useEffect(() => {
    const handleOnline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: true, syncError: null }));
      hasShownOfflineToast.current = false;
      
      // Debounced auto-sync when coming back online
      if (syncDebounceTimer.current) {
        clearTimeout(syncDebounceTimer.current);
      }
      syncDebounceTimer.current = setTimeout(() => {
        syncPendingActions();
      }, SYNC_DEBOUNCE_MS);

      toast.success("Conexão restaurada. Sincronizando...", {
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: false }));
      
      if (!hasShownOfflineToast.current) {
        toast.warning("Modo offline ativado. Suas alterações serão salvas localmente.", {
          duration: 5000,
        });
        hasShownOfflineToast.current = true;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (syncDebounceTimer.current) {
        clearTimeout(syncDebounceTimer.current);
      }
    };
  }, []);

  // Add action to pending queue
  const addPendingAction = useCallback(
    async (
      type: SyncQueueItem["type"],
      payload: Record<string, unknown>,
      priority: number = 1
    ): Promise<string> => {
      // Idempotency: inject a stable client_op_id so retries from offline queue
      // are deduped at the database level (UNIQUE index on client_op_id).
      const payloadWithOpId: Record<string, unknown> = {
        ...payload,
        client_op_id:
          (payload.client_op_id as string | undefined) ??
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      };

      const id = await addToSyncQueue({
        type,
        payload: payloadWithOpId,
        timestamp: new Date().toISOString(),
        priority,
      });

      const count = await getSyncQueueCount();
      setSyncState((prev) => ({ ...prev, pendingCount: count }));


      // If online, trigger debounced sync
      if (navigator.onLine) {
        if (syncDebounceTimer.current) {
          clearTimeout(syncDebounceTimer.current);
        }
        syncDebounceTimer.current = setTimeout(() => {
          syncPendingActions();
        }, SYNC_DEBOUNCE_MS);
      }

      return id;
    },
    []
  );


  // Process a single action
  const processAction = async (action: SyncQueueItem): Promise<boolean> => {
    try {
      switch (action.type) {
        case "equipment_status": {
          const { id, stop_reason, stop_start_time, driver, helper } = action.payload as {
            id: string;
            stop_reason: string;
            stop_start_time: string | null;
            driver?: string;
            helper?: string;
          };

          const updateData: Record<string, unknown> = {
            stop_reason,
            stop_start_time,
          };

          if (driver !== undefined) updateData.driver = driver;
          if (helper !== undefined) updateData.helper = helper;

          const { error } = await supabase
            .from("equipment")
            .update(updateData)
            .eq("id", id);

          if (error) throw error;
          break;
        }

        case "stop_history": {

          const {
            equipment_id,
            stop_reason,
            started_at,
            ended_at,
            duration_minutes,
            changed_by_driver,
            defect_description,
          } = action.payload as {
            equipment_id: string;
            stop_reason: string;
            started_at: string;
            ended_at?: string | null;
            duration_minutes?: number | null;
            changed_by_driver?: string | null;
            defect_description?: string | null;
          };

          // Check if we're inserting or updating
          if (action.payload.update_ended_at) {
            const { error } = await supabase
              .from("equipment_stop_history")
              .update({
                ended_at,
                duration_minutes,
              })
              .eq("equipment_id", equipment_id)
              .is("ended_at", null)
              .neq("stop_reason", stop_reason);

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("equipment_stop_history")
              .insert({
                equipment_id,
                stop_reason,
                started_at,
                changed_by_driver,
                defect_description,
                client_op_id: action.payload.client_op_id as string | undefined,
              } as never);

            // 23505 = unique_violation → idempotent retry, treat as success
            if (error && (error as { code?: string }).code !== "23505") throw error;
          }
          break;
        }

        case "equipment_movement": {
          const movementPayload = action.payload as {
            equipment_name: string;
            plate: string;
            movement_type: "entrada" | "saida";
            exit_reason?:
              | "manutencao_corretiva"
              | "manutencao_preventiva"
              | "vistoria"
              | "operando"
              | "aguardando_frente_servico"
              | "fim_turno"
              | null;
            problem_description?: string | null;
            observation?: string | null;
            created_by: string;
            client_op_id?: string;
          };

          const { error } = await supabase.from("equipment_movements").insert({
            equipment_name: movementPayload.equipment_name,
            plate: movementPayload.plate,
            movement_type: movementPayload.movement_type,
            exit_reason: movementPayload.exit_reason || null,
            problem_description: movementPayload.problem_description || null,
            observation: movementPayload.observation || null,
            created_by: movementPayload.created_by,
            client_op_id: movementPayload.client_op_id,
          } as never);

          if (error && (error as { code?: string }).code !== "23505") throw error;
          break;
        }

        case "shift_record": {
          const shiftPayload = action.payload as {
            equipment_id: string;
            equipment_name: string;
            plate: string;
            driver_name: string;
            helper_name?: string | null;
            shift_date: string;
            shift_start_time?: string | null;
            shift_end_time?: string | null;
            initial_fuel_level?: string | null;
            final_fuel_level?: string | null;
            initial_km?: number | null;
            final_km?: number | null;
            initial_horimeter?: number | null;
            final_horimeter?: number | null;
            status_history?: unknown[];
            refueling_points?: unknown[];
            update_existing?: boolean;
            client_op_id?: string;
          };

          if (shiftPayload.update_existing) {
            // Update existing record
            const updateData: Record<string, unknown> = {};
            if (shiftPayload.shift_end_time) updateData.shift_end_time = shiftPayload.shift_end_time;
            if (shiftPayload.final_fuel_level) updateData.final_fuel_level = shiftPayload.final_fuel_level;
            if (shiftPayload.final_km !== undefined) updateData.final_km = shiftPayload.final_km;
            if (shiftPayload.final_horimeter !== undefined) updateData.final_horimeter = shiftPayload.final_horimeter;
            if (shiftPayload.status_history) updateData.status_history = shiftPayload.status_history;
            if (shiftPayload.refueling_points) updateData.refueling_points = shiftPayload.refueling_points;

            const { error } = await supabase
              .from("daily_shift_records")
              .update(updateData)
              .eq("equipment_id", shiftPayload.equipment_id)
              .eq("shift_date", shiftPayload.shift_date);

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("daily_shift_records")
              .insert({
                equipment_id: shiftPayload.equipment_id,
                equipment_name: shiftPayload.equipment_name,
                plate: shiftPayload.plate,
                driver_name: shiftPayload.driver_name,
                helper_name: shiftPayload.helper_name || null,
                shift_date: shiftPayload.shift_date,
                shift_start_time: shiftPayload.shift_start_time || null,
                initial_fuel_level: shiftPayload.initial_fuel_level || null,
                initial_km: shiftPayload.initial_km || null,
                initial_horimeter: shiftPayload.initial_horimeter || null,
                status_history: (shiftPayload.status_history || []) as unknown as never,
                refueling_points: (shiftPayload.refueling_points || []) as unknown as never,
                client_op_id: shiftPayload.client_op_id,
              } as never);

            if (error && (error as { code?: string }).code !== "23505") throw error;
          }
          break;
        }

        case "driver_checklist": {
          const checklistPayload = action.payload as {
            equipment_id: string;
            equipment_name: string;
            plate: string;
            driver_name?: string | null;
            problem_description: string;
            created_by?: string | null;
            client_op_id?: string;
          };

          const { error } = await supabase.from("driver_vehicle_checklists").insert({
            equipment_id: checklistPayload.equipment_id,
            equipment_name: checklistPayload.equipment_name,
            plate: checklistPayload.plate,
            driver_name: checklistPayload.driver_name || null,
            problem_description: checklistPayload.problem_description,
            created_by: checklistPayload.created_by || null,
            client_op_id: checklistPayload.client_op_id,
          } as never);

          if (error && (error as { code?: string }).code !== "23505") throw error;
          break;
        }


        default:
          console.warn("Unknown action type:", action.type);
          return true; // Remove unknown actions
      }

      return true;
    } catch (error) {
      console.error("Error processing action:", error);
      return false;
    }
  };



  // Sync all pending actions
  const syncPendingActions = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) {
      return;
    }

    const actions = await getSyncQueue();
    if (actions.length === 0) {
      return;
    }

    syncInProgress.current = true;
    setSyncState((prev) => ({ ...prev, isSyncing: true, syncError: null }));


    let successCount = 0;
    let failedCount = 0;
    let stoppedForOrder = false;

    for (const action of actions) {
      const success = await processAction(action);

      if (success) {
        successCount++;
        await removeSyncQueueItem(action.id);
      } else {
        // STRICT ORDER: stop on first failure so later actions do not
        // overtake earlier ones. The queue will retry from this item on
        // the next sync trigger. After MAX_RETRIES we discard so a single
        // permanently-bad item cannot block the whole queue forever.
        const newRetries = action.retries + 1;

        if (newRetries >= MAX_RETRIES) {
          console.warn("Action exceeded max retries, discarding:", action);
          await removeSyncQueueItem(action.id);
          failedCount++;
          // Continue with the next item — bad one is gone.
        } else {
          await updateSyncQueueItem(action.id, { retries: newRetries });
          stoppedForOrder = true;
          break;
        }
      }
    }

    const now = new Date().toISOString();
    await setMetadata("lastSyncTime", now);

    const remainingCount = await getSyncQueueCount();

    setSyncState((prev) => ({
      ...prev,
      isSyncing: false,
      pendingCount: remainingCount,
      lastSyncTime: now,
      syncError: failedCount > 0 ? `${failedCount} ações falharam` : null,
    }));

    syncInProgress.current = false;

    if (successCount > 0) {
      toast.success(
        `${successCount} ${
          successCount === 1 ? "alteração sincronizada" : "alterações sincronizadas"
        } com sucesso!`
      );
    }

    if (remainingCount > 0) {
      toast.warning(
        `${remainingCount} ${
          remainingCount === 1 ? "alteração pendente" : "alterações pendentes"
        } de sincronização.`
      );
    }

    if (failedCount > 0) {
      toast.error(`${failedCount} ${failedCount === 1 ? "ação" : "ações"} descartada(s) após múltiplas tentativas.`);
    }
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    if (!navigator.onLine) {
      toast.error("Sem conexão com internet. Tente novamente quando estiver online.");
      return;
    }
    syncPendingActions();
  }, [syncPendingActions]);

  // Clear all pending actions
  const clearPendingActions = useCallback(async () => {
    const { clearSyncQueue } = await import("@/lib/offlineDb");
    await clearSyncQueue();
    setSyncState((prev) => ({ ...prev, pendingCount: 0 }));
  }, []);

  // Get pending actions for display
  const getPendingActions = useCallback(async (): Promise<SyncQueueItem[]> => {
    return getSyncQueue();
  }, []);

  return {
    ...syncState,
    addPendingAction,
    syncPendingActions,
    triggerSync,
    clearPendingActions,
    getPendingActions,
  };
}
