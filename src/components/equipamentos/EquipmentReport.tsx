import { useMemo, useState } from "react";
import * as E from "@/lib/whatsappEmojis";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, isWithinInterval, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, Clock, Wrench, CloudRain, Play, ChevronDown, BarChart3, AlertTriangle, CalendarIcon, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEquipment, useEquipmentStopHistory, type Equipment, type EquipmentStopHistory } from "@/hooks/useEquipment";
import { toast } from "sonner";
import { getBrazilNorthDate } from "@/lib/timezone";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  none: { label: "Operando", color: "text-green-600", bg: "bg-green-500", icon: <Play className="w-3.5 h-3.5" /> },
  maintenance: { label: "Manutenção", color: "text-orange-600", bg: "bg-orange-500", icon: <Wrench className="w-3.5 h-3.5" /> },
  waiting: { label: "Aguardando", color: "text-amber-600", bg: "bg-amber-500", icon: <Clock className="w-3.5 h-3.5" /> },
  rain: { label: "Chuva", color: "text-blue-600", bg: "bg-blue-500", icon: <CloudRain className="w-3.5 h-3.5" /> },
  end_of_day: { label: "Fim do dia", color: "text-slate-600", bg: "bg-slate-500", icon: <Clock className="w-3.5 h-3.5" /> },
  end_of_shift: { label: "Fim de Turno", color: "text-purple-600", bg: "bg-purple-500", icon: <Clock className="w-3.5 h-3.5" /> },
};

type FilterPeriod = "daily" | "weekly" | "monthly" | "custom";

interface EquipmentStats {
  equipment: Equipment;
  totalStopMinutes: number;
  stopsByReason: Record<string, number>;
  stops: EquipmentStopHistory[];
}

