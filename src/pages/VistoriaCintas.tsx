import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { useState } from "react";
import { Loader2, Link2, Plus, Filter, FileText, FileSpreadsheet, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  useSlingEquipment,
  useSlingInspections,
  useCreateSlingInspection,
  useUpdateSlingInspection,
  useCreateSlingEquipment,
  colorLabels,
  colorClasses,
  colorMonthMap,
  type SlingColor,
  type SlingWithInspection,
} from "@/hooks/useSlingEquipment";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { SlingInspectionDialog } from "@/components/vistorias/SlingInspectionDialog";
import { SlingInspectionHistory } from "@/components/vistorias/SlingInspectionHistory";
import { useVisualizadorContext } from "@/contexts/VisualizadorContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Camera } from "lucide-react";
import { exportSlingsToExcel } from "@/lib/slingExcelExport";

const VistoriaCintas = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const { isVisualizador } = useVisualizadorContext();
  const createInspection = useCreateSlingInspection();
  const updateInspection = useUpdateSlingInspection();
  const createSling = useCreateSlingEquipment();

  const canManagePhoto =
    isAdmin ||
    profile?.cargo === "tecnico_seguranca_i" ||
    profile?.cargo === "tecnico_seguranca_ii";

  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(currentMonthYear);
  const [filterColor, setFilterColor] = useState<SlingColor | "all">("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSling, setNewSling] = useState({ tag: "", description: "", color: "red" as SlingColor });
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [selectedSling, setSelectedSling] = useState<SlingWithInspection | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: allSlings, isLoading: slingsLoading } = useSlingEquipment();
  const { data: monthInspections, isLoading: inspectionsLoading } = useSlingInspections(selectedMonthYear);
  const isLoading = slingsLoading || inspectionsLoading;

  const [selectedYear, selectedMonth] = selectedMonthYear.split("-").map((v) => parseInt(v, 10));
  const currentMonthColor: SlingColor = colorMonthMap[selectedMonth];
  const inspectionDate = `${selectedMonthYear}-01`;
  const isViewingCurrentMonth = selectedMonthYear === currentMonthYear;

  const slings: SlingWithInspection[] = (allSlings || []).map((s) => {
    const currentInspection = monthInspections?.find(
      (i) => i.sling_id === s.id && i.inspection_date.startsWith(selectedMonthYear),
    );
    return { ...s, currentInspection };
  });

  const pendingInspections = slings.filter(
    (s) => s.color === currentMonthColor && (!s.currentInspection || s.currentInspection.status === "pending"),
  );

  const filteredSlings = slings.filter((s) => filterColor === "all" || s.color === filterColor);


  const handleOpenInspection = (sling: SlingWithInspection) => {
    setSelectedSling(sling);
    setInspectionDialogOpen(true);
  };

  const handleConfirmInspection = async (
    status: "inspected" | "cancelled",
    notes: string,
    photoUrl: string | null,
    isoInspectionDate: string | null,
  ) => {
    if (!user || !selectedSling) {
      toast.error("Você precisa estar logado");
      return;
    }

    try {
      if (selectedSling.currentInspection) {
        await updateInspection.mutateAsync({
          id: selectedSling.currentInspection.id,
          status,
          inspected_by: user.id,
          notes: notes || undefined,
          photo_url: canManagePhoto ? photoUrl : undefined,
          inspected_at: canManagePhoto && isoInspectionDate ? isoInspectionDate : undefined,
        });
      } else {
        await createInspection.mutateAsync({
          sling_id: selectedSling.id,
          inspection_date: inspectionDate,
          status,
          inspected_by: user.id,
          notes: notes || undefined,
          photo_url: canManagePhoto ? photoUrl : null,
        });
      }
      toast.success(`Cinta ${selectedSling.tag} marcada como ${status === "inspected" ? "inspecionada" : "cancelada"}`);
      setInspectionDialogOpen(false);
      setSelectedSling(null);
    } catch (error) {
      toast.error("Erro ao atualizar inspeção");
    }
  };


  const handleAddSling = async () => {
    if (!user || !newSling.tag || !newSling.description) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      await createSling.mutateAsync({
        ...newSling,
        created_by: user.id,
      });
      toast.success("Cinta cadastrada com sucesso");
      setAddDialogOpen(false);
      setNewSling({ tag: "", description: "", color: "red" });
    } catch (error) {
      toast.error("Erro ao cadastrar cinta");
    }
  };

  const getStatusBadge = (sling: SlingWithInspection) => {
    const isCurrentMonthColor = sling.color === currentMonthColor;
    
    if (!isCurrentMonthColor) {
      return <Badge variant="outline" className="text-muted-foreground">Não é mês de inspeção</Badge>;
    }

    if (!sling.currentInspection || sling.currentInspection.status === "pending") {
      return <Badge variant="destructive" className="animate-pulse">Pendente</Badge>;
    }

    if (sling.currentInspection.status === "inspected") {
      return <Badge className="bg-green-500 hover:bg-green-600">Inspecionada</Badge>;
    }

    return <Badge variant="secondary">Cancelada</Badge>;
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-6 py-3 sm:py-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <EditablePageTitle pageKey="vistoria-cintas" defaultValue="Vistoria de Cintas" className="text-xl font-semibold text-foreground tracking-tight" />
                <p className="text-sm text-muted-foreground">
                  Controle de inspeção mensal por cor
                </p>
              </div>
            </div>
          </div>

          {!isVisualizador && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nova Cinta</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Cinta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Tag</Label>
                  <Input
                    placeholder="E-SUC-018"
                    value={newSling.tag}
                    onChange={(e) => setNewSling({ ...newSling, tag: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="CINTA 4T - 4M"
                    value={newSling.description}
                    onChange={(e) => setNewSling({ ...newSling, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Select
                    value={newSling.color}
                    onValueChange={(v) => setNewSling({ ...newSling, color: v as SlingColor })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(colorLabels).map(([color, label]) => (
                        <SelectItem key={color} value={color}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colorClasses[color as SlingColor]}`} />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddSling} className="w-full">
                  Cadastrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Selected Month Info */}
        <Card className={`border-2 ${colorClasses[currentMonthColor].replace("bg-", "border-")}/50`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full ${colorClasses[currentMonthColor]}`} />
                <div>
                  <p className="font-medium">
                    {isViewingCurrentMonth ? "Mês de Inspeção" : "Editando mês"}: {monthNames[selectedMonth - 1]} / {selectedYear}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cor do mês: <strong>{colorLabels[currentMonthColor]}</strong> - Inspeção no dia 01
                  </p>
                </div>
              </div>
              <Badge variant={pendingInspections.length > 0 ? "destructive" : "secondary"}>
                {pendingInspections.length} pendente(s)
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Filters + Export */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground hidden sm:inline">Mês:</span>
            <Input
              type="month"
              value={selectedMonthYear}
              max={currentMonthYear}
              onChange={(e) => setSelectedMonthYear(e.target.value || currentMonthYear)}
              className="w-[160px]"
            />
            {!isViewingCurrentMonth && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedMonthYear(currentMonthYear)}>
                Mês atual
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground hidden sm:inline">Cor:</span>
            <Select value={filterColor} onValueChange={(v) => setFilterColor(v as SlingColor | "all")}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(colorLabels).map(([color, label]) => (
                  <SelectItem key={color} value={color}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorClasses[color as SlingColor]}`} />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 ml-auto"
            onClick={async () => {
              if (filteredSlings.length === 0) {
                toast.error("Nenhuma cinta para exportar");
                return;
              }
              setIsExporting(true);
              try {
                await exportSlingsToExcel(filteredSlings, selectedMonthYear);
                toast.success("Excel exportado com sucesso!");
              } catch (err) {
                console.error(err);
                toast.error("Erro ao exportar Excel");
              } finally {
                setIsExporting(false);
              }
            }}
            disabled={isExporting || isLoading}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
            )}
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
        </div>


        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Equipamentos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
              </div>
            ) : filteredSlings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma cinta encontrada
              </div>
            ) : (
              <div className="table-scroll">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cor</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Inspecionada em</TableHead>
                    <TableHead>Foto</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSlings.map((sling) => {
                    const isCurrentMonthColor = sling.color === currentMonthColor;
                    const isInspected = sling.currentInspection?.status === "inspected";
                    const canInspect = isCurrentMonthColor && (!sling.currentInspection || sling.currentInspection.status === "pending");
                    const canManageThis = canManagePhoto && !!sling.currentInspection && !canInspect;
                    const hasNotes = sling.currentInspection?.notes;
                    const photoUrl = sling.currentInspection?.photo_url;
                    const inspectedAt = sling.currentInspection?.inspected_at;

                    return (
                      <TableRow key={sling.id} className={isCurrentMonthColor ? "bg-accent/30" : ""}>
                        <TableCell>
                          <div className={`w-6 h-6 rounded-full ${colorClasses[sling.color]}`} />
                        </TableCell>
                        <TableCell className="font-mono font-medium">{sling.tag}</TableCell>
                        <TableCell>{sling.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(sling)}
                            {hasNotes && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <FileText className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">{sling.currentInspection?.notes}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {inspectedAt ? format(new Date(inspectedAt), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </TableCell>
                        <TableCell>
                          {photoUrl ? (
                            <a href={photoUrl} target="_blank" rel="noreferrer">
                              <img
                                src={photoUrl}
                                alt={`Foto ${sling.tag}`}
                                className="w-12 h-12 rounded object-cover border hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canInspect && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => handleOpenInspection(sling)}
                              >
                                Registrar Inspeção
                              </Button>
                            )}
                            {canManageThis && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1"
                                onClick={() => handleOpenInspection(sling)}
                              >
                                <Camera className="w-4 h-4" />
                                {isInspected ? "Editar" : "Alterar status"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
              </div>

            )}
          </CardContent>
        </Card>

        {/* Color Legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Calendário de Inspeções por Cor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(colorLabels).map(([color, label]) => {
                const months = Object.entries({
                  1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr",
                  5: "Mai", 6: "Jun", 7: "Jul", 8: "Ago",
                  9: "Set", 10: "Out", 11: "Nov", 12: "Dez"
                })
                  .filter(([month]) => {
                    const monthColors: Record<number, string> = {
                      1: "red", 2: "blue", 3: "yellow", 4: "green",
                      5: "red", 6: "blue", 7: "yellow", 8: "green",
                      9: "red", 10: "blue", 11: "yellow", 12: "green"
                    };
                    return monthColors[parseInt(month)] === color;
                  })
                  .map(([, name]) => name);

                return (
                  <div key={color} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`w-5 h-5 rounded-full ${colorClasses[color as SlingColor]}`} />
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{months.join(", ")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <SlingInspectionHistory />



        {/* Inspection Dialog */}
        <SlingInspectionDialog
          open={inspectionDialogOpen}
          onOpenChange={setInspectionDialogOpen}
          sling={selectedSling}
          onConfirm={handleConfirmInspection}
          isLoading={createInspection.isPending || updateInspection.isPending}
          canManagePhoto={canManagePhoto}
        />
      </div>
    </Layout>
  );
};

export default VistoriaCintas;
