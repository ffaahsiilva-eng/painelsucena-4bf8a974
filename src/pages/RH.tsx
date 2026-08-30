import { useState, useMemo, useEffect, useCallback, useDeferredValue } from "react";
import { Search, Users, Phone, Calendar, Hash, MapPin, Filter, X, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, CircleAlert, Pencil, Save, History, ArrowDownAZ, ArrowUpAZ, Trash2, GraduationCap, User } from "lucide-react";
import { resolveStorageUrl } from "@/lib/storage";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useIsAdmin } from "@/hooks/useUserRole";
import { isLikelyFemaleName } from "@/lib/gender";
import femaleAvatar from "@/assets/female-avatar.png.asset.json";
import maleAvatar from "@/assets/male-avatar.png.asset.json";

import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { colaboradoresAtivos as initialColaboradores, funcoes, type Colaborador } from "@/data/efetivoData";
import { AddEmployeeDialog } from "@/components/rh/AddEmployeeDialog";
import { EditColaboradorDialog } from "@/components/rh/EditColaboradorDialog";
import { DeleteEmployeeDialog } from "@/components/rh/DeleteEmployeeDialog";
import { useRHPermissions } from "@/hooks/useRHPermissions";
import { ExportEfetivoPdfButton } from "@/components/rh/ExportEfetivoPdfButton";
import { ExportEfetivoExcelButton } from "@/components/rh/ExportEfetivoExcelButton";
import { ImportEfetivoExcelButton } from "@/components/rh/ImportEfetivoExcelButton";
import { toast } from "sonner";
import { PromotionDialog } from "@/components/rh/PromotionDialog";
import { ManageNrCatalogDialog } from "@/components/rh/ManageNrCatalogDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { getEffectiveAsoExpiry, getEffectiveAsoExpiryStr } from "@/lib/asoValidity";
import { useProfile } from "@/hooks/useProfile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Check } from "lucide-react";

type SortField = "id" | "nome" | "funcao" | "admissao" | "matricula";
type SortDirection = "asc" | "desc";

