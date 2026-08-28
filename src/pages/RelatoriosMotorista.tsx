import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Filter, Clock, Wrench, Activity, PauseCircle, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEquipment, useEquipmentStopHistory } from "@/hooks/useEquipment";
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

const getStatusInfo = (stopReason: string | null) => {
  switch (stopReason) {
    case null:
    case "none":
    case "operando":
    case "operating":
      return {
        label: "Operando",
        color: "bg-green-500/10 text-green-600 border-green-500/30",
        icon: <Activity className="h-3 w-3" />,
      };
    case "maintenance":
    case "manutencao_corretiva":
    case "corrective_maintenance":
      return {
        label: "Manutenção Corretiva",
        color: "bg-red-500/10 text-red-600 border-red-500/30",
        icon: <Wrench className="h-3 w-3" />,
      };
    case "manutencao_preventiva":
    case "preventive_maintenance":
      return {
        label: "Manutenção Preventiva",
        color: "bg-orange-500/10 text-orange-600 border-orange-500/30",
        icon: <Wrench className="h-3 w-3" />,
      };
    case "aguardando_frente_servico":
    case "waiting_front":
    case "waiting_service_front":
      return {
        label: "Aguardando Frente de Serviço",
        color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
        icon: <PauseCircle className="h-3 w-3" />,
      };
    case "fim_turno":
    case "end_of_shift":
    case "end_shift":
      return {
        label: "Fim de Turno",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
        icon: <Clock className="h-3 w-3" />,
      };
    case "vistoria":
    case "inspection":
      return {
        label: "Vistoria",
        color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
        icon: <Wrench className="h-3 w-3" />,
      };
    case "abastecimento":
    case "refueling":
      return {
        label: "Abastecimento",
        color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
        icon: <Activity className="h-3 w-3" />,
      };
    case "retorno_abastecimento":
      return {
        label: "Retorno Abastecimento",
        color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
        icon: <Activity className="h-3 w-3" />,
      };
    default:
      return {
        label: stopReason || "Desconhecido",
        color: "bg-gray-500/10 text-gray-600 border-gray-500/30",
        icon: <Activity className="h-3 w-3" />,
      };
  }
};

const formatDuration = (minutes: number | null) => {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
};

type FilterPeriod = "today" | "7days" | "30days" | "all";
type FilterStatus = "all" | "operando" | "manutencao_corretiva" | "manutencao_preventiva" | "aguardando_frente_servico" | "fim_turno" | "vistoria";

const statusOptions = [
  { value: "all", label: "Todos os Status" },
  { value: "operando", label: "Operando" },
  { value: "manutencao_corretiva", label: "Manutenção Corretiva" },
  { value: "manutencao_preventiva", label: "Manutenção Preventiva" },
  { value: "aguardando_frente_servico", label: "Aguardando Frente" },
  { value: "fim_turno", label: "Fim de Turno" },
  { value: "vistoria", label: "Vistoria" },
];

