import { memo } from "react";
import { useEquipment } from "@/hooks/useEquipment";
import { useRefuelingData } from "@/hooks/useRefuelingData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { Loader2, Truck, Activity, Wrench, Clock, PauseCircle, Droplets } from "lucide-react";

const getStatusInfo = (stopReason: string | null) => {
  const reason = (stopReason || "").toLowerCase();
  
  if (reason === "none" || reason === "") {
    return {
      label: "Operando",
      color: "bg-green-500/10 text-green-600 border-green-500/30",
      icon: <Activity className="h-3 w-3" />,
    };
  }

  if (reason === "waiting") {
    return {
      label: "Aguardando",
      color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
      icon: <PauseCircle className="h-3 w-3" />,
    };
  }

  if (reason.includes("manutenc") || reason.includes("manutenç") || reason.includes("oficina") || reason === "maintenance") {
    if (reason.includes("preventiva")) {
      return {
        label: "Manutenção Preventiva",
        color: "bg-orange-500/10 text-orange-600 border-orange-500/30",
        icon: <Wrench className="h-3 w-3" />,
      };
    }
    return {
      label: "Manutenção",
      color: "bg-red-500/10 text-red-600 border-red-500/30",
      icon: <Wrench className="h-3 w-3" />,
    };
  }

  switch (reason) {
    case "aguardando_frente_servico":
      return {
        label: "Aguardando Frente",
        color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
        icon: <PauseCircle className="h-3 w-3" />,
      };
    case "fim_turno":
    case "end_of_shift":
      return {
        label: "Fim de Turno",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
        icon: <Clock className="h-3 w-3" />,
      };
    case "rain":
      return {
        label: "Parado (Chuva)",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
        icon: <Clock className="h-3 w-3" />,
      };
    case "end_of_day":
      return {
        label: "Abastecendo",
        color: "bg-red-600/10 text-red-600 border-red-600/30",
        icon: <Clock className="h-3 w-3" />,
      };
    case "almoco":
      return {
        label: "Almoço",
        color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
        icon: <Clock className="h-3 w-3" />,
      };
    case "vistoria":
      return {
        label: "Vistoria",
        color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
        icon: <Wrench className="h-3 w-3" />,
      };
    default:
      return {
        label: "Desconhecido",
        color: "bg-gray-500/10 text-gray-600 border-gray-500/30",
        icon: <Truck className="h-3 w-3" />,
      };
  }
};

const VehicleRow = memo(({ vehicle, vehicleRefueling }: { vehicle: any, vehicleRefueling: any }) => {
  const statusInfo = getStatusInfo(vehicle.stop_reason);
  const hasRefueling = vehicleRefueling && vehicleRefueling.count > 0;
  
  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <div className={vehicle.image_url ? "" : "p-0.5 rounded-lg bg-background"}>
          <VehicleIcon
            type={vehicle.equipment_type as "pipa" | "munk" | "camionete" | "onibus"}
            size="sm"
            imageUrl={vehicle.image_url}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{vehicle.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{vehicle.plate}</span>
            {vehicle.driver && (
              <>
                <span>•</span>
                <span className="truncate">{vehicle.driver}</span>
              </>
            )}
          </div>
        </div>
        <Badge variant="outline" className={`${statusInfo.color} shrink-0 text-xs`}>
          <span className="mr-1">{statusInfo.icon}</span>
          {statusInfo.label}
        </Badge>
      </div>
      
      {vehicle.equipment_type === "pipa" && hasRefueling && vehicleRefueling && (
        <div className="pl-12 space-y-1">
          <div className="flex items-center gap-2">
            <Droplets className="h-3 w-3 text-primary" />
            <span className="text-xs text-muted-foreground">
              {vehicleRefueling.count} abastecimento{vehicleRefueling.count !== 1 ? 's' : ''} no mês
            </span>
            <span className="text-xs font-medium text-primary">
              ({vehicleRefueling.liters.toLocaleString('pt-BR')} L)
            </span>
          </div>
          <div className="flex gap-2 text-[10px]">
            {vehicleRefueling.byPoint["46"] > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                Ponto 46: {vehicleRefueling.byPoint["46"]}
              </span>
            )}
            {vehicleRefueling.byPoint["3C"] > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                Ponto 3C: {vehicleRefueling.byPoint["3C"]}
              </span>
            )}
            {vehicleRefueling.byPoint["3D"] > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                Ponto 3D: {vehicleRefueling.byPoint["3D"]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export function EquipmentStatusList() {
  const { data: equipment = [], isLoading } = useEquipment();
  const { data: refuelingData, isLoading: isLoadingRefueling } = useRefuelingData();

  const vehicles = equipment.filter(
    (eq) => eq.equipment_type === "pipa" || eq.equipment_type === "munk"
  );

  const getVehicleRefuelingData = (vehiclePlate: string) => {
    if (!refuelingData?.refuelingByVehicleWithPoints) return null;
    return refuelingData.refuelingByVehicleWithPoints.find((v) => v.plate === vehiclePlate);
  };

  if (isLoading || isLoadingRefueling) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum veículo cadastrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Status dos Veículos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {vehicles.map((vehicle) => (
          <VehicleRow 
            key={vehicle.id} 
            vehicle={vehicle} 
            vehicleRefueling={getVehicleRefuelingData(vehicle.plate)} 
          />
        ))}
        
        {refuelingData && refuelingData.refuelingByPoint.some(p => p.count > 0) && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              Abastecimentos por Ponto (Mês Atual)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {refuelingData.refuelingByPoint.map((point) => (
                <div
                  key={point.point}
                  className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20"
                >
                  <p className="text-xs font-medium text-primary">
                    {point.point}
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {point.count}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {point.liters.toLocaleString('pt-BR')} L
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}