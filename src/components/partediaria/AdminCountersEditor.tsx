import { useState, useEffect } from "react";
import { Gauge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useShiftRecordByEquipment, useUpdateShiftRecord } from "@/hooks/useDailyShiftRecords";
import { toast } from "sonner";

interface AdminCountersEditorProps {
  equipmentId: string;
  equipmentName: string;
  /** Optional date override (yyyy-MM-dd). Defaults to today. */
  date?: string;
  /** If true, renders inline fields without Dialog wrapper */
  inline?: boolean;
  /** Callback after successful save */
  onSaved?: () => void;
}

export function AdminCountersEditor({ equipmentId, equipmentName, date, inline, onSaved }: AdminCountersEditorProps) {
  const [open, setOpen] = useState(false);
  const targetDate = date || new Date().toISOString().split("T")[0];
  const shouldFetch = inline || open;
  const { data: shiftRecord } = useShiftRecordByEquipment(shouldFetch ? equipmentId : null, targetDate);
  const updateShift = useUpdateShiftRecord();

  const [initialHorimeter, setInitialHorimeter] = useState("");
  const [finalHorimeter, setFinalHorimeter] = useState("");
  const [initialKm, setInitialKm] = useState("");
  const [finalKm, setFinalKm] = useState("");

  useEffect(() => {
    if (shiftRecord) {
      setInitialHorimeter(shiftRecord.initial_horimeter?.toString() ?? "");
      setFinalHorimeter(shiftRecord.final_horimeter?.toString() ?? "");
      setInitialKm(shiftRecord.initial_km?.toString() ?? "");
      setFinalKm(shiftRecord.final_km?.toString() ?? "");
    }
  }, [shiftRecord]);

  const handleSave = () => {
    if (!shiftRecord) {
      toast.error("Nenhum registro de turno encontrado para hoje");
      return;
    }

    updateShift.mutate(
      {
        id: shiftRecord.id,
        initial_horimeter: initialHorimeter ? Number(initialHorimeter) : undefined,
        final_horimeter: finalHorimeter ? Number(finalHorimeter) : undefined,
        initial_km: initialKm ? Number(initialKm) : undefined,
        final_km: finalKm ? Number(finalKm) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Horímetro e KM atualizados!");
          setOpen(false);
          onSaved?.();
        },
        onError: () => {
          toast.error("Erro ao atualizar valores");
        },
      }
    );
  };

  const fieldsContent = (
    <>
      {!shiftRecord ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum registro de turno encontrado{inline ? " para esta data" : " para hoje"}.
        </p>
      ) : (
        <div className="space-y-3 pt-2 overflow-hidden">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 min-w-0">
              <Label className="text-xs">Horímetro Ini.</Label>
              <Input
                type="number"
                value={initialHorimeter}
                onChange={(e) => setInitialHorimeter(e.target.value)}
                placeholder="0"
                className="text-sm h-8 px-2"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-xs">Horímetro Fin.</Label>
              <Input
                type="number"
                value={finalHorimeter}
                onChange={(e) => setFinalHorimeter(e.target.value)}
                placeholder="0"
                className="text-sm h-8 px-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 min-w-0">
              <Label className="text-xs">KM Inicial</Label>
              <Input
                type="number"
                value={initialKm}
                onChange={(e) => setInitialKm(e.target.value)}
                placeholder="0"
                className="text-sm h-8 px-2"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-xs">KM Final</Label>
              <Input
                type="number"
                value={finalKm}
                onChange={(e) => setFinalKm(e.target.value)}
                placeholder="0"
                className="text-sm h-8 px-2"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateShift.isPending} className="w-full" size="sm">
            {updateShift.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Gauge className="h-4 w-4 mr-2" />
            )}
            Salvar Correção
          </Button>
        </div>
      )}
    </>
  );

  if (inline) {
    return fieldsContent;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Corrigir Horímetro/KM">
          <Gauge className="h-4 w-4 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Corrigir Horímetro / KM — {equipmentName}</DialogTitle>
        </DialogHeader>
        {fieldsContent}
      </DialogContent>
    </Dialog>
  );
}
