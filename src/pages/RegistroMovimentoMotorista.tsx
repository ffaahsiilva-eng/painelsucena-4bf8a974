import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn, LogOut, Wrench, Settings, Eye, Loader2, CheckCircle2, AlertTriangle, Gauge, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEquipment } from "@/hooks/useEquipment";
import { useCreateEquipmentMovement, useEquipmentCurrentlyOut, ExitReason } from "@/hooks/useEquipmentMovements";
import { useUpdateShiftRecord } from "@/hooks/useDailyShiftRecords";
import { useOfflineSyncV2 } from "@/hooks/useOfflineSyncV2";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type MovementType = "entrada" | "saida";

const EXIT_REASONS: { value: ExitReason; label: string; icon: React.ReactNode; color: string }[] = [
  { 
    value: "manutencao_corretiva", 
    label: "Manutenção Corretiva", 
    icon: <Wrench className="h-5 w-5" />,
    color: "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
  },
  { 
    value: "manutencao_preventiva", 
    label: "Manutenção Preventiva", 
    icon: <Settings className="h-5 w-5" />,
    color: "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400"
  },
  { 
    value: "vistoria", 
    label: "Vistoria", 
    icon: <Eye className="h-5 w-5" />,
    color: "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400"
  },
];

export default function RegistroMovimentoMotorista() {
  const navigate = useNavigate();
  const { data: equipment = [], isLoading: loadingEquipment } = useEquipment();
  const { data: equipmentCurrentlyOut = [] } = useEquipmentCurrentlyOut();
  const createMovement = useCreateEquipmentMovement();
  const updateShiftRecord = useUpdateShiftRecord();
  const { addPendingAction, isOnline } = useOfflineSyncV2();
  const { user } = useAuth();

  const [movementType, setMovementType] = useState<MovementType | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [exitReason, setExitReason] = useState<ExitReason | null>(null);
  const [problemDescription, setProblemDescription] = useState("");
  const [observation, setObservation] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState<MovementType | null>(null);
  const [exitHorimeter, setExitHorimeter] = useState("");
  const [exitKm, setExitKm] = useState("");
  
  // Check if we're in entry-only mode (equipment exit pending)
  const exitPending = localStorage.getItem("equipmentExitPending") === "true";
  
  const observationRef = useRef<HTMLDivElement>(null);

  // Get the vehicle ID the driver selected at login
  const savedVehicleId = localStorage.getItem("selectedVehicleId");
  
  // Filter equipment to only show the linked vehicle
  const linkedVehicle = equipment.filter(eq => eq.id === savedVehicleId);

  // Pre-select the vehicle the driver chose at login
  useEffect(() => {
    if (savedVehicleId && linkedVehicle.length > 0) {
      setSelectedEquipment(savedVehicleId);
    }
  }, [savedVehicleId, linkedVehicle.length]);

  // If exit is pending, default selection to "entrada" but keep the selector
  // visible so the driver can see SAÍDA blocked instead of hidden.
  useEffect(() => {
    if (exitPending && !movementType) {
      setMovementType("entrada");
    }
  }, [exitPending]);

  // Pre-fill horímetro/km from previous shift data
  useEffect(() => {
    if (savedVehicleId && movementType === "saida") {
      const storedH = localStorage.getItem(`shift_horimeter_${savedVehicleId}`);
      const storedK = localStorage.getItem(`shift_km_${savedVehicleId}`);
      if (storedH) setExitHorimeter(storedH);
      if (storedK) setExitKm(storedK);
    }
  }, [savedVehicleId, movementType]);

  // Auto-scroll when movement type is selected to show full form
  useEffect(() => {
    if (movementType && observationRef.current) {
      setTimeout(() => {
        observationRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 150);
    }
  }, [movementType]);

  const selectedEquipmentData = equipment.find(e => e.id === selectedEquipment);

  // Check if the selected equipment has a registered exit (is currently out)
  const isEquipmentOut = selectedEquipmentData
    ? equipmentCurrentlyOut.some(m => m.plate === selectedEquipmentData.plate)
    : false;
  const handleSubmit = async () => {
    if (!selectedEquipmentData || !movementType) {
      toast.error("Selecione o equipamento e o tipo de movimento");
      return;
    }

    if (movementType === "saida" && !exitReason) {
      toast.error("Selecione o motivo da saída");
      return;
    }

    if (movementType === "saida" && (!exitHorimeter.trim() || !exitKm.trim())) {
      toast.error("Preencha o Horímetro e KM final");
      return;
    }

    if (exitReason === "manutencao_corretiva" && !problemDescription.trim()) {
      toast.error("Descreva o problema para manutenção corretiva");
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("environment")
        .eq("user_id", user?.id)
        .single();
      
      const currentEnv = profile?.environment || "barcarena";

      if (isOnline) {
        // Caminho online: comportamento original
        await createMovement.mutateAsync({
          equipment_name: selectedEquipmentData.name,
          plate: selectedEquipmentData.plate,
          movement_type: movementType,
          exit_reason: movementType === "saida" ? exitReason : null,
          problem_description: exitReason === "manutencao_corretiva" ? problemDescription : null,
          observation: observation.trim() || null,
          environment: currentEnv,
        });

        if (movementType === "saida" && savedVehicleId) {
          const today = new Date().toISOString().split("T")[0];
          try {
            await updateShiftRecord.mutateAsync({
              id: undefined, // ensure it uses equipment_id + shift_date path
              equipment_id: savedVehicleId,
              shift_date: today,
              final_horimeter: parseFloat(exitHorimeter),
              final_km: parseFloat(exitKm),
            });
          } catch (e) {
            console.error("Error updating shift record telemetry:", e);
          }
        }

        // Atualiza stop_reason do equipamento para refletir manutenção/vistoria em destaques
        if (savedVehicleId) {
          const newStopReason =
            movementType === "saida" && exitReason
              ? exitReason // manutencao_corretiva | manutencao_preventiva | vistoria
              : null;
          try {
            await supabase
              .from("equipment")
              .update({ stop_reason: newStopReason })
              .eq("id", savedVehicleId);
          } catch (e) {
            console.error("Erro ao atualizar stop_reason do equipamento:", e);
          }
        }
      } else {
        // Caminho offline: enfileira para sincronizar quando voltar a internet
        if (!user?.id) {
          toast.error("Usuário não autenticado. Não é possível registrar offline.");
          return;
        }

        await addPendingAction("equipment_movement", {
          equipment_name: selectedEquipmentData.name,
          plate: selectedEquipmentData.plate,
          movement_type: movementType,
          exit_reason: movementType === "saida" ? exitReason : null,
          problem_description: exitReason === "manutencao_corretiva" ? problemDescription : null,
          observation: observation.trim() || null,
          created_by: user.id,
          environment: currentEnv,
        }, 2);

        if (movementType === "saida" && savedVehicleId) {
          const today = new Date().toISOString().split("T")[0];
          await addPendingAction("shift_record", {
            equipment_id: savedVehicleId,
            equipment_name: selectedEquipmentData.name,
            plate: selectedEquipmentData.plate,
            driver_name: selectedEquipmentData.driver || "",
            shift_date: today,
            final_horimeter: parseFloat(exitHorimeter),
            final_km: parseFloat(exitKm),
            update_existing: true,
          }, 1);
        }

        toast.success(
          movementType === "saida"
            ? "Saída salva offline. Será sincronizada ao reconectar."
            : "Entrada salva offline. Será sincronizada ao reconectar.",
        );
      }

      // Telemetria local (saída) — sempre salva
      if (movementType === "saida" && savedVehicleId) {
        localStorage.setItem("equipmentExitPending", "true");
      }

      // Entrada limpa flag
      if (movementType === "entrada") {
        localStorage.removeItem("equipmentExitPending");
      }

      // Show success animation
      setSuccessType(movementType);
      setShowSuccess(true);

      // Navigate after animation
      setTimeout(() => {
        if (movementType === "saida") {
          navigate("/registro-movimento-motorista", { replace: true });
          window.location.reload();
        } else {
          navigate("/painel-motorista", { replace: true });
        }
      }, 1800);
    } catch (error) {
      console.error("Error creating movement:", error);
      toast.error("Erro ao registrar movimento. Tente novamente.");
    }
  };

  const resetForm = () => {
    setMovementType(null);
    setExitReason(null);
    setProblemDescription("");
    setObservation("");
  };

  // Success overlay component
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 animate-scale-in">
          {/* Success Icon with pulse animation */}
          <div 
            className={`relative w-32 h-32 rounded-full flex items-center justify-center ${
              successType === "entrada" 
                ? "bg-green-500/20" 
                : "bg-red-500/20"
            }`}
          >
            {/* Pulse rings */}
            <div 
              className={`absolute inset-0 rounded-full animate-ping opacity-30 ${
                successType === "entrada" ? "bg-green-500" : "bg-red-500"
              }`}
              style={{ animationDuration: "1.5s" }}
            />
            <div 
              className={`absolute inset-2 rounded-full animate-ping opacity-20 ${
                successType === "entrada" ? "bg-green-500" : "bg-red-500"
              }`}
              style={{ animationDuration: "1.5s", animationDelay: "0.2s" }}
            />
            
            {/* Icon */}
            <div 
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center ${
                successType === "entrada" 
                  ? "bg-green-500 text-white" 
                  : "bg-red-500 text-white"
              }`}
            >
              <CheckCircle2 className="h-12 w-12 animate-[bounce_0.6s_ease-in-out]" />
            </div>
          </div>

          {/* Success text */}
          <div className="text-center space-y-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <h2 className={`text-2xl font-bold ${
              successType === "entrada" ? "text-green-500" : "text-red-500"
            }`}>
              {successType === "entrada" ? "Entrada" : "Saída"} Registrada!
            </h2>
            <p className="text-muted-foreground">
              Movimento salvo com sucesso
            </p>
          </div>

          {/* Vehicle info */}
          {selectedEquipmentData && (
            <div 
              className="bg-card border rounded-lg p-4 animate-fade-in" 
              style={{ animationDelay: "0.5s" }}
            >
              <div className="text-center">
                <p className="font-semibold text-lg">{selectedEquipmentData.name}</p>
                <p className="text-muted-foreground font-mono">{selectedEquipmentData.plate}</p>
              </div>
            </div>
          )}

          {/* Loading indicator for redirect */}
          <div className="flex items-center gap-2 text-muted-foreground animate-fade-in" style={{ animationDelay: "0.7s" }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Retornando ao painel...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm shrink-0">
        <div className="flex items-center gap-3 p-3">
          {!exitPending && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/painel-motorista")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-bold truncate">
            {exitPending ? "Registrar Entrada do Equipamento" : "Registro de Movimento"}
          </h1>
        </div>
        {exitPending && (
          <div className="px-3 pb-2">
            <Alert className="bg-amber-500/10 border-amber-500/30 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                O equipamento está fora da obra. Registre a entrada para liberar o painel.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 max-w-lg mx-auto space-y-4 pb-safe">
        {/* Equipment Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selecione o Equipamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Escolha o equipamento..." />
              </SelectTrigger>
              <SelectContent>
                {loadingEquipment ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Carregando...
                  </div>
                ) : linkedVehicle.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Nenhum veículo vinculado
                  </div>
                ) : (
                  linkedVehicle.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id} className="py-3">
                      <span className="font-medium">{eq.name}</span>
                      <span className="text-muted-foreground ml-2">({eq.plate})</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Movement Type Selection */}
        {selectedEquipment && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tipo de Movimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={movementType === "entrada" ? "default" : "outline"}
                  className={`h-20 flex-col gap-2 text-base ${
                    movementType === "entrada" 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : isEquipmentOut
                        ? "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                        : "border-muted text-muted-foreground opacity-50 cursor-not-allowed"
                  }`}
                  disabled={!isEquipmentOut}
                  onClick={() => {
                    setMovementType("entrada");
                    setExitReason(null);
                    setProblemDescription("");
                  }}
                >
                  <LogIn className="h-6 w-6" />
                  <span className="font-bold">ENTRADA</span>
                </Button>
                
                <Button
                  variant={movementType === "saida" ? "default" : "outline"}
                  className={`h-20 flex-col gap-2 text-base ${
                    movementType === "saida"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : isEquipmentOut
                        ? "border-muted text-muted-foreground opacity-50 cursor-not-allowed"
                        : "border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  }`}
                  disabled={isEquipmentOut}
                  onClick={() => {
                    setMovementType("saida");
                  }}
                >
                  <LogOut className="h-6 w-6" />
                  <span className="font-bold">SAÍDA</span>
                </Button>
              </div>

              {/* Warning when entry is not allowed */}
              {!isEquipmentOut && (
                <Alert className="bg-amber-500/10 border-amber-500/30">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                    Entrada só pode ser registrada se o equipamento tiver uma saída registrada anteriormente.
                  </AlertDescription>
                </Alert>
              )}

              {/* Warning when exit is blocked because equipment is already out */}
              {isEquipmentOut && (
                <Alert className="bg-red-500/10 border-red-500/30">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-xs text-red-700 dark:text-red-300">
                    Equipamento já está registrado como SAÍDA. Registre a entrada antes de registrar uma nova saída.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Exit Reason Selection (only for saida) */}
        {movementType === "saida" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Motivo da Saída</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={exitReason || ""}
                onValueChange={(value) => setExitReason(value as ExitReason)}
                className="space-y-3"
              >
                {EXIT_REASONS.map((reason) => (
                  <div key={reason.value}>
                    <RadioGroupItem
                      value={reason.value}
                      id={reason.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={reason.value}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${exitReason === reason.value 
                          ? reason.color + " border-current" 
                          : "border-border hover:border-muted-foreground/50"
                        }
                      `}
                    >
                      <div className={exitReason === reason.value ? "" : "text-muted-foreground"}>
                        {reason.icon}
                      </div>
                      <span className="font-medium text-base">{reason.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Horímetro / KM Final (only for saída) */}
        {movementType === "saida" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Telemetria Final *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  Horímetro Final
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={exitHorimeter}
                  onChange={(e) => setExitHorimeter(e.target.value)}
                  placeholder="Ex: 1250.5"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  KM Final
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={exitKm}
                  onChange={(e) => setExitKm(e.target.value)}
                  placeholder="Ex: 85430"
                  className="h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Problem Description (only for manutencao_corretiva) */}
        {exitReason === "manutencao_corretiva" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-red-600 dark:text-red-400">
                Descrição do Problema *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Descreva o problema encontrado no equipamento..."
                className="min-h-[100px] text-base"
              />
            </CardContent>
          </Card>
        )}

        {/* Observation Field */}
        {movementType && (
          <Card ref={observationRef}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Observação (opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Adicione uma observação se necessário..."
                className="min-h-[80px] text-base"
              />
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        {movementType && (
          <div className="flex gap-3 pt-2 pb-6">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={resetForm}
            >
              Limpar
            </Button>
            <Button
              className={`flex-1 h-12 text-base font-bold ${
                movementType === "entrada"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
              onClick={handleSubmit}
              disabled={createMovement.isPending}
            >
              {createMovement.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {movementType === "entrada" ? (
                    <LogIn className="h-5 w-5 mr-2" />
                  ) : (
                    <LogOut className="h-5 w-5 mr-2" />
                  )}
                  Registrar {movementType === "entrada" ? "Entrada" : "Saída"}
                </>
              )}
            </Button>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
