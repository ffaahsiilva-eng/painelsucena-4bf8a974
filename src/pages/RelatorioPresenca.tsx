import { useMemo, useState, useDeferredValue } from "react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Trash2, ShieldAlert, Search } from "lucide-react";
import { toast } from "sonner";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  ABSENCE_REASONS,
  REASON_COLORS,
  useAbsenceReasons,
  useUpsertAbsence,
  useDeleteAbsence,
  type AbsenceReason,
  type AbsenceRow,
} from "@/hooks/useAbsenceReasons";
import type { Colaborador } from "@/data/efetivoData";
import { ExportRelatorioPresencaExcel } from "@/components/presenca/ExportRelatorioPresencaExcel";
import { VirtualList } from "@/components/ui/virtual-list";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const reasonShort = (r: string) => {
  const map: Record<string, string> = {
    "Falta": "F",
    "Atestado": "AT",
    "Treinamento": "TR",
    "Folga por Exame": "FE",
    "Folga": "FG",
    "Afastado": "AF",
    "Licença Maternidade/Paternidade": "LM",
    "INSS": "IN",
    "Folga de Campo": "FC",
    "Licença Casamento": "LC",
    "Licença Morte": "LO",
    "Trabalho Externo": "TE",
  };
  return map[r] || r.slice(0, 2).toUpperCase();
};

const RH_CARGOS = ["aux_administrativo", "encarregado_geral", "encarregado_i", "encarregado_ii"];

