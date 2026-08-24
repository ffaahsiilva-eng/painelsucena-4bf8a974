import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, User, Truck, MapPin, X, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInventoryMovements, InventoryItem } from "@/hooks/useInventory";

interface MovementHistoryDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getMovementIcon = (type: string) => {
  switch (type) {
    case "entrada":
      return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
    case "saida":
      return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
    case "ajuste":
      return <RefreshCw className="h-4 w-4 text-yellow-500" />;
    default:
      return null;
  }
};

const getMovementLabel = (type: string) => {
  switch (type) {
    case "entrada":
      return "Entrada";
    case "saida":
      return "Saída";
    case "ajuste":
      return "Ajuste";
    default:
      return type;
  }
};

const getDestinationIcon = (type: string | null) => {
  switch (type) {
    case "employee":
      return <User className="h-3 w-3" />;
    case "equipment":
      return <Truck className="h-3 w-3" />;
    case "gabiao":
    case "jardinagem":
      return <MapPin className="h-3 w-3" />;
    case "descarte":
      return <Trash2 className="h-3 w-3" />;
    default:
      return null;
  }
};

const getDestinationLabel = (type: string | null) => {
  switch (type) {
    case "employee":
      return "Funcionário";
    case "equipment":
      return "Equipamento";
    case "gabiao":
      return "Gabião";
    case "jardinagem":
      return "Jardinagem";
    case "descarte":
      return "Descarte";
    default:
      return null;
  }
};

export function MovementHistoryDialog({ item, open, onOpenChange }: MovementHistoryDialogProps) {
  const { data: movements, isLoading } = useInventoryMovements(item?.id);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Movimentações</DialogTitle>
        </DialogHeader>
        
        <div className="bg-muted/50 p-3 rounded-lg mb-4">
          <p className="font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            Quantidade atual: <span className="font-semibold">{item.quantity} {item.unit}</span>
          </p>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : movements && movements.length > 0 ? (
            <div className="space-y-3">
              {movements.map((movement) => (
                <div
                  key={movement.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getMovementIcon(movement.movement_type)}
                      <span className="font-medium">
                        {getMovementLabel(movement.movement_type)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {movement.quantity} {item.unit}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <span>{movement.previous_quantity}</span>
                    <span className="mx-2">→</span>
                    <span className="font-medium text-foreground">{movement.new_quantity}</span>
                    <span className="ml-1">{item.unit}</span>
                  </div>

                  {movement.destination_type && movement.destination_name && (
                    <div className="flex items-center gap-2 text-sm">
                      {getDestinationIcon(movement.destination_type)}
                      <span className="text-muted-foreground">
                        {getDestinationLabel(movement.destination_type)}:
                      </span>
                      <span className="font-medium">{movement.destination_name}</span>
                    </div>
                  )}

                  {movement.reason && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Motivo:</span> {movement.reason}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Por: {movement.moved_by_name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
