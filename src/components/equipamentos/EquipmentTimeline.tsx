import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pause, Play, Wrench, CloudRain, Clock, User, Edit2, Check, X, Trash2, MoreHorizontal, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUpdateEquipmentStatus, useUpdateEquipment, useDeleteEquipment, useEquipmentStopHistory, type StopReason, type Equipment } from "@/hooks/useEquipment";
import { VehicleIcon, equipmentTypeColors, type EquipmentType } from "./VehicleIcons";
import { getBrazilNorthDate } from "@/lib/timezone";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  none: { label: "Operando", color: "text-green-600", bg: "bg-green-500", icon: <Play className="w-3 h-3" /> },
  maintenance: { label: "Manutenção", color: "text-orange-600", bg: "bg-orange-500", icon: <Wrench className="w-3 h-3" /> },
  waiting: { label: "Aguardando", color: "text-amber-600", bg: "bg-amber-500", icon: <Clock className="w-3 h-3" /> },
  rain: { label: "Chuva", color: "text-blue-600", bg: "bg-blue-500", icon: <CloudRain className="w-3 h-3" /> },
  end_of_day: { label: "Fim do dia", color: "text-slate-600", bg: "bg-slate-500", icon: <Pause className="w-3 h-3" /> },
  end_of_shift: { label: "Fim de Turno", color: "text-purple-600", bg: "bg-purple-500", icon: <Pause className="w-3 h-3" /> },
};

const quickStatusOptions: StopReason[] = ["none", "maintenance", "waiting", "rain", "end_of_shift"];

interface EquipmentTimelineProps {
  equipment: Equipment;
}

