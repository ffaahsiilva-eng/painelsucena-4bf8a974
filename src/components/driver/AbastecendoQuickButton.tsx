import { useState } from "react";
import { Fuel, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useEquipment,
  useUpdateEquipmentStatus,
  type StopReason,
} from "@/hooks/useEquipment";
import { useProfile } from "@/hooks/useProfile";
import { useAddStatusToHistory } from "@/hooks/useDailyShiftRecords";
import { useOfflineSyncV2 } from "@/hooks/useOfflineSyncV2";
import { confirmOnce } from "@/lib/pendingConfirm";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Quick-access tile for setting status to "Abastecendo" (end_of_day),
 * mirroring the behavior of the status grid button in DriverStatusButtons.
 */
export function AbastecendoQuickButton() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { data: equipment = [] } = useEquipment();
  const { data: profile } = useProfile();
  const updateStatus = useUpdateEquipmentStatus();
  const addStatusToHistory = useAddStatusToHistory();
  const { isOnline, addPendingAction } = useOfflineSyncV2();
  const queryClient = useQueryClient();

  const selectedVehicleId =
    typeof window !== "undefined"
      ? localStorage.getItem("selectedVehicleId")
      : null;
  const selectedVehicle = equipment.find((eq) => eq.id === selectedVehicleId);
  const currentStatus = (selectedVehicle?.stop_reason || "none") as string;
  const isCurrent = currentStatus === "end_of_day";

  const shiftStarted =
    selectedVehicleId &&
    !!localStorage.getItem(`shift_horimeter_${selectedVehicleId}`) &&
    !!localStorage.getItem(`shift_km_${selectedVehicleId}`);

  const handleClick = async () => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }
    if (!shiftStarted) {
      toast.error("Inicie o turno antes de alterar o status");
      return;
    }
    if (isCurrent) return;

    await confirmOnce(
      `status:${selectedVehicleId}:end_of_day`,
      'Tem certeza que deseja selecionar "Abastecendo"?',
      async () => {
        setIsUpdating(true);
        const now = new Date().toISOString();
        const newStatus: StopReason = "end_of_day";

        const wapiBody = {
          equipmentId: selectedVehicleId,
          equipmentName: selectedVehicle.name,
          plate: selectedVehicle.plate,
          newStatus,
          previousStatus: currentStatus,
          driverName: profile?.full_name || null,
          timestamp: now,
        };

        if (!isOnline) {
          addPendingAction("equipment_status", {
            id: selectedVehicleId,
            stop_reason: newStatus,
            stop_start_time: now,
          });
          addPendingAction("stop_history", {
            equipment_id: selectedVehicleId,
            stop_reason: newStatus,
            started_at: now,
            changed_by_driver: profile?.full_name || null,
          });
          addPendingAction("wapi_invoke", {
            functionName: "wapi-driver-status-notify",
            body: wapiBody,
          });
          
          queryClient.setQueryData(["equipment"], (old: any) => {
            if (!old) return old;
            const newData = old.map((eq: any) =>
              eq.id === selectedVehicleId
                ? { ...eq, stop_reason: newStatus, stop_start_time: now }
                : eq
            );
            const env = localStorage.getItem("selected_environment") ?? sessionStorage.getItem("selected_environment");
            localStorage.setItem(`cached_equipment_${env || "default"}`, JSON.stringify(newData));
            return newData;
          });

          toast.success("Salvo offline: Abastecendo");
          setIsUpdating(false);
          return;
        }

        try {
          await updateStatus.mutateAsync({
            id: selectedVehicleId,
            stop_reason: newStatus as any,
            stop_start_time: now,
            previousStopReason: currentStatus as any,
            previousStopStartTime: selectedVehicle.stop_start_time,
            changed_by_driver: profile?.full_name || null,
          });
          await addStatusToHistory.mutateAsync({
            equipmentId: selectedVehicleId,
            status: newStatus,
            changedBy: profile?.full_name || null,
          });
          supabase.functions
            .invoke("wapi-driver-status-notify", { body: wapiBody })
            .catch((e) => console.warn("driver-status-notify failed", e));
          toast.success("Status alterado para: Abastecendo");
        } catch (err) {
          console.error(err);
          addPendingAction("equipment_status", {
            id: selectedVehicleId,
            stop_reason: newStatus,
            stop_start_time: now,
          });
          addPendingAction("stop_history", {
            equipment_id: selectedVehicleId,
            stop_reason: newStatus,
            started_at: now,
            changed_by_driver: profile?.full_name || null,
          });
          addPendingAction("wapi_invoke", {
            functionName: "wapi-driver-status-notify",
            body: wapiBody,
          });
          toast.warning("Erro de conexão. Alteração salva para sincronizar depois.");
        } finally {
          setIsUpdating(false);
        }
      },
    );
  };

  return (
    <div
      onClick={handleClick}
      className={`po-menu-item ${isUpdating || isCurrent ? "opacity-75 cursor-not-allowed" : ""}`}
      style={{ 
        background: isCurrent 
          ? "linear-gradient(145deg, #10b981, #059669)" 
          : "linear-gradient(145deg, #ef4444, #b91c1c)",
        outline: isCurrent ? "2px solid #10b981" : "none"
      }}
    >
      <div className="mb-1 text-white">
        {isUpdating ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : (
          <Fuel className="w-8 h-8" />
        )}
      </div>
      <span>{isCurrent ? "ABASTECENDO (ATIVO)" : "ABASTECENDO"}</span>
    </div>
  );
}