export function EquipmentReport() {
  const [period, setPeriod] = useState<FilterPeriod>("daily");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const { data: equipment } = useEquipment();
  const { data: allHistory } = useEquipmentStopHistory();

  const periodLabels: Record<FilterPeriod, string> = {
    daily: "Hoje",
    weekly: "Esta Semana",
    monthly: "Este Mês",
    custom: customDate ? format(customDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data",
  };

  const dateRange = useMemo(() => {
    const now = getBrazilNorthDate();
    switch (period) {
      case "daily":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "weekly":
        return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
      case "monthly":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "custom":
        if (customDate) {
          return { start: startOfDay(customDate), end: endOfDay(customDate) };
        }
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  }, [period, customDate]);

  const filteredHistory = useMemo(() => {
    if (!allHistory) return [];
    return allHistory.filter(stop => {
      const stopDate = new Date(stop.started_at);
      return isWithinInterval(stopDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [allHistory, dateRange]);

  const maintenanceHistory = useMemo(() => {
    let filtered = filteredHistory.filter(stop => stop.stop_reason === "maintenance");
    if (selectedEquipmentId) {
      filtered = filtered.filter(stop => stop.equipment_id === selectedEquipmentId);
    }
    return filtered;
  }, [filteredHistory, selectedEquipmentId]);

  const equipmentStats = useMemo((): EquipmentStats[] => {
    if (!equipment) return [];
    
    return equipment.map(eq => {
      const stops = filteredHistory.filter(h => h.equipment_id === eq.id);
      const stopsByReason: Record<string, number> = {};
      let totalStopMinutes = 0;

      stops.forEach(stop => {
        const minutes = stop.duration_minutes || 0;
        totalStopMinutes += minutes;
        stopsByReason[stop.stop_reason] = (stopsByReason[stop.stop_reason] || 0) + minutes;
      });

      return { equipment: eq, totalStopMinutes, stopsByReason, stops };
    });
  }, [equipment, filteredHistory]);

  const totalStats = useMemo(() => {
    const totalHoursAvailable = (equipment?.length || 0) * 8 * (period === "daily" ? 1 : period === "weekly" ? 5 : 22);
    const totalMinutesAvailable = totalHoursAvailable * 60;
    const totalStopMinutes = equipmentStats.reduce((acc, s) => acc + s.totalStopMinutes, 0);
    const totalOperatingMinutes = Math.max(0, totalMinutesAvailable - totalStopMinutes);
    
    const stopsByReason: Record<string, number> = {};
    equipmentStats.forEach(s => {
      Object.entries(s.stopsByReason).forEach(([reason, minutes]) => {
        stopsByReason[reason] = (stopsByReason[reason] || 0) + minutes;
      });
    });

    return {
      totalHoursAvailable,
      totalOperatingMinutes,
      totalStopMinutes,
      stopsByReason,
      operatingPercent: totalMinutesAvailable > 0 ? (totalOperatingMinutes / totalMinutesAvailable) * 100 : 0,
    };
  }, [equipmentStats, equipment?.length, period]);

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}h${m > 0 ? ` ${m}m` : ''}`;
    }
    return `${minutes}min`;
  };

  const buildReportMessage = () => {
    const periodLabel = periodLabels[period];
    const dateStr = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    
    let message = `${E.EMOJI_CHART} *RELATÓRIO DE EQUIPAMENTOS*\n`;
    message += `${E.EMOJI_CALENDAR} ${periodLabel} - ${dateStr}\n\n`;
    
    message += `${E.EMOJI_STOPWATCH} *RESUMO GERAL*\n`;
    message += `${E.EMOJI_CHECK} Operando: ${formatDuration(totalStats.totalOperatingMinutes)} (${totalStats.operatingPercent.toFixed(0)}%)\n`;
    message += `${E.EMOJI_PAUSE} Parado: ${formatDuration(totalStats.totalStopMinutes)}\n\n`;

    if (Object.keys(totalStats.stopsByReason).length > 0) {
      message += `${E.EMOJI_CLIPBOARD} *PARADAS POR MOTIVO*\n`;
      Object.entries(totalStats.stopsByReason).forEach(([reason, minutes]) => {
        const emoji = reason === "maintenance" ? E.EMOJI_WRENCH : reason === "waiting" ? E.EMOJI_HOURGLASS : reason === "rain" ? E.EMOJI_RAIN : E.EMOJI_STOP;
        message += `${emoji} ${statusConfig[reason]?.label || reason}: ${formatDuration(minutes)}\n`;
      });
      message += `\n`;
    }

    message += `${E.EMOJI_TRUCK} *POR EQUIPAMENTO*\n`;
    equipmentStats.forEach(stat => {
      const operatingMinutes = 8 * 60 * (period === "daily" ? 1 : period === "weekly" ? 5 : 22) - stat.totalStopMinutes;
      message += `\n*${stat.equipment.name}* (${stat.equipment.plate})\n`;
      message += `  ${E.EMOJI_CHECK} Operando: ${formatDuration(Math.max(0, operatingMinutes))}\n`;
      if (stat.totalStopMinutes > 0) {
        message += `  ${E.EMOJI_PAUSE} Parado: ${formatDuration(stat.totalStopMinutes)}\n`;
        Object.entries(stat.stopsByReason).forEach(([reason, minutes]) => {
          message += `    - ${statusConfig[reason]?.label || reason}: ${formatDuration(minutes)}\n`;
        });
      }
    });

    if (maintenanceHistory.length > 0) {
      message += `\n${E.EMOJI_WRENCH} *HISTÓRICO DE MANUTENÇÕES*\n`;
      maintenanceHistory.forEach(stop => {
        const eq = equipment?.find(e => e.id === stop.equipment_id);
        const startDate = format(new Date(stop.started_at), "dd/MM 'às' HH:mm", { locale: ptBR });
        const duration = stop.duration_minutes ? ` (${formatDuration(stop.duration_minutes)})` : ` ${E.EMOJI_WARNING} Em andamento`;
        
        message += `\n*${eq?.name || "Equipamento"}* - ${eq?.plate || ""}\n`;
        message += `  ${E.EMOJI_CALENDAR} ${startDate}${duration}\n`;
        
        if (stop.defect_description) {
          message += `  ${E.EMOJI_MEMO} _${stop.defect_description}_\n`;
        }
      });
    }
    return message;
  };

  const handleWhatsAppReport = async () => {
    const ok = await copyAndShareWhatsApp(buildReportMessage());
    if (ok) toast.success("Enviado para WhatsApp!");
    else toast.error("Erro ao compartilhar");
  };

  const handleCopyReport = async () => {
    const ok = await copyToClipboard(buildReportMessage());
    if (ok) toast.success("Relatório copiado!");
    else toast.error("Erro ao copiar");
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-8">
      <div className="border border-border rounded-2xl bg-card overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <h2 className="font-semibold text-foreground">Relatório de Paradas</h2>
                <p className="text-sm text-muted-foreground">
                  {format(dateRange.start, "dd/MM", { locale: ptBR })} - {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Quick Stats Preview */}
              <div className="hidden sm:flex items-center gap-4 mr-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Operando</p>
                  <p className="text-sm font-semibold text-green-600">{totalStats.operatingPercent.toFixed(0)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Parado</p>
                  <p className="text-sm font-semibold text-muted-foreground">{formatDuration(totalStats.totalStopMinutes)}</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-5 border-t border-border pt-5">
            {/* Controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      {periodLabels[period]}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => { setPeriod("daily"); setCustomDate(undefined); }}>Hoje</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setPeriod("daily"); setCustomDate(subDays(getBrazilNorthDate(), 1)); setPeriod("custom"); }}>Ontem</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setPeriod("weekly"); setCustomDate(undefined); }}>Esta Semana</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setPeriod("monthly"); setCustomDate(undefined); }}>Este Mês</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Data específica</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={(date) => {
                        setCustomDate(date);
                        if (date) setPeriod("custom");
                      }}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button size="sm" variant="outline" onClick={handleWhatsAppReport} className="gap-2">
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopyReport} className="gap-2">
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Copiar</span>
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: "operating", label: "Operando", value: formatDuration(totalStats.totalOperatingMinutes), config: statusConfig.none },
                { key: "maintenance", label: "Manutenção", value: formatDuration(totalStats.stopsByReason.maintenance || 0), config: statusConfig.maintenance },
                { key: "waiting", label: "Aguardando", value: formatDuration(totalStats.stopsByReason.waiting || 0), config: statusConfig.waiting },
                { key: "rain", label: "Chuva", value: formatDuration(totalStats.stopsByReason.rain || 0), config: statusConfig.rain },
              ].map(stat => (
                <div key={stat.key} className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${stat.config.bg}/10`}>
                      {stat.config.icon}
                    </div>
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-semibold ${stat.config.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 py-3 border-y border-border">
              {Object.entries(statusConfig)
                .filter(([key]) => !["end_of_day", "end_of_shift"].includes(key))
                .map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${config.bg}`} />
                  <span className="text-xs text-muted-foreground">{config.label}</span>
                </div>
              ))}
            </div>

            {/* Maintenance History Section */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-medium text-foreground">Histórico de Manutenções</h3>
                  {maintenanceHistory.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {maintenanceHistory.length}
                    </Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                      {selectedEquipmentId 
                        ? equipment?.find(e => e.id === selectedEquipmentId)?.name || "Equipamento"
                        : "Todos"}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedEquipmentId(null)}>
                      Todos os equipamentos
                    </DropdownMenuItem>
                    {equipment?.map(eq => (
                      <DropdownMenuItem key={eq.id} onClick={() => setSelectedEquipmentId(eq.id)}>
                        {eq.name} ({eq.plate})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <ScrollArea className="h-[220px] -mx-1 px-1">
                {maintenanceHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="p-3 rounded-xl bg-muted/50 mb-3">
                      <Wrench className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada no período</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {maintenanceHistory.map((stop) => {
                      const eq = equipment?.find(e => e.id === stop.equipment_id);
                      const isOngoing = !stop.ended_at;
                      return (
                        <div 
                          key={stop.id} 
                          className={`p-4 rounded-xl border transition-colors ${
                            isOngoing 
                              ? 'bg-orange-500/5 border-orange-500/30' 
                              : 'bg-muted/30 border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{eq?.name || "Equipamento"}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                                {eq?.plate}
                              </Badge>
                              {isOngoing && (
                                <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0">
                                  Em andamento
                                </Badge>
                              )}
                            </div>
                            {stop.duration_minutes && (
                              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-lg shrink-0">
                                {formatDuration(stop.duration_minutes)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Clock className="w-3 h-3" />
                            <span>{format(new Date(stop.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                            {stop.ended_at && (
                              <>
                                <span>→</span>
                                <span>{format(new Date(stop.ended_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                              </>
                            )}
                          </div>

                          {stop.defect_description ? (
                            <div className="flex items-start gap-2 p-2 bg-background/50 rounded-lg">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
                              <p className="text-xs text-foreground leading-relaxed">
                                {stop.defect_description}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                              <span className="text-xs text-muted-foreground italic">
                                Sem descrição do defeito
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* All Stops History List */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Todas as Paradas</h3>
              <ScrollArea className="h-[220px] -mx-1 px-1">
                {filteredHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="p-3 rounded-xl bg-muted/50 mb-3">
                      <Clock className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">Nenhuma parada registrada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredHistory.map((stop) => {
                      const eq = equipment?.find(e => e.id === stop.equipment_id);
                      const config = statusConfig[stop.stop_reason] || statusConfig.none;
                      return (
                        <div 
                          key={stop.id} 
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className={`w-1 h-10 rounded-full ${config.bg}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-sm">{eq?.name || "Equipamento"}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                                {eq?.plate}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {config.icon}
                              <span>{config.label}</span>
                              <span>•</span>
                              <span>{format(new Date(stop.started_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                              {stop.ended_at && (
                                <>
                                  <span>→</span>
                                  <span>{format(new Date(stop.ended_at), "HH:mm", { locale: ptBR })}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {stop.duration_minutes && (
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                              {formatDuration(stop.duration_minutes)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
