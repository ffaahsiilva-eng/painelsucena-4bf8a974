import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ABSENCE_REASONS,
  useUpsertAbsence,
  type AbsenceReason as AbsenceReasonType,
} from "@/hooks/useAbsenceReasons";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD (first day of absence)
  initialReason?: string;
  initialDays?: number;
  initialCid?: string;
  initialNotes?: string;
  onSaved?: () => void;
}

export const AbsenceReasonDialog = ({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  date,
  initialReason,
  initialDays,
  initialCid,
  initialNotes,
  onSaved,
}: Props) => {
  const [reason, setReason] = useState<string>(initialReason ?? "Falta");
  const [days, setDays] = useState<number>(initialDays ?? 1);
  const [cid, setCid] = useState<string>(initialCid ?? "");
  const [notes, setNotes] = useState<string>(initialNotes ?? "");
  const save = useUpsertAbsence();

  useEffect(() => {
    if (open) {
      setReason(initialReason ?? "Falta");
      setDays(initialDays ?? 1);
      setCid(initialCid ?? "");
      setNotes(initialNotes ?? "");
    }
  }, [open, initialReason, initialDays, initialCid, initialNotes]);

  const isAtestado = reason === "Atestado";
  const showDays = isAtestado || reason === "Afastado" || reason === "INSS";

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        employeeKey: employeeId,
        date,
        reason: reason as AbsenceReasonType,
        daysCount: showDays ? Math.max(1, days) : 1,
        cid: cid.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success(
        showDays && days > 1
          ? `${reason} registrado para ${days} dias corridos`
          : `${reason} registrado`
      );
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar motivo da falta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Motivo da falta</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{employeeName}</span>
            <br />
            Data inicial: {new Date(date + "T00:00:00").toLocaleDateString("pt-BR")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ABSENCE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showDays && (
            <div>
              <Label>Quantos dias?</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value || "1", 10))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Os próximos {days} dias corridos serão preenchidos automaticamente.
              </p>
            </div>
          )}

          {isAtestado && (
            <div>
              <Label>CID (opcional)</Label>
              <Input
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                placeholder="Ex: M54.5"
              />
            </div>
          )}

          <div>
            <Label>Observação (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Detalhes adicionais"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
