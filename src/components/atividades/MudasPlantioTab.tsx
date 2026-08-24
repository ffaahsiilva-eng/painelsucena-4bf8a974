import { useState, useMemo } from "react";
import { Plus, Trash2, Sprout, Loader2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMudasPlantio, useAddMudaPlantio, useDeleteMudaPlantio } from "@/hooks/useMudasPlantio";
import { useMudasParaPlantar, useUpdateMudaParaPlantar } from "@/hooks/useMudasParaPlantar";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const FAIXA_OPTIONS = [
  { value: "FAIXA 1", label: "Faixa 1" },
  { value: "FAIXA 2", label: "Faixa 2" },
  { value: "FAIXA 3", label: "Faixa 3" },
  { value: "FAIXA 4", label: "Faixa 4" },
];

const BERMA_OPTIONS_EVEN = Array.from({ length: 15 }, (_, i) => ({
  value: (28 + i * 2).toString(),
  label: `Berma ${28 + i * 2}`,
}));

interface MudasPlantioTabProps {
  canEdit: boolean;
}

export default function MudasPlantioTab({ canEdit }: MudasPlantioTabProps) {
  const { data: mudas, isLoading } = useMudasPlantio();
  const addMuda = useAddMudaPlantio();
  const deleteMuda = useDeleteMudaPlantio();
  const { data: estoque } = useMudasParaPlantar();
  const updateEstoque = useUpdateMudaParaPlantar();

  const [especie, setEspecie] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [faixa, setFaixa] = useState("");
  const [berma, setBerma] = useState("");
  const [dataPlantio, setDataPlantio] = useState<Date>(new Date());

  // Aggregate stock by species
  const estoqueByEspecie = useMemo(() => {
    if (!estoque) return new Map<string, { total: number; items: { id: string; quantidade: number }[] }>();
    const map = new Map<string, { total: number; items: { id: string; quantidade: number }[] }>();
    estoque.forEach((m) => {
      const key = m.especie.trim().toUpperCase();
      const existing = map.get(key) || { total: 0, items: [] };
      existing.total += m.quantidade;
      existing.items.push({ id: m.id, quantidade: m.quantidade });
      map.set(key, existing);
    });
    return map;
  }, [estoque]);

  const especiesDisponiveis = useMemo(() => {
    return Array.from(estoqueByEspecie.entries())
      .filter(([, v]) => v.total > 0)
      .map(([key, v]) => {
        // Use original casing from first item
        const original = estoque?.find((m) => m.especie.trim().toUpperCase() === key);
        return { especie: original?.especie || key, disponivel: v.total };
      });
  }, [estoqueByEspecie, estoque]);

  const selectedStock = especie ? estoqueByEspecie.get(especie.trim().toUpperCase()) : null;
  const maxQtd = selectedStock?.total || 0;

  const handleAdd = async () => {
    if (!especie.trim()) {
      toast.error("Selecione a espécie.");
      return;
    }
    const qtd = parseInt(quantidade);
    if (!quantidade || qtd <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    if (!faixa && !berma) {
      toast.error("Selecione a Faixa ou a Berma onde foram plantadas.");
      return;
    }
    if (qtd > maxQtd) {
      toast.error(`Estoque insuficiente. Disponível: ${maxQtd}`);
      return;
    }

    try {
      // 1. Register planting
      await addMuda.mutateAsync({
        especie: especie.trim(),
        quantidade: qtd,
        faixa: faixa || undefined,
        berma: berma ? parseInt(berma) : undefined,
        data_plantio: format(dataPlantio, "yyyy-MM-dd"),
      });

      // 2. Deduct from stock (FIFO)
      let remaining = qtd;
      const stockItems = selectedStock!.items;
      for (const item of stockItems) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, item.quantidade);
        await updateEstoque.mutateAsync({
          id: item.id,
          quantidade: item.quantidade - deduct,
        });
        remaining -= deduct;
      }

      toast.success("Muda plantada registrada e estoque atualizado!");
      setEspecie("");
      setQuantidade("");
      setFaixa("");
      setBerma("");
      setDataPlantio(new Date());
    } catch (error: any) {
      toast.error("Erro ao registrar: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este registro?")) return;
    try {
      await deleteMuda.mutateAsync(id);
      toast.success("Registro excluído!");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const totalMudas = mudas?.reduce((sum, m) => sum + m.quantidade, 0) || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Total de Mudas Plantadas:</span>
            <Badge variant="outline" className="border-green-500/50 text-green-500 font-semibold">
              {totalMudas.toLocaleString("pt-BR")} unidades
            </Badge>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Registrar Mudas Plantadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data do Plantio *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataPlantio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataPlantio ? format(dataPlantio, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataPlantio}
                      onSelect={(d) => d && setDataPlantio(d)}
                      initialFocus
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Espécie (do estoque) *</Label>
                <Select value={especie} onValueChange={(v) => { setEspecie(v); setQuantidade(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a espécie" />
                  </SelectTrigger>
                  <SelectContent>
                    {especiesDisponiveis.length === 0 ? (
                      <SelectItem value="__empty" disabled>Nenhuma espécie em estoque</SelectItem>
                    ) : (
                      especiesDisponiveis.map((e) => (
                        <SelectItem key={e.especie} value={e.especie}>
                          {e.especie} ({e.disponivel} disponíveis)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade * {maxQtd > 0 && <span className="text-muted-foreground text-xs">(máx: {maxQtd})</span>}</Label>
                <Input
                  type="number"
                  min="1"
                  max={maxQtd}
                  placeholder="Qtd"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Faixa</Label>
                <Select value={faixa} onValueChange={setFaixa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a faixa" />
                  </SelectTrigger>
                  <SelectContent>
                    {FAIXA_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Berma (pares 28-56)</Label>
                <Select value={berma} onValueChange={setBerma}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a berma" />
                  </SelectTrigger>
                  <SelectContent>
                    {BERMA_OPTIONS_EVEN.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleAdd} disabled={addMuda.isPending || updateEstoque.isPending} className="gap-2">
              {(addMuda.isPending || updateEstoque.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registros de Mudas Plantadas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !mudas?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Espécie</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Local</TableHead>
                    {canEdit && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mudas.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(parseISO(m.created_at), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{m.especie}</TableCell>
                      <TableCell className="text-right">{m.quantidade}</TableCell>
                      <TableCell className="text-xs">
                        {m.faixa && <Badge variant="secondary" className="mr-1">{m.faixa}</Badge>}
                        {m.berma && <Badge variant="outline">Berma {m.berma}</Badge>}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
  );
}
