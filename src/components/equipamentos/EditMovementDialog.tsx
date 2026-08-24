import { useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
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
import { useUpdateEquipmentMovement, type EquipmentMovement } from "@/hooks/useEquipmentMovements";

interface EditMovementDialogProps {
  movement: EquipmentMovement;
}

export function EditMovementDialog({ movement }: EditMovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(movement.movement_date);
  const [time, setTime] = useState(movement.movement_time.slice(0, 5));
  const updateMovement = useUpdateEquipmentMovement();

  const handleSave = () => {
    updateMovement.mutate(
      { id: movement.id, movement_date: date, movement_time: time },
      { onSuccess: () => setOpen(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v) {
        setDate(movement.movement_date);
        setTime(movement.movement_time.slice(0, 5));
      }
      setOpen(v);
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-base">
            Editar — {movement.equipment_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">Data</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hora</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="text-sm h-9"
            />
          </div>
          <Button onClick={handleSave} disabled={updateMovement.isPending} className="w-full" size="sm">
            {updateMovement.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
