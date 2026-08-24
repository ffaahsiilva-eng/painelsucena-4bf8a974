import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save, Wrench, Trash2 } from "lucide-react";

type ConsertoRecord = {
  id: string;
  report_date: string;
  environment: string;
  count: number;
  notes: string | null;
  created_at: string;
  created_by_name: string | null;
};

export default function AspersoresConsertosTab() {
  const { environment } = useEnvironment();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [count, setCount] = useState("");
  const [notes, setNotes] = useState("");
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time (Para)

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["aspersores-consertos", environment],
    queryFn: async () => {
      if (!environment) return [];
      const { data, error } = await supabase
        .from("aspersores_consertos" as any)
        .select("*")
        .eq("environment", environment)
        .order("report_date", { ascending: false });
      if (error) throw error;
      return data as ConsertoRecord[];
    },
    enabled: !!environment,
  });

  const saveConserto = useMutation({
    mutationFn: async () => {
      if (!count || isNaN(Number(count))) throw new Error("Quantidade inválida");
      if (!user?.id) throw new Error("Usuário não autenticado");
      if (!environment) throw new Error("Ambiente não selecionado");
      
      // Get profile name without failing if user data is missing (profile might be in cache)
      // Using user_id instead of id since profiles table uses user_id as the unique auth reference
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .maybeSingle();

      const { error } = await supabase
        .from("aspersores_consertos" as any)
        .insert({
          environment,
          report_date: todayStr,
          count: Number(count),
          notes: notes || null,
          created_by: user?.id,
          created_by_name: profile?.full_name || user?.email || "Usuário"
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conserto registrado!");
      setCount("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["aspersores-consertos", environment] });
    },
    onError: (err: any) => {
      console.error("AspersoresConsertosTab save error:", err);
      toast.error("Erro ao salvar: " + (err.message || "Falha na conexão"));
    },
  });

  const deleteConserto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("aspersores_consertos" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido");
      qc.invalidateQueries({ queryKey: ["aspersores-consertos", environment] });
    },
    onError: (err: any) => toast.error("Erro ao remover: " + err.message)
  });

  return (
    <div className="space-y-6">
      <Card className="bg-card/40 border-border/40">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-[#c9a84c]" />
            Registrar Conserto de Aspersor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Quantidade Consertada</Label>
              <Input
                type="number"
                min="1"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="Ex: 5"
                className="bg-background/50"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Observações (Opcional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Trocado bocal da Berma 28"
                className="bg-background/50"
              />
            </div>
            <Button 
              onClick={() => saveConserto.mutate()}
              disabled={saveConserto.isPending || !count}
              className="bg-[#c9a84c] hover:bg-[#b09340] text-[#1a1a1a] font-bold"
            >
              {saveConserto.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Registrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Consertos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      Nenhum conserto registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>{new Date(rec.report_date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-bold text-[#c9a84c]">{rec.count}</TableCell>
                      <TableCell className="text-sm">{rec.created_by_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rec.notes || "—"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          onClick={() => {
                            if (confirm("Deseja realmente excluir este registro?")) {
                              deleteConserto.mutate(rec.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