const RelatorioPresenca = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{
    employee: Colaborador;
    date: string; // YYYY-MM-DD
    existing?: AbsenceRow;
  } | null>(null);

  const { data: rhData, isLoading: rhLoading } = useRHEfetivo();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const canEdit = isAdmin || RH_CARGOS.includes(profile?.cargo || "");

  const { data: absences, isLoading: absLoading } = useAbsenceReasons({ year, month });
  const upsert = useUpsertAbsence();
  const removeAbs = useDeleteAbsence();

  const colaboradores = useMemo(() => {
    if (!rhData?.colaboradores?.length) return [];
    const deletedIds = rhData.deletedIds || [];
    return rhData.colaboradores
      .filter((c) => !deletedIds.includes(c.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rhData]);

  // Índice pré-normalizado para busca instantânea (sem toLowerCase por tecla)
  const searchIndex = useMemo(
    () =>
      colaboradores.map((c) => ({
        c,
        nome: c.nome.toLowerCase(),
        matricula: (c.matricula || "").toLowerCase(),
        funcao: (c.funcao || "").toLowerCase(),
      })),
    [colaboradores]
  );

  // Delay removido: filtragem síncrona.
  const deferredSearch = search;

  const filteredColabs = useMemo(() => {
    const s = deferredSearch.trim().toLowerCase();
    if (!s) return colaboradores;
    const out: Colaborador[] = [];
    for (const e of searchIndex) {
      if (e.nome.includes(s) || e.matricula.includes(s) || e.funcao.includes(s)) {
        out.push(e.c);
      }
    }
    return out;
  }, [searchIndex, colaboradores, deferredSearch]);


  const daysInMonth = new Date(year, month, 0).getDate();
  const dayList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const employeeKey = (c: Colaborador) => String(c.matricula || c.id);

  // Map: employeeKey -> date(YYYY-MM-DD) -> AbsenceRow
  const absenceMap = useMemo(() => {
    const map = new Map<string, Map<string, AbsenceRow>>();
    (absences || []).forEach((a) => {
      if (!map.has(a.employee_id)) map.set(a.employee_id, new Map());
      map.get(a.employee_id)!.set(a.date, a);
    });
    return map;
  }, [absences]);

  const isoDate = (day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const openCellDialog = (employee: Colaborador, date: string) => {
    if (!canEdit) {
      toast.error("Apenas Admin e RH podem editar");
      return;
    }
    const existing = absenceMap.get(employeeKey(employee))?.get(date);
    setEditing({ employee, date, existing });
    setDialogOpen(true);
  };

  // Day stats for the per-day tab
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const dayAbsences = useMemo(() => {
    const date = isoDate(selectedDay);
    const m = new Map<string, AbsenceRow>();
    (absences || []).forEach((a) => {
      if (a.date === date) m.set(a.employee_id, a);
    });
    return m;
  }, [absences, selectedDay, year, month]);

  const presentCount = colaboradores.length - dayAbsences.size;

  return (
    <Layout>
      <div className="space-y-4 p-3 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <EditablePageTitle pageKey="relatorio-presenca-title" defaultValue="Relatório de Presença" />
          {!canEdit && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-md">
              <ShieldAlert className="w-4 h-4" />
              Somente leitura — apenas Admin e RH podem editar
            </div>
          )}
        </div>

        {/* Period selector */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((n, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 6 }, (_, i) => today.getFullYear() - 2 + i).map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <ExportRelatorioPresencaExcel
            year={year}
            month={month}
            colaboradores={filteredColabs}
            absences={absences || []}
          />

          <div className="relative ml-auto w-full md:w-[280px]">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar funcionário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Tabs defaultValue="dia" className="w-full">
          <TabsList>
            <TabsTrigger value="dia">Por dia</TabsTrigger>
            <TabsTrigger value="mensal">Mensal</TabsTrigger>
          </TabsList>

          {/* ===================== DIA ===================== */}
          <TabsContent value="dia" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-sm">Dia:</Label>
              <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayList.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {String(d).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-3 ml-auto text-sm">
                <span className="px-2 py-1 rounded bg-success/15 text-success font-medium">
                  Presentes: {presentCount}
                </span>
                <span className="px-2 py-1 rounded bg-destructive/15 text-destructive font-medium">
                  Ausências: {dayAbsences.size}
                </span>
              </div>
            </div>

            <div className="rounded-md border overflow-hidden">
              {/* Header (fora do container virtualizado — sempre visível) */}
              <div
                className="grid gap-0 bg-muted/50 text-sm font-medium text-muted-foreground border-b"
                style={{ gridTemplateColumns: "80px 1fr 1fr 180px 200px" }}
              >
                <div className="px-4 py-2">Matrícula</div>
                <div className="px-4 py-2">Colaborador</div>
                <div className="px-4 py-2">Função</div>
                <div className="px-4 py-2">Status</div>
                <div className="px-4 py-2">Detalhes</div>
              </div>

              {rhLoading || absLoading ? (
                <div className="text-center py-6 text-muted-foreground">Carregando...</div>
              ) : filteredColabs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhum funcionário encontrado.
                </div>
              ) : (
                <VirtualList
                  items={filteredColabs}
                  estimateSize={49}
                  height={Math.min(640, filteredColabs.length * 49 + 4)}
                  overscan={10}
                  getKey={(c) => c.id}
                  renderItem={(c) => {
                    const abs = dayAbsences.get(employeeKey(c));
                    return (
                      <div
                        className="grid gap-0 border-b cursor-pointer hover:bg-muted/40 text-sm items-center"
                        style={{ gridTemplateColumns: "80px 1fr 1fr 180px 200px", minHeight: 49 }}
                        onClick={() => openCellDialog(c, isoDate(selectedDay))}
                      >
                        <div className="px-4 py-2 font-mono text-xs">{c.matricula}</div>
                        <div className="px-4 py-2 font-medium truncate">{c.nome}</div>
                        <div className="px-4 py-2 text-sm text-muted-foreground truncate">{c.funcao}</div>
                        <div className="px-4 py-2">
                          {abs ? (
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold border ${REASON_COLORS[abs.reason as AbsenceReason]}`}
                            >
                              {abs.reason}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-success/15 text-success text-xs font-semibold">
                              Presente
                            </span>
                          )}
                        </div>
                        <div className="px-4 py-2 text-xs text-muted-foreground">
                          {abs?.cid && <div>CID: {abs.cid}</div>}
                          {abs?.days_count && abs.days_count > 1 && (
                            <div>{abs.days_count} dias</div>
                          )}
                          {abs?.notes && <div className="truncate max-w-[180px]">{abs.notes}</div>}
                        </div>
                      </div>
                    );
                  }}
                />
              )}
            </div>
          </TabsContent>

          {/* ===================== MENSAL ===================== */}
          <TabsContent value="mensal">
            <div className="rounded-md border overflow-auto max-w-full">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="sticky left-0 bg-muted px-2 py-2 text-left border-r min-w-[60px]">
                      Matr.
                    </th>
                    <th className="sticky left-[60px] bg-muted px-2 py-2 text-left border-r min-w-[200px]">
                      Colaborador
                    </th>
                    {dayList.map((d) => (
                      <th
                        key={d}
                        className="px-1 py-2 text-center border-r font-semibold min-w-[32px]"
                      >
                        {String(d).padStart(2, "0")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredColabs.map((c) => {
                    const empMap = absenceMap.get(employeeKey(c));
                    return (
                      <tr key={c.id} className="virtual-row border-t hover:bg-muted/30">
                        <td className="sticky left-0 bg-background px-2 py-1.5 border-r font-mono">
                          {c.matricula}
                        </td>
                        <td className="sticky left-[60px] bg-background px-2 py-1.5 border-r">
                          <div className="font-medium truncate max-w-[200px]">{c.nome}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {c.funcao}
                          </div>
                        </td>
                        {dayList.map((d) => {
                          const date = isoDate(d);
                          const abs = empMap?.get(date);
                          return (
                            <td
                              key={d}
                              className="border-r p-0.5 text-center cursor-pointer hover:bg-accent/40"
                              onClick={() => openCellDialog(c, date)}
                              title={abs ? `${abs.reason}${abs.cid ? ` - CID ${abs.cid}` : ""}` : "Presente"}
                            >
                              {abs ? (
                                <span
                                  className={`inline-block px-1 py-0.5 rounded text-[10px] font-bold border ${REASON_COLORS[abs.reason as AbsenceReason]}`}
                                >
                                  {reasonShort(abs.reason)}
                                </span>
                              ) : (
                                <span className="text-success">•</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-3">
              {ABSENCE_REASONS.map((r) => (
                <span
                  key={r}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${REASON_COLORS[r]}`}
                >
                  {reasonShort(r)} — {r}
                </span>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit cell dialog */}
      <AbsenceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSave={async (params) => {
          try {
            await upsert.mutateAsync(params);
            toast.success("Registro salvo");
            setDialogOpen(false);
          } catch (e: any) {
            toast.error("Erro: " + (e?.message || "falha ao salvar"));
          }
        }}
        onClear={async (params) => {
          try {
            await removeAbs.mutateAsync(params);
            toast.success("Registro removido");
            setDialogOpen(false);
          } catch (e: any) {
            toast.error("Erro: " + (e?.message || "falha"));
          }
        }}
      />
    </Layout>
  );
};

interface AbsenceDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: { employee: Colaborador; date: string; existing?: AbsenceRow } | null;
  onSave: (p: {
    employeeKey: string;
    date: string;
    reason: AbsenceReason;
    daysCount?: number;
    cid?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  onClear: (p: { employeeKey: string; date: string }) => Promise<void>;
}

const AbsenceDialog = ({ open, onOpenChange, editing, onSave, onClear }: AbsenceDialogProps) => {
  const [reason, setReason] = useState<AbsenceReason | "">("");
  const [days, setDays] = useState<number>(1);
  const [cid, setCid] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when opening
  useMemo(() => {
    if (open && editing) {
      const e = editing.existing;
      setReason((e?.reason as AbsenceReason) || "");
      setDays(e?.days_count || 1);
      setCid(e?.cid || "");
      setNotes(e?.notes || "");
    }
  }, [open, editing]);

  if (!editing) return null;
  const { employee, date, existing } = editing;
  const employeeKey = String(employee.matricula || employee.id);

  const handleSave = () => {
    if (!reason) {
      toast.error("Selecione um motivo");
      return;
    }
    onSave({
      employeeKey,
      date,
      reason: reason as AbsenceReason,
      daysCount: reason === "Atestado" ? Math.max(1, days) : 1,
      cid: reason === "Atestado" && cid ? cid : null,
      notes: notes || null,
    });
  };

  const formatDateBR = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar ausência</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{employee.nome}</span>
            <br />
            <span className="text-xs">
              Matrícula {employee.matricula} • {formatDateBR(date)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as AbsenceReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent className="max-h-[260px] overflow-y-auto">
                {ABSENCE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "Atestado" && (
            <>
              <div>
                <Label>Dias de atestado</Label>
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Os próximos {days} dia(s) corridos serão preenchidos automaticamente como
                  Atestado.
                </p>
              </div>
              <div>
                <Label>CID (opcional)</Label>
                <Input
                  placeholder="Ex: M54.5"
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <Label>Observação (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionais..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {existing && (
            <Button
              variant="outline"
              onClick={() => onClear({ employeeKey, date })}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Remover
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RelatorioPresenca;
