import { Truck, MapPin, ExternalLink, Clock, Plus, Trash2, LogOut, Info } from "lucide-react";
import { Leaf, ArrowUpCircle, ArrowDownCircle, Loader2 as Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { useCreateEquipmentMovement, ExitReason } from "@/hooks/useEquipmentMovements";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
 import Layout from "@/components/layout/Layout";
 import { useEquipment } from "@/hooks/useEquipment";
import { useEquipmentCurrentlyOut } from "@/hooks/useEquipmentMovements";
import { OutHistoryDialog } from "@/components/equipamentos/OutHistoryDialog";
import { InHistoryDialog } from "@/components/equipamentos/InHistoryDialog";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { EquipmentMovementHistoryDialog } from "@/components/equipamentos/EquipmentMovementHistoryDialog";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExportMovementsHistoryPdfButton } from "@/components/equipamentos/ExportMovementsHistoryPdfButton";
import { ExportMovementsHistoryExcelButton } from "@/components/equipamentos/ExportMovementsHistoryExcelButton";
import { RecentMovementsFeed } from "@/components/equipamentos/RecentMovementsFeed";
// TotalEquipmentStatusModal removed in favor of direct page link
import { useJardinagemEquipment, useUpdateJardinagemEquipmentStatus, useCreateJardinagemEquipment, useDeleteJardinagemEquipment } from "@/hooks/useJardinagemEquipment";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const EXIT_REASON_LABELS: Record<string, string> = {
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  operando: "Operando",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  fim_turno: "Fim de Turno",
};
 
 const EntradaSaidaEquipamentos = () => {
   const { data: equipment = [], isLoading } = useEquipment();
  const { data: equipmentOut = [], isLoading: loadingOut } = useEquipmentCurrentlyOut();
  const { data: jardinagemEquipment = [], isLoading: loadingJardinagem } = useJardinagemEquipment();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const updateJardinagemStatus = useUpdateJardinagemEquipmentStatus();
  const createJardinagemEquipment = useCreateJardinagemEquipment();
  const deleteJardinagemEquipment = useDeleteJardinagemEquipment();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");

  // Equipment movement history dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyEquipment, setHistoryEquipment] = useState<{ name: string; plate: string } | null>(null);

  // Jardinagem exit dialog state
  const [jardinagemExitDialogOpen, setJardinagemExitDialogOpen] = useState(false);
  const [jardinagemExitEquipment, setJardinagemExitEquipment] = useState<{ id: string; name: string } | null>(null);
  const [jardinagemExitDate, setJardinagemExitDate] = useState("");
  const [jardinagemExitTime, setJardinagemExitTime] = useState("");

  const createMovement = useCreateEquipmentMovement();

  // Admin exit dialog state
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitEquipment, setExitEquipment] = useState<{ name: string; plate: string } | null>(null);
  const [exitDate, setExitDate] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [exitReason, setExitReason] = useState<ExitReason | "">("");
  const [exitProblem, setExitProblem] = useState("");
  const [exitObservation, setExitObservation] = useState("");

  // Admin entry dialog state
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryEquipment, setEntryEquipment] = useState<{ name: string; plate: string } | null>(null);
  const [entryDate, setEntryDate] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [entryObservation, setEntryObservation] = useState("");

  const handleOpenExitDialog = (eq: { name: string; plate: string }) => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    // Default to current date/time in Brazil North (UTC-4)
    const brDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    setExitDate(brDate.toISOString().split("T")[0]);
    setExitTime(`${pad(brDate.getUTCHours())}:${pad(brDate.getUTCMinutes())}`);
    setExitReason("");
    setExitProblem("");
    setExitObservation("");
    setExitEquipment(eq);
    setExitDialogOpen(true);
  };

  const handleOpenEntryDialog = (eq: { name: string; plate: string }) => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const brDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    setEntryDate(brDate.toISOString().split("T")[0]);
    setEntryTime(`${pad(brDate.getUTCHours())}:${pad(brDate.getUTCMinutes())}`);
    setEntryObservation("");
    setEntryEquipment(eq);
    setEntryDialogOpen(true);
  };

  const handleConfirmEntry = () => {
    if (!entryEquipment || !entryDate) {
      toast.error("Informe a data da entrada");
      return;
    }
    createMovement.mutate(
      {
        equipment_name: entryEquipment.name,
        plate: entryEquipment.plate,
        movement_type: "entrada",
        movement_date: entryDate,
        movement_time: entryTime || "00:00",
        exit_reason: null,
        problem_description: null,
        observation: entryObservation || null,
      },
      {
        onSuccess: () => {
          setEntryDialogOpen(false);
          setEntryEquipment(null);
        },
      }
    );
  };

  const handleConfirmExit = () => {
    if (!exitEquipment || !exitReason) {
      toast.error("Selecione o motivo da saída");
      return;
    }
    if (!exitDate) {
      toast.error("Informe a data da saída");
      return;
    }
    createMovement.mutate(
      {
        equipment_name: exitEquipment.name,
        plate: exitEquipment.plate,
        movement_type: "saida",
        movement_date: exitDate,
        movement_time: exitTime || "00:00",
        exit_reason: exitReason as ExitReason,
        problem_description: exitProblem || null,
        observation: exitObservation || null,
      },
      {
        onSuccess: () => {
          setExitDialogOpen(false);
          setExitEquipment(null);
        },
      }
    );
  };

  // Check if user can edit jardinagem equipment
  const canEditJardinagem = isAdmin || 
    profile?.cargo === "preposto" || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_i";

  const [jardinagemDialogNewStatus, setJardinagemDialogNewStatus] = useState<"entrou" | "saiu">("saiu");

  const handleToggleJardinagemStatus = (id: string, name: string, currentStatus: "entrou" | "saiu") => {
    const newStatus = currentStatus === "entrou" ? "saiu" : "entrou";
    const now = new Date();
    setJardinagemExitEquipment({ id, name });
    setJardinagemExitDate(format(now, "yyyy-MM-dd"));
    setJardinagemExitTime(format(now, "HH:mm"));
    setJardinagemDialogNewStatus(newStatus);
    setJardinagemExitDialogOpen(true);
  };

  const handleConfirmJardinagemExit = () => {
    if (!jardinagemExitEquipment) return;
    const customDateTime = jardinagemExitDate && jardinagemExitTime
      ? new Date(`${jardinagemExitDate}T${jardinagemExitTime}:00`).toISOString()
      : undefined;
    updateJardinagemStatus.mutate(
      { id: jardinagemExitEquipment.id, name: jardinagemExitEquipment.name, newStatus: jardinagemDialogNewStatus, customDateTime },
      {
        onSuccess: () => {
          setJardinagemExitDialogOpen(false);
          setJardinagemExitEquipment(null);
        },
      }
    );
  };

  const handleAddEquipment = () => {
    if (!newEquipmentName.trim()) return;
    createJardinagemEquipment.mutate(
      { name: newEquipmentName.trim() },
      {
        onSuccess: () => {
          setNewEquipmentName("");
          setAddDialogOpen(false);
        },
      }
    );
  };

  const handleDeleteEquipment = (id: string) => {
    deleteJardinagemEquipment.mutate(id);
  };
 
  // Only consider equipment "out" if exit reason is NOT "fim_turno" or "operando"
  // Those statuses mean the equipment is still on site
  const reallyOut = equipmentOut.filter(m => 
    m.exit_reason && 
    m.exit_reason !== "fim_turno" && 
    m.exit_reason !== "operando" &&
    m.exit_reason !== "aguardando_frente_servico"
  );
  
  // Get plates of equipment actually out (manutenção, vistoria, etc.)
  const platesOut = new Set(reallyOut.map(m => m.plate));
  
  // Equipment in the yard = all equipment minus those with active exit
  const equipmentNoCanteiro = equipment.filter(eq => !platesOut.has(eq.plate));
  
  // Equipment out = only those with real exit reasons (maintenance, inspection)
  const equipmentForaObra = reallyOut;

  // PDF export is handled by ExportMovementsHistoryPdfButton component
 
   return (
     <Layout>
       <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <EditablePageTitle pageKey="entrada-saida" defaultValue="Entrada e Saída de Equipamentos" className="inline" as="h1" />
            </h1>
            <p className="text-muted-foreground mt-2">
              Controle de equipamentos no canteiro e fora da obra
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/status-geral-equipamentos">
              <Button variant="outline" className="gap-2 bg-primary/10 hover:bg-primary/20 border-primary/30 transition-all">
                <Info className="h-4 w-4 text-primary" />
                <span className="font-semibold">Status 17 Equipamentos</span>
              </Button>
            </Link>
            <ExportMovementsHistoryExcelButton />
            <ExportMovementsHistoryPdfButton />
          </div>
         </div>
 
        {isLoading || loadingOut || loadingJardinagem ? (
           <div className="flex justify-center py-12">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
         ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 grid gap-6">
             {/* Equipamentos no Canteiro */}
             <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
                    <MapPin className="h-5 w-5 text-green-600" />
                    Equipamentos no Canteiro
                    <Badge variant="secondary" className="ml-2">
                      {equipmentNoCanteiro.length}
                    </Badge>
                    <InHistoryDialog />
                  </CardTitle>
                </CardHeader>
               <CardContent>
                 {equipmentNoCanteiro.length === 0 ? (
                   <p className="text-muted-foreground text-center py-4">
                     Nenhum equipamento no canteiro
                   </p>
                 ) : (
                   <div className="overflow-x-auto">
                     <Table>
                     <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 hidden sm:table-cell"></TableHead>
                            <TableHead>Equipamento</TableHead>
                            <TableHead>Placa</TableHead>
                            <TableHead className="hidden md:table-cell">Motorista</TableHead>
                            <TableHead className="hidden lg:table-cell">Ajudante</TableHead>
                             <TableHead>Status</TableHead>
                             <TableHead className="w-28">Ação</TableHead>
                           </TableRow>
                         </TableHeader>
                        <TableBody>
                          {equipmentNoCanteiro.map((eq) => (
                             <TableRow 
                               key={eq.id} 
                               className="cursor-pointer hover:bg-muted/50"
                               onClick={() => {
                                 setHistoryEquipment({ name: eq.name, plate: eq.plate });
                                 setHistoryDialogOpen(true);
                               }}
                             >
                               <TableCell className="hidden sm:table-cell">
                                 <VehicleIcon
                                   type={eq.equipment_type as "pipa" | "munk" | "camionete" | "onibus"}
                                   size="sm"
                                 />
                               </TableCell>
                               <TableCell className="font-medium text-sm">{eq.name}</TableCell>
                               <TableCell className="font-mono text-xs sm:text-sm">{eq.plate}</TableCell>
                               <TableCell className="hidden md:table-cell">{eq.driver || "-"}</TableCell>
                               <TableCell className="hidden lg:table-cell">{eq.helper || "-"}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    eq.stop_reason === "none"
                                      ? "bg-green-500/10 text-green-600 border-green-500/30"
                                      : eq.stop_reason === "maintenance"
                                      ? "bg-red-500/10 text-red-600 border-red-500/30"
                                      : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                                  }
                                >
                                   {eq.stop_reason === "none"
                                     ? "Operando"
                                     : eq.stop_reason === "maintenance"
                                     ? "Manutenção"
                                     : eq.stop_reason === "waiting"
                                     ? "Aguardando"
                                     : eq.stop_reason === "end_of_shift"
                                     ? "Fim de Turno"
                                     : eq.stop_reason === "rain"
                                     ? "Chuva"
                                     : eq.stop_reason || "Aguardando"}
                                </Badge>
                              </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                                     onClick={() => handleOpenExitDialog({ name: eq.name, plate: eq.plate })}
                                  >
                                    <LogOut className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Saída</span>
                                  </Button>
                                </TableCell>
                            </TableRow>
                          ))}
                       </TableBody>
                     </Table>
                   </div>
                 )}
               </CardContent>
             </Card>
 
             {/* Equipamentos Fora da Obra */}
             <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
                    <ExternalLink className="h-5 w-5 text-orange-600" />
                    Equipamentos Fora da Obra
                    <Badge variant="secondary" className="ml-2">
                      {equipmentForaObra.length}
                    </Badge>
                    <OutHistoryDialog />
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 {equipmentForaObra.length === 0 ? (
                   <p className="text-muted-foreground text-center py-4">
                     Nenhum equipamento fora da obra
                   </p>
                 ) : (
                   <div className="overflow-x-auto">
                     <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 hidden sm:table-cell"></TableHead>
                            <TableHead>Equipamento</TableHead>
                            <TableHead className="hidden sm:table-cell">Placa</TableHead>
                     <TableHead>Data/Hora</TableHead>
                             <TableHead>Motivo</TableHead>
                      <TableHead className="hidden md:table-cell">Observações</TableHead>
                      <TableHead className="w-28">Ação</TableHead>
                           </TableRow>
                         </TableHeader>
                        <TableBody>
                   {equipmentForaObra.map((m) => (
                     <TableRow 
                       key={m.id} 
                       className="cursor-pointer hover:bg-muted/50"
                       onClick={() => {
                         setHistoryEquipment({ name: m.equipment_name, plate: m.plate });
                         setHistoryDialogOpen(true);
                       }}
                     >
                              <TableCell className="hidden sm:table-cell">
                         <ExternalLink className="h-4 w-4 text-orange-500" />
                       </TableCell>
                       <TableCell className="font-medium text-sm">{m.equipment_name}</TableCell>
                       <TableCell className="font-mono text-xs sm:text-sm hidden sm:table-cell">{m.plate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(m.movement_date + "T" + m.movement_time), "dd/MM HH:mm")}
                        </div>
                             </TableCell>
                             <TableCell>
                               <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                          {EXIT_REASON_LABELS[m.exit_reason || ""] || m.exit_reason || "-"}
                               </Badge>
                             </TableCell>
                       <TableCell className="max-w-xs hidden md:table-cell">
                        {m.problem_description && (
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                            {m.problem_description}
                          </p>
                        )}
                        {m.observation && (
                          <p className="text-sm text-muted-foreground">
                            {m.observation}
                          </p>
                        )}
                        {!m.problem_description && !m.observation && "-"}
                       </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => handleOpenEntryDialog({ name: m.equipment_name, plate: m.plate })}
                          >
                            <ArrowDownCircle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Entrada</span>
                          </Button>
                        </TableCell>
                            </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </div>
                 )}
               </CardContent>
             </Card>

            {/* Equipamentos para Jardinagem */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Leaf className="h-5 w-5 text-green-500" />
                  Equipamentos para Jardinagem
                  <Badge variant="secondary" className="ml-2">
                    {jardinagemEquipment.length}
                  </Badge>
                  {isAdmin && (
                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="ml-auto gap-1">
                          <Plus className="h-4 w-4" />
                          Adicionar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Equipamento</DialogTitle>
                          <DialogDescription>
                            Insira o nome do novo equipamento de jardinagem.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Input
                            placeholder="Ex: Motopoda 02, Roçadeira 76..."
                            value={newEquipmentName}
                            onChange={(e) => setNewEquipmentName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddEquipment();
                            }}
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleAddEquipment}
                            disabled={!newEquipmentName.trim() || createJardinagemEquipment.isPending}
                          >
                            {createJardinagemEquipment.isPending ? (
                              <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Adicionar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jardinagemEquipment.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum equipamento cadastrado
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Última Atualização</TableHead>
                        {canEditJardinagem && <TableHead className="w-24">Ação</TableHead>}
                        {isAdmin && <TableHead className="w-12"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jardinagemEquipment.map((eq, idx) => (
                        <TableRow key={eq.id}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{eq.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                eq.status === "entrou"
                                  ? "bg-green-500/10 text-green-600 border-green-500/30"
                                  : "bg-orange-500/10 text-orange-600 border-orange-500/30"
                              }
                            >
                              {eq.status === "entrou" ? (
                                <><ArrowDownCircle className="h-3 w-3 mr-1" /> Entrou</>
                              ) : (
                                <><ArrowUpCircle className="h-3 w-3 mr-1" /> Saiu</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(eq.status_changed_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          {canEditJardinagem && (
                            <TableCell>
                              <Button
                                size="sm"
                                variant={eq.status === "entrou" ? "destructive" : "default"}
                                onClick={() => handleToggleJardinagemStatus(eq.id, eq.name, eq.status)}
                                disabled={updateJardinagemStatus.isPending}
                                className="gap-1"
                              >
                                {updateJardinagemStatus.isPending ? (
                                  <Loader2Icon className="h-3 w-3 animate-spin" />
                                ) : eq.status === "entrou" ? (
                                  <><ArrowUpCircle className="h-3 w-3" /> Saiu</>
                                ) : (
                                  <><ArrowDownCircle className="h-3 w-3" /> Entrou</>
                                )}
                              </Button>
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover equipamento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover "{eq.name}"? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteEquipment(eq.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4">
              <RecentMovementsFeed />
            </div>
          </div>
         )}
        {/* Jardinagem Exit Dialog */}
        <Dialog open={jardinagemExitDialogOpen} onOpenChange={setJardinagemExitDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {jardinagemDialogNewStatus === "saiu" ? (
                  <ArrowUpCircle className="h-5 w-5 text-orange-600" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5 text-green-600" />
                )}
                Registrar {jardinagemDialogNewStatus === "saiu" ? "Saída" : "Entrada"} - {jardinagemExitEquipment?.name}
              </DialogTitle>
              <DialogDescription>
                Informe a data e hora da {jardinagemDialogNewStatus === "saiu" ? "saída" : "entrada"} do equipamento.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Data de {jardinagemDialogNewStatus === "saiu" ? "Saída" : "Entrada"}</Label>
                <Input
                  type="date"
                  value={jardinagemExitDate}
                  onChange={(e) => setJardinagemExitDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora de {jardinagemDialogNewStatus === "saiu" ? "Saída" : "Entrada"}</Label>
                <Input
                  type="time"
                  value={jardinagemExitTime}
                  onChange={(e) => setJardinagemExitTime(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setJardinagemExitDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmJardinagemExit}
                disabled={updateJardinagemStatus.isPending}
                variant={jardinagemDialogNewStatus === "saiu" ? "destructive" : "default"}
              >
                {updateJardinagemStatus.isPending ? (
                  <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Confirmar {jardinagemDialogNewStatus === "saiu" ? "Saída" : "Entrada"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Admin Exit Dialog */}
        <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-orange-600" />
                Registrar Saída de Equipamento
              </DialogTitle>
              <DialogDescription>
                {exitEquipment?.name} ({exitEquipment?.plate})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data da Saída</Label>
                  <Input
                    type="date"
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora da Saída</Label>
                  <Input
                    type="time"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motivo da Saída *</Label>
                <Select value={exitReason} onValueChange={(v) => setExitReason(v as ExitReason)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manutencao_corretiva">Manutenção Corretiva</SelectItem>
                    <SelectItem value="manutencao_preventiva">Manutenção Preventiva</SelectItem>
                    <SelectItem value="vistoria">Vistoria</SelectItem>
                    <SelectItem value="operando">Operando</SelectItem>
                    <SelectItem value="aguardando_frente_servico">Aguardando Frente de Serviço</SelectItem>
                    <SelectItem value="fim_turno">Fim de Turno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(exitReason === "manutencao_corretiva" || exitReason === "manutencao_preventiva") && (
                <div className="space-y-2">
                  <Label>Descrição do Problema</Label>
                  <Textarea
                    value={exitProblem}
                    onChange={(e) => setExitProblem(e.target.value)}
                    placeholder="Descreva o problema..."
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  value={exitObservation}
                  onChange={(e) => setExitObservation(e.target.value)}
                  placeholder="Observações adicionais..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExitDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmExit}
                disabled={createMovement.isPending}
                className="gap-2"
              >
                {createMovement.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar Saída
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Entry Dialog */}
        <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
                Registrar Entrada de Equipamento
              </DialogTitle>
              <DialogDescription>
                {entryEquipment?.name} ({entryEquipment?.plate})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data da Entrada</Label>
                  <Input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora da Entrada</Label>
                  <Input
                    type="time"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  value={entryObservation}
                  onChange={(e) => setEntryObservation(e.target.value)}
                  placeholder="Observações adicionais..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmEntry}
                disabled={createMovement.isPending}
                className="gap-2"
              >
                {createMovement.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar Entrada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Equipment Movement History Dialog */}
        {historyEquipment && (
          <EquipmentMovementHistoryDialog
            equipmentName={historyEquipment.name}
            plate={historyEquipment.plate}
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
          />
        )}
       </div>
      </Layout>
   );
 };
 
 export default EntradaSaidaEquipamentos;