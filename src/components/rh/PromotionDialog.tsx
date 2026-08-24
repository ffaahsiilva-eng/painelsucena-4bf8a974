import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, History, TrendingUp } from "lucide-react";
import { funcoes, type Colaborador, type Promocao } from "@/data/efetivoData";

interface PromotionDialogProps {
  colaborador: Colaborador;
  onPromote: (id: number, novaFuncao: string, observacao: string) => void;
}

export const PromotionDialog = ({ colaborador, onPromote }: PromotionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [novaFuncao, setNovaFuncao] = useState("");
  const [observacao, setObservacao] = useState("");

  const handleSubmit = () => {
    if (!novaFuncao || novaFuncao === colaborador.funcao) return;
    onPromote(colaborador.id, novaFuncao, observacao);
    setNovaFuncao("");
    setObservacao("");
    setOpen(false);
  };

  const promocoes = colaborador.promocoes || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Promoção / Troca de Função"
          onClick={(e) => e.stopPropagation()}
        >
          <TrendingUp className="h-4 w-4 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Promoção / Troca de Função
          </DialogTitle>
          <DialogDescription>
            Altere a função de <strong>{colaborador.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <div>
              <p className="text-xs text-muted-foreground">Função Atual</p>
              <Badge variant="outline" className="mt-1">{colaborador.funcao}</Badge>
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Nova Função</p>
              <Select value={novaFuncao} onValueChange={setNovaFuncao}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a nova função" />
                </SelectTrigger>
                <SelectContent>
                  {funcoes.filter(f => f !== colaborador.funcao).map((funcao) => (
                    <SelectItem key={funcao} value={funcao}>{funcao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              placeholder="Motivo da promoção ou troca de função..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
            />
          </div>

          {/* Histórico de promoções */}
          {promocoes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <History className="h-4 w-4" />
                Histórico de Promoções
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {[...promocoes].reverse().map((p, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-md bg-muted/30 border text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-primary">{p.data}</p>
                      <p className="text-muted-foreground">
                        <span className="line-through">{p.funcaoAnterior}</span>
                        {" → "}
                        <span className="font-medium text-foreground">{p.funcaoNova}</span>
                      </p>
                      {p.observacao && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">"{p.observacao}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!novaFuncao || novaFuncao === colaborador.funcao}>
            Confirmar Promoção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
