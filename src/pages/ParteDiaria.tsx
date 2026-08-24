import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Truck, Plus, Loader2, Trash2, User, Clock, AlertCircle, Droplets, MapPin, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminStatusEditor } from "@/components/partediaria/AdminStatusEditor";
import { AdminCountersEditor } from "@/components/partediaria/AdminCountersEditor";
import { ExportEquipmentPdfButton } from "@/components/equipamentos/ExportEquipmentPdfButton";
import { ExportMovementsByDateButton } from "@/components/equipamentos/ExportMovementsByDateButton";
import { MovementHistoryDialog } from "@/components/equipamentos/MovementHistoryDialog";
import { useEquipment, useCreateEquipment, useDeleteEquipment, useUpdateEquipment, useEquipmentStopHistory } from "@/hooks/useEquipment";
import { useEquipmentMovements } from "@/hooks/useEquipmentMovements";
import { useDailyShiftRecords } from "@/hooks/useDailyShiftRecords";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ParteDiaria() {
  const { data: equipment = [], isLoading: isLoadingEquipment } = useEquipment();
  const { data: movements = [], isLoading: isLoadingMovements } = useEquipmentMovements();
  const { data: stopHistory = [] } = useEquipmentStopHistory();
  const { data: shiftRecords = [], isLoading: isLoadingRecords } = useDailyShiftRecords();
  const createEquipment = useCreateEquipment();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  

  // Check if user can edit (only admin)
  const canEdit = isAdmin;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    name: "",
    plate: "",
    equipment_type: "pipa" as "pipa" | "munk",
  });
  const [editingEquipment, setEditingEquipment] = useState<any>(null);

  // Filter only Pipa and Munk vehicles (driver vehicles)
  const driverVehicles = equipment.filter(
    (eq) => eq.equipment_type === "pipa" || eq.equipment_type === "munk"
  );

  const handleCreateEquipment = async () => {
    if (!newEquipment.name || !newEquipment.plate) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      await createEquipment.mutateAsync({
        name: newEquipment.name,
        plate: newEquipment.plate.toUpperCase(),
        equipment_type: newEquipment.equipment_type,
        driver: "",
        helper: "",
        start_hour: 8,
        end_hour: 16,
      });

      toast.success("Equipamento cadastrado com sucesso!");
      setNewEquipment({ name: "", plate: "", equipment_type: "pipa" });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating equipment:", error);
      toast.error("Erro ao cadastrar equipamento");
    }
  };

  const handleUpdateEquipment = async () => {
    if (!editingEquipment.name || !editingEquipment.plate) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const updatedPlate = editingEquipment.plate.toUpperCase();
      await updateEquipment.mutateAsync({
        id: editingEquipment.id,
        name: editingEquipment.name,
        plate: updatedPlate,
        equipment_type: editingEquipment.equipment_type,
      });

      // Synchronize with today's shift record
      const today = format(new Date(), "yyyy-MM-dd");
      await supabase
        .from("daily_shift_records")
        .update({
          equipment_name: editingEquipment.name,
          plate: updatedPlate,
        })
        .eq("equipment_id", editingEquipment.id)
        .eq("shift_date", today);

      toast.success("Equipamento atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingEquipment(null);
    } catch (error) {
      console.error("Error updating equipment:", error);
      toast.error("Erro ao atualizar equipamento");
    }
  };

  const handleOpenEdit = (equipment: any) => {
    setEditingEquipment(equipment);
    setIsEditDialogOpen(true);
  };

  const handleDeleteEquipment = async (id: string) => {
    try {
      await deleteEquipment.mutateAsync(id);
      toast.success("Equipamento removido com sucesso!");
    } catch (error) {
      console.error("Error deleting equipment:", error);
      toast.error("Erro ao remover equipamento");
    }
  };

  // Check if a vehicle has already started its shift today (initial_horimeter set)
  const hasStartedShiftToday = (vehicleId?: string) => {
    if (!vehicleId) return false;
    const today = format(new Date(), "yyyy-MM-dd");
    return shiftRecords.some(
      (r) =>
        r.equipment_id === vehicleId &&
        r.shift_date === today &&
        r.initial_horimeter != null
    );
  };

  const getStatusBadge = (stopReason: string | null, vehicleId?: string, driverName?: string) => {
    // Check if there's actually a driver (non-empty string after trimming)
    const hasDriver = driverName && driverName.trim().length > 0;
    const shiftStarted = hasStartedShiftToday(vehicleId);

    // Only show "Operando" if there's a driver AND the status is none/operando
    if (!stopReason || stopReason === "none" || stopReason === "operando") {
      if (hasDriver) {
        return <Badge className="bg-green-500 text-white">Operando</Badge>;
      } else {
        return <Badge className="bg-gray-500 text-white">Sem Motorista</Badge>;
      }
    }
    switch (stopReason) {
      case "maintenance":
      case "manutencao_corretiva":
        return <Badge className="bg-red-500 text-white">Manutenção Corretiva</Badge>;
      case "manutencao_preventiva":
        return <Badge className="bg-amber-500 text-white">Manutenção Preventiva</Badge>;
      case "vistoria":
        return <Badge className="bg-purple-500 text-white">Vistoria</Badge>;
      case "waiting":
        // If the driver has already started the shift today, "waiting" means
        // they pressed the "Aguardando" button mid-shift (Aguardando Frente),
        // and the vehicle is effectively operating. Otherwise it's pre-start.
        if (shiftStarted && hasDriver) {
          return <Badge className="bg-green-500 text-white">Operando</Badge>;
        }
        return <Badge className="bg-yellow-500 text-black">Aguardando Início</Badge>;
      case "waiting_front":
        return <Badge className="bg-yellow-500 text-black">Aguardando Frente</Badge>;
      case "end_of_shift":
        return <Badge className="bg-blue-500 text-white">Fim de Turno</Badge>;
      case "end_of_day":
        return <Badge className="bg-red-600 text-white">Abastecendo</Badge>;
      case "almoco":
        return <Badge className="bg-amber-500 text-white">Almoço</Badge>;
      case "rain":
        return <Badge className="bg-sky-500 text-white">Chuva</Badge>;
      case "abastecimento":
        // Find the current refueling point from stop history
        if (vehicleId) {
          const currentRefueling = stopHistory.find(
            (h) => h.equipment_id === vehicleId && 
                   h.stop_reason === "abastecimento" && 
                   !h.ended_at
          );
          if (currentRefueling?.defect_description) {
            const pointMatch = currentRefueling.defect_description.match(/Ponto: (.+)/);
            if (pointMatch) {
              return (
                <Badge className="bg-cyan-500 text-white flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  Abastecimento - Ponto {pointMatch[1]}
                </Badge>
              );
            }
          }
        }
        return (
          <Badge className="bg-cyan-500 text-white flex items-center gap-1">
            <Droplets className="h-3 w-3" />
            Abastecimento
          </Badge>
        );
      default:
        return <Badge variant="secondary">{stopReason}</Badge>;
    }
  };

  const getEquipmentTypeLabel = (type: string) => {
    switch (type) {
      case "pipa":
        return "Pipa";
      case "munk":
        return "Munk";
      default:
        return type;
    }
  };

  // Get today's movements for each vehicle
  const getTodayMovements = (plate: string) => {
    const today = format(new Date(), "yyyy-MM-dd");
    return movements
      .filter((m) => m.plate === plate && m.movement_date === today)
      .sort((a, b) => a.movement_time.localeCompare(b.movement_time));
  };

  // Get status label for stop history entries (synced with PDF labels)
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      none: "Operando",
      operando: "Operando",
      waiting: "Aguardando Frente",
      waiting_front: "Aguardando Frente",
      aguardando_frente_servico: "Aguardando Frente",
      rain: "Parado (Chuva)",
      end_of_day: "Abastecendo",
      abastecimento: "Abastecendo",
      maintenance: "Manutenção",
      manutencao_corretiva: "Manutenção Corretiva",
      manutencao_preventiva: "Manutenção Preventiva",
      vistoria: "Vistoria",
      end_of_shift: "Fim de Turno",
      fim_turno: "Fim de Turno",
      almoco: "Almoço",
    };
    return labels[status] || status;
  };

  // Get today's status history for each vehicle (filter consecutive duplicates)
  const getTodayStatusHistory = (vehicleId: string) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const sorted = stopHistory
      .filter((h) => {
        const startedAt = new Date(h.started_at);
        return h.equipment_id === vehicleId && startedAt >= todayStart;
      })
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    
    // Filter out consecutive duplicates (same status AND same description)
    return sorted.filter((entry, index, arr) => {
      if (index === 0) return true;
      const prev = arr[index - 1];
      return entry.stop_reason !== prev.stop_reason || entry.defect_description !== prev.defect_description;
    });
  };

  // Get status timeline for each vehicle
  const getVehicleTimeline = (vehicleId: string, plate: string) => {
    const todayMovements = getTodayMovements(plate);
    const todayStatusHistory = getTodayStatusHistory(vehicleId);
    const vehicle = driverVehicles.find((v) => v.id === vehicleId);

    return {
      driver: vehicle?.driver || null,
      currentStatus: vehicle?.stop_reason || "none",
      stopStartTime: vehicle?.stop_start_time,
      movements: todayMovements,
      statusHistory: todayStatusHistory,
    };
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-6 py-3 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <EditablePageTitle pageKey="parte-diaria" defaultValue="Parte Diária" className="text-xl sm:text-2xl font-bold" />
            <p className="text-muted-foreground">
              Gestão de equipamentos e acompanhamento de status dos motoristas
            </p>
          </div>
          <MovementHistoryDialog />
        </div>

        <Tabs defaultValue="status" className="space-y-4">
          <TabsList>
            <TabsTrigger value="status">Status dos Veículos</TabsTrigger>
            {canEdit && (
              <TabsTrigger value="equipamentos">Cadastro de Equipamentos</TabsTrigger>
            )}
          </TabsList>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4">
            {isLoadingEquipment || isLoadingMovements ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : driverVehicles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhum veículo cadastrado. Cadastre veículos na aba "Cadastro de Equipamentos".
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {driverVehicles.map((vehicle) => {
                  const timeline = getVehicleTimeline(vehicle.id, vehicle.plate);

                  return (
                    <Card key={vehicle.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <VehicleIcon
                                type={vehicle.equipment_type as "pipa" | "munk"}
                                size="md"
                              />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                              <p className="text-sm text-muted-foreground font-mono">
                                {vehicle.plate}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <ExportMovementsByDateButton equipment={vehicle} />
                            <ExportEquipmentPdfButton
                              equipment={vehicle}
                              movements={movements.filter((m) => m.plate === vehicle.plate)}
                              stopHistory={stopHistory.filter((h) => h.equipment_id === vehicle.id)}
                            />
                            {getStatusBadge(timeline.currentStatus, vehicle.id, timeline.driver || "")}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Driver Info */}
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Motorista:</span>
                          <span className="font-medium">
                            {timeline.driver || "Não vinculado"}
                          </span>
                        </div>

                        {/* Location Info */}
                        {(vehicle as any).latitude && (vehicle as any).longitude && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-green-500" />
                            <a
                              href={`https://www.google.com/maps?q=${(vehicle as any).latitude},${(vehicle as any).longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs"
                            >
                              Ver localização no mapa
                            </a>
                            {(vehicle as any).location_updated_at && (
                              <span className="text-[10px] text-muted-foreground">
                                (atualizado {format(new Date((vehicle as any).location_updated_at), "HH:mm", { locale: ptBR })})
                              </span>
                            )}
                          </div>
                        )}
                        {timeline.driver && !(vehicle as any).latitude && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground italic">Localização indisponível</span>
                          </div>
                        )}

                        {/* Stop Time */}
                        {timeline.currentStatus !== "none" && timeline.stopStartTime && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Parado desde:</span>
                            <span className="font-medium">
                              {format(new Date(timeline.stopStartTime), "HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        )}

                        {/* Today's Status History Timeline */}
                        {timeline.statusHistory.length > 0 && (
                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                Movimentações de Hoje
                              </p>
                              {isAdmin && (
                                <div className="flex items-center gap-1">
                                  <AdminCountersEditor
                                    equipmentId={vehicle.id}
                                    equipmentName={vehicle.name}
                                  />
                                  <AdminStatusEditor
                                    equipmentId={vehicle.id}
                                    equipmentName={vehicle.name}
                                    equipmentPlate={vehicle.plate}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {timeline.statusHistory.map((status, idx) => {
                                const statusLabel = getStatusLabel(status.stop_reason);
                                const isOperando = status.stop_reason === "operando" || status.stop_reason === "none";
                                const isAbastecimento = status.stop_reason === "abastecimento" || status.stop_reason === "end_of_day";
                                const isMaintenanceCorretiva = status.stop_reason === "maintenance" || status.stop_reason === "manutencao_corretiva";
                                const isMaintenancePreventiva = status.stop_reason === "manutencao_preventiva";
                                const isVistoria = status.stop_reason === "vistoria";
                                const isEndOfShift = status.stop_reason === "end_of_shift" || status.stop_reason === "fim_turno";
                                const isWaiting = status.stop_reason === "waiting" || status.stop_reason === "waiting_front" || status.stop_reason === "aguardando_frente_servico";
                                const isRain = status.stop_reason === "rain";
                                
                                return (
                                  <div
                                    key={status.id || idx}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <span className="font-mono text-muted-foreground w-12">
                                      {format(new Date(status.started_at), "HH:mm", { locale: ptBR })}
                                    </span>
                                    <Badge
                                      className={`text-xs ${
                                        isOperando ? "bg-green-500 text-white" :
                                        isAbastecimento ? "bg-cyan-500 text-white" :
                                        isMaintenanceCorretiva ? "bg-red-500 text-white" :
                                        isMaintenancePreventiva ? "bg-amber-500 text-white" :
                                        isVistoria ? "bg-purple-500 text-white" :
                                        isEndOfShift ? "bg-blue-500 text-white" :
                                        isWaiting ? "bg-yellow-500 text-black" :
                                        isRain ? "bg-sky-500 text-white" :
                                        ""
                                      }`}
                                    >
                                      {statusLabel}
                                    </Badge>
                                    {status.defect_description && (
                                      <span className="text-muted-foreground truncate max-w-[120px]" title={status.defect_description}>
                                        {status.defect_description}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {timeline.statusHistory.length === 0 && !timeline.driver && (
                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                <span>Aguardando seleção do motorista</span>
                              </div>
                              {isAdmin && (
                                <AdminStatusEditor
                                  equipmentId={vehicle.id}
                                  equipmentName={vehicle.name}
                                  equipmentPlate={vehicle.plate}
                                />
                              )}
                            </div>
                          </div>
                        )}
                        {timeline.statusHistory.length === 0 && timeline.driver && isAdmin && (
                          <div className="border-t pt-3">
                            <div className="flex items-center justify-end">
                              <AdminStatusEditor
                                equipmentId={vehicle.id}
                                equipmentName={vehicle.name}
                                equipmentPlate={vehicle.plate}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>


          {/* Equipment Registration Tab */}
          {canEdit && (
          <TabsContent value="equipamentos" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Equipamentos Cadastrados
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Equipamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cadastrar Novo Equipamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Equipamento</Label>
                        <Input
                          id="name"
                          placeholder="Ex: PIPA 01"
                          value={newEquipment.name}
                          onChange={(e) =>
                            setNewEquipment({ ...newEquipment, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="plate">Placa</Label>
                        <Input
                          id="plate"
                          placeholder="Ex: ABC1D23"
                          value={newEquipment.plate}
                          onChange={(e) =>
                            setNewEquipment({
                              ...newEquipment,
                              plate: e.target.value.toUpperCase(),
                            })
                          }
                          maxLength={7}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select
                          value={newEquipment.equipment_type}
                          onValueChange={(value: "pipa" | "munk") =>
                            setNewEquipment({ ...newEquipment, equipment_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pipa">Pipa</SelectItem>
                            <SelectItem value="munk">Munk</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleCreateEquipment}
                        disabled={createEquipment.isPending}
                      >
                        {createEquipment.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Cadastrar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoadingEquipment ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : driverVehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nenhum equipamento cadastrado
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Motorista Atual</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driverVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <VehicleIcon
                                type={vehicle.equipment_type as "pipa" | "munk"}
                                size="sm"
                              />
                              {vehicle.name}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{vehicle.plate}</TableCell>
                          <TableCell>
                            {getEquipmentTypeLabel(vehicle.equipment_type)}
                          </TableCell>
                          <TableCell>
                            {vehicle.driver || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(vehicle.stop_reason, vehicle.id, vehicle.driver || "")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-500 hover:text-blue-600"
                                onClick={() => handleOpenEdit(vehicle)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    disabled={!!vehicle.driver}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover Equipamento</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover o equipamento{" "}
                                      <strong>{vehicle.name}</strong>? Esta action não pode
                                      ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteEquipment(vehicle.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Equipamento</DialogTitle>
                </DialogHeader>
                {editingEquipment && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Nome do Equipamento</Label>
                      <Input
                        id="edit-name"
                        value={editingEquipment.name}
                        onChange={(e) =>
                          setEditingEquipment({ ...editingEquipment, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-plate">Placa</Label>
                      <Input
                        id="edit-plate"
                        value={editingEquipment.plate}
                        onChange={(e) =>
                          setEditingEquipment({
                            ...editingEquipment,
                            plate: e.target.value.toUpperCase(),
                          })
                        }
                        maxLength={7}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-type">Tipo</Label>
                      <Select
                        value={editingEquipment.equipment_type}
                        onValueChange={(value: "pipa" | "munk") =>
                          setEditingEquipment({ ...editingEquipment, equipment_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pipa">Pipa</SelectItem>
                          <SelectItem value="munk">Munk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleUpdateEquipment}
                      disabled={updateEquipment.isPending}
                    >
                      {updateEquipment.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Pencil className="h-4 w-4 mr-2" />
                      )}
                      Salvar Alterações
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
