import { useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { GraduationCap, Search, CalendarDays, RefreshCw, Download, ShieldCheck, Plus } from "lucide-react";
import { NrManagementTab } from "@/components/treinamento/NrManagementTab";
import { ManageNrCatalogDialog } from "@/components/rh/ManageNrCatalogDialog";
import ExcelJS from "exceljs";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NrTraining {
  id: string;
  matricula: string | null;
  status: string;
  collaborator_name: string;
  role: string | null;
  area: string | null;
  training: "NR20" | "NR35";
  training_date: string | null;
  validity_days: number | null;
}

const daysRemaining = (dateStr: string | null, validity: number | null) => {
  if (!dateStr) return null;
  const v = validity ?? 730;
  const expiry = new Date(dateStr + "T00:00:00");
  expiry.setDate(expiry.getDate() + v);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return { days: diff, expiry };
};

const statusBadge = (days: number | null) => {
  if (days === null) return <Badge variant="outline">Sem registro</Badge>;
  if (days < 0) return <Badge className="bg-red-600 hover:bg-red-700">Vencido ({Math.abs(days)}d)</Badge>;
  if (days <= 30) return <Badge className="bg-orange-500 hover:bg-orange-600">{days} dias</Badge>;
  if (days <= 90) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">{days} dias</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-700">{days} dias</Badge>;
};

const ControleTreinamento = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<NrTraining | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editValidity, setEditValidity] = useState<number>(730);

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ["nr-trainings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr_trainings")
        .select("*")
        .order("collaborator_name");
      if (error) throw error;
      return data as NrTraining[];
    },
  });

  const updateMut = useMutation({
    mutationFn: async (payload: { id: string; training_date: string; validity_days: number }) => {
      const { error } = await supabase
        .from("nr_trainings")
        .update({
          training_date: payload.training_date,
          validity_days: payload.validity_days,
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nr-trainings"] });
      toast({ title: "Data atualizada", description: "Os dias restantes foram recalculados." });
      setEditing(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return trainings;
    return trainings.filter(
      (t) =>
        t.collaborator_name.toLowerCase().includes(term) ||
        (t.role ?? "").toLowerCase().includes(term) ||
        (t.matricula ?? "").toLowerCase().includes(term),
    );
  }, [trainings, search]);

  const nr20 = filtered.filter((t) => t.training === "NR20");
  const nr35 = filtered.filter((t) => t.training === "NR35");

  const openEdit = (t: NrTraining) => {
    setEditing(t);
    setEditDate(t.training_date ?? format(new Date(), "yyyy-MM-dd"));
    setEditValidity(t.validity_days ?? 730);
  };

  const { data: nrCatalog = [] } = useQuery({
    queryKey: ["nr_catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nr_catalog").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: allRecords = [] } = useQuery({
    queryKey: ["nr_records_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nr_records").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ["rh_efetivo_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rh_efetivo")
        .select("id, colaboradores, deleted_ids");
      if (error) throw error;

      const map = new Map<string, any>();
      data?.forEach((row: any) => {
        const colabs = (row.colaboradores as any[]) || [];
        const deletedIds = (row.deleted_ids as number[]) || [];
        colabs.forEach((c) => {
          if (!deletedIds.includes(c.id)) {
            const key = `${c.nome}-${c.funcao}`;
            if (!map.has(key)) map.set(key, { ...c, id_supabase: row.id });
          }
        });
      });
      return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });

  const summaryData = useMemo(() => {
    const term = search.trim().toLowerCase();
    const catalogMap = new Map(nrCatalog.map((c: any) => [c.id, c.nr_code]));

    return collaborators
      .filter((c: any) =>
        !term ||
        String(c.nome ?? "").toLowerCase().includes(term) ||
        String(c.funcao ?? "").toLowerCase().includes(term),
      )
      .map((c: any) => {
        const colabId = String(c.id);
        const rowId = String(c.id_supabase);
        const recs = allRecords.filter(
          (r: any) => String(r.collaborator_id) === colabId && String(r.db_row_id) === rowId,
        );

        const nrsList = Array.from(
          new Set(recs.map((r: any) => catalogMap.get(r.nr_id) || "NR").filter(Boolean)),
        ) as string[];

        let minDays: number | null = null;
        recs.forEach((r: any) => {
          const res = r.expiry_date
            ? daysRemaining(r.expiry_date, 0)
            : daysRemaining(r.issue_date, 730);
          const d = res?.days;
          if (d !== undefined && d !== null && (minDays === null || d < minDays)) minDays = d;
        });

        return { id: `${rowId}-${colabId}`, name: c.nome, funcao: c.funcao, nrs: nrsList, days: minDays };
      })
      .filter((row) => row.nrs.length > 0 || !!term);
  }, [collaborators, allRecords, nrCatalog, search]);

  const renderTable = () => (
    <Card className="overflow-hidden border-yellow-500/20 bg-black/40 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold text-yellow-500/80">Colaborador</th>
              <th className="px-4 py-3 font-semibold text-yellow-500/80">Treinamentos (NRs)</th>
              <th className="px-4 py-3 font-semibold text-yellow-500/80 text-center">Vencimento Próximo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {summaryData.map((row) => (
              <tr key={row.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-4 font-medium text-white">
                  {row.name}
                  {row.funcao && (
                    <span className="block text-[10px] text-muted-foreground">{row.funcao}</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {row.nrs.length > 0 ? (
                      row.nrs.map((nr, idx) => (
                        <Badge key={idx} variant="outline" className="border-yellow-500/30 text-[10px] text-yellow-200/70">
                          {nr}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Nenhum registro</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">{statusBadge(row.days)}</td>
              </tr>
            ))}
            {summaryData.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground italic">
                  Nenhum colaborador encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const summaryStats = useMemo(() => {
    let vencidos = 0, proximos = 0, ok = 0, sem = 0;
    summaryData.forEach((row) => {
      if (row.days === null) sem++;
      else if (row.days < 0) vencidos++;
      else if (row.days <= 30) proximos++;
      else ok++;
    });
    return { vencidos, proximos, ok, sem, total: summaryData.length };
  }, [summaryData]);


  const [downloading, setDownloading] = useState(false);

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const res = await fetch("/templates/Controle_de_Treinamentos_Hydro_Alunorte.xlsx");
      if (!res.ok) throw new Error("Template não encontrado");
      const buf = await res.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);

      const fillSheet = (sheetName: string, items: NrTraining[]) => {
        const ws = wb.getWorksheet(sheetName);
        if (!ws) return;
        // Limpa linhas a partir da 3 (mantém cabeçalho linhas 1-2)
        const lastRow = ws.actualRowCount;
        for (let r = lastRow; r >= 3; r--) {
          ws.spliceRows(r, 1);
        }
        items.forEach((t, idx) => {
          const rowIdx = idx + 3;
          const row = ws.getRow(rowIdx);
          row.getCell(1).value = t.matricula ? (isNaN(Number(t.matricula)) ? t.matricula : Number(t.matricula)) : null;
          row.getCell(2).value = t.status || "Ativo";
          row.getCell(3).value = t.collaborator_name;
          row.getCell(4).value = t.role ?? "";
          row.getCell(5).value = t.area ?? "";
          row.getCell(6).value = t.training === "NR20" ? "NR 20" : "NR 35";
          if (t.training_date) {
            const d = new Date(t.training_date + "T00:00:00");
            row.getCell(7).value = d;
            row.getCell(7).numFmt = "dd/mm/yyyy";
          }
          row.getCell(8).value = t.validity_days ?? 730;
          // Fórmulas dinâmicas para Próx. Reciclagem (I) e Dias Restantes (J)
          if (t.training_date) {
            row.getCell(9).value = { formula: `G${rowIdx}+H${rowIdx}` } as any;
            row.getCell(9).numFmt = "dd/mm/yyyy";
            row.getCell(10).value = { formula: `I${rowIdx}-$L$2` } as any;
          } else {
            row.getCell(9).value = "NA";
            row.getCell(10).value = "NA";
          }
          row.commit();
        });
      };

      fillSheet("NR 20 (2)", nr20);
      fillSheet("NR 35", nr35);

      const out = await wb.xlsx.writeBuffer();
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Controle_de_Treinamentos_Hydro_Alunorte_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Excel gerado", description: "Download iniciado." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar Excel", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] text-[#1a1a1a]">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#c9a84c]">
            Controle de Treinamento
          </h1>
          <div className="ml-auto flex gap-2">
            <ManageNrCatalogDialog />
            <Button
              onClick={handleDownloadExcel}
              disabled={downloading || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Gerando..." : "Baixar Excel"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-12">Carregando...</p>
        ) : (
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid grid-cols-2 max-w-md mb-8">
              <TabsTrigger value="dashboard">
                Destaques
              </TabsTrigger>
              <TabsTrigger value="seguranca" className="gap-2">
                <ShieldCheck className="w-4 h-4" />
                Segurança
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="relative mb-4 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, função ou matrícula..."
                  className="pl-9"
                />
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex flex-col gap-1 text-yellow-500/90">
                    <span>Resumo de Treinamentos</span>
                    <span className="text-xs font-normal text-muted-foreground leading-tight">
                      Todas as NRs seram exibidas no resumo de Treinamentos de cada colaborador individualmente.
                      <br />
                      Com proximo vencimento e NRs que colaborador foi adicioando.
                    </span>
                  </h3>
                  <StatsRow s={summaryStats} />
                  {renderTable()}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="seguranca">
              <NrManagementTab />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <CalendarDays className="inline h-5 w-5 mr-2" />
              Atualizar Treinamento {editing?.training}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Colaborador: <strong>{editing?.collaborator_name}</strong>
            </p>
            <div className="space-y-2">
              <Label>Nova Data do Treinamento</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Validade (dias)</Label>
              <Input
                type="number"
                value={editValidity}
                onChange={(e) => setEditValidity(Number(e.target.value))}
              />
            </div>
            {editDate && (
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                <strong>Próxima Reciclagem:</strong>{" "}
                {format(
                  new Date(
                    new Date(editDate + "T00:00:00").getTime() +
                      editValidity * 24 * 60 * 60 * 1000,
                  ),
                  "dd 'de' MMMM 'de' yyyy",
                  { locale: ptBR },
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editing &&
                updateMut.mutate({
                  id: editing.id,
                  training_date: editDate,
                  validity_days: editValidity,
                })
              }
              disabled={updateMut.isPending || !editDate}
            >
              {updateMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

const StatsRow = ({
  s,
}: {
  s: { vencidos: number; proximos: number; ok: number; sem: number; total: number };
}) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
    <Card className="p-3 bg-black/40 border-yellow-500/20 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</div>
      <div className="text-2xl font-bold text-white">{s.total}</div>
    </Card>
    <Card className="p-3 bg-black/40 border-green-500/40 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Em dia</div>
      <div className="text-2xl font-bold text-green-400">{s.ok}</div>
    </Card>
    <Card className="p-3 bg-black/40 border-yellow-500/40 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Próx. 30 dias</div>
      <div className="text-2xl font-bold text-yellow-400">{s.proximos}</div>
    </Card>
    <Card className="p-3 bg-black/40 border-red-500/40 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Vencidos</div>
      <div className="text-2xl font-bold text-red-500">{s.vencidos}</div>
    </Card>
    <Card className="p-3 bg-black/40 border-white/10 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sem registro</div>
      <div className="text-2xl font-bold text-gray-400">{s.sem}</div>
    </Card>
  </div>
);

export default ControleTreinamento;
