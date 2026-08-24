import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PendingAction {
  id: string;
  type: "equipment_status" | "equipment_movement" | "stop_history";
  payload: Record<string, unknown>;
  timestamp: string;
  retries: number;
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
}

const STORAGE_KEY = "driver_panel_pending_actions";
const LAST_SYNC_KEY = "driver_panel_last_sync";
const MAX_RETRIES = 3;

// Get pending actions from localStorage
const getPendingActions = (): PendingAction[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save pending actions to localStorage
const savePendingActions = (actions: PendingAction[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  } catch (error) {
    console.error("Error saving pending actions:", error);
  }
};

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function useOfflineSync() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: getPendingActions().length,
    lastSyncTime: localStorage.getItem(LAST_SYNC_KEY),
  });
  
  const syncInProgress = useRef(false);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: true }));
      // Auto-sync when coming back online
      syncPendingActions();
    };

    const handleOffline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: false }));
      toast.warning("Você está offline. As alterações serão salvas localmente.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Add action to pending queue
  const addPendingAction = useCallback((
    type: PendingAction["type"],
    payload: Record<string, unknown>
  ) => {
    const action: PendingAction = {
      id: generateId(),
      type,
      payload,
      timestamp: new Date().toISOString(),
      retries: 0,
    };

    const actions = getPendingActions();
    actions.push(action);
    savePendingActions(actions);

    setSyncState((prev) => ({
      ...prev,
      pendingCount: actions.length,
    }));

    return action.id;
  }, []);

  // Process a single action
  const processAction = async (action: PendingAction): Promise<boolean> => {
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
          const { equipment_id, stop_reason, started_at, ended_at, duration_minutes, changed_by_driver, defect_description } = 
            action.payload as {
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
            // Update existing record
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
            // Insert new record
            const { error } = await supabase
              .from("equipment_stop_history")
              .insert({
                equipment_id,
                stop_reason,
                started_at,
                changed_by_driver,
                defect_description,
              });
              
            if (error) throw error;
          }
          break;
        }

        case "equipment_movement": {
          const movementPayload = action.payload as {
              equipment_name: string;
              plate: string;
              movement_type: "entrada" | "saida";
              exit_reason?: "manutencao_corretiva" | "manutencao_preventiva" | "vistoria" | "operando" | "aguardando_frente_servico" | "fim_turno" | null;
              problem_description?: string | null;
              observation?: string | null;
              created_by: string;
            };

          const { error } = await supabase
            .from("equipment_movements")
            .insert({
              equipment_name: movementPayload.equipment_name,
              plate: movementPayload.plate,
              movement_type: movementPayload.movement_type,
              exit_reason: movementPayload.exit_reason || null,
              problem_description: movementPayload.problem_description || null,
              observation: movementPayload.observation || null,
              created_by: movementPayload.created_by,
            });
            
          if (error) throw error;
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

    const actions = getPendingActions();
    if (actions.length === 0) {
      return;
    }

    syncInProgress.current = true;
    setSyncState((prev) => ({ ...prev, isSyncing: true }));


    const failedActions: PendingAction[] = [];
    let successCount = 0;

    for (const action of actions) {
      const success = await processAction(action);
      
      if (success) {
        successCount++;
      } else {
        // Increment retry count and keep if under max
        action.retries++;
        if (action.retries < MAX_RETRIES) {
          failedActions.push(action);
        } else {
          console.warn("Action exceeded max retries, discarding:", action);
        }
      }
    }

    // Save remaining failed actions
    savePendingActions(failedActions);
    
    const now = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, now);

    setSyncState((prev) => ({
      ...prev,
      isSyncing: false,
      pendingCount: failedActions.length,
      lastSyncTime: now,
    }));

    syncInProgress.current = false;

    if (successCount > 0) {
      toast.success(`${successCount} ${successCount === 1 ? "alteração sincronizada" : "alterações sincronizadas"} com sucesso!`);
    }

    if (failedActions.length > 0) {
      toast.warning(`${failedActions.length} ${failedActions.length === 1 ? "alteração pendente" : "alterações pendentes"} de sincronização.`);
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

  // Clear all pending actions (use with caution)
  const clearPendingActions = useCallback(() => {
    savePendingActions([]);
    setSyncState((prev) => ({ ...prev, pendingCount: 0 }));
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
