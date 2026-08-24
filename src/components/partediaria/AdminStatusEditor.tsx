import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
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
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from "@/components/ui/alert-dialog";
 import { Edit, Plus, Loader2, Trash2, Clock, Pencil, FileText, Calendar } from "lucide-react";
 import { toast } from "sonner";
import { format } from "date-fns";
import { 
  useAddStatusToHistory, 
  useRemoveStatusFromHistory, 
  useUpdateStatusInHistory,
  StatusHistoryEntry,
  useDailyShiftRecords
} from "@/hooks/useDailyShiftRecords";
import { useEquipmentStopHistory } from "@/hooks/useEquipment";
import { useProfile } from "@/hooks/useProfile";
import { useAllUsers } from "@/hooks/useAllUsers";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportDailyShiftPdfButton } from "@/components/equipamentos/ExportDailyShiftPdfButton";
 
 interface AdminStatusEditorProps {
   equipmentId: string;
   equipmentName: string;
   equipmentPlate?: string;
   shiftDate?: string;
}
 
const STATUS_OPTIONS = [
  { value: "operando", label: "Operando" },
  { value: "waiting_front", label: "Aguardando Frente" },
  { value: "aguardando_frente_servico", label: "Aguardando Frente de Serviço" },
  { value: "maintenance", label: "Manutenção" },
  { value: "manutencao_corretiva", label: "Manutenção Corretiva" },
  { value: "manutencao_preventiva", label: "Manutenção Preventiva" },
  { value: "vistoria", label: "Vistoria" },
  { value: "abastecimento", label: "Abastecendo" },
  { value: "servico", label: "Em Serviço" },
  { value: "rain", label: "Parado (Chuva)" },
  { value: "almoco", label: "Almoço" },
  { value: "end_of_shift", label: "Fim de Turno" },
] as const;

// Pontos de abastecimento disponíveis no painel do motorista
const PONTOS_ABASTECIMENTO = ["46", "3C", "3D", "82"] as const;

// Serviços disponíveis no painel do motorista
const SERVICOS_OPTIONS = [
  { id: "lavagem_mirante", label: "Lavagem Mirante" },
  { id: "irrigacao_carretel", label: "Irrigação Carretel" },
  { id: "irrigacao_faixa_3_4", label: "Irrigação FAIXA 3 e 4" },
  { id: "abastecimento_tanque_irrigacao", label: "Abastecimento do Tanque de Irrigação" },
  { id: "lavagem_vertedouro", label: "Lavagem Vertedouro" },
  { id: "umectacao_vias", label: "Umectação de Vias" },
  { id: "lavagem_carro", label: "Lavagem de Carro" },
] as const;

const ALL_STATUS_LABELS: Record<string, string> = {
  operando: "Operando",
  waiting_front: "Aguardando Frente",
  waiting: "Aguardando Frente",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  maintenance: "Manutenção",
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  abastecimento: "Abastecendo",
  servico: "Em Serviço",
  rain: "Parado (Chuva)",
  end_of_shift: "Fim de Turno",
  fim_turno: "Fim de Turno",
  end_of_day: "Abastecendo",
  almoco: "Almoço",
  none: "Sem Status",
};

const getStatusLabel = (status: string) => {
  return ALL_STATUS_LABELS[status] || status;
};

