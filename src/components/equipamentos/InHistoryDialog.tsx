import { useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEquipmentOutByDate } from "@/hooks/useEquipmentMovements";
import { useEquipment } from "@/hooks/useEquipment";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBrazilNorthTodayString } from "@/lib/timezone";

export function InHistoryDialog() {
  const [selectedDate, setSelectedDate] = useState(getBrazilNorthTodayString());
  const { data: equipment = [], isLoading: loadingEq } = useEquipment();
  const { data: equipmentOut = [], isLoading: loadingOut } = useEquipmentOutByDate(selectedDate);

  const isLoading = loadingEq || loadingOut;

  // Plates that are really out (same filter as the page)
  const platesOut = new Set(
    equipmentOut
      .filter(
        (m) =>
          m.exit_reason &&
          m.exit_reason !== "fim_turno" &&
          m.exit_reason !== "operando" &&
          m.exit_reason !== "aguardando_frente_servico"
      )
      .map((m) => m.plate)
  );

  const equipmentInYard = equipment.filter((eq) => !platesOut.has(eq.plate));

  const dateLabel = (() => {
    try {
      return format(new Date(selectedDate + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return selectedDate;
    }
  })();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Histórico</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-green-500" />
            Histórico - No Canteiro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium whitespace-nowrap">Data:</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-[200px]"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Equipamentos no canteiro em <strong>{dateLabel}</strong>
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : equipmentInYard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum equipamento no canteiro nesta data
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead className="hidden sm:table-cell">Motorista</TableHead>
                    <TableHead className="hidden sm:table-cell">Ajudante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipmentInYard.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell>
                        <VehicleIcon
                          type={eq.equipment_type as "pipa" | "munk" | "camionete" | "onibus"}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-sm">{eq.name}</TableCell>
                      <TableCell className="font-mono text-xs">{eq.plate}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{eq.driver || "-"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{eq.helper || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
