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
    <button
      type="button"
      onClick={handleClick}
      disabled={isUpdating || isCurrent}
      className={`bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all duration-150 border-none shadow-md touch-manipulation rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
        isUpdating || isCurrent
          ? "opacity-70 cursor-not-allowed"
          : "cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
      }`}
    >
      <div className="p-4 flex flex-col items-center justify-center text-center min-h-[90px] sm:min-h-[110px] pointer-events-none">
        <div className="text-white mb-2 pointer-events-none">
          {isUpdating ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <Fuel className="w-8 h-8" />
          )}
        </div>
        <h3 className="font-bold text-white text-xs uppercase tracking-wide pointer-events-none">
          {isCurrent ? "Abastecendo (Ativo)" : "Abastecendo"}
        </h3>
      </div>
    </button>
  );
}