export default function RelatoriosMotorista() {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("7days");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Get selected vehicle from localStorage
  const selectedVehicleId = localStorage.getItem("selectedVehicleId");

  const { data: equipment = [] } = useEquipment();
  const { data: history = [], isLoading } = useEquipmentStopHistory(selectedVehicleId || undefined);

  // Find the selected vehicle
  const selectedVehicle = equipment.find(eq => eq.id === selectedVehicleId);

  // Filter history based on period and search
  const filteredHistory = useMemo(() => {
    let filtered = history;

    // Filter by period
    const now = new Date();
    switch (filterPeriod) {
      case "today":
        filtered = filtered.filter(item => {
          const itemDate = parseISO(item.started_at);
          return isWithinInterval(itemDate, {
            start: startOfDay(now),
            end: endOfDay(now),
          });
        });
        break;
      case "7days":
        filtered = filtered.filter(item => {
          const itemDate = parseISO(item.started_at);
          return isWithinInterval(itemDate, {
            start: startOfDay(subDays(now, 7)),
            end: endOfDay(now),
          });
        });
        break;
      case "30days":
        filtered = filtered.filter(item => {
          const itemDate = parseISO(item.started_at);
          return isWithinInterval(itemDate, {
            start: startOfDay(subDays(now, 30)),
            end: endOfDay(now),
          });
        });
        break;
      case "all":
      default:
        // No date filter
        break;
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter(item => {
        // Match the status with possible variations
        const reason = item.stop_reason;
        if (filterStatus === "operando") {
          return reason === "operando" || reason === "operating" || reason === "none";
        }
        if (filterStatus === "manutencao_corretiva") {
          return reason === "manutencao_corretiva" || reason === "maintenance" || reason === "corrective_maintenance";
        }
        if (filterStatus === "manutencao_preventiva") {
          return reason === "manutencao_preventiva" || reason === "preventive_maintenance";
        }
        if (filterStatus === "aguardando_frente_servico") {
          return reason === "aguardando_frente_servico" || reason === "waiting_front" || reason === "waiting_service_front";
        }
        if (filterStatus === "fim_turno") {
          return reason === "fim_turno" || reason === "end_of_shift" || reason === "end_shift";
        }
        if (filterStatus === "vistoria") {
          return reason === "vistoria" || reason === "inspection";
        }
        return true;
      });
    }

    // Filter by search term (in description or status)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const statusInfo = getStatusInfo(item.stop_reason);
        return (
          statusInfo.label.toLowerCase().includes(term) ||
          (item.defect_description && item.defect_description.toLowerCase().includes(term))
        );
      });
    }

    return filtered;
  }, [history, filterPeriod, filterStatus, searchTerm]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95  border-b shadow-sm">
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
            <h1 className="text-base sm:text-lg font-bold truncate">Relatórios</h1>
            {selectedVehicle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {selectedVehicle.name} • {selectedVehicle.plate}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="p-3 sm:p-4 max-w-lg mx-auto space-y-3 pb-6">
        {/* Filters - More compact */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {/* Period Filter */}
            <Select value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as FilterPeriod)}>
              <SelectTrigger className="h-9 text-xs sm:text-sm">
                <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="all">Todo o histórico</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
              <SelectTrigger className="h-9 text-xs sm:text-sm">
                <Activity className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs sm:text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs sm:text-sm flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 min-w-0">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Histórico</span>
              </span>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {filteredHistory.length}
              </Badge>
            </CardTitle>
            {/* Last driver info */}
            {selectedVehicle && selectedVehicle.driver && (
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground mt-1">
                <User className="h-3 w-3 shrink-0" />
                <span>Último motorista: <span className="font-medium text-foreground">{selectedVehicle.driver}</span></span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {isLoading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !selectedVehicleId ? (
              <div className="py-4 text-center text-muted-foreground">
                <p className="text-xs">Nenhum veículo selecionado.</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                <Clock className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
                <p className="text-xs">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHistory.map((item) => {
                  const statusInfo = getStatusInfo(item.stop_reason);
                  const startDate = parseISO(item.started_at);
                  const endDate = item.ended_at ? parseISO(item.ended_at) : null;

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-muted/50 border space-y-1.5"
                    >
                      {/* Status and Duration Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge variant="outline" className={`${statusInfo.color} text-[10px] px-1.5 py-0.5`}>
                          <span className="mr-1">{statusInfo.icon}</span>
                          {statusInfo.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {formatDuration(item.duration_minutes)}
                        </span>
                      </div>

                      {/* Dates - Compact layout */}
                      <div className="text-[10px] sm:text-xs text-muted-foreground grid grid-cols-2 gap-1">
                        <div className="truncate">
                          <span className="font-medium">Início: </span>
                          {format(startDate, "dd/MM HH:mm", { locale: ptBR })}
                        </div>
                        {endDate ? (
                          <div className="truncate">
                            <span className="font-medium">Fim: </span>
                            {format(endDate, "dd/MM HH:mm", { locale: ptBR })}
                          </div>
                        ) : (
                          <div className="text-amber-600 font-medium">
                            Em andamento
                          </div>
                        )}
                      </div>

                      {/* Problem Description or Refueling Location */}
                      {item.defect_description && (
                        (() => {
                          const isRefueling = item.stop_reason === "abastecimento" || 
                            item.defect_description.toLowerCase().includes("abastecimento") ||
                            (item.defect_description.toLowerCase().includes("ponto:") && !item.defect_description.toLowerCase().includes("problema"));
                          
                          return (
                            <div className={`text-[10px] sm:text-xs bg-background/50 p-1.5 rounded border-l-2 ${
                              isRefueling ? "border-cyan-500/50" : "border-red-500/50"
                            }`}>
                              <span className={`font-medium ${
                                isRefueling ? "text-cyan-600" : "text-red-600"
                              }`}>
                                {isRefueling ? "Local: " : "Problema: "}
                              </span>
                              <span className="text-foreground break-words">
                                {isRefueling 
                                  ? item.defect_description
                                      .replace("Retorno após abastecimento - ", "")
                                      .replace("Abastecimento - ", "")
                                  : item.defect_description}
                              </span>
                            </div>
                          );
                        })()
                      )}

                      {/* Driver who made the change */}
                      {item.changed_by_driver && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                          <User className="h-2.5 w-2.5 shrink-0" />
                          <span>Alterado por: <span className="font-medium text-foreground">{item.changed_by_driver}</span></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
