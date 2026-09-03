import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Wrench,
  Droplets,
  Sprout,
  Waves,
  FuelIcon,
  CloudDrizzle,
  CarFront,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEquipment, useUpdateEquipmentStatus } from "@/hooks/useEquipment";
import { useProfile } from "@/hooks/useProfile";

interface ServiceOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const SERVICES: ServiceOption[] = [
  { id: "lavagem_mirante", label: "Lavagem Mirante", icon: <Waves className="h-6 w-6" />, color: "bg-cyan-600 hover:bg-cyan-700" },
  { id: "irrigacao_carretel", label: "Irrigação Carretel", icon: <Droplets className="h-6 w-6" />, color: "bg-blue-600 hover:bg-blue-700" },
  { id: "irrigacao_faixa_3_4", label: "Irrigação FAIXA 3 e 4", icon: <Sprout className="h-6 w-6" />, color: "bg-emerald-600 hover:bg-emerald-700" },
  { id: "abastecimento_tanque_irrigacao", label: "Abastecimento do Tanque de Irrigação", icon: <FuelIcon className="h-6 w-6" />, color: "bg-indigo-600 hover:bg-indigo-700" },
  { id: "lavagem_vertedouro", label: "Lavagem Vertedouro", icon: <Waves className="h-6 w-6" />, color: "bg-teal-600 hover:bg-teal-700" },
  { id: "umectacao_vias", label: "Umectação de Vias", icon: <CloudDrizzle className="h-6 w-6" />, color: "bg-sky-600 hover:bg-sky-700" },
  { id: "lavagem_carro", label: "Lavagem de Carro", icon: <CarFront className="h-6 w-6" />, color: "bg-slate-600 hover:bg-slate-700" },
];

const ServicosMotorista = () => {
  const navigate = useNavigate();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activeService, setActiveService] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const { data: equipment = [] } = useEquipment();
  const { data: profile } = useProfile();
  const updateStatus = useUpdateEquipmentStatus();

  useEffect(() => {
    const id = localStorage.getItem("selectedVehicleId");
    setSelectedVehicleId(id);
    if (id) {
      const saved = localStorage.getItem(`active_service_${id}`);
      if (saved) setActiveService(saved);
    }
  }, []);

  const vehicle = equipment.find((e) => e.id === selectedVehicleId);

  const handleSelect = async (service: ServiceOption) => {
    if (!selectedVehicleId || !vehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }
    setSubmittingId(service.id);
    try {
      const now = new Date().toISOString();
      await updateStatus.mutateAsync({
        id: selectedVehicleId,
        stop_reason: "servico" as any,
        stop_start_time: now,
        previousStopReason: (vehicle.stop_reason as any) || "none",
        previousStopStartTime: vehicle.stop_start_time,
        defect_description: `Serviço: ${service.label}`,
        changed_by_driver: profile?.full_name || null,
      });

      localStorage.setItem(`active_service_${selectedVehicleId}`, service.id);
      setActiveService(service.id);

      // WhatsApp notify
      supabase.functions
        .invoke("wapi-driver-status-notify", {
          body: {
            equipmentId: selectedVehicleId,
            equipmentName: vehicle.name,
            plate: vehicle.plate,
            newStatus: "servico",
            previousStatus: vehicle.stop_reason || "none",
            driverName: profile?.full_name || null,
            extraInfo: `*Serviço:* ${service.label}`,
          },
        })
        .catch((e) => console.warn("driver-status-notify failed", e));

      toast.success(`Serviço selecionado: ${service.label}`);
      // Volta para o painel - o status já aparece na Parte Diária
      setTimeout(() => navigate("/painel-motorista"), 600);

    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao registrar serviço: ${err?.message || err}`);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm safe-area-inset-top">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/painel-motorista")}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5" /> Serviços
          </h1>
        </div>
      </header>

      <main className="px-3 py-4 space-y-3">
        {vehicle && (
          <Card>
            <CardContent className="py-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground truncate">{vehicle.name}</span>
                <span>•</span>
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {vehicle.plate}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selecione a atividade</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2.5">
            {SERVICES.map((s) => {
              const isActive = activeService === s.id;
              const isLoading = submittingId === s.id;
              return (
                <Button
                  key={s.id}
                  variant="outline"
                  className={`h-auto min-h-[60px] py-3 px-3 flex items-center justify-start gap-3 touch-manipulation transition-transform active:scale-95 text-white border-transparent ${s.color} ${
                    isActive ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                  onClick={() => handleSelect(s)}
                  disabled={!!submittingId}
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : isActive ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    s.icon
                  )}
                  <span className="text-sm font-semibold text-left flex-1">{s.label}</span>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center px-2">
          O serviço selecionado é registrado na Parte Diária e enviado ao grupo do
          WhatsApp automaticamente.
        </p>
      </main>
    </div>
  );
};

export default ServicosMotorista;
