import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useUserRole";

export const ManageNrCatalogDialog = ({ children }: { children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [newNrCode, setNewNrCode] = useState("");
  const [newNrName, setNewNrName] = useState("");
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();

  const { data: nrs, isLoading } = useQuery({
    queryKey: ["nr_catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr_catalog")
        .select("*")
        .order("nr_code", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newNrCode || !newNrName) throw new Error("Campos obrigatórios");
      const { error } = await supabase.from("nr_catalog").insert({
        nr_code: newNrCode.toUpperCase().trim(),
        nr_name: newNrName.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nr_catalog"] });
      setNewNrCode("");
      setNewNrName("");
      toast.success("NR adicionada ao catálogo");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar NR");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nr_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nr_catalog"] });
      toast.success("NR removida do catálogo");
    },
  });

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            Gerenciar Catálogo NRs
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Catálogo de Treinamentos (NRs)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2 p-3 border rounded-lg bg-muted/30">
            <Label className="text-sm">Nova NR</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Código (Ex: NR-38)"
                value={newNrCode}
                onChange={(e) => setNewNrCode(e.target.value)}
                className="w-1/3"
              />
              <Input
                placeholder="Nome/Descrição"
                value={newNrName}
                onChange={(e) => setNewNrName(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={() => addMutation.mutate()} 
                disabled={addMutation.isPending}
                size="icon"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <p className="text-center py-4 text-muted-foreground text-sm">Carregando...</p>
            ) : nrs?.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">Nenhuma NR cadastrada</p>
            ) : (
              nrs?.map((nr) => (
                <div key={nr.id} className="flex items-center justify-between p-2 border rounded hover:bg-accent/50 group">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{nr.nr_code}</span>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{nr.nr_name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => {
                      if (confirm("Deseja remover esta NR do catálogo?")) {
                        deleteMutation.mutate(nr.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
