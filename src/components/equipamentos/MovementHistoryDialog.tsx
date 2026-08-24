import { useState } from "react";
import { History, ArrowDownCircle, ArrowUpCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAllEquipmentMovements } from "@/hooks/useEquipmentMovements";
import { useIsAdmin } from "@/hooks/useUserRole";
import { EditMovementDialog } from "./EditMovementDialog";

const EXIT_REASON_LABELS: Record<string, string> = {
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  operando: "Operando",
  aguardando_frente_servico: "Aguardando Frente",
  fim_turno: "Fim de Turno",
};

const ITEMS_PER_PAGE = 20;

export function MovementHistoryDialog() {
  const [open, setOpen] = useState(false);
  const { data: movements = [], isLoading } = useAllEquipmentMovements();
  const { isAdmin } = useIsAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = movements.filter((m) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      m.equipment_name.toLowerCase().includes(q) ||
      m.plate.toLowerCase().includes(q) ||
      (m.observation || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <History className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Histórico de Entrada/Saída</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Entrada e Saída
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por equipamento ou placa..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Search className="h-10 w-10 opacity-30" />
              <p>Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Tipo</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead className="hidden sm:table-cell">Placa</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="hidden md:table-cell">Motivo</TableHead>
                   <TableHead className="hidden lg:table-cell">Observação</TableHead>
                   {isAdmin && <TableHead className="w-10"></TableHead>}
                 </TableRow>
               </TableHeader>
              <TableBody>
                {paginated.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {m.movement_type === "entrada" ? (
                        <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                          <ArrowDownCircle className="h-3 w-3" />
                          Entrada
                        </Badge>
                      ) : (
                        <Badge className="gap-1 bg-red-500/10 text-red-600 border-red-500/20">
                          <ArrowUpCircle className="h-3 w-3" />
                          Saída
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {m.equipment_name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">
                      {m.plate}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(m.movement_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      <span className="text-muted-foreground ml-1">
                        {m.movement_time.slice(0, 5)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {m.exit_reason
                        ? EXIT_REASON_LABELS[m.exit_reason] || m.exit_reason
                        : "-"}
                    </TableCell>
                     <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                       {m.observation || m.problem_description || "-"}
                     </TableCell>
                     {isAdmin && (
                       <TableCell>
                         <EditMovementDialog movement={m} />
                       </TableCell>
                     )}
                   </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              {filtered.length} registros · Página {currentPage}/{totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
