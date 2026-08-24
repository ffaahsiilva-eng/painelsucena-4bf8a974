import { useState } from "react";
import { History, Search, ExternalLink } from "lucide-react";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBrazilNorthTodayString } from "@/lib/timezone";

const EXIT_REASON_LABELS: Record<string, string> = {
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  operando: "Operando",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  fim_turno: "Fim de Turno",
};

const EXIT_REASON_COLORS: Record<string, string> = {
  manutencao_corretiva: "bg-red-500/10 text-red-600 border-red-500/30",
  manutencao_preventiva: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  vistoria: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
};

export function OutHistoryDialog() {
  const [selectedDate, setSelectedDate] = useState(getBrazilNorthTodayString());
  const { data: equipmentOut = [], isLoading } = useEquipmentOutByDate(selectedDate);

  // Filter only real "out" reasons
  const reallyOut = equipmentOut.filter(
    (m) =>
      m.exit_reason &&
      m.exit_reason !== "fim_turno" &&
      m.exit_reason !== "operando" &&
      m.exit_reason !== "aguardando_frente_servico"
  );

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
            <History className="h-5 w-5 text-orange-500" />
            Histórico - Fora da Obra
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
            Equipamentos fora da obra em <strong>{dateLabel}</strong>
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : reallyOut.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum equipamento fora da obra nesta data
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Data/Hora Saída</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="hidden sm:table-cell">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reallyOut.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-sm">{m.equipment_name}</TableCell>
                      <TableCell className="font-mono text-xs">{m.plate}</TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(m.movement_date + "T" + m.movement_time), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={EXIT_REASON_COLORS[m.exit_reason || ""] || "bg-muted text-muted-foreground"}
                        >
                          {EXIT_REASON_LABELS[m.exit_reason || ""] || m.exit_reason || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        {m.problem_description || m.observation || "-"}
                      </TableCell>
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
