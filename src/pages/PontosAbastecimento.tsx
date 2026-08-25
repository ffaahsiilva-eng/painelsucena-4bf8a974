import { useState, useEffect } from "react";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Droplets, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEquipment } from "@/hooks/useEquipment";
import { useAddStatusToHistory } from "@/hooks/useDailyShiftRecords";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { confirmOnce } from "@/lib/pendingConfirm";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOfflineSyncV2 } from "@/hooks/useOfflineSyncV2";

const PONTOS_ABASTECIMENTO = ["46", "3C", "3D", "82"];

export default function PontosAbastecimento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPoint, setCurrentPoint] = useState<string | null>(null);
  const [refuelingStartTime, setRefuelingStartTime] = useState<string | null>(null);
  
  const selectedVehicleId = localStorage.getItem("selectedVehicleId");
  const { data: equipment = [], refetch } = useEquipment();
  const { data: profile } = useProfile();
  const addStatusToHistory = useAddStatusToHistory();
  const { isOnline, addPendingAction } = useOfflineSyncV2();
  
  const selectedVehicle = equipment.find(eq => eq.id === selectedVehicleId);

  // Check if currently refueling
  useEffect(() => {
    if (selectedVehicle) {
      // Cast to string for comparison since "abastecimento" may not be in the type enum
      const stopReason = selectedVehicle.stop_reason as string;
      if (stopReason === "abastecimento") {
        // Extract point from stop_start_time or check history
        checkCurrentRefueling();
      } else {
        setCurrentPoint(null);
        setRefuelingStartTime(null);
      }
    }
  }, [selectedVehicle?.stop_reason]);

  const checkCurrentRefueling = async () => {
    if (!selectedVehicleId) return;
    
    // Get the most recent open refueling record
    const { data } = await supabase
      .from("equipment_stop_history")
      .select("*")
      .eq("equipment_id", selectedVehicleId)
      .eq("stop_reason", "abastecimento")
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      // Extract point from defect_description (format: "Ponto: XX")
      const pointMatch = data.defect_description?.match(/Ponto: (.+)/);
      if (pointMatch) {
        setCurrentPoint(pointMatch[1]);
        setRefuelingStartTime(data.started_at);
      }
    }
  };

  const handlePointClick = async (point: string) => {
    if (!selectedVehicleId) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    // Bloquear seleção do ponto se o turno ainda não foi iniciado
    const horimeter = localStorage.getItem(`shift_horimeter_${selectedVehicleId}`);
    const km = localStorage.getItem(`shift_km_${selectedVehicleId}`);
    const shiftStarted = horimeter !== null && km !== null;
    if (!shiftStarted) {
      toast.error("Inicie o turno antes de selecionar um ponto de abastecimento");
      return;
    }


    await confirmOnce(
      `point:${selectedVehicleId}:${point}`,
      `Tem certeza que deseja selecionar o Ponto ${point}?`,
      async () => {
        setLoading(point);
        try {
          if (currentPoint === point) {
            await endRefueling(point);
          } else if (currentPoint) {
            toast.error(`Finalize o abastecimento no ponto ${currentPoint} primeiro`);
          } else {
            await startRefueling(point);
          }
        } catch (error) {
          console.error("Error handling refueling:", error);
          toast.error("Erro ao processar abastecimento");
        } finally {
          setLoading(null);
        }
      },
    );
  };

  const startRefueling = async (point: string) => {
    const now = new Date().toISOString();
    const wapiBody = {
      equipmentId: selectedVehicleId,
      equipmentName: selectedVehicle?.name,
      plate: selectedVehicle?.plate,
      newStatus: "abastecimento",
      previousStatus: selectedVehicle?.stop_reason || null,
      driverName: profile?.full_name || selectedVehicle?.driver || null,
      waterPoint: point,
      timestamp: now,
    };

    if (!isOnline) {
      addPendingAction("equipment_status", {
        id: selectedVehicleId,
        stop_reason: "abastecimento",
        stop_start_time: now,
      }).catch(e => console.warn(e));
      addPendingAction("stop_history", {
        equipment_id: selectedVehicleId,
        stop_reason: "abastecimento",
        started_at: now,
        defect_description: `Ponto: ${point}`,
        changed_by_driver: profile?.full_name || selectedVehicle?.driver || null,
      }).catch(e => console.warn(e));
      addPendingAction("wapi_invoke", {
        functionName: "wapi-driver-status-notify",
        body: wapiBody,
      }).catch(e => console.warn(e));
      
      setCurrentPoint(point);
      setRefuelingStartTime(now);
      toast.success(`Abastecimento salvo offline no ponto ${point}`);
      return;
    }

    try {
      // Update equipment status to abastecimento
      const { error: equipError } = await supabase
        .from("equipment")
        .update({
          stop_reason: "abastecimento",
          stop_start_time: now,
        })
        .eq("id", selectedVehicleId);

      if (equipError) throw equipError;

      // Create history record
      const { error: historyError } = await supabase
        .from("equipment_stop_history")
        .insert({
          equipment_id: selectedVehicleId,
          stop_reason: "abastecimento",
          started_at: now,
          defect_description: `Ponto: ${point}`,
          changed_by_driver: profile?.full_name || selectedVehicle?.driver || null,
        });

      if (historyError) throw historyError;

      // Also add to daily shift record status history
      if (selectedVehicleId) {
        await addStatusToHistory.mutateAsync({
          equipmentId: selectedVehicleId,
          status: "abastecimento",
          changedBy: profile?.full_name || selectedVehicle?.driver || null,
          description: `Abastecendo - Ponto: ${point}`,
        });
      }

      setCurrentPoint(point);
      setRefuelingStartTime(now);
      await refetch();

      // Fire-and-forget WhatsApp group notification
      supabase.functions.invoke("wapi-driver-status-notify", { body: wapiBody }).catch((e) => console.warn("driver-status-notify failed", e));

      toast.success(`Abastecimento iniciado no ponto ${point}`);
    } catch (err) {
      console.error(err);
      addPendingAction("equipment_status", {
        id: selectedVehicleId,
        stop_reason: "abastecimento",
        stop_start_time: now,
      }).catch(e => console.warn(e));
      addPendingAction("stop_history", {
        equipment_id: selectedVehicleId,
        stop_reason: "abastecimento",
        started_at: now,
        defect_description: `Ponto: ${point}`,
        changed_by_driver: profile?.full_name || selectedVehicle?.driver || null,
      }).catch(e => console.warn(e));
      addPendingAction("wapi_invoke", {
        functionName: "wapi-driver-status-notify",
        body: wapiBody,
      }).catch(e => console.warn(e));
      setCurrentPoint(point);
      setRefuelingStartTime(now);
      toast.warning("Erro de conexão. Alteração salva para sincronizar depois.");
    }
  };

  const endRefueling = async (point: string) => {
    const now = new Date();
    const nowIso = now.toISOString();

    // Calculate duration
    let durationMinutes = 0;
    if (refuelingStartTime) {
      const start = new Date(refuelingStartTime);
      durationMinutes = Math.round((now.getTime() - start.getTime()) / 60000);
    }

    const wapiBody = {
      equipmentId: selectedVehicleId,
      equipmentName: selectedVehicle?.name,
      plate: selectedVehicle?.plate,
      newStatus: "none",
      previousStatus: "abastecimento",
      driverName: profile?.full_name || selectedVehicle?.driver || null,
      extraInfo: `*Retorno do Ponto ${point}*\n*Duração:* ${durationMinutes} min`,
      timestamp: nowIso,
    };

    if (!isOnline) {
      addPendingAction("equipment_status", {
        id: selectedVehicleId,
        stop_reason: "operando",
        stop_start_time: nowIso,
      }).catch(e => console.warn(e));
      addPendingAction("stop_history", {
        update_ended_at: true,
        equipment_id: selectedVehicleId,
        ended_at: nowIso,
        duration_minutes: durationMinutes,
        stop_reason: "operando", // neq operando = abastecimento
      }).catch(e => console.warn(e));
      addPendingAction("stop_history", {
        equipment_id: selectedVehicleId,
        stop_reason: "operando",
        started_at: nowIso,
        defect_description: `Retorno do Ponto ${point}`,
        changed_by_driver: profile?.full_name || selectedVehicle?.driver || null,
      }).catch(e => console.warn(e));
      addPendingAction("wapi_invoke", {
        functionName: "wapi-driver-status-notify",
        body: wapiBody,
      }).catch(e => console.warn(e));
      
      setCurrentPoint(null);
      setRefuelingStartTime(null);
      toast.success(`Retorno salvo offline (${durationMinutes} min)`);
      return;
    }

    try {
      // Update equipment status back to operando
      const { error: equipError } = await supabase
        .from("equipment")
        .update({
          stop_reason: "operando",
          stop_start_time: nowIso,
        })
        .eq("id", selectedVehicleId);

      if (equipError) throw equipError;

      // Close the abastecimento history record (set end time)
      const { error: historyError } = await supabase
        .from("equipment_stop_history")
        .update({
          ended_at: nowIso,
          duration_minutes: durationMinutes,
        })
        .eq("equipment_id", selectedVehicleId)
        .eq("stop_reason", "abastecimento")
        .is("ended_at", null);

      if (historyError) throw historyError;

      // Create "Operando" history entry so it shows in Parte Diária
      await supabase
        .from("equipment_stop_history")
        .insert({
          equipment_id: selectedVehicleId,
          stop_reason: "operando",
          started_at: nowIso,
          defect_description: `Retorno do Ponto ${point}`,
          changed_by_driver: profile?.full_name || selectedVehicle?.driver || null,
        });

      // Also add to daily shift record status history
      if (selectedVehicleId) {
        await addStatusToHistory.mutateAsync({
          equipmentId: selectedVehicleId,
          status: "operando",
          changedBy: profile?.full_name || selectedVehicle?.driver || null,
          description: `Operando - Retorno do Ponto ${point}`,
        });
      }

      setCurrentPoint(null);
      setRefuelingStartTime(null);
      await refetch();

      // Fire-and-forget WhatsApp group notification
      supabase.functions.invoke("wapi-driver-status-notify", { body: wapiBody }).catch((e) => console.warn("driver-status-notify failed", e));

      toast.success(`Abastecimento finalizado (${durationMinutes} min)`);
    } catch (err) {
      console.error(err);
      addPendingAction("equipment_status", {
        id: selectedVehicleId,
        stop_reason: "operando",
        stop_start_time: nowIso,
      }).catch(e => console.warn(e));
      addPendingAction("stop_history", {
        update_ended_at: true,
        equipment_id: selectedVehicleId,
        ended_at: nowIso,
        duration_minutes: durationMinutes,
        stop_reason: "operando",
      }).catch(e => console.warn(e));
      addPendingAction("stop_history", {
        equipment_id: selectedVehicleId,
        stop_reason: "operando",
        started_at: nowIso,
        defect_description: `Retorno do Ponto ${point}`,
        changed_by_driver: profile?.full_name || selectedVehicle?.driver || null,
      }).catch(e => console.warn(e));
      addPendingAction("wapi_invoke", {
        functionName: "wapi-driver-status-notify",
        body: wapiBody,
      }).catch(e => console.warn(e));
      setCurrentPoint(null);
      setRefuelingStartTime(null);
      toast.warning("Erro de conexão. Retorno salvo para sincronizar depois.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center gap-2 p-2 sm:p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/painel-motorista")}
            className="shrink-0 h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold truncate flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              <EditablePageTitle pageKey="pontos-abastecimento" defaultValue="Pontos de Abastecimento" className="inline" as="h1" />
            </h1>
            {selectedVehicle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {selectedVehicle.name} • {selectedVehicle.plate}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-lg mx-auto">
        {/* Info Card */}
        <Card className="mb-6 bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-center text-blue-700 dark:text-blue-300">
              Selecione o ponto de abastecimento para registrar a parada
            </p>
          </CardContent>
        </Card>

        {/* Current Status */}
        {currentPoint && refuelingStartTime && (
          <Card className="mb-6 bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Abastecendo desde {format(new Date(refuelingStartTime), "HH:mm", { locale: ptBR })}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Clique novamente no ponto para finalizar
              </p>
            </CardContent>
          </Card>
        )}

        {/* Points Grid */}
        <div className="grid grid-cols-1 gap-4">
          {PONTOS_ABASTECIMENTO.map((point) => {
            const isActive = currentPoint === point;
            const isLoading = loading === point;
            const isDisabled = loading !== null || (currentPoint !== null && currentPoint !== point);

            return (
              <button
                key={point}
                onClick={() => handlePointClick(point)}
                disabled={isDisabled}
                className={`
                  relative p-6 sm:p-8 rounded-xl text-center font-bold text-xl sm:text-2xl
                  transition-all duration-200 transform
                  ${isActive 
                    ? "bg-amber-500 text-white shadow-lg scale-[1.02] animate-pulse" 
                    : "bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  }
                  ${isDisabled && !isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  touch-manipulation
                `}
              >
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                ) : isActive ? (
                  <div className="flex flex-col items-center gap-1">
                    <Droplets className="h-8 w-8 mb-1" />
                    <span>Abastecendo</span>
                    <span className="text-sm font-normal opacity-80">Ponto {point}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Droplets className="h-8 w-8 mb-1 opacity-80" />
                    <span>Ponto {point}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Instructions */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          O tempo de abastecimento será registrado automaticamente
        </p>
      </main>
    </div>
  );
}
