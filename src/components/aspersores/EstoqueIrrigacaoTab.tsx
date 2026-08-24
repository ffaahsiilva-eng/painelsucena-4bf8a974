import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useEnvironment } from "@/hooks/useEnvironment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Plus, Trash2, Loader2, History, Search, X, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Item = {
  id: string;
  environment: string;
  nome: string;
  unidade: string;
  quantidade: number;
  observacao: string | null;
};

type Movimento = {
  id: string;
  item_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  motivo: string | null;
  registrado_por_nome: string | null;
  created_at: string;
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { timeZone: "America/Belem" });
};

export default function EstoqueIrrigacaoTab() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const { environment } = useEnvironment();
  const qc = useQueryClient();

  const [newItemOpen, setNewItemOpen] = useState(false);
  const [entradaItem, setEntradaItem] = useState<Item | null>(null);
  const [saidaItem, setSaidaItem] = useState<Item | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [qtdInicial, setQtdInicial] = useState("");
  const [obs, setObs] = useState("");

  const [movQtd, setMovQtd] = useState("");
  const [movMotivo, setMovMotivo] = useState("");
  const [search, setSearch] = useState("");

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["irrigacao_itens", environment],
    queryFn: async () => {
      if (!environment) return [];
      const { data, error } = await supabase
        .from("irrigacao_itens")
        .select("*")
        .eq("environment", environment)
        .order("nome");
      if (error) throw error;
      return (data as Item[]) ?? [];
    },
    enabled: !!environment,
  });

  const { data: movimentos = [] } = useQuery({
    queryKey: ["irrigacao_movimentos", environment],
    queryFn: async () => {
      if (!environment) return [];
      const { data, error } = await supabase
        .from("irrigacao_movimentos")
        .select("*")
        .eq("environment", environment)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data as Movimento[]) ?? [];
    },
    enabled: !!environment,
  });

  const itemMap = useMemo(() => Object.fromEntries(itens.map((i) => [i.id, i])), [itens]);
  const filteredItens = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter((i) => i.nome.toLowerCase().includes(q) || (i.observacao ?? "").toLowerCase().includes(q));
  }, [itens, search]);

  const createItem = useMutation({
    mutationFn: async () => {
      const nomeUp = nome.trim().toUpperCase();
      if (!nomeUp) throw new Error("Nome obrigatório");
      const q = Number(qtdInicial) || 0;
      const { error } = await supabase.from("irrigacao_itens").insert({
        environment,
        nome: nomeUp,
        unidade: unidade.trim() || "un",
        quantidade: q,
        observacao: obs || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item criado");
      qc.invalidateQueries({ queryKey: ["irrigacao_itens", environment] });
      setNewItemOpen(false);
      setNome(""); setUnidade("un"); setQtdInicial(""); setObs("");
    },
    onError: (e: any) => toast.error(e.message || "Falha ao criar item"),
  });

  const registrarMov = useMutation({
    mutationFn: async (vars: { tipo: "entrada" | "saida"; item: Item }) => {
      const q = Number(movQtd);
      if (!q || q <= 0) throw new Error("Quantidade inválida");
      if (vars.tipo === "saida" && q > Number(vars.item.quantidade)) {
        throw new Error("Quantidade maior que o estoque");
      }
      const novaQtd = vars.tipo === "entrada"
        ? Number(vars.item.quantidade) + q
        : Number(vars.item.quantidade) - q;
      const nome = profile?.full_name || user?.email || "Usuário";
      const { error: e1 } = await supabase.from("irrigacao_movimentos").insert({
        environment,
        item_id: vars.item.id,
        tipo: vars.tipo,
        quantidade: q,
        motivo: movMotivo || null,
        registrado_por_id: user?.id,
        registrado_por_nome: nome,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("irrigacao_itens")
        .update({ quantidade: novaQtd })
        .eq("id", vars.item.id);
      if (e2) throw e2;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.tipo === "entrada" ? "Entrada registrada" : "Saída registrada");
      qc.invalidateQueries({ queryKey: ["irrigacao_itens", environment] });
      qc.invalidateQueries({ queryKey: ["irrigacao_movimentos", environment] });
      setEntradaItem(null); setSaidaItem(null); setMovQtd(""); setMovMotivo("");
    },
    onError: (e: any) => toast.error(e.message || "Falha ao registrar"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("irrigacao_itens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item removido");
      qc.invalidateQueries({ queryKey: ["irrigacao_itens", environment] });
      qc.invalidateQueries({ queryKey: ["irrigacao_movimentos", environment] });
    },
    onError: (e: any) => toast.error(e.message || "Falha ao remover"),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card className="bg-card/60 backdrop-blur border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base md:text-lg">Estoque de Irrigação</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              const doc = new jsPDF();
              const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" });
              doc.setFontSize(14);
              doc.text("Estoque de Irrigação", 14, 15);
              doc.setFontSize(9);
              doc.text(`Ambiente: ${environment ?? "-"}`, 14, 21);
              doc.text(`Gerado em: ${now}`, 14, 26);
              const total = itens.reduce((s, i) => s + Number(i.quantidade || 0), 0);
              autoTable(doc, {
                startY: 30,
                head: [["Item", "Quantidade", "Unidade", "Observação"]],
                body: itens.map((i) => [i.nome, Number(i.quantidade), i.unidade, i.observacao ?? ""]),
                foot: [["TOTAL", String(total), "", ""]],
                styles: { fontSize: 9 },
                headStyles: { fillColor: [34, 139, 87] },
                footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
              });
              doc.save(`estoque-irrigacao-${new Date().toISOString().slice(0, 10)}.pdf`);
            }}>
              <FileDown className="h-4 w-4 mr-1" />PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4 mr-1" />Histórico
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={() => setNewItemOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Novo Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar item por nome..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded hover:bg-muted"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : itens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum item cadastrado. {isAdmin && "Clique em \"Novo Item\" para começar."}
            </p>
          ) : filteredItens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum item encontrado para "{search}".
            </p>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-260px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-center">Unidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItens.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">
                        {it.nome}
                        {it.observacao && (
                          <div className="text-xs text-muted-foreground">{it.observacao}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono">{Number(it.quantidade)}</TableCell>
                      <TableCell className="text-center">{it.unidade}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {isAdmin && (
                            <Button size="sm" variant="outline" onClick={() => setEntradaItem(it)}>
                              <ArrowDownToLine className="h-4 w-4 mr-1" />Entrada
                            </Button>
                          )}
                          <Button size="sm" onClick={() => setSaidaItem(it)} disabled={Number(it.quantidade) <= 0}>
                            <ArrowUpFromLine className="h-4 w-4 mr-1" />Retirar
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Remover "${it.nome}"? Todo o histórico será apagado.`)) deleteItem.mutate(it.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Novo Item */}
      <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo item de irrigação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} placeholder="Ex: ASPERSOR 3/4" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Unidade</Label>
                <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="un / m / pç" />
              </div>
              <div>
                <Label>Qtd. inicial</Label>
                <Input type="number" value={qtdInicial} onChange={(e) => setQtdInicial(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewItemOpen(false)}>Cancelar</Button>
            <Button onClick={() => createItem.mutate()} disabled={createItem.isPending}>
              {createItem.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entrada */}
      <Dialog open={!!entradaItem} onOpenChange={(o) => !o && setEntradaItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Entrada — {entradaItem?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Quantidade ({entradaItem?.unidade}) *</Label>
              <Input type="number" value={movQtd} onChange={(e) => setMovQtd(e.target.value)} autoFocus />
            </div>
            <div>
              <Label>Motivo / observação</Label>
              <Textarea value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntradaItem(null)}>Cancelar</Button>
            <Button
              onClick={() => entradaItem && registrarMov.mutate({ tipo: "entrada", item: entradaItem })}
              disabled={registrarMov.isPending}
            >
              {registrarMov.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Registrar entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saída */}
      <Dialog open={!!saidaItem} onOpenChange={(o) => !o && setSaidaItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Retirada — {saidaItem?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Disponível: <b>{saidaItem ? Number(saidaItem.quantidade) : 0}</b> {saidaItem?.unidade}
            </div>
            <div>
              <Label>Quantidade a retirar *</Label>
              <Input type="number" value={movQtd} onChange={(e) => setMovQtd(e.target.value)} autoFocus />
            </div>
            <div>
              <Label>Motivo / destino</Label>
              <Textarea value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaidaItem(null)}>Cancelar</Button>
            <Button
              onClick={() => saidaItem && registrarMov.mutate({ tipo: "saida", item: saidaItem })}
              disabled={registrarMov.isPending}
            >
              {registrarMov.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Confirmar retirada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico de movimentações</DialogTitle></DialogHeader>
          {movimentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem movimentações registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Qtd.</TableHead>
                    <TableHead>Registrado por</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDate(m.created_at)}</TableCell>
                      <TableCell>{itemMap[m.item_id]?.nome ?? "—"}</TableCell>
                      <TableCell>
                        <span className={m.tipo === "entrada" ? "text-green-500" : "text-orange-500"}>
                          {m.tipo === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono">{Number(m.quantidade)}</TableCell>
                      <TableCell className="text-xs">{m.registrado_por_nome ?? "—"}</TableCell>
                      <TableCell className="text-xs">{m.motivo ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
