import { useMemo, useState } from "react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Wrench, CloudRain, Play, X, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEquipment, useEquipmentStopHistory } from "@/hooks/useEquipment";
import { getBrazilNorthDate } from "@/lib/timezone";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  none: { label: "Operando", color: "text-green-600", bg: "bg-green-500", icon: <Play className="w-3 h-3" /> },
  maintenance: { label: "Manutenção", color: "text-orange-600", bg: "bg-orange-500", icon: <Wrench className="w-3 h-3" /> },
  waiting: { label: "Aguardando", color: "text-amber-600", bg: "bg-amber-500", icon: <Clock className="w-3 h-3" /> },
  rain: { label: "Chuva", color: "text-blue-600", bg: "bg-blue-500", icon: <CloudRain className="w-3 h-3" /> },
  end_of_shift: { label: "Fim de Turno", color: "text-purple-600", bg: "bg-purple-500", icon: <Clock className="w-3 h-3" /> },
};

export function PreviousDaySummary() {
  const [isDismissed, setIsDismissed] = useState(false);
  const { data: equipment } = useEquipment();
  const { data: allHistory } = useEquipmentStopHistory();

  const now = getBrazilNorthDate();
  const currentHour = now.getHours();
  
  // Show only in the morning (6h - 12h)
  const isMorning = currentHour >= 6 && currentHour < 12;

  const yesterday = subDays(now, 1);
  const yesterdayRange = {
    start: startOfDay(yesterday),
    end: endOfDay(yesterday),
  };

  const yesterdayHistory = useMemo(() => {
    if (!allHistory) return [];
    return allHistory.filter(stop => {
      const stopDate = new Date(stop.started_at);
      return isWithinInterval(stopDate, yesterdayRange);
    });
  }, [allHistory, yesterdayRange]);

  // Equipment currently in maintenance
  const currentlyInMaintenance = useMemo(() => {
    if (!equipment) return [];
    return equipment.filter(eq => eq.stop_reason === "maintenance");
  }, [equipment]);

  const summary = useMemo(() => {
    if (!equipment || !yesterdayHistory.length) return null;

    const stopsByReason: Record<string, number> = {};
    let totalStopMinutes = 0;
    const maintenanceIssues: { equipmentName: string; description: string | null }[] = [];

    yesterdayHistory.forEach(stop => {
      const minutes = stop.duration_minutes || 0;
      totalStopMinutes += minutes;
      stopsByReason[stop.stop_reason] = (stopsByReason[stop.stop_reason] || 0) + minutes;

      if (stop.stop_reason === "maintenance" && stop.defect_description) {
        const eq = equipment.find(e => e.id === stop.equipment_id);
        maintenanceIssues.push({
          equipmentName: eq?.name || "Equipamento",
          description: stop.defect_description,
        });
      }
    });

    const totalHoursAvailable = equipment.length * 8;
    const totalMinutesAvailable = totalHoursAvailable * 60;
    const operatingMinutes = Math.max(0, totalMinutesAvailable - totalStopMinutes);
    const operatingPercent = totalMinutesAvailable > 0 ? (operatingMinutes / totalMinutesAvailable) * 100 : 0;

    return {
      totalStopMinutes,
      operatingMinutes,
      operatingPercent,
      stopsByReason,
      maintenanceIssues,
      stopsCount: yesterdayHistory.length,
    };
  }, [equipment, yesterdayHistory]);

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}h${m > 0 ? ` ${m}m` : ''}`;
    }
    return `${minutes}min`;
  };

  // Don't show if dismissed, not morning, or no data (unless there are current maintenance items)
  const hasCurrentMaintenance = currentlyInMaintenance.length > 0;
  if (isDismissed || (!isMorning && !hasCurrentMaintenance) || (!summary && !hasCurrentMaintenance) || (summary?.stopsCount === 0 && !hasCurrentMaintenance)) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 p-5 animate-fade-in">
      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-3 right-3 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => setIsDismissed(true)}
      >
        <X className="w-4 h-4" />
      </Button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-amber-500/20">
          <CalendarDays className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Resumo do Dia Anterior</h3>
          <p className="text-xs text-muted-foreground">
            {format(yesterday, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Stats - only show if summary exists */}
      {summary && (
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm">
              <span className="font-semibold text-green-600">{summary.operatingPercent.toFixed(0)}%</span>
              <span className="text-muted-foreground ml-1">operando</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm">
              <span className="font-semibold text-foreground">{formatDuration(summary.totalStopMinutes)}</span>
              <span className="text-muted-foreground ml-1">parado</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{summary.stopsCount}</span> paradas
            </span>
          </div>
        </div>
      )}

      {/* Stops by Reason - only show if summary exists */}
      {summary && Object.keys(summary.stopsByReason).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(summary.stopsByReason)
            .filter(([reason]) => !["end_of_day", "end_of_shift", "none"].includes(reason))
            .map(([reason, minutes]) => {
              const config = statusConfig[reason] || statusConfig.waiting;
              return (
                <Badge
                  key={reason}
                  variant="secondary"
                  className="gap-1.5 py-1 px-2.5"
                >
                  {config.icon}
                  <span>{config.label}:</span>
                  <span className="font-semibold">{formatDuration(minutes)}</span>
                </Badge>
              );
            })}
        </div>
      )}

      {/* Maintenance Issues from Yesterday */}
      {summary && summary.maintenanceIssues.length > 0 && (
        <div className="space-y-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
            <Wrench className="w-4 h-4" />
            <span>Manutenções ontem</span>
          </div>
          <div className="space-y-1.5">
            {summary.maintenanceIssues.slice(0, 3).map((issue, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <ChevronRight className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium text-foreground">{issue.equipmentName}:</span>
                  <span className="text-muted-foreground ml-1">{issue.description}</span>
                </span>
              </div>
            ))}
            {summary.maintenanceIssues.length > 3 && (
              <p className="text-xs text-muted-foreground ml-5">
                + {summary.maintenanceIssues.length - 3} outras manutenções
              </p>
            )}
          </div>
        </div>
      )}

      {/* Currently in Maintenance */}
      {currentlyInMaintenance.length > 0 && (
        <div className="space-y-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
            <Wrench className="w-4 h-4" />
            <span>Em manutenção agora ({currentlyInMaintenance.length})</span>
          </div>
          <div className="space-y-1.5">
            {currentlyInMaintenance.map((eq) => (
              <div key={eq.id} className="flex items-start gap-2 text-xs">
                <ChevronRight className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium text-foreground">{eq.name}</span>
                  <span className="text-muted-foreground ml-1">({eq.plate})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