const getStatusColor = (status: string) => {
  if (status === "operando" || status === "none") return "bg-green-500 text-white";
  if (status === "abastecimento" || status === "end_of_day") return "bg-cyan-500 text-white";
  if (status === "maintenance" || status === "manutencao_corretiva") return "bg-red-500 text-white";
  if (status === "manutencao_preventiva") return "bg-amber-500 text-white";
  if (status === "vistoria") return "bg-purple-500 text-white";
  if (status === "end_of_shift" || status === "fim_turno") return "bg-blue-500 text-white";
  if (status === "waiting" || status === "waiting_front" || status === "aguardando_frente_servico") return "bg-yellow-500 text-black";
  if (status === "rain") return "bg-sky-500 text-white";
  return "";
};
 
 export function AdminStatusEditor({ equipmentId, equipmentName, equipmentPlate, shiftDate }: AdminStatusEditorProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [activeTab, setActiveTab] = useState<string>("list");
   
   // Date picker state
   const today = new Date().toISOString().split("T")[0];
   const [selectedDate, setSelectedDate] = useState<string>(shiftDate || today);
   
   // Add new status state
   const [selectedStatus, setSelectedStatus] = useState<string>("");
   const [statusTime, setStatusTime] = useState<string>("");
   const [description, setDescription] = useState<string>("");
   const [selectedPoint, setSelectedPoint] = useState<string>("");
   const [selectedServico, setSelectedServico] = useState<string>("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   
   // Edit status state
   const [editingIndex, setEditingIndex] = useState<number | null>(null);
   const [editStatus, setEditStatus] = useState<string>("");
   const [editTime, setEditTime] = useState<string>("");
   const [editDescription, setEditDescription] = useState<string>("");
   
   // Delete confirmation state
   const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
   
   // Auto PDF state
   const [autoGeneratingPdf, setAutoGeneratingPdf] = useState(false);
   const pdfButtonRef = useRef<HTMLButtonElement>(null);

    const addStatusToHistory = useAddStatusToHistory();
    const removeStatusFromHistory = useRemoveStatusFromHistory();
    const updateStatusInHistory = useUpdateStatusInHistory();
    const queryClient = useQueryClient();
    const { data: profile } = useProfile();
    const { allUsers } = useAllUsers();
    
    // Resolve UUID to name for changed_by display
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const resolveChangedBy = (name?: string) => {
      if (!name) return undefined;
      if (uuidRegex.test(name)) {
        const found = allUsers.find((p) => p.user_id === name);
        return found?.full_name || name;
      }
      return name;
    };
    const targetDate = selectedDate;
    
    // Fetch records for target date AND without date filter as fallback
    const { data: dateRecords = [] } = useDailyShiftRecords(targetDate);
    const { data: allRecords = [] } = useDailyShiftRecords();
    
    // Also fetch from equipment_stop_history (the source of "Movimentações de Hoje")
    const { data: stopHistory = [] } = useEquipmentStopHistory(equipmentId);
    
    // Try to find record for the target date first, then fall back to most recent record for this equipment
    const dateRecord = dateRecords.find((r) => r.equipment_id === equipmentId);
    const currentRecord = dateRecord || allRecords.find((r) => r.equipment_id === equipmentId);
    // Always use the selected date for filtering stop history, not the fallback record's date
    const effectiveDate = targetDate;
    const shiftStatusHistory = currentRecord?.status_history || [];
    
    // Build merged history: combine daily_shift_records status_history with equipment_stop_history
    // Build merged history with source tracking
    type MergedEntry = StatusHistoryEntry & { shiftIndex: number | null; stopHistoryId: string | null };
    
    const mergedHistory: MergedEntry[] = (() => {
      const todayStopHistory = stopHistory.filter((sh) => {
        const startedDate = sh.started_at.slice(0, 10);
        return startedDate === effectiveDate;
      });
      
      const entries: MergedEntry[] = shiftStatusHistory.map((entry, idx) => ({
        ...entry,
        shiftIndex: idx,
        stopHistoryId: null,
      }));
      
      for (const sh of todayStopHistory) {
        const shTime = new Date(sh.started_at).getTime();
        const matchIdx = entries.findIndex((entry) => {
          const entryTime = new Date(entry.timestamp).getTime();
          return Math.abs(entryTime - shTime) < 120000 && entry.status === sh.stop_reason;
        });
        if (matchIdx >= 0) {
          // Link the stop history id to the existing shift entry
          entries[matchIdx].stopHistoryId = sh.id;
        } else {
          entries.push({
            status: sh.stop_reason,
            timestamp: sh.started_at,
            changed_by: sh.changed_by_driver || undefined,
            description: sh.defect_description || undefined,
            shiftIndex: null,
            stopHistoryId: sh.id,
          });
        }
      }
      
      return entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    })();
    
    const statusHistory = mergedHistory;
    
    // Auto-generate PDF after changes
    const triggerAutoPdf = useCallback(async () => {
      // Wait for queries to refresh
      await queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
      await queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
      await queryClient.invalidateQueries({ queryKey: ["equipment-stop-history"] });
      
      // Wait for data to settle before generating PDF
      setTimeout(() => {
        if (pdfButtonRef.current) {
          pdfButtonRef.current.click();
        }
      }, 2000);
    }, [queryClient]);
 
   const handleAddSubmit = async () => {
     if (!selectedStatus || !statusTime) {
       toast.error("Selecione o status e o horário");
       return;
     }

     if (selectedStatus === "abastecimento" && !selectedPoint) {
       toast.error("Selecione o ponto de abastecimento");
       return;
     }

     if (selectedStatus === "servico" && !selectedServico) {
       toast.error("Selecione o serviço");
       return;
     }

     setIsSubmitting(true);

     try {
        const timestamp = new Date(`${effectiveDate}T${statusTime}:00`).toISOString();

        // Build description including point/servico when applicable
        let finalDescription = description || "";
        if (selectedStatus === "abastecimento") {
          finalDescription = `Ponto: ${selectedPoint}${description ? ` - ${description}` : ""}`;
        } else if (selectedStatus === "servico") {
          const svc = SERVICOS_OPTIONS.find((s) => s.id === selectedServico);
          finalDescription = `Serviço: ${svc?.label || selectedServico}${description ? ` - ${description}` : ""}`;
        }

         await addStatusToHistory.mutateAsync({
          equipmentId,
          status: selectedStatus,
          changedBy: profile?.full_name ? `${profile.full_name} (Admin)` : "Admin",
          description: finalDescription || undefined,
          customTimestamp: timestamp,
          shiftDate: effectiveDate,
          equipmentName,
          equipmentPlate,
        });

        // Also add to equipment_stop_history for the selected date.
        // Set ended_at so that reports (e.g. abastecimento) that filter by
        // completed records include admin-registered entries.
        await supabase
          .from("equipment_stop_history")
          .insert({
            equipment_id: equipmentId,
            stop_reason: selectedStatus,
            started_at: timestamp,
            ended_at: timestamp,
            duration_minutes: 0,
            defect_description: finalDescription || null,
            changed_by_driver: profile?.full_name ? `${profile.full_name} (Admin)` : "Admin",
          });
 
       toast.success("Status adicionado com sucesso!");
       setSelectedStatus("");
       setStatusTime("");
       setDescription("");
       setSelectedPoint("");
       setSelectedServico("");
       setActiveTab("list");
       
       // Auto-generate PDF after adding
       triggerAutoPdf();
     } catch (error) {
       console.error("Error adding status:", error);
       toast.error("Erro ao adicionar status");
     } finally {
       setIsSubmitting(false);
     }
   };
 
   const handleStartEdit = (index: number, entry: StatusHistoryEntry) => {
     setEditingIndex(index);
     setEditStatus(entry.status);
     const time = new Date(entry.timestamp);
     setEditTime(format(time, "HH:mm"));
     setEditDescription(entry.description || "");
   };
 
   const handleCancelEdit = () => {
     setEditingIndex(null);
     setEditStatus("");
     setEditTime("");
     setEditDescription("");
   };
 
    const handleSaveEdit = async () => {
      if (editingIndex === null || !editTime) return;
      
      const entry = statusHistory[editingIndex];
      if (!entry) return;

      setIsSubmitting(true);

      try {
        const newTimestamp = new Date(`${effectiveDate}T${editTime}:00`).toISOString();

        if (entry.shiftIndex !== null) {
          // Edit in daily_shift_records
          await updateStatusInHistory.mutateAsync({
            equipmentId,
            statusIndex: entry.shiftIndex,
            newStatus: editStatus,
            newTimestamp,
            newDescription: editDescription,
            shiftDate: effectiveDate,
          });
        }
        
        // Also update equipment_stop_history if we have a matching record
        const editorName = profile?.full_name ? `${profile.full_name} (editou)` : "Admin (editou)";

        if (entry.stopHistoryId) {
          await supabase
            .from("equipment_stop_history")
            .update({
              stop_reason: editStatus,
              started_at: newTimestamp,
              defect_description: editDescription || null,
              changed_by_driver: editorName,
            })
            .eq("id", entry.stopHistoryId);
        } else if (entry.shiftIndex === null) {
          // Entry only in stop_history, find by timestamp match
          const { data: matches } = await supabase
            .from("equipment_stop_history")
            .select("id")
            .eq("equipment_id", equipmentId)
            .eq("started_at", entry.timestamp)
            .eq("stop_reason", entry.status)
            .limit(1);
          
          if (matches && matches.length > 0) {
            await supabase
              .from("equipment_stop_history")
              .update({
                stop_reason: editStatus,
                started_at: newTimestamp,
                defect_description: editDescription || null,
                changed_by_driver: editorName,
              })
              .eq("id", matches[0].id);
          }
        }

        // When editing a "Fim de Turno" entry, also update shift_end_time in daily_shift_records
        const fimTurnoReasons = ["end_of_shift", "fim_turno"];
        if (fimTurnoReasons.includes(editStatus) && currentRecord) {
          await supabase
            .from("daily_shift_records")
            .update({ shift_end_time: newTimestamp })
            .eq("id", currentRecord.id);
        }

        // Update ended_at of the previous stop history entry to match this entry's new start time
        const prevEntry = editingIndex > 0 ? statusHistory[editingIndex - 1] : null;
        if (prevEntry) {
          const prevStopId = prevEntry.stopHistoryId;
          if (prevStopId) {
            const startMs = new Date(newTimestamp).getTime();
            const prevStartMs = new Date(prevEntry.timestamp).getTime();
            const durationMin = Math.round((startMs - prevStartMs) / 60000);
            await supabase
              .from("equipment_stop_history")
              .update({ ended_at: newTimestamp, duration_minutes: durationMin > 0 ? durationMin : null })
              .eq("id", prevStopId);
          } else {
            // Try to find the previous entry in stop_history by timestamp
            const { data: prevMatches } = await supabase
              .from("equipment_stop_history")
              .select("id")
              .eq("equipment_id", equipmentId)
              .eq("started_at", prevEntry.timestamp)
              .eq("stop_reason", prevEntry.status)
              .limit(1);
            if (prevMatches && prevMatches.length > 0) {
              const startMs = new Date(newTimestamp).getTime();
              const prevStartMs = new Date(prevEntry.timestamp).getTime();
              const durationMin = Math.round((startMs - prevStartMs) / 60000);
              await supabase
                .from("equipment_stop_history")
                .update({ ended_at: newTimestamp, duration_minutes: durationMin > 0 ? durationMin : null })
                .eq("id", prevMatches[0].id);
            }
          }
        }

        // Also sync description to equipment_movements for "Fora da Obra" display
        const maintenanceReasons = ["manutencao_corretiva", "manutencao_preventiva", "maintenance", "vistoria"];
        if (editDescription && maintenanceReasons.includes(editStatus)) {
          // Map stop_reason to exit_reason used in equipment_movements
          const exitReasonMap: Record<string, string> = {
            manutencao_corretiva: "manutencao_corretiva",
            maintenance: "manutencao_corretiva",
            manutencao_preventiva: "manutencao_preventiva",
            vistoria: "vistoria",
          };
          const exitReason = exitReasonMap[editStatus];
          if (exitReason) {
            // Find matching movement by equipment name and date
            const { data: movements } = await supabase
              .from("equipment_movements")
              .select("id")
              .eq("equipment_name", equipmentName)
              .eq("movement_date", effectiveDate)
              .eq("movement_type", "saida")
              .eq("exit_reason", exitReason as any)
              .order("movement_time", { ascending: false })
              .limit(1);

            if (movements && movements.length > 0) {
              await supabase
                .from("equipment_movements")
                .update({ problem_description: editDescription })
                .eq("id", movements[0].id);
            }
          }
        }

        toast.success("Status atualizado com sucesso!");
        handleCancelEdit();
        // Invalidate stop history cache
        queryClient.invalidateQueries({ queryKey: ["equipment-stop-history"] });
        queryClient.invalidateQueries({ queryKey: ["equipment-currently-out"] });
        queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
        
        // Auto-generate PDF after editing
        triggerAutoPdf();
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error("Erro ao atualizar status");
      } finally {
        setIsSubmitting(false);
      }
    };
 
    const handleDelete = async () => {
      if (deleteIndex === null) return;
      
      const entry = statusHistory[deleteIndex];
      if (!entry) return;

      try {
        if (entry.shiftIndex !== null) {
          await removeStatusFromHistory.mutateAsync({
            equipmentId,
            statusIndex: entry.shiftIndex,
            shiftDate: effectiveDate,
          });
        }
        
        // Also delete from equipment_stop_history
        if (entry.stopHistoryId) {
          await supabase
            .from("equipment_stop_history")
            .delete()
            .eq("id", entry.stopHistoryId);
        } else if (entry.shiftIndex === null) {
          const { data: matches } = await supabase
            .from("equipment_stop_history")
            .select("id")
            .eq("equipment_id", equipmentId)
            .eq("started_at", entry.timestamp)
            .eq("stop_reason", entry.status)
            .limit(1);
          
          if (matches && matches.length > 0) {
            await supabase
              .from("equipment_stop_history")
              .delete()
              .eq("id", matches[0].id);
          }
        }

        toast.success("Status removido com sucesso!");
        setDeleteIndex(null);
        queryClient.invalidateQueries({ queryKey: ["equipment-stop-history"] });
        queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
        queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
        
        // Auto-generate PDF after deleting
        triggerAutoPdf();
      } catch (error) {
        console.error("Error removing status:", error);
        toast.error("Erro ao remover status");
      }
    };
 
   return (
     <>
       <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) setSelectedDate(shiftDate || today); }}>
         <DialogTrigger asChild>
           <Button variant="ghost" size="sm" className="h-7 text-xs">
             <Edit className="h-3 w-3 mr-1" />
             Editar
           </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-[500px]">
           <DialogHeader>
             <DialogTitle>Gerenciar Status - {equipmentName}</DialogTitle>
           </DialogHeader>
           
           {/* Date Picker */}
           <div className="flex items-center gap-2 pb-2 border-b">
             <Calendar className="h-4 w-4 text-muted-foreground" />
             <Label className="text-sm font-medium">Data:</Label>
             <Input
               type="date"
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="h-8 w-auto"
             />
             {currentRecord && (
               <ExportDailyShiftPdfButton ref={pdfButtonRef} record={currentRecord} isLoading={autoGeneratingPdf} />
             )}
           </div>
           
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="list">Histórico</TabsTrigger>
               <TabsTrigger value="add">Adicionar</TabsTrigger>
             </TabsList>
             
             <TabsContent value="list" className="mt-4">
               {statusHistory.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground">
                   <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                   <p className="text-sm">Nenhum status registrado</p>
                 </div>
               ) : (
                 <ScrollArea className="h-[300px] pr-4">
                   <div className="space-y-2">
                     {statusHistory.map((entry, index) => (
                       <div
                         key={index}
                         className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30"
                       >
                         {editingIndex === index ? (
                           <div className="flex-1 space-y-3">
                             <div className="grid grid-cols-2 gap-2">
                               <div>
                                 <Label className="text-xs">Status</Label>
                                 <Select value={editStatus} onValueChange={setEditStatus}>
                                   <SelectTrigger className="h-8">
                                     <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {STATUS_OPTIONS.map((option) => (
                                       <SelectItem key={option.value} value={option.value}>
                                         {option.label}
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>
                               <div>
                                 <Label className="text-xs">Horário</Label>
                                 <Input
                                   type="time"
                                   value={editTime}
                                   onChange={(e) => setEditTime(e.target.value)}
                                   className="h-8"
                                 />
                               </div>
                             </div>
                             <div>
                               <Label className="text-xs">Descrição</Label>
                               <Input
                                 value={editDescription}
                                 onChange={(e) => setEditDescription(e.target.value)}
                                 placeholder="Descrição (opcional)"
                                 className="h-8"
                               />
                             </div>
                             <div className="flex gap-2">
                               <Button
                                 size="sm"
                                 onClick={handleSaveEdit}
                                 disabled={isSubmitting}
                                 className="h-7"
                               >
                                 {isSubmitting ? (
                                   <Loader2 className="h-3 w-3 animate-spin" />
                                 ) : (
                                   "Salvar"
                                 )}
                               </Button>
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={handleCancelEdit}
                                 className="h-7"
                               >
                                 Cancelar
                               </Button>
                             </div>
                           </div>
                         ) : (
                           <>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    {format(new Date(entry.timestamp), "HH:mm")}
                                  </Badge>
                                  <Badge className={`text-xs ${getStatusColor(entry.status)}`}>
                                    {getStatusLabel(entry.status)}
                                  </Badge>
                                </div>
                               {entry.description && (
                                 <p className="text-xs text-muted-foreground mt-1 truncate">
                                   {entry.description}
                                 </p>
                               )}
                                {entry.changed_by && (
                                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                                    por {resolveChangedBy(entry.changed_by)}
                                  </p>
                                )}
                             </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleStartEdit(index, entry)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteIndex(index)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                           </>
                         )}
                       </div>
                     ))}
                   </div>
                 </ScrollArea>
               )}
             </TabsContent>
             
             <TabsContent value="add" className="mt-4">
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="status">Status</Label>
                   <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione o status" />
                     </SelectTrigger>
                     <SelectContent>
                       {STATUS_OPTIONS.map((option) => (
                         <SelectItem key={option.value} value={option.value}>
                           {option.label}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>

                 {selectedStatus === "abastecimento" && (
                   <div className="space-y-2">
                     <Label htmlFor="point">Ponto de Abastecimento</Label>
                     <Select value={selectedPoint} onValueChange={setSelectedPoint}>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione o ponto" />
                       </SelectTrigger>
                       <SelectContent>
                         {PONTOS_ABASTECIMENTO.map((p) => (
                           <SelectItem key={p} value={p}>
                             Ponto {p}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}

                 {selectedStatus === "servico" && (
                   <div className="space-y-2">
                     <Label htmlFor="servico">Serviço</Label>
                     <Select value={selectedServico} onValueChange={setSelectedServico}>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione o serviço" />
                       </SelectTrigger>
                       <SelectContent>
                         {SERVICOS_OPTIONS.map((s) => (
                           <SelectItem key={s.id} value={s.id}>
                             {s.label}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}
 
 
                 <div className="space-y-2">
                   <Label htmlFor="time">Horário</Label>
                   <Input
                     id="time"
                     type="time"
                     value={statusTime}
                     onChange={(e) => setStatusTime(e.target.value)}
                     className="w-full"
                   />
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="description">Descrição (opcional)</Label>
                   <Input
                     id="description"
                     placeholder="Ex: Ponto 1, Problema no motor..."
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                   />
                 </div>
 
                 <Button
                   className="w-full"
                   onClick={handleAddSubmit}
                   disabled={isSubmitting || !selectedStatus || !statusTime}
                 >
                   {isSubmitting ? (
                     <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   ) : (
                     <Plus className="h-4 w-4 mr-2" />
                   )}
                   Adicionar Status
                 </Button>
               </div>
             </TabsContent>
           </Tabs>
         </DialogContent>
       </Dialog>
 
       <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Remover Status</AlertDialogTitle>
             <AlertDialogDescription>
               Tem certeza que deseja remover este status do histórico? Esta ação não pode ser desfeita.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancelar</AlertDialogCancel>
             <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
               Remover
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   );
 }