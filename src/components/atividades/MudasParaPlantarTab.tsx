import { useState } from "react";
import { Plus, Trash2, TreePine, Loader2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMudasParaPlantar, useAddMudaParaPlantar, useDeleteMudaParaPlantar, useUpdateMudaParaPlantar } from "@/hooks/useMudasParaPlantar";
import { useIsAdmin } from "@/hooks/useUserRole";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MudasParaPlantarTabProps {
  canEdit: boolean;
}

export default function MudasParaPlantarTab({ canEdit }: MudasParaPlantarTabProps) {
  const { data: mudas, isLoading } = useMudasParaPlantar();
  const addMuda = useAddMudaParaPlantar();
  const deleteMuda = useDeleteMudaParaPlantar();
  const updateMuda = useUpdateMudaParaPlantar();
  const { isAdmin } = useIsAdmin();

  const [especie, setEspecie] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQtd, setEditingQtd] = useState("");

  const handleAdd = async () => {
    if (!especie.trim()) {
      toast.error("Informe o nome da espécie.");
      return;
    }
    if (!quantidade || parseInt(quantidade) <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }

    try {
      await addMuda.mutateAsync({
        especie: especie.trim(),
        quantidade: parseInt(quantidade),
      });
      toast.success("Muda em estoque registrada com sucesso!");
      setEspecie("");
      setQuantidade("");
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

  const handleEditStart = (id: string, currentQtd: number) => {
    setEditingId(id);
    setEditingQtd(String(currentQtd));
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    const newQtd = parseInt(editingQtd);
    if (isNaN(newQtd) || newQtd < 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    try {
      await updateMuda.mutateAsync({ id: editingId, quantidade: newQtd });
      toast.success("Quantidade atualizada!");
      setEditingId(null);
      setEditingQtd("");
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingQtd("");
  };

  const totalMudas = mudas?.reduce((sum, m) => sum + m.quantidade, 0) || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2">
            <TreePine className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Total de Mudas em Estoque:</span>
            <Badge variant="outline" className="border-amber-500/50 text-amber-500 font-semibold">
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
              Registrar Mudas Recebidas (Estoque)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Espécie *</Label>
                <Input placeholder="Ex: Ipê Amarelo" value={especie} onChange={(e) => setEspecie(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input type="number" min="1" placeholder="Qtd" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAdd} disabled={addMuda.isPending} className="gap-2">
              {addMuda.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mudas em Estoque</CardTitle>
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
                    {(canEdit || isAdmin) && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mudas.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(parseISO(m.created_at), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{m.especie}</TableCell>
                      <TableCell className="text-right">
                        {editingId === m.id ? (
                          <Input
                            type="number"
                            min="0"
                            value={editingQtd}
                            onChange={(e) => setEditingQtd(e.target.value)}
                            className="w-20 h-7 text-right ml-auto"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave();
                              if (e.key === "Escape") handleEditCancel();
                            }}
                            autoFocus
                          />
                        ) : (
                          m.quantidade
                        )}
                      </TableCell>
                      {(canEdit || isAdmin) && (
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            {editingId === m.id ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={handleEditSave} disabled={updateMuda.isPending}>
                                  {updateMuda.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleEditCancel}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                {isAdmin && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEditStart(m.id, m.quantidade)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
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
