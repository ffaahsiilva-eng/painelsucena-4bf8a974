import { useEffect, useMemo, useState, useDeferredValue } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  Copy,
  Check,
  Share2,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Save,
  Lock,
  Unlock,
  Pencil,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import {
  useAttendanceAreaAssignments,
  type AttendanceArea,
} from "@/hooks/useAttendanceAreaAssignments";
import { useAttendanceReportLocks } from "@/hooks/useAttendanceReportLock";
import { useAttendanceDailyMarks } from "@/hooks/useAttendanceDailyMarks";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useCustomActivities } from "@/hooks/useCustomActivities";
import type { Colaborador } from "@/data/efetivoData";
import { supabase } from "@/integrations/supabase/client";

const toTitleCase = (name: string) =>
  name
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");

const formatDateBR = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("pt-BR");
};

const STATIC_AREAS: { id: AttendanceArea; label: string; header: string }[] = [
  { id: "gabiao", label: "Área Gabião", header: "✳️  ÁREA GABIÃO  ✳️" },
  { id: "jardinagem", label: "Área Jardinagem", header: "🌿  ÁREA JARDINAGEM  🌿" },
  { id: "adm", label: "Área ADM", header: "🏢  ÁREA ADM  🏢" },
  { id: "transporte", label: "Área Transporte", header: "🚚  ÁREA TRANSPORTE  🚚" },
];

const SUPPORT_ROLES = [
  "TECNICO DE SEGURANÇA DO TRABALHO",
  "ENGENHEIRO DE SEGURANÇA DO TRABALHO",
  "ENCARREGADO GERAL",
  "ENCARREGADO DE FRENTE DE SERVIÇO",
];

const EXECUTION_ORDER = [
  "OFICIAL POLIVALENTE",
  "POLIVALENTE",
  "MEIO OFICIAL",
  "MEIA OFICIAL",
  "AJUDANTE",
  "JARDINEIRO",
  "MOTORISTA DE CAMINHÃO PIPA",
  "MOTORISTA DE CAMINHÃO MUNCK",
  "SINALEIRO RIGGER",
  "SINALEIRO",
  "MECANICO",
  "MECÂNICO MONTADOR",
  "ELETRICISTA",
  "AJUDANTE DE ELETRICISTA",
  "AUXILIAR DE ELÉTRICA",
  "APONTADOR",
  "PLANEJADOR",
  "ENGENHEIRO FLORESTAL",
  "TECNICO DE MEIO AMBIENTE",
  "AUXILIAR DE ALMOXARIFE",
];

const ROLE_LABELS: Record<string, string> = {
  "OFICIAL POLIVALENTE": "OFICIAL POLIVALENTE",
  POLIVALENTE: "POLIVALENTES",
  "MEIO OFICIAL": "MEIA OFICIAL",
  "MEIA OFICIAL": "MEIA OFICIAL",
  AJUDANTE: "AJUDANTE",
  JARDINEIRO: "JARDINEIRO",
  "MOTORISTA DE CAMINHÃO PIPA": "MOTORISTA DO PIPA",
  "MOTORISTA DE CAMINHÃO MUNCK": "MOTORISTA DO MUNCK",
  "SINALEIRO RIGGER": "SINALEIRO",
  SINALEIRO: "SINALEIRO",
  MECANICO: "MECÂNICO",
  "MECÂNICO MONTADOR": "MECÂNICO MONTADOR",
  ELETRICISTA: "ELETRICISTA",
  "AJUDANTE DE ELETRICISTA": "AJUDANTE DE ELÉTRICA",
  "AUXILIAR DE ELÉTRICA": "AUXILIAR DE ELÉTRICA",
  APONTADOR: "APONTADOR",
  PLANEJADOR: "PLANEJADOR",
  "ENGENHEIRO FLORESTAL": "ENGENHEIRO FLORESTAL",
  "TECNICO DE MEIO AMBIENTE": "TÉCNICO DE MEIO AMBIENTE",
  "AUXILIAR DE ALMOXARIFE": "AUXILIAR DE ALMOXARIFE",
};

import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";