export function EquipmentTimeline({ equipment }: EquipmentTimelineProps) {
  const [currentTime, setCurrentTime] = useState(getBrazilNorthDate());
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [defectDescription, setDefectDescription] = useState("");
  const [isEditingMaintenance, setIsEditingMaintenance] = useState(false);
  const [currentMaintenanceId, setCurrentMaintenanceId] = useState<string | null>(null);
  const [maintenanceStartedAt, setMaintenanceStartedAt] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    name: equipment.name,
    plate: equipment.plate,
    driver: equipment.driver,
    helper: equipment.helper,
  });
  
  const updateStatus = useUpdateEquipmentStatus();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();
  const { data: stopHistory, refetch: refetchHistory } = useEquipmentStopHistory(equipment.id);

  const stopReason = (equipment.stop_reason || "none") as StopReason;
  const stopStartTime = equipment.stop_start_time ? new Date(equipment.stop_start_time) : null;
  const equipmentType = (equipment.equipment_type || "pipa") as EquipmentType;
  const status = statusConfig[stopReason] || statusConfig.none;
  const typeColors = equipmentTypeColors[equipmentType] || equipmentTypeColors.pipa;

  useEffect(() => {
    setEditData({ name: equipment.name, plate: equipment.plate, driver: equipment.driver, helper: equipment.helper });
  }, [equipment]);

  const checkAutoEndOfShift = useCallback(async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (hours === 16 && minutes === 30 && stopReason === "none") {
      try {
        await updateStatus.mutateAsync({
          id: equipment.id,
          stop_reason: "end_of_shift",
          stop_start_time: now.toISOString(),
          previousStopReason: stopReason,
          previousStopStartTime: equipment.stop_start_time,
        });
        toast.info(`${equipment.name}: Fim de Turno automático`);
      } catch {
        console.error("Erro ao aplicar fim de turno automático");
      }
    }
  }, [equipment.id, equipment.name, equipment.stop_start_time, stopReason, updateStatus]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      checkAutoEndOfShift();
    }, 60000);
    checkAutoEndOfShift();
    return () => clearInterval(interval);
  }, [checkAutoEndOfShift]);

  const handleStatusButtonClick = async (reason: StopReason) => {
    // Se já está no mesmo status (exceto "none"), não fazer nada
    if (stopReason === reason && reason !== "none") {
      if (reason === "maintenance") {
        // Para manutenção, abrir dialog para ver/editar
        const currentMaintenance = stopHistory?.find(
          (h) => h.stop_reason === "maintenance" && h.ended_at === null
        );
        if (currentMaintenance) {
          setDefectDescription(currentMaintenance.defect_description || "");
          setCurrentMaintenanceId(currentMaintenance.id);
          setMaintenanceStartedAt(currentMaintenance.started_at);
          setIsEditingMaintenance(true);
          setShowMaintenanceDialog(true);
        }
      }
      return;
    }

    if (reason === "maintenance") {
      // Starting new maintenance
      setDefectDescription("");
      setCurrentMaintenanceId(null);
      setMaintenanceStartedAt(null);
      setIsEditingMaintenance(false);
      setShowMaintenanceDialog(true);
    } else {
      handleStopChange(reason);
    }
  };

  const handleStopChange = async (reason: StopReason, description?: string) => {
    try {
      await updateStatus.mutateAsync({
        id: equipment.id,
        stop_reason: reason,
        stop_start_time: reason === "none" ? null : new Date().toISOString(),
        previousStopReason: stopReason,
        previousStopStartTime: equipment.stop_start_time,
        defect_description: description,
      });
      
      if (reason === "end_of_shift") {
        toast.success(`${equipment.name}: Fim de Turno ativado`, {
          description: "Equipamento parado até reinício manual",
          icon: <Pause className="w-4 h-4 text-purple-500" />,
        });
      } else if (reason === "none") {
        toast.success(`${equipment.name}: Operação retomada`, {
          icon: <Play className="w-4 h-4 text-green-500" />,
        });
      } else {
        toast.success(`${equipment.name}: ${statusConfig[reason].label}`);
      }
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleMaintenanceSubmit = async () => {
    if (!defectDescription.trim()) {
      toast.error("Por favor, descreva o defeito");
      return;
    }

    if (isEditingMaintenance && currentMaintenanceId) {
      // Update existing maintenance description
      try {
        const { error } = await supabase
          .from("equipment_stop_history")
          .update({ defect_description: defectDescription.trim() })
          .eq("id", currentMaintenanceId);

        if (error) throw error;
        toast.success("Descrição atualizada!");
        refetchHistory();
      } catch {
        toast.error("Erro ao atualizar descrição");
      }
    } else {
      // Create new maintenance
      handleStopChange("maintenance", defectDescription.trim());
    }

    setShowMaintenanceDialog(false);
    setDefectDescription("");
    setCurrentMaintenanceId(null);
    setIsEditingMaintenance(false);
  };

  const handleSaveEdit = async () => {
    try {
      await updateEquipment.mutateAsync({ id: equipment.id, ...editData });
      toast.success("Atualizado!");
      setIsEditing(false);
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEquipment.mutateAsync(equipment.id);
      toast.success("Equipamento removido!");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const getStopDuration = () => {
    if (!stopStartTime) return null;
    const diff = Math.floor((currentTime.getTime() - stopStartTime.getTime()) / 60000);
    return diff >= 60 ? `${Math.floor(diff / 60)}h ${diff % 60}m` : `${diff}min`;
  };

  const isStopped = stopReason !== "none";

  return (
    <div className="group bg-card border border-border rounded-2xl p-5 transition-all hover:shadow-lg hover:border-primary/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`relative p-3 rounded-xl transition-all border ${
            isStopped 
              ? 'bg-muted border-border' 
              : `${typeColors.bg} ${typeColors.border} shadow-lg ${typeColors.glow}`
          }`}>
            <div className={!isStopped ? 'animate-pulse' : ''}>
              <VehicleIcon type={equipmentType} isStopped={isStopped} size="sm" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${status.bg} ${!isStopped ? 'animate-pulse' : ''}`} />
          </div>
          
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Input 
                  value={editData.name} 
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })} 
                  className="h-8 w-28 text-sm" 
                  placeholder="Nome"
                />
                <Input 
                  value={editData.plate} 
                  onChange={(e) => setEditData({ ...editData, plate: e.target.value.toUpperCase() })} 
                  className="h-8 w-24 text-sm" 
                  placeholder="Placa"
                />
                <Input 
                  value={editData.driver} 
                  onChange={(e) => setEditData({ ...editData, driver: e.target.value })} 
                  className="h-8 w-28 text-sm" 
                  placeholder="Motorista" 
                />
                <Input 
                  value={editData.helper} 
                  onChange={(e) => setEditData({ ...editData, helper: e.target.value })} 
                  className="h-8 w-28 text-sm" 
                  placeholder="Ajudante" 
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSaveEdit}>
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground">{equipment.name}</h3>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {equipment.plate}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span>{equipment.driver}</span>
                  {equipment.helper && (
                    <>
                      <span className="text-border">•</span>
                      <span>{equipment.helper}</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${status.color} bg-current/10`}>
            {status.icon}
            <span>{status.label}</span>
            {isStopped && stopStartTime && (
              <span className="opacity-70">• {getStopDuration()}</span>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2">
                <Edit2 className="w-4 h-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4" /> Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Status Buttons */}
      <div className="flex items-center gap-2">
        {quickStatusOptions.map((reason) => {
          const config = statusConfig[reason];
          const isActive = stopReason === reason;
          return (
            <button
              key={reason}
              onClick={() => handleStatusButtonClick(reason)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive 
                  ? `${config.bg} text-white shadow-sm` 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {config.icon}
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Equipamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{equipment.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Maintenance Dialog */}
      <Dialog open={showMaintenanceDialog} onOpenChange={(open) => {
        setShowMaintenanceDialog(open);
        if (!open) {
          setDefectDescription("");
          setCurrentMaintenanceId(null);
          setMaintenanceStartedAt(null);
          setIsEditingMaintenance(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-500" />
              {isEditingMaintenance ? "Ver/Editar Manutenção" : "Registrar Manutenção"}
            </DialogTitle>
            <DialogDescription>
              {isEditingMaintenance 
                ? <>Manutenção em andamento para <strong>{equipment.name}</strong></>
                : <>Descreva o defeito do equipamento <strong>{equipment.name}</strong></>
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isEditingMaintenance && maintenanceStartedAt && (
              <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <Calendar className="w-4 h-4 text-orange-500" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Início da manutenção: </span>
                  <span className="font-medium text-foreground">
                    {format(new Date(maintenanceStartedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="defect">Descrição do Defeito</Label>
              <Textarea
                id="defect"
                placeholder="Ex: Problema no sistema hidráulico, vazamento de óleo..."
                value={defectDescription}
                onChange={(e) => setDefectDescription(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isEditingMaintenance && (
              <Button
                variant="default"
                onClick={() => {
                  handleStopChange("none");
                  setShowMaintenanceDialog(false);
                  setDefectDescription("");
                  setCurrentMaintenanceId(null);
                  setMaintenanceStartedAt(null);
                  setIsEditingMaintenance(false);
                }}
                className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Finalizar Manutenção
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMaintenanceDialog(false);
                  setDefectDescription("");
                  setCurrentMaintenanceId(null);
                  setMaintenanceStartedAt(null);
                  setIsEditingMaintenance(false);
                }}
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleMaintenanceSubmit}
                className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Wrench className="w-4 h-4 mr-2" />
                {isEditingMaintenance ? "Salvar" : "Iniciar Manutenção"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
