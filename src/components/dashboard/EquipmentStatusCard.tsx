import { Truck, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEquipment, type Equipment, type StopReason } from "@/hooks/useEquipment";
import { useEquipmentCurrentlyOut } from "@/hooks/useEquipmentMovements";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import statusIconAsset from "@/assets/heartbeat.png.asset.json";
import maintenanceIconAsset from "@/assets/maintenance_icon.png.asset.json";
import stopIconAsset from "@/assets/stop_icon.png.asset.json";

const getEquipmentTypeColor = (type: string) => {
  switch (type) {
    case "pipa":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "munk":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "camionete":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "onibus":
      return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

const getEquipmentTypeLabel = (type: string) => {
  switch (type) {
    case "pipa":
      return "Pipa";
    case "munk":
      return "Munk";
    case "camionete":
      return "Camionete";
    case "onibus":
      return "Ônibus";
    default:
      return type;
  }
};

interface EquipmentListProps {
  equipment: Equipment[];
  emptyMessage: string;
}

const EquipmentList = ({ equipment, emptyMessage }: EquipmentListProps) => {
  if (equipment.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {equipment.map((eq) => (
        <div
          key={eq.id}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`text-xs ${getEquipmentTypeColor(eq.equipment_type)}`}
            >
              {getEquipmentTypeLabel(eq.equipment_type)}
            </Badge>
            <span className="font-medium text-sm dark:!text-slate-100">{eq.name}</span>
          </div>
          <span className="text-xs text-muted-foreground dark:!text-slate-300">{eq.plate}</span>
        </div>
      ))}
    </div>
  );
};

export function EquipmentStatusCard() {
  const { data: equipment, isLoading } = useEquipment();
  const { data: currentlyOut = [] } = useEquipmentCurrentlyOut();

  // Data local (Pará = UTC-3), no formato YYYY-MM-DD
  const paraToday = useMemo(
    () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10),
    []
  );

  const { data: activeShiftIds = [] } = useQuery({
    queryKey: ["active-shifts-today", paraToday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_shift_records")
        .select("equipment_id, shift_start_time, shift_end_time")
        .eq("shift_date", paraToday)
        .not("shift_start_time", "is", null)
        .is("shift_end_time", null);
      if (error) throw error;
      return (data ?? []).map((r) => r.equipment_id);
    },

  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="h-6 bg-muted rounded w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="h-6 bg-muted rounded w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMaintenanceStatus = (status: string | null | undefined) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s.includes("manutenc") || 
           s.includes("manutenç") || 
           s.includes("oficina") || 
           s === "maintenance" || 
           s === "vistoria";
  };

  const activeSet = new Set(activeShiftIds);
  // Placas atualmente fora da obra por manutenção/vistoria (equipment_movements)
  const outMaintenancePlates = new Set(
    currentlyOut
      .filter((m: any) => isMaintenanceStatus(m.exit_reason))
      .map((m: any) => m.plate)
  );

  const isInMaintenance = (eq: Equipment) => {
    return isMaintenanceStatus(eq.stop_reason) || outMaintenancePlates.has(eq.plate);
  };
  // Camionete e Ônibus sempre em Operação, exceto quando saíram para manutenção/vistoria
  const alwaysOperatingTypes = ["camionete", "onibus"];
  const isAlwaysOperating = (eq: Equipment) => alwaysOperatingTypes.includes(eq.equipment_type);
  const inMaintenance = equipment?.filter(isInMaintenance) || [];
  const inOperation = equipment?.filter(
    (eq) => !isInMaintenance(eq) && (isAlwaysOperating(eq) || activeSet.has(eq.id))
  ) || [];
  const stopped = equipment?.filter(
    (eq) => !isInMaintenance(eq) && !isAlwaysOperating(eq) && !activeSet.has(eq.id)
  ) || [];

  return (
    <div className="space-y-4 mb-8 animate-fade-in">
      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent p-3 sm:p-4 glass-card-dashboard">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center overflow-hidden w-10 h-10 sm:w-16 sm:h-16">
              <img 
                src={statusIconAsset.url} 
                alt="Status" 
                className="w-full h-full object-contain scale-90"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Operação</p>
              <p className="text-xl sm:text-3xl font-bold text-green-500 tracking-widest leading-none mb-1" style={{ fontFamily: "Brazil2026, sans-serif" }}>{inOperation.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent p-3 sm:p-4 glass-card-dashboard">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center overflow-hidden w-10 h-10 sm:w-16 sm:h-16">
              <img 
                src={maintenanceIconAsset.url} 
                alt="Manutenção" 
                className="w-full h-full object-contain scale-90"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Manutenção</p>
              <p className="text-xl sm:text-3xl font-bold text-orange-500 tracking-widest leading-none mb-1" style={{ fontFamily: "Brazil2026, sans-serif" }}>{inMaintenance.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent p-3 sm:p-4 glass-card-dashboard">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center overflow-hidden w-10 h-10 sm:w-16 sm:h-16">
              <img 
                src={stopIconAsset.url} 
                alt="Parados" 
                className="w-full h-full object-contain scale-90"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Parados</p>
              <p className="text-xl sm:text-3xl font-bold text-emerald-500 tracking-widest leading-none mb-1" style={{ fontFamily: "Brazil2026, sans-serif" }}>{stopped.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Equipment in Operation */}
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent glass-card-dashboard">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="flex items-center justify-center overflow-hidden w-10 h-10 sm:w-16 sm:h-16">
                <img 
                  src={statusIconAsset.url} 
                  alt="Status" 
                  className="w-full h-full object-contain scale-90"
                />
              </div>
              <span>Em Operação</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentList
              equipment={inOperation}
              emptyMessage="Nenhum equipamento em operação"
            />
            <Link
              to="/equipamentos"
              className="block mt-4 text-xs text-center text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Ver todos os equipamentos →
            </Link>
          </CardContent>
        </Card>

        {/* Equipment in Maintenance */}
        <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent glass-card-dashboard">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="flex items-center justify-center overflow-hidden w-10 h-10 sm:w-16 sm:h-16">
                <img 
                  src={maintenanceIconAsset.url} 
                  alt="Manutenção" 
                  className="w-full h-full object-contain scale-90"
                />
              </div>
              <span>Em Manutenção</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentList
              equipment={inMaintenance}
              emptyMessage="Nenhum equipamento em manutenção"
            />
            <Link
              to="/equipamentos"
              className="block mt-4 text-xs text-center text-muted-foreground hover:text-foreground dark:!text-slate-400 dark:hover:!text-slate-200 transition-colors"
            >
              Ver todos os equipamentos →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