const Presenca = () => {
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const { data: rhData, isLoading } = useRHEfetivo();

  const {
    data: assignments,
    assignMutation,
    removeMutation,
  } = useAttendanceAreaAssignments();




  const { environment } = useEnvironment();
  const isBarcarena = (environment ?? "barcarena") === "barcarena";
  const { definitions: customDefs, create: createCustomActivity, update: updateCustomActivity, remove: removeCustomActivity } = useCustomActivities();
  const canManageAreas =
    isAdmin ||
    profile?.cargo === "preposto" ||
    profile?.cargo === "encarregado_geral" ||
    profile?.cargo === "encarregado_i" ||
    profile?.cargo === "encarregado_ii";

  const openNewAreaDialog = () => {
    setNewAreaName("");
    setNewAreaOpen(true);
  };

  const confirmCreateArea = async () => {
    const name = newAreaName.trim();
    if (!name) {
      toast.error("Informe o nome da área");
      return;
    }
    setNewAreaSaving(true);
    try {
      const created: any = await createCustomActivity.mutateAsync({
        title: name,
        icon: "ClipboardList",
        color: "#c9a84c",
        config: { mode: "manual", fields: [], locations: [], unit: "" } as any,
      });
      if (created?.id) setActiveArea(created.id);
      toast.success("Área criada");
      setNewAreaOpen(false);
    } catch (e: any) {
      toast.error("Erro ao criar área: " + (e?.message || ""));
    } finally {
      setNewAreaSaving(false);
    }
  };

  const handleRenameArea = (id: string, currentTitle: string) => {
    setRenameArea({ id, title: currentTitle });
    setRenameName(currentTitle);
  };

  const confirmRenameArea = async () => {
    if (!renameArea) return;
    const name = renameName.trim();
    if (!name || name === renameArea.title) {
      setRenameArea(null);
      return;
    }
    try {
      await updateCustomActivity.mutateAsync({ id: renameArea.id, title: name });
      toast.success("Área renomeada");
      setRenameArea(null);
    } catch (e: any) {
      toast.error("Erro ao renomear: " + (e?.message || ""));
    }
  };

  const handleDeleteArea = (id: string, title: string) => {
    setDeleteArea({ id, title });
  };

  const confirmDeleteArea = async () => {
    if (!deleteArea) return;
    const { id } = deleteArea;
    try {
      const env = environment ?? "barcarena";
      await supabase
        .from("attendance_area_assignments")
        .delete()
        .eq("area", id)
        .eq("environment", env);
      await removeCustomActivity.mutateAsync(id);
      await queryClient.refetchQueries({ queryKey: ["attendance-area-assignments"] });
      if (activeArea === id) {
        const fallback = AREAS.find((a) => a.id !== id);
        if (fallback) setActiveArea(fallback.id);
      }
      toast.success("Área removida");
      setDeleteArea(null);
    } catch (e: any) {
      toast.error("Erro ao remover área: " + (e?.message || ""));
    }
  };



  const AREAS = useMemo(() => {
    const customAreas = customDefs.map((d) => ({
      id: d.id as AttendanceArea,
      label: d.title,
      header: `🏷️  ÁREA ${d.title.toUpperCase()}  🏷️`,
    }));
    return [...(isBarcarena ? STATIC_AREAS : []), ...customAreas];
  }, [customDefs, isBarcarena]);

  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const { isLocked, lockMutation, unlockMutation } =
    useAttendanceReportLocks(date);
  const { data: dailyMarks, getAbsentIds, getExternalWorkIds, saveMutation: marksSaveMutation } =
    useAttendanceDailyMarks(date);

  const initialArea = useMemo<AttendanceArea>(() => {
    if (isBarcarena) return "gabiao";
    return customDefs[0]?.id ?? "custom";
  }, [isBarcarena, customDefs]);

  const [activeArea, setActiveArea] = useState<AttendanceArea>(initialArea);

  useEffect(() => {
    if (AREAS.length > 0 && !AREAS.some((a) => a.id === activeArea)) {
      setActiveArea(AREAS[0].id);
    }
  }, [AREAS, activeArea]);

  
  useEffect(() => {
    // Todos os encarregados I e II veem todas as áreas e podem salvar
  }, [profile?.cargo]);

  const [absentByArea, setAbsentByArea] = useState<
    Record<string, Set<number>>
  >({});

  const [externalWorkByArea, setExternalWorkByArea] = useState<
    Record<string, Set<number>>
  >({});

  // Sincroniza ausências salvas (banco) com o estado local
  useEffect(() => {
    if (!dailyMarks) return;
    const absent: Record<string, Set<number>> = {};
    const external: Record<string, Set<number>> = {};
    AREAS.forEach((a) => {
      absent[a.id] = getAbsentIds(a.id);
      external[a.id] = getExternalWorkIds(a.id);
    });
    setAbsentByArea(absent);
    setExternalWorkByArea(external);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyMarks, AREAS]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addEmployeeIds, setAddEmployeeIds] = useState<Set<number>>(new Set());
  const [addSearch, setAddSearch] = useState("");
  const debouncedAddSearch = useDebounce(addSearch, 300);
  const [addArea, setAddArea] = useState<AttendanceArea>(initialArea);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [newAreaOpen, setNewAreaOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaSaving, setNewAreaSaving] = useState(false);
  const [renameArea, setRenameArea] = useState<{ id: string; title: string } | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteArea, setDeleteArea] = useState<{ id: string; title: string } | null>(null);


  const deferredSearch = useDeferredValue(search);

  const allColaboradores: Colaborador[] = useMemo(() => {
    const list = rhData?.colaboradores ?? [];
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [rhData]);

  // Map: employee_id -> area (ignora vínculos órfãos para áreas que não existem mais)
  const validAreaIds = useMemo(() => new Set(AREAS.map((a) => a.id)), [AREAS]);
  const employeeAreaMap = useMemo(() => {
    const map = new Map<number, AttendanceArea>();
    (assignments ?? []).forEach((a) => {
      if (validAreaIds.has(a.area)) map.set(a.employee_id, a.area);
    });
    return map;
  }, [assignments, validAreaIds]);

  // Funcionários da área ativa
  const areaEmployees = useMemo(
    () => {
      return allColaboradores.filter((c) => {
        return employeeAreaMap.get(c.id) === activeArea;
      });
    },
    [allColaboradores, employeeAreaMap, activeArea]
  );

  // Não atribuídos (para o diálogo de adicionar)
  const unassignedEmployees = useMemo(
    () => allColaboradores.filter((c) => !employeeAreaMap.has(c.id)),
    [allColaboradores, employeeAreaMap]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return areaEmployees;
    return areaEmployees.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.funcao || "").toLowerCase().includes(q)
    );
  }, [areaEmployees, debouncedSearch]);

  const toggleAbsent = (id: number) => {
    setAbsentByArea((prev) => {
      const next = { ...prev, [activeArea]: new Set(prev[activeArea]) };
      if (next[activeArea].has(id)) {
        next[activeArea].delete(id);
      } else {
        next[activeArea].add(id);
        // Se está ausente, não pode estar em trabalho externo simultaneamente no relatório
        setExternalWorkByArea((prevExt) => {
          const nextExt = { ...prevExt, [activeArea]: new Set(prevExt[activeArea]) };
          nextExt[activeArea].delete(id);
          return nextExt;
        });
      }
      return next;
    });
  };

  const toggleExternalWork = (id: number) => {
    setExternalWorkByArea((prev) => {
      const next = { ...prev, [activeArea]: new Set(prev[activeArea]) };
      if (next[activeArea].has(id)) {
        next[activeArea].delete(id);
      } else {
        next[activeArea].add(id);
        // Se está em trabalho externo, não pode estar ausente simultaneamente no relatório
        setAbsentByArea((prevAbs) => {
          const nextAbs = { ...prevAbs, [activeArea]: new Set(prevAbs[activeArea]) };
          nextAbs[activeArea].delete(id);
          return nextAbs;
        });
      }
      return next;
    });
  };

  const markAllPresent = () => {
    setAbsentByArea((prev) => ({ ...prev, [activeArea]: new Set() }));
    setExternalWorkByArea((prev) => ({ ...prev, [activeArea]: new Set() }));
  };
  const markAllAbsent = () => {
    setAbsentByArea((prev) => ({
      ...prev,
      [activeArea]: new Set(areaEmployees.map((c) => c.id)),
    }));
    setExternalWorkByArea((prev) => ({ ...prev, [activeArea]: new Set() }));
  };

  const absentSet = absentByArea[activeArea] ?? new Set<number>();
  const presentCount = areaEmployees.length - absentSet.size;
  const absentCount = absentSet.size;

  const handleAddAssign = async () => {
    if (addEmployeeIds.size === 0) {
      toast.error("Selecione pelo menos um funcionário");
      return;
    }
    const emps = allColaboradores.filter((c) => addEmployeeIds.has(c.id));
    try {
      await Promise.all(
        emps.map((emp) =>
          assignMutation.mutateAsync({
            employee_id: emp.id,
            employee_name: emp.nome,
            area: addArea,
          })
        )
      );
      toast.success(
        emps.length === 1
          ? `${toTitleCase(emps[0].nome)} adicionado`
          : `${emps.length} funcionários adicionados`
      );
      setAddEmployeeIds(new Set());
      setAddSearch("");
      setAddOpen(false);
      // Garante que a prévia reflita imediatamente os novos funcionários
      await queryClient.refetchQueries({
        queryKey: ["attendance-area-assignments"],
      });
      setActiveArea(addArea);
    } catch (e) {
      toast.error("Erro ao adicionar");
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeMutation.mutateAsync(id);
      toast.success("Removido da área");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  // Gera relatório de uma área
  const buildReportForArea = (area: AttendanceArea): string => {
    const list = allColaboradores.filter(
      (c) => employeeAreaMap.get(c.id) === area
    );
    const absents = absentByArea[area] ?? new Set<number>();
    const externalWorks = externalWorkByArea[area] ?? new Set<number>();
    const isPresent = (c: Colaborador) => !absents.has(c.id) && !externalWorks.has(c.id);
    const isExternal = (c: Colaborador) => externalWorks.has(c.id);
    const header = AREAS.find((a) => a.id === area)?.header ?? "🏷️  ÁREA";

    const lines: string[] = [];
    lines.push(header);
    lines.push("");

    // Suporte (não exibir na área ADM nem em áreas personalizadas)
    const isAdm = area === "adm" || !STATIC_AREAS.some((s) => s.id === area);
    const tst = !isAdm ? list.find(
      (c) =>
        (c.funcao === "TECNICO DE SEGURANÇA DO TRABALHO" ||
          c.funcao === "ENGENHEIRO DE SEGURANÇA DO TRABALHO") &&
        isPresent(c)
    ) : undefined;
    const encGeral = !isAdm ? list.find(
      (c) => (c.funcao || "").toUpperCase().startsWith("ENCARREGADO GERAL") && isPresent(c)
    ) : undefined;
    const enc = !isAdm ? list.find((c) => {
      const f = (c.funcao || "").toUpperCase();
      return f.startsWith("ENCARREGADO") && !f.startsWith("ENCARREGADO GERAL") && isPresent(c);
    }) : undefined;

    if (tst || encGeral || enc) {
      lines.push("✴️EQUIPE DE SUPORTE✴️");
      lines.push("");
      if (tst) {
        lines.push(`🙋 TST : ${toTitleCase(tst.nome)}`);
        lines.push("");
      }
      if (encGeral) {
        lines.push(`🙋 ENC GERAL: ${toTitleCase(encGeral.nome)}`);
        lines.push("");
      }
      if (enc) {
        lines.push(`🙋 ENC: ${toTitleCase(enc.nome)}`);
        lines.push("");
      }
    }

    // Execução (na área ADM, lista todos por função, sem distinção de suporte)
    const exec = isAdm
      ? list.filter(isPresent)
      : list.filter((c) => {
          const f = (c.funcao || "").toUpperCase();
          return !SUPPORT_ROLES.includes(f) && !f.startsWith("ENCARREGADO");
        });
    if (exec.length > 0) {
      if (!isAdm) {
        lines.push("✴️EQUIPE DE EXECUÇÃO✴️");
        lines.push("");
      }
      const groups = new Map<string, Colaborador[]>();
      exec.forEach((c) => {
        const role = (c.funcao || "").toUpperCase();
        if (!groups.has(role)) groups.set(role, []);
        groups.get(role)!.push(c);
      });
      const orderedRoles = [
        ...EXECUTION_ORDER.filter((r) => groups.has(r)),
        ...Array.from(groups.keys()).filter((r) => !EXECUTION_ORDER.includes(r)),
      ];
      orderedRoles.forEach((role) => {
        const items = groups.get(role)!;
        const label = ROLE_LABELS[role] || role;
        lines.push(`👷 ${label}:`);
        lines.push("");
        items.forEach((c) => {
          const mark = isExternal(c) ? "🛠️ (Externo)" : isPresent(c) ? "✅" : "❌";
          lines.push(`${toTitleCase(c.nome)} ${mark}`);
          lines.push("");
        });
      });
    }

    const ausentes = list.filter((c) => !isPresent(c) && !isExternal(c));
    const externos = list.filter(isExternal);
    const presentes = list.length - ausentes.length - externos.length;
    lines.push("───────────────────────────");
    lines.push(
      `✅ Presentes: ${presentes}  |  ❌ Ausentes: ${ausentes.length}  |  🛠️ Externo: ${externos.length}  |  👥 Total: ${list.length}`
    );
    return lines.join("\n").trim();
  };

  const reportText = useMemo(() => {
    const list = allColaboradores.filter(
      (c) => employeeAreaMap.get(c.id) === activeArea
    );
    if (list.length === 0) {
      return `📅 Data: ${formatDateBR(date)}\n\n(Nenhum funcionário nesta área)`;
    }
    return [
      `📅 Data: ${formatDateBR(date)}`,
      "",
      buildReportForArea(activeArea),
    ].join("\n");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, allColaboradores, employeeAreaMap, absentByArea, activeArea]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      toast.success("Relatório copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
    window.open(url, "_blank");
  };

  const handleSaveLock = async () => {
    try {
      // Persiste as ausências e trabalho externo para a área (vai para o RDO)
      await marksSaveMutation.mutateAsync({
        area: activeArea,
        absentIds: Array.from(absentByArea[activeArea] ?? new Set<number>()),
        externalWorkIds: Array.from(externalWorkByArea[activeArea] ?? new Set<number>()),
      });
      await lockMutation.mutateAsync(activeArea);
      toast.success("Lista salva e enviada para o RDO");
      // Envio automático ao grupo W-API (se habilitado em /admin/whatsapp)
      // Envia SOMENTE os dados da área que está sendo salva no momento.
      try {
        const areaEntry = AREAS.find((a) => a.id === activeArea);
        const areaTitle =
          areaEntry?.label?.toUpperCase() ??
          (activeArea === "gabiao"
            ? "GABIÃO"
            : activeArea === "jardinagem"
              ? "JARDINAGEM"
              : activeArea === "transporte"
                ? "TRANSPORTE"
                : activeArea === "adm"
                  ? "ADMINISTRATIVO"
                  : "ÁREA");
        const captionWithHeader = `📋 *LISTA DE PRESENÇA — ${areaTitle}*\n\n${reportText}`;
        await supabase.functions.invoke("wapi-attendance-notify", {
          body: { caption: captionWithHeader, area: activeArea },
        });
      } catch (err) {
        console.warn("[wapi-attendance-notify] falha no envio automático:", err);
      }
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const handleUnlock = async () => {
    try {
      await unlockMutation.mutateAsync(activeArea);
      toast.success("Lista desbloqueada para edição");
    } catch {
      toast.error("Erro ao desbloquear");
    }
  };

  const locked = isLocked(activeArea);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Lista de Presença
            </h1>
            <p className="text-sm text-muted-foreground">
              Marque presentes/ausentes por área e gere o relatório completo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        <Tabs
          value={activeArea}
          onValueChange={(v) => setActiveArea(v as AttendanceArea)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <TabsList className="flex flex-wrap h-auto gap-1">

              {AREAS.map((a) => {
                const count = allColaboradores.filter(
                  (c) => employeeAreaMap.get(c.id) === a.id
                ).length;
                const isCustom = customDefs.some((d) => d.id === a.id);
                const def = customDefs.find((d) => d.id === a.id);
                return (
                  <TabsTrigger key={a.id} value={a.id} className="gap-1">
                    <span>{a.label}</span>
                    <span className="text-xs opacity-70">({count})</span>
                    {isCustom && canManageAreas && def && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameArea(def.id, def.title);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRenameArea(def.id, def.title);
                          }
                        }}
                        className="ml-1 inline-flex items-center justify-center rounded p-0.5 hover:bg-muted-foreground/20"
                        title="Renomear área"
                        aria-label="Renomear área"
                      >
                        <Pencil className="h-3 w-3" />
                      </span>
                    )}
                    {isCustom && isAdmin && def && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteArea(def.id, def.title);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteArea(def.id, def.title);
                          }
                        }}
                        className="ml-0.5 inline-flex items-center justify-center rounded p-0.5 text-destructive hover:bg-destructive/15"
                        title="Remover área"
                        aria-label="Remover área"
                      >
                        <Trash2 className="h-3 w-3" />
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {canManageAreas && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openNewAreaDialog}
                className="gap-1"
                title="Adicionar nova área"
              >
                <Plus className="h-4 w-4" />
                Nova Área
              </Button>
            )}
          </div>



          {AREAS.map((a) => (
            <TabsContent key={a.id} value={a.id} className="space-y-4 mt-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="text-xl font-bold">
                        {areaEmployees.length}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Presentes
                      </div>
                      <div className="text-xl font-bold">{presentCount}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-destructive" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Ausentes
                      </div>
                      <div className="text-xl font-bold text-destructive">
                        {absentCount}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Buscar por nome ou função..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllPresent}
                  disabled={locked}
                >
                  Todos presentes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAbsent}
                  disabled={locked}
                >
                  Todos ausentes
                </Button>

                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => setAddArea(a.id)}
                      disabled={locked}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar funcionário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar à lista de presença</DialogTitle>
                      <DialogDescription>
                        Selecione o funcionário e a área para a qual ele será
                        atribuído.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Funcionário
                        </label>
                        <Input
                          placeholder="Digite o nome para buscar..."
                          value={addSearch}
                          onChange={(e) => setAddSearch(e.target.value)}
                          className="mb-2"
                          autoFocus
                        />
                        <ScrollArea className="h-[240px] rounded-md border">
                          {unassignedEmployees.length === 0 ? (
                            <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                              Todos os funcionários já estão atribuídos.
                            </div>
                          ) : (
                            (() => {
                              const q = debouncedAddSearch.trim().toLowerCase();
                              const list = q
                                ? unassignedEmployees.filter(
                                    (c) =>
                                      c.nome.toLowerCase().includes(q) ||
                                      (c.funcao || "")
                                        .toLowerCase()
                                        .includes(q)
                                  )
                                : unassignedEmployees;
                              if (list.length === 0) {
                                return (
                                  <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                                    Nenhum funcionário encontrado.
                                  </div>
                                );
                              }
                              const allSelected = list.every((c) =>
                                addEmployeeIds.has(c.id)
                              );
                              const toggleAll = () => {
                                setAddEmployeeIds((prev) => {
                                  const next = new Set(prev);
                                  if (allSelected) {
                                    list.forEach((c) => next.delete(c.id));
                                  } else {
                                    list.forEach((c) => next.add(c.id));
                                  }
                                  return next;
                                });
                              };
                              return (
                                <div className="p-1">
                                  <button
                                    type="button"
                                    onClick={toggleAll}
                                    className="w-full text-left px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent border-b mb-1"
                                  >
                                    {allSelected
                                      ? "Desmarcar todos visíveis"
                                      : "Selecionar todos visíveis"}{" "}
                                    ({list.length})
                                  </button>
                                  {list.map((c) => {
                                    const selected = addEmployeeIds.has(c.id);
                                    return (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() =>
                                          setAddEmployeeIds((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(c.id))
                                              next.delete(c.id);
                                            else next.add(c.id);
                                            return next;
                                          })
                                        }
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-start gap-2 ${
                                          selected
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-accent"
                                        }`}
                                      >
                                        <div
                                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                            selected
                                              ? "bg-primary-foreground border-primary-foreground"
                                              : "border-muted-foreground/40"
                                          }`}
                                        >
                                          {selected && (
                                            <Check className="w-3 h-3 text-primary" />
                                          )}
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-medium">
                                            {toTitleCase(c.nome)}
                                          </div>
                                          <div
                                            className={`text-xs ${
                                              selected
                                                ? "text-primary-foreground/80"
                                                : "text-muted-foreground"
                                            }`}
                                          >
                                            {c.funcao}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })()
                          )}
                        </ScrollArea>
                        {addEmployeeIds.size > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {addEmployeeIds.size} selecionado(s)
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Área
                        </label>
                        <Select
                          value={addArea}
                          onValueChange={(v) =>
                            setAddArea(v as AttendanceArea)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AREAS.map((ar) => (
                              <SelectItem key={ar.id} value={ar.id}>
                                {ar.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setAddOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAddAssign}
                        disabled={
                          addEmployeeIds.size === 0 || assignMutation.isPending
                        }
                      >
                        Adicionar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="ml-auto flex items-center gap-2">
                  {locked ? (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handleUnlock}
                      disabled={unlockMutation.isPending}
                    >
                      <Unlock className="w-4 h-4" />
                      Desbloquear
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      className="gap-2"
                      onClick={handleSaveLock}
                      disabled={lockMutation.isPending}
                    >
                      <Save className="w-4 h-4" />
                      Salvar
                    </Button>
                  )}

                  <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Eye className="w-4 h-4" />
                        Pré-visualizar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          Pré-visualização — {a.label}
                        </DialogTitle>
                        <DialogDescription>
                          Relatório apenas desta área. Use as outras abas para
                          gerar separadamente.
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="h-[60vh] rounded-md border bg-muted/30 p-4">
                        <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                          {reportText}
                        </pre>
                      </ScrollArea>
                      <DialogFooter className="gap-2">
                        <Button
                          variant="outline"
                          onClick={handleCopy}
                          className="gap-2"
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {copied ? "Copiado!" : "Copiar"}
                        </Button>
                        <Button onClick={handleWhatsApp} className="gap-2">
                          <Share2 className="w-4 h-4" />
                          Enviar WhatsApp
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {locked && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <Lock className="w-4 h-4" />
                  Lista bloqueada — clique em "Desbloquear" para editar.
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {a.label} — {filtered.length} funcionário(s)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground space-y-2">
                      <p>Nenhum funcionário nesta área.</p>
                      <p className="text-xs">
                        Use "Adicionar funcionário" para incluir alguém.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filtered.map((c) => {
                        const absent = absentSet.has(c.id);
                        const external = (externalWorkByArea[activeArea] ?? new Set<number>()).has(c.id);
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-2 md:gap-3 py-2.5 md:py-3 hover:bg-muted/40 px-1.5 md:px-2 rounded transition overflow-hidden"
                          >
                            <div className="flex flex-col gap-1 pr-2 border-r shrink-0">
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  checked={absent}
                                  onCheckedChange={() => toggleAbsent(c.id)}
                                  aria-label="Marcar como ausente"
                                  disabled={locked}
                                  className="w-4 h-4 md:w-5 md:h-5"
                                />
                                <span className="text-[9px] md:text-[10px] uppercase font-bold text-muted-foreground">Ausente</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  checked={external}
                                  onCheckedChange={() => toggleExternalWork(c.id)}
                                  aria-label="Marcar como trabalho externo"
                                  disabled={locked}
                                  className="w-4 h-4 md:w-5 md:h-5"
                                />
                                <span className="text-[9px] md:text-[10px] uppercase font-bold text-muted-foreground">Externo</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div
                                className={`font-medium truncate text-sm md:text-base ${
                                  absent
                                    ? "line-through text-muted-foreground"
                                    : external
                                      ? "text-blue-600"
                                      : ""
                                }`}
                              >
                                {toTitleCase(c.nome)}
                              </div>
                              <div className="text-[11px] md:text-xs text-muted-foreground truncate">
                                {c.funcao}
                              </div>
                            </div>
                            <span className="text-base md:text-lg shrink-0" aria-hidden>
                              {absent ? "❌" : external ? "🛠️" : "✅"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(c.id)}
                              title="Remover desta área"
                              disabled={locked}
                              className="w-8 h-8 shrink-0"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Dialog: Nova Área */}
      <Dialog open={newAreaOpen} onOpenChange={setNewAreaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova área</DialogTitle>
            <DialogDescription>
              Informe o nome da nova área de presença.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              autoFocus
              placeholder="Ex.: Descarregamento"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmCreateArea();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewAreaOpen(false)} disabled={newAreaSaving}>
              Cancelar
            </Button>
            <Button onClick={confirmCreateArea} disabled={newAreaSaving || !newAreaName.trim()}>
              {newAreaSaving ? "Criando..." : "Criar área"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Renomear Área */}
      <Dialog open={!!renameArea} onOpenChange={(v) => !v && setRenameArea(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear área</DialogTitle>
            <DialogDescription>Novo nome para a área.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              autoFocus
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmRenameArea();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameArea(null)}>Cancelar</Button>
            <Button onClick={confirmRenameArea} disabled={!renameName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Remover Área */}
      <Dialog open={!!deleteArea} onOpenChange={(v) => !v && setDeleteArea(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover área</DialogTitle>
            <DialogDescription>
              Remover a área <span className="font-semibold">"{deleteArea?.title}"</span>? Todos os funcionários atribuídos voltarão para "não atribuídos".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteArea(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteArea}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>

  );
};

export default Presenca;