const RH = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFuncao, setFilterFuncao] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("nome");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const { data: rhData, isLoading: rhLoading, saveMutation } = useRHEfetivo();
  // Não inicializar com a lista legada (initialColaboradores) para evitar
  // "flash" de colaboradores antigos antes do banco responder. A lista real
  // vem via useEffect abaixo assim que rhData carrega.
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [dbRowId, setDbRowId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [editingAso, setEditingAso] = useState<number | null>(null);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  const [asoForm, setAsoForm] = useState<Record<string, string>>({});

  // Sync state from DB whenever data changes (initial load + realtime updates).
  // We only skip syncing while the user is actively editing the ASO of a row
  // or has the colaborador edit dialog open, to avoid wiping their form.
  useEffect(() => {
    if (!rhData) return;
    const isEditing = editingAso !== null || editingColaborador !== null;
    if (!initialized || !isEditing) {
      const loadResolvedData = async () => {
        const resolvedColaboradores = await Promise.all(rhData.colaboradores.map(async (c: Colaborador) => {
          const colaborador = { ...c };
          if (colaborador.foto) {
            colaborador.foto = (await resolveStorageUrl(colaborador.foto)) || undefined;
          }
          return colaborador;
        }));
        setColaboradores(resolvedColaboradores);
        setDeletedIds(rhData.deletedIds);
        setDbRowId(rhData.rowId);
        setInitialized(true);
      };
      loadResolvedData();
    }
  }, [rhData, initialized, editingAso, editingColaborador]);

  // Persist to database whenever colaboradores change (after initialization)
  const persistToDb = useCallback((newColaboradores: Colaborador[], newDeletedIds: number[], mode: "merge" | "replace" = "merge") => {
    saveMutation.mutate({
      colaboradores: newColaboradores,
      deletedIds: newDeletedIds,
      existingRowId: dbRowId,
      mode,
    });
  }, [saveMutation, dbRowId]);

  const { canEditRH, isLoading: permissionsLoading } = useRHPermissions();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [clearAllOpen, setClearAllOpen] = useState(false);

  // Cabeçalho "Matrícula Hydro" editável por Admin, Preposto e Auxiliar Administrativo
  const { data: profile } = useProfile();
  const { settings, updateSettings } = useSiteSettings();
  const canEditHydroHeader = isAdmin || profile?.cargo === "preposto" || profile?.cargo === "aux_administrativo";
  const hydroLabel = settings?.rh_matricula_hydro_label ?? "Matrícula Hydro";
  const [editingHydroLabel, setEditingHydroLabel] = useState(false);
  const [hydroLabelDraft, setHydroLabelDraft] = useState(hydroLabel);
  useEffect(() => { setHydroLabelDraft(hydroLabel); }, [hydroLabel]);
  const saveHydroLabel = () => {
    updateSettings.mutate(
      { rh_matricula_hydro_label: hydroLabelDraft.trim() },
      {
        onSuccess: () => { toast.success("Nome do cabeçalho salvo"); setEditingHydroLabel(false); },
        onError: () => toast.error("Erro ao salvar"),
      }
    );
  };


  const handleClearAllEmployees = useCallback(() => {
    setColaboradores([]);
    setDeletedIds([]);
    persistToDb([], [], "replace");
    setClearAllOpen(false);
    toast.success("Todo o efetivo foi apagado neste ambiente.");
  }, [persistToDb]);

  const handleAddEmployee = (newEmployee: Omit<Colaborador, "id">) => {
    const maxId = Math.max(...colaboradores.map(c => c.id), 0);
    const employee: Colaborador = {
      ...newEmployee,
      id: maxId + 1,
    };
    const updated = [...colaboradores, employee];
    setColaboradores(updated);
    persistToDb(updated, deletedIds);
  };

  const handleImportEmployees = (updated: Colaborador[]) => {
    // Replace mode: nova planilha substitui completamente o efetivo anterior,
    // descartando colaboradores que não constam mais (sem mesclar com DB).
    setColaboradores(updated);
    setDeletedIds([]);
    // Atualiza cache imediatamente para refletir na UI sem esperar refetch
    queryClient.setQueriesData({ queryKey: ["rh-efetivo"] }, (prev: any) => ({
      colaboradores: updated,
      deletedIds: [],
      hasImported: true,
      rowId: prev?.rowId ?? dbRowId,
    }));
    persistToDb(updated, [], "replace");
  };


  const handleDeleteEmployee = (id: number) => {
    const updated = colaboradores.filter(c => c.id !== id);
    const newDeletedIds = [...deletedIds, id];
    setColaboradores(updated);
    setDeletedIds(newDeletedIds);
    persistToDb(updated, newDeletedIds);
    toast.success("Colaborador removido com sucesso!");
  };

  const handleEditColaborador = (updated: Colaborador) => {
    const newList = colaboradores.map(c => c.id === updated.id ? updated : c);
    setColaboradores(newList);
    persistToDb(newList, deletedIds);
  };

  const handlePromote = useCallback(async (id: number, novaFuncao: string, observacao: string) => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const dataFormatada = `${dd}/${mm}/${yyyy}`;

    // Find the employee name to sync with Supabase
    const colaborador = colaboradores.find(c => c.id === id);
    
    // Update state and persist to DB
    const newList = colaboradores.map(c => {
      if (c.id !== id) return c;
      const promocao = {
        funcaoAnterior: c.funcao,
        funcaoNova: novaFuncao,
        data: dataFormatada,
        observacao: observacao || undefined,
      };
      return {
        ...c,
        funcao: novaFuncao,
        promocoes: [...(c.promocoes || []), promocao],
      };
    });
    setColaboradores(newList);
    persistToDb(newList, deletedIds);

    // Sync with Supabase employees table (used by Presença, RDO, etc.)
    if (colaborador) {
      try {
        // Find matching employee in Supabase by name (case-insensitive)
        const { data: dbEmployees } = await supabase
          .from("employees")
          .select("id, name, role")
          .ilike("name", colaborador.nome);

        if (dbEmployees && dbEmployees.length > 0) {
          const { error } = await supabase
            .from("employees")
            .update({ role: novaFuncao })
            .eq("id", dbEmployees[0].id);

          if (error) {
            console.error("Erro ao sincronizar promoção no banco:", error);
          } else {
            // Invalidate queries so Presença, RDO, etc. reflect the change
            queryClient.invalidateQueries({ queryKey: ["employees"] });
            queryClient.invalidateQueries({ queryKey: ["employees_all"] });
            queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
            queryClient.invalidateQueries({ queryKey: ["attendance_report"] });
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar promoção:", err);
      }
    }

    toast.success("Promoção registrada com sucesso!");
  }, [colaboradores, queryClient, persistToDb, deletedIds]);

  const handleStartEditAso = (colaborador: Colaborador) => {
    setEditingAso(colaborador.id);
    // Pré-preenche a validade com o valor efetivo (calculado a partir de
    // admissão ou da data-base mais recente) quando não há validade salva,
    // para refletir o que está sendo exibido no card.
    const effectiveValidade =
      colaborador.aso?.validade ||
      getEffectiveAsoExpiryStr(colaborador.aso, colaborador.admissao) ||
      "";
    setAsoForm({
      admissional: colaborador.aso?.admissional || "",
      validade: effectiveValidade,
      periodico: colaborador.aso?.periodico || "",
      retornoTrabalho: colaborador.aso?.retornoTrabalho || "",
      mudancaRisco: colaborador.aso?.mudancaRisco || "",
      observacao: colaborador.aso?.observacao || "",
    });
  };

  const handleSaveAso = (id: number) => {
    const newList = colaboradores.map(c => {
      if (c.id !== id) return c;

      let newValidade = asoForm.validade || c.aso?.validade || "";

      // Helper: soma 1 ano a uma data dd/mm/yyyy
      const addOneYear = (dateStr: string): string | null => {
        try {
          const parts = dateStr.split("/");
          if (parts.length !== 3) return null;
          const d = new Date(
            parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])
          );
          d.setFullYear(d.getFullYear() + 1);
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yyyy = d.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        } catch {
          return null;
        }
      };

      // Recalcula validade sempre que houver QUALQUER data preenchida entre
      // Periódico, Retorno ao Trabalho, Mudança de Risco ou Observação.
      // Pega a data MAIS RECENTE entre as 4 e define vencimento = data + 1 ano.
      // Isso garante que registros antigos também sejam corrigidos ao re-salvar.
      const triggerValues: string[] = [
        asoForm.admissional,
        asoForm.periodico,
        asoForm.retornoTrabalho,
        asoForm.mudancaRisco,
        asoForm.observacao,
      ];
      let latest: Date | null = null;
      let latestStr = "";
      for (const v of triggerValues) {
        if (!v) continue;
        const parts = v.split("/");
        if (parts.length !== 3) continue;
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (isNaN(d.getTime())) continue;
        if (!latest || d > latest) {
          latest = d;
          latestStr = v;
        }
      }
      if (latestStr) {
        const next = addOneYear(latestStr);
        if (next) newValidade = next;
      }


      return {
        ...c,
        aso: {
          admissional: asoForm.admissional || c.aso?.admissional || c.admissao || "",
          validade: newValidade,
          periodico: asoForm.periodico || undefined,
          retornoTrabalho: asoForm.retornoTrabalho || undefined,
          mudancaRisco: asoForm.mudancaRisco || undefined,
          observacao: asoForm.observacao || undefined,
        },
      };
    });
    setColaboradores(newList);
    persistToDb(newList, deletedIds);
    setEditingAso(null);
    toast.success("ASO atualizado com sucesso!");
  };

  // Search index - memoized for performance
  const searchIndex = useMemo(() => {
    return colaboradores.map((c) => ({
      c,
      nome: c.nome.toLowerCase(),
      funcao: (c.funcao || "").toLowerCase(),
      matricula: c.matricula || "",
      matriculaHydro: c.matriculaHydro || "",
      cpf: c.cpf || "",
    }));
  }, [colaboradores]);

  // useDeferredValue fix: Allows search filtering without blocking input
  const deferredSearch = useDeferredValue(searchTerm);

  // Filter and sort employees - memoized
  const filteredColaboradores = useMemo(() => {
    const searchLower = deferredSearch.toLowerCase();
    const hasSearch = searchLower.length > 0;

    const result: Colaborador[] = [];
    for (const entry of searchIndex) {
      if (hasSearch) {
        const matchesSearch =
          entry.nome.includes(searchLower) ||
          entry.funcao.includes(searchLower) ||
          entry.matricula.includes(deferredSearch) ||
          entry.matriculaHydro.includes(deferredSearch) ||
          entry.cpf.includes(deferredSearch);
        if (!matchesSearch) continue;
      }
      if (filterFuncao !== "all" && entry.c.funcao !== filterFuncao) continue;
      result.push(entry.c);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "id":
          comparison = a.id - b.id;
          break;
        case "nome":
          comparison = a.nome.localeCompare(b.nome);
          break;
        case "funcao":
          comparison = a.funcao.localeCompare(b.funcao);
          break;
        case "admissao": {
          // Parse date in DD/MM/YYYY format
          const parseDate = (dateStr: string) => {
            const [day, month, year] = (dateStr || "").split('/').map(Number);
            if (!day || !month || !year) return 0;
            return new Date(year, month - 1, day).getTime();
          };
          comparison = parseDate(a.admissao) - parseDate(b.admissao);
          break;
        }
        case "matricula":
          comparison = parseInt(a.matricula || "0") - parseInt(b.matricula || "0");
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [deferredSearch, filterFuncao, sortField, sortDirection, searchIndex]);


  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterFuncao("all");
    setSortField("id");
    setSortDirection("asc");
  };

  const hasActiveFilters = searchTerm || filterFuncao !== "all";

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  // Count by function for stats
  const funcaoStats = useMemo(() => {
    const stats: Record<string, number> = {};
    colaboradores.forEach(c => {
      if (c.funcao) stats[c.funcao] = (stats[c.funcao] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [colaboradores]);

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-6 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <EditablePageTitle pageKey="rh" defaultValue="Efetivo" className="text-2xl sm:text-4xl font-bold mb-2" />
            <p className="text-muted-foreground">
              Quadro de colaboradores ativos: <span className="font-semibold text-primary">{colaboradores.length}</span> funcionários
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <ManageNrCatalogDialog />
            <ExportEfetivoPdfButton 
              colaboradores={filteredColaboradores} 
              filterFuncao={filterFuncao} 
            />
            <ExportEfetivoExcelButton 
              colaboradores={filteredColaboradores} 
              filterFuncao={filterFuncao} 
            />
            {canEditRH && (
              <>
                <ImportEfetivoExcelButton
                  colaboradores={colaboradores}
                  onImport={handleImportEmployees}
                />
                <AddEmployeeDialog onAdd={handleAddEmployee} />
              </>
            )}
            {isAdmin && (
              <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    title="Apagar todo o efetivo"
                    aria-label="Apagar todo o efetivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[95vw] sm:w-full max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Apagar todo o efetivo?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação removerá <strong>todos os {colaboradores.length} colaboradores</strong> deste ambiente de forma permanente.
                      <br />
                      <br />
                      Esta operação <strong>não pode ser desfeita</strong>. Considere exportar um Excel antes de prosseguir.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAllEmployees}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, apagar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Efetivo</p>
                  <p className="text-2xl font-bold">{colaboradores.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {funcaoStats.map(([funcao, count]) => (
            <Card 
              key={funcao} 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setFilterFuncao(funcao)}
            >
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground truncate" title={funcao}>
                  {funcao}
                </p>
                <p className="text-xl font-bold">{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-8 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, função, matrícula ou CPF..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterFuncao} onValueChange={setFilterFuncao}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Filtrar por função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as funções</SelectItem>
                  {funcoes.map((funcao) => (
                    <SelectItem key={funcao} value={funcao}>
                      {funcao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={sortField === "nome" ? "default" : "outline"}
                onClick={() => {
                  if (sortField === "nome") {
                    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("nome");
                    setSortDirection("asc");
                  }
                }}
                className="gap-2 whitespace-nowrap"
              >
                {sortField === "nome" && sortDirection === "desc" ? (
                  <ArrowUpAZ className="w-4 h-4" />
                ) : (
                  <ArrowDownAZ className="w-4 h-4" />
                )}
                A-Z
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <X className="w-4 h-4" />
                  Limpar
                </Button>
              )}
            </div>
            
            {hasActiveFilters && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    Busca: "{searchTerm}"
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm("")} />
                  </Badge>
                )}
                {filterFuncao !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {filterFuncao}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterFuncao("all")} />
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground ml-2">
                  ({filteredColaboradores.length} resultado{filteredColaboradores.length !== 1 ? "s" : ""})
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-lg border-t-2 border-primary">
          <CardContent className="p-0">
            <div className="table-scroll overflow-x-auto pb-4">
              <div className="min-w-[1000px] xl:min-w-full">
                <Table className="text-xs modern-text-black">
                <TableHeader>
                  <TableRow className="bg-muted/50 whitespace-nowrap sm:whitespace-normal [&_th]:px-1 sm:[&_th]:px-3 [&_th]:py-3 sm:[&_th]:py-4 text-xs font-bold">
                    <TableHead 
                      className="cursor-pointer hover:bg-muted w-12"
                      onClick={() => handleSort("id")}
                    >
                      # <SortIcon field="id" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted min-w-[120px] sm:min-w-[160px]"
                      onClick={() => handleSort("nome")}
                    >
                      Colaborador <SortIcon field="nome" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted min-w-[100px] sm:min-w-[130px]"
                      onClick={() => handleSort("funcao")}
                    >
                      Função <SortIcon field="funcao" />
                    </TableHead>
                    <TableHead className="w-24">
                      {editingHydroLabel ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            autoFocus
                            value={hydroLabelDraft}
                            onChange={(e) => setHydroLabelDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveHydroLabel();
                              if (e.key === "Escape") { setHydroLabelDraft(hydroLabel); setEditingHydroLabel(false); }
                            }}
                            placeholder="(em branco)"
                            className="h-7 text-xs"
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveHydroLabel}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setHydroLabelDraft(hydroLabel); setEditingHydroLabel(false); }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="cursor-pointer hover:underline" onClick={() => handleSort("matricula")}>
                            {hydroLabel || <span className="text-muted-foreground italic">—</span>} <SortIcon field="matricula" />
                          </span>
                          {canEditHydroHeader && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingHydroLabel(true)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableHead>
                    <TableHead className="w-24">
                      Mat. Sucena
                    </TableHead>
                    <TableHead className="w-24">
                      Nascimento
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted w-20 sm:w-24"
                      onClick={() => handleSort("admissao")}
                    >
                      Admissão <SortIcon field="admissao" />
                    </TableHead>
                    <TableHead className="w-32">Contato</TableHead>
                    {!permissionsLoading && canEditRH && (
                      <TableHead className="w-[110px] sm:w-[130px] sticky right-0 bg-muted/80  shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.4)] z-30">Ações</TableHead>

                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredColaboradores.map((colaborador, index) => {
                    const asoExpiry = getEffectiveAsoExpiry(colaborador.aso, colaborador.admissao);
                    const today = new Date(); today.setHours(0,0,0,0);
                    const diffDays = asoExpiry ? Math.ceil((asoExpiry.getTime() - today.getTime()) / 86400000) : null;
                    const asoVencido = diffDays !== null && diffDays <= 15;
                    return (
                    <>
                      <TableRow 
                        key={colaborador.id}
                        className={`virtual-row cursor-pointer cv-auto ${asoVencido ? "bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/50" : "hover:bg-accent/50"}`}
                        onClick={() => setExpandedRow(expandedRow === colaborador.id ? null : colaborador.id)}
                      >
                        <TableCell className="font-medium text-muted-foreground w-10 px-1 text-center">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 sm:gap-3">
                            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 bg-transparent flex items-center justify-center border border-primary/20">
                              {colaborador.foto ? (
                                <img loading="lazy" decoding="async"
                                  src={colaborador.foto}
                                  alt={colaborador.nome}
                                  className="w-full h-full object-cover"
                                  draggable={false}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-[10px] sm:text-xs">
                                  {colaborador.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <span
                                className={`font-medium block truncate max-w-[100px] xs:max-w-[150px] sm:max-w-none ${canEditRH ? "cursor-pointer hover:underline" : ""} ${asoVencido ? "text-red-500 font-bold drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" : ""}`}
                                onClick={(e) => {
                                  if (!canEditRH) return;
                                  e.stopPropagation();
                                  handleStartEditAso(colaborador);
                                }}
                                title={canEditRH ? "Clique para editar datas do ASO" : undefined}
                              >
                                {colaborador.nome}
                              </span>
                              {colaborador.nrDates && Object.keys(colaborador.nrDates).length > 0 && (
                                <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-1">
                                  {Object.entries(colaborador.nrDates).map(([nr, info]) => (
                                    <Badge 
                                      key={nr} 
                                      variant="secondary" 
                                      className={`text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-3.5 sm:h-4 gap-0.5 sm:gap-1 ${info.documentUrl ? "border-primary/50 text-primary" : ""}`}
                                    >
                                      {nr}
                                      {info.documentUrl && <GraduationCap className="w-1.5 h-1.5 sm:w-2 sm:h-2" />}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal whitespace-normal sm:whitespace-nowrap text-[8px] sm:text-[10px]">
                            {colaborador.funcao}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Hash className="w-3 h-3" />
                            {colaborador.matriculaHydro || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Hash className="w-3 h-3" />
                            {colaborador.matricula || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground whitespace-normal sm:whitespace-nowrap">
                            <Calendar className="w-3 h-3" />
                            {colaborador.dataNascimento || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground whitespace-normal sm:whitespace-nowrap">
                            <Calendar className="w-3 h-3" />
                            {colaborador.admissao}
                          </div>
                        </TableCell>
                        <TableCell>
                          {colaborador.contato && (
                            <div className="flex items-center gap-1 text-muted-foreground whitespace-normal sm:whitespace-nowrap">
                              <Phone className="w-3 h-3" />
                              {colaborador.contato}
                            </div>
                          )}
                        </TableCell>
                        {!permissionsLoading && canEditRH && (
                          <TableCell className={`sticky right-0 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.4)] z-20 ${asoVencido ? "bg-red-200 dark:bg-red-900" : "bg-muted/80 backdrop-blur-sm"}`}>
                            <div className="flex items-center gap-0.5 sm:gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={(e) => { e.stopPropagation(); setEditingColaborador(colaborador); }}
                              >
                                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                              <PromotionDialog
                                colaborador={colaborador}
                                onPromote={handlePromote}
                              />
                              <DeleteEmployeeDialog
                                employee={colaborador}
                                onDelete={handleDeleteEmployee}
                              />
                            </div>
                          </TableCell>
                        )}

                      </TableRow>
                      
                      {/* Expanded Row Details */}
                      {expandedRow === colaborador.id && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={canEditRH ? 9 : 8} className="relative z-10">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 py-1">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">CPF</p>
                                <p className="font-medium">{colaborador.cpf}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Data de Nascimento</p>
                                <p className="font-medium">{colaborador.dataNascimento}</p>
                              </div>
                              <div className="lg:hidden">
                                <p className="text-xs text-muted-foreground mb-1">Contato</p>
                                <p className="font-medium flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {colaborador.contato || "Não informado"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Localidade</p>
                                <p className="font-medium flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {colaborador.localidade}
                                </p>
                              </div>
                            </div>

                            {/* Promotion History */}
                            {colaborador.promocoes && colaborador.promocoes.length > 0 && (
                              <div className="mt-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <History className="w-4 h-4 text-primary" />
                                  <span className="font-semibold text-sm text-primary">
                                    Histórico de Promoções ({colaborador.promocoes.length})
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {[...colaborador.promocoes].reverse().map((p, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                      <span className="text-xs font-medium text-primary">{p.data}</span>
                                      <span className="text-muted-foreground line-through text-xs">{p.funcaoAnterior}</span>
                                      <span className="text-xs">→</span>
                                      <span className="font-medium text-xs">{p.funcaoNova}</span>
                                      {p.observacao && (
                                        <span className="text-xs text-muted-foreground italic ml-1">({p.observacao})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ASO Section */}
                            {(() => {
                              const aso = colaborador.aso;
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const validade = getEffectiveAsoExpiry(aso, colaborador.admissao);
                              const validadeStr = getEffectiveAsoExpiryStr(aso, colaborador.admissao);
                              const displayedValidade = validadeStr || aso?.validade || "-";
                              const diffDays = validade ? Math.ceil((validade.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                              
                              let farolColor = "text-muted-foreground";
                              let farolBg = "bg-muted/50 border-border";
                              let farolLabel = "Sem ASO";
                              let FarolIcon = CircleAlert;
                              
                              if (diffDays !== null) {
                                if (diffDays < 0) {
                                  farolColor = "text-red-500";
                                  farolBg = "bg-red-500/10 border-red-500/30";
                                  farolLabel = "Vencido";
                                  FarolIcon = CircleAlert;
                                } else if (diffDays <= 30) {
                                  farolColor = "text-yellow-500";
                                  farolBg = "bg-yellow-500/10 border-yellow-500/30";
                                  farolLabel = "Vence em breve";
                                  FarolIcon = AlertTriangle;
                                } else if (diffDays <= 60) {
                                  farolColor = "text-orange-400";
                                  farolBg = "bg-orange-400/10 border-orange-400/30";
                                  farolLabel = "Atenção";
                                  FarolIcon = AlertTriangle;
                                } else {
                                  farolColor = "text-green-500";
                                  farolBg = "bg-green-500/10 border-green-500/30";
                                  farolLabel = "Em dia";
                                  FarolIcon = ShieldCheck;
                                }
                              }

                              return (
                                <div className={`mt-2 p-2 sm:p-3 rounded-lg border ${farolBg}`}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <FarolIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${farolColor}`} />
                                      <span className={`font-semibold text-xs sm:text-sm ${farolColor}`}>
                                        ASO - {farolLabel} {diffDays !== null && `(${diffDays > 0 ? `${diffDays}d` : `${Math.abs(diffDays)}d venc.`})`}
                                      </span>
                                    </div>
                                    {canEditRH && (
                                      <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[10px] sm:text-xs" onClick={(e) => { e.stopPropagation(); handleStartEditAso(colaborador); }}>
                                        <Pencil className="w-3 h-3" /> Editar
                                      </Button>
                                    )}
                                  </div>
                                   <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-2 gap-y-2 auto-rows-min">
                                    <div className="min-w-0">
                                      <p className="text-[10px] text-muted-foreground leading-tight truncate">Admissional</p>
                                      <p className="text-xs font-medium truncate">{aso?.admissional || colaborador.admissao || "-"}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[10px] text-muted-foreground leading-tight truncate">Validade</p>
                                      <div className="flex items-baseline gap-1 min-w-0">
                                        <p className={`text-xs font-medium truncate ${farolColor}`}>{displayedValidade}</p>
                                        {validadeStr && aso?.validade !== validadeStr && (
                                          <span className="text-[8px] text-muted-foreground leading-none shrink-0">(calc.)</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[10px] text-muted-foreground leading-tight truncate">Periódico</p>
                                      <p className="text-xs font-medium truncate">{aso?.periodico || "-"}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[10px] text-muted-foreground leading-tight truncate">Retorno Trabalho</p>
                                      <p className="text-xs font-medium truncate">{aso?.retornoTrabalho || "-"}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[10px] text-muted-foreground leading-tight truncate">Mudança Risco</p>
                                      <p className="text-xs font-medium truncate">{aso?.mudancaRisco || "-"}</p>
                                    </div>
                                    {aso?.observacao && (
                                      <div className="col-span-1 min-w-0">
                                        <p className="text-[10px] text-muted-foreground leading-tight truncate">Obs.</p>
                                        <p className="text-xs font-medium truncate" title={aso.observacao}>{aso.observacao}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );})}
                </TableBody>
              </Table>
              </div>
            </div>

            {filteredColaboradores.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-lg">
                  Nenhum colaborador encontrado
                </p>
                <p className="text-sm text-muted-foreground">
                  Tente ajustar os filtros de busca
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <EditColaboradorDialog
          open={!!editingColaborador}
          onOpenChange={(open) => !open && setEditingColaborador(null)}
          colaborador={editingColaborador}
          onSave={handleEditColaborador}
        />
        {/* ASO Edit Dialog */}
        <Dialog open={editingAso !== null} onOpenChange={(open) => { if (!open) setEditingAso(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Editar datas do ASO
                {editingAso !== null && (() => {
                  const c = colaboradores.find(x => x.id === editingAso);
                  return c ? ` — ${c.nome}` : "";
                })()}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: "admissional", label: "Admissional" },
                { key: "validade", label: "Validade" },
                { key: "periodico", label: "Periódico" },
                { key: "retornoTrabalho", label: "Retorno ao Trabalho" },
                { key: "mudancaRisco", label: "Mudança de Risco" },
                { key: "observacao", label: "Observação" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <Input
                    className="h-9 text-sm"
                    placeholder="DD/MM/AAAA"
                    inputMode="numeric"
                    maxLength={10}
                    value={asoForm[key] || ""}
                    onChange={(e) => setAsoForm(prev => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                      let masked = digits;
                      if (digits.length >= 4) masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}${digits.length > 4 ? "/" + digits.slice(4) : "/"}`;
                      else if (digits.length >= 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
                      const next = { ...prev, [key]: masked };
                      if (key !== "validade") {
                        const triggers = [next.admissional, next.periodico, next.retornoTrabalho, next.mudancaRisco, next.observacao];
                        let latest: Date | null = null;
                        let latestStr = "";
                        for (const v of triggers) {
                          if (!v) continue;
                          const p = v.split("/");
                          if (p.length !== 3 || p[2].length !== 4) continue;
                          const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
                          if (isNaN(d.getTime())) continue;
                          if (!latest || d > latest) { latest = d; latestStr = v; }
                        }
                        if (latestStr && latest) {
                          const nd = new Date(latest);
                          nd.setFullYear(nd.getFullYear() + 1);
                          const dd = String(nd.getDate()).padStart(2, "0");
                          const mm = String(nd.getMonth() + 1).padStart(2, "0");
                          next.validade = `${dd}/${mm}/${nd.getFullYear()}`;
                        }
                      }
                      return next;
                    })}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditingAso(null)}>Cancelar</Button>
              <Button onClick={() => { if (editingAso !== null) handleSaveAso(editingAso); }}>
                <Save className="w-4 h-4 mr-1" /> Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RH;
