import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, LogOut, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEquipment } from "@/hooks/useEquipment";
import { useOfflineSyncV2 } from "@/hooks/useOfflineSyncV2";
import { useEnvironment } from "@/hooks/useEnvironment";

import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Fixed driver-vehicle assignments (userId -> equipmentId)
const FIXED_VEHICLE_ASSIGNMENTS: Record<string, string> = {
  "efd87157-7281-4542-bcb9-afe230a76708": "b24426c7-40ad-4033-9823-652e487a9534", // Anderson da Cruz -> Pipa 01
  "b40c05a7-ab8e-4491-9774-b469ca6bb89c": "a59c51cf-7304-4207-858c-cd9782d14be7", // Paulo Felix -> Pipa 02
  "975a7ee9-0d2d-40e6-bef3-9c805c0836aa": "6daf33a8-ec29-4151-be69-9e37c8438838", // Jeová Marcelino -> Munk
};

export default function SelecaoVeiculo() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const { environment: env } = useEnvironment();
  const { data: equipment = [], isLoading } = useEquipment();
  
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";

  // Realtime listener for administrative reset
  useEffect(() => {
    const channel = supabase.channel(`driver_force_logout_selection_${currentEnv}`)
      .on('broadcast', { event: 'force_logout' }, () => {
        toast.info("O administrador realizou um reset. Você será desconectado.", {
          duration: 5000,
          id: "admin-reset-toast-selection"
        });
        
        // Wait a moment then sign out
        setTimeout(async () => {
          await signOut();
          navigate("/auth", { replace: true });
        }, 2000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentEnv, signOut, navigate]);
  const { addPendingAction, isOnline } = useOfflineSyncV2();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [helperName, setHelperName] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  // Fixed vehicle assignments disabled: every driver may pick any Pipa/Munk
  // that is not currently held by another driver.
  const hasFixedVehicle = false;
  const fixedVehicleId: string | null = null;
  const fixedVehicle = null as any;

  // Check if user already has a vehicle selected
  useEffect(() => {
    const savedVehicle = localStorage.getItem("selectedVehicleId");
    if (savedVehicle) {
      navigate("/painel-motorista", { replace: true });
      return;
    }

    // No localStorage selection — try to recover from the DB.
    if (!profile?.full_name) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("equipment")
          .select("id")
          .eq("driver", profile.full_name)
          .in("equipment_type", ["pipa", "munk"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error || !data?.id) return;
        localStorage.setItem("selectedVehicleId", data.id);
        navigate("/painel-motorista", { replace: true });
      } catch (e) {
        console.warn("auto-restore selected vehicle from DB failed", e);
      }
    })();
  }, [navigate, profile?.full_name]);

  // Show all Pipa and Munk vehicles that are free OR already held by this driver
  // AND meet the new business rules for availability
  const availableVehicles = equipment.filter((eq) => {
    const isPipaOrMunk = eq.equipment_type === "pipa" || eq.equipment_type === "munk";
    if (!isPipaOrMunk) return false;

    const driverField = (eq.driver || "").trim();
    const isFree = driverField === "";
    const isMine = !!profile?.full_name && driverField === profile.full_name;
    
    // New rules:
    // 1. Not in Maintenance Fora
    const unavailableReasons = [
      "manutencao_fora", 
      "manutencao_externa", 
      "oficina_externa", 
      "trabalho_externo"
    ];
    const isUnavailable = unavailableReasons.includes(eq.stop_reason as string);
    if (isUnavailable) return false;

    // 2. Performed by the query itself if env is provided, but double check here
    if (env && (eq as any).environment && (eq as any).environment !== env) return false;

    return isFree || isMine;
  });

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
  };

  const handleConfirm = async () => {
    const vehicleId = hasFixedVehicle ? fixedVehicleId : selectedVehicle;
    if (!vehicleId || !profile) return;

    if (!profile.full_name?.trim()) {
      toast.error("Não foi possível identificar o motorista logado");
      return;
    }

    setIsConfirming(true);
    
    try {
      const selectedEquipmentData = equipment.find(eq => eq.id === vehicleId);
      if (!selectedEquipmentData) return;

      const nowIso = new Date().toISOString();

      if (isOnline) {
        // Use RPC for atomic equipment claiming with concurrency protection
        const { data: claimResult, error: claimError } = await supabase
          .rpc('rpc_claim_equipment', {
            p_equipment_id: vehicleId,
            p_driver_name: profile.full_name,
            p_helper_name: helperName.trim(),
            p_user_id: user?.id,
            p_environment: env
          });

        if (claimError) throw claimError;
        
        // Handle logic error from the RPC
        const result = claimResult as { ok: boolean; auto_closed?: boolean; error?: string; driver_name?: string; equipment_name?: string; shift_start_time?: string };
        
        if (!result.ok) {
          const errorMessage = result.driver_name 
            ? `Este equipamento está em uso por ${result.driver_name} desde ${new Date(result.shift_start_time!).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. Finalize o turno anterior ou solicite liberação ao administrador.`
            : (result.error || "Este equipamento não está mais disponível.");
          
          toast.error(errorMessage, { duration: 6000 });
          // Refresh list to show current availability
          queryClient.invalidateQueries({ queryKey: ["equipment"] });
          return;
        }

        if (result.auto_closed) {
          toast.info("Um turno antigo abandonado foi encerrado automaticamente para permitir sua seleção.", {
            duration: 8000,
            icon: <Truck className="h-4 w-4 text-blue-500" />
          });
        }
      } else {
        // Offline: enfileira a atualização limpando o status
        await addPendingAction("equipment_status", {
          id: vehicleId,
          driver: profile.full_name,
          helper: helperName.trim(),
          stop_reason: null,
          stop_start_time: null,
        }, 2);
        toast.info("Sem internet. Seleção salva offline e será sincronizada.");
      }

      // Invalidate equipment query to reflect changes
      queryClient.invalidateQueries({ queryKey: ["equipment"] });

      // Store selected vehicle in localStorage
      localStorage.setItem("selectedVehicleId", vehicleId);
      localStorage.setItem("selectedDriverName", profile.full_name.trim());
      localStorage.setItem(`selected_driver_name_${vehicleId}`, profile.full_name.trim());
      if (user?.id) {
        localStorage.setItem("selectedVehicleUserId", user.id);
        localStorage.setItem(`selected_vehicle_user_${vehicleId}`, user.id);
      }

      if (isOnline) {
        toast.success("Veículo selecionado! Clique em 'Operar' para iniciar o turno.");
      }
      navigate("/painel-motorista");
    } catch (error) {
      console.error("Error confirming vehicle:", error);
      toast.error("Erro ao confirmar veículo");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleLogout = async () => {
    try {
      // If there was a selected vehicle, clear the driver field
      const savedVehicle = localStorage.getItem("selectedVehicleId");
      if (savedVehicle) {
        await supabase
          .from("equipment")
          .update({ driver: "", helper: "" })
          .eq("id", savedVehicle);
      }
      
      localStorage.removeItem("selectedVehicleId");
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error during logout:", error);
      // Still try to sign out even if clearing driver failed
      localStorage.removeItem("selectedVehicleId");
      await signOut();
      navigate("/auth");
    }
  };

  const getVehicleTypeLabel = (type: string) => {
    switch (type) {
      case "pipa":
        return "Pipa";
      case "munk":
        return "Munk";
      default:
        return type;
    }
  };

  // Determine helper label based on vehicle type
  const getHelperLabel = (vehicleType: string) => {
    return vehicleType === "munk" ? "Nome do Sinaleiro" : "Nome do Ajudante";
  };

  const getHelperPlaceholder = (vehicleType: string) => {
    return vehicleType === "munk" ? "Digite o nome do sinaleiro" : "Digite o nome do ajudante";
  };

  // Render fixed vehicle UI for drivers with assigned vehicles
  if (hasFixedVehicle && fixedVehicle) {
    const helperLabel = getHelperLabel(fixedVehicle.equipment_type);
    const helperPlaceholder = getHelperPlaceholder(fixedVehicle.equipment_type);

    return (
      <div className="h-[100dvh] overflow-hidden bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card/95  border-b shadow-sm">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-bold">Iniciar Turno</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
          {/* Welcome Message */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">
              Olá, {profile?.full_name?.split(" ")[0] || "Motorista"}!
            </h2>
            <p className="text-muted-foreground">
              Seu veículo está pronto para iniciar o turno
            </p>
          </div>

          {/* Fixed Vehicle Card */}
          <Card className="ring-2 ring-primary bg-primary/5 border-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <VehicleIcon 
                    type={fixedVehicle.equipment_type as "pipa" | "munk" | "camionete" | "onibus"} 
                    size="lg" 
                    imageUrl={(fixedVehicle as any).image_url}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{fixedVehicle.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono bg-muted px-2 py-0.5 rounded">
                      {fixedVehicle.plate}
                    </span>
                    <span>•</span>
                    <span>{getVehicleTypeLabel(fixedVehicle.equipment_type)}</span>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Helper/Sinaleiro Name Input - REQUIRED */}
          <Card className={`mt-4 ${helperName.trim() ? 'border-primary/30 bg-primary/5' : 'border-destructive/50 bg-destructive/5'}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className={`h-4 w-4 ${helperName.trim() ? 'text-primary' : 'text-destructive'}`} />
                <Label htmlFor="helper-name" className="text-sm font-semibold">
                  {helperLabel} <span className="text-destructive">*</span>
                </Label>
              </div>
              <Input
                id="helper-name"
                placeholder={helperPlaceholder}
                value={helperName}
                onChange={(e) => setHelperName(e.target.value)}
                className={`h-10 text-sm ${!helperName.trim() ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                required
              />
              {!helperName.trim() && (
                <p className="text-xs text-destructive mt-1">
                  Campo obrigatório para iniciar o turno
                </p>
              )}
            </CardContent>
          </Card>

          {/* Confirm Button */}
          <div className="mt-4 pb-6">
            <Button
              className="w-full h-12 text-base font-bold"
              disabled={isConfirming || !helperName.trim()}
              onClick={handleConfirm}
            >
              {isConfirming ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Truck className="h-5 w-5 mr-2" />
              )}
              {isConfirming ? "Iniciando..." : "Iniciar Turno"}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Default UI for drivers without fixed vehicle
  return (
    <div className="h-[100dvh] overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95  border-b shadow-sm safe-area-inset-top">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">Seleção de Veículo</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 max-w-lg mx-auto w-full safe-area-inset-bottom">
        {/* Welcome Message */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">
            Olá, {profile?.full_name?.split(" ")[0] || "Motorista"}!
          </h2>
          <p className="text-muted-foreground">
            Selecione o veículo que você está operando hoje
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : availableVehicles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">
                Todos os equipamentos já estão em uso ou em manutenção.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Aguarde a liberação por outro motorista ou entre em contato com o encarregado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Vehicle Grid */}
            <div className="grid gap-3">
              {availableVehicles.map((vehicle) => (
                <Card
                  key={vehicle.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedVehicle === vehicle.id
                      ? "ring-2 ring-primary bg-primary/5 border-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => handleSelectVehicle(vehicle.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          selectedVehicle === vehicle.id
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <VehicleIcon 
                          type={vehicle.equipment_type as "pipa" | "munk" | "camionete" | "onibus"} 
                          size="lg" 
                          imageUrl={(vehicle as any).image_url}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg truncate">{vehicle.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-sm text-muted-foreground">
                          <span className="font-mono bg-muted px-2 py-0.5 rounded">
                            {vehicle.plate}
                          </span>
                          <span>•</span>
                          <span>{getVehicleTypeLabel(vehicle.equipment_type)}</span>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedVehicle === vehicle.id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {selectedVehicle === vehicle.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Helper/Sinaleiro Name Input - Show only when vehicle is selected - REQUIRED */}
            {selectedVehicle && (() => {
              const selectedVehicleData = availableVehicles.find(v => v.id === selectedVehicle);
              const helperLabel = selectedVehicleData ? getHelperLabel(selectedVehicleData.equipment_type) : "Nome do Ajudante";
              const helperPlaceholder = selectedVehicleData ? getHelperPlaceholder(selectedVehicleData.equipment_type) : "Digite o nome do ajudante";
              
              return (
                <Card className={`mt-4 ${helperName.trim() ? 'border-primary/30 bg-primary/5' : 'border-destructive/50 bg-destructive/5'}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className={`h-4 w-4 ${helperName.trim() ? 'text-primary' : 'text-destructive'}`} />
                      <Label htmlFor="helper-name" className="text-sm font-semibold">
                        {helperLabel} <span className="text-destructive">*</span>
                      </Label>
                    </div>
                    <Input
                      id="helper-name"
                      placeholder={helperPlaceholder}
                      value={helperName}
                      onChange={(e) => setHelperName(e.target.value)}
                      className={`h-10 text-sm ${!helperName.trim() ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                      required
                    />
                    {!helperName.trim() && (
                      <p className="text-xs text-destructive mt-1">
                        Campo obrigatório para iniciar o turno
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Confirm Button */}
            <div className="mt-4 pb-6">
              <Button
                className="w-full h-12 text-base font-bold"
                disabled={!selectedVehicle || isConfirming || !helperName.trim()}
                onClick={handleConfirm}
              >
                {isConfirming ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Truck className="h-5 w-5 mr-2" />
                )}
                {isConfirming ? "Confirmando..." : "Confirmar Veículo"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
