import { useRecentMovements, EquipmentMovement, MovementType } from "@/hooks/useEquipmentMovements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownCircle, ArrowUpCircle, Clock, Loader2, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const EXIT_REASON_LABELS: Record<string, string> = {
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  operando: "Operando",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  fim_turno: "Fim de Turno",
};

export function RecentMovementsFeed() {
  const { data: movements = [], isLoading } = useRecentMovements(15);

  const formatDateTime = (date: string, time: string) => {
    try {
      return format(parseISO(`${date}T${time}`), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return `${date} ${time}`;
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Atividades Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {movements.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Nenhuma atividade registrada.</p>
            ) : (
              movements.map((m: any) => (
                <div key={m.id} className="relative pl-6 pb-2 border-l border-muted last:border-0 last:pb-0">
                  <div className={`absolute left-[-9px] top-0 p-1 rounded-full bg-background border ${m.movement_type === 'entrada' ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}>
                    {m.movement_type === 'entrada' ? <ArrowDownCircle className="h-3.5 w-3.5" /> : <ArrowUpCircle className="h-3.5 w-3.5" />}
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{m.equipment_name}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDateTime(m.movement_date, m.movement_time)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1 py-0 h-4 ${m.movement_type === 'entrada' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                      >
                        {m.movement_type === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                      <span className="text-[11px] font-mono text-muted-foreground">{m.plate}</span>
                    </div>

                    {m.movement_type === 'saida' && m.exit_reason && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Motivo: {EXIT_REASON_LABELS[m.exit_reason] || m.exit_reason}
                      </p>
                    )}

                    {m.previous_movement && (
                      <div className="mt-1 p-2 rounded bg-muted/30 border border-muted/50 flex items-start gap-2">
                        <Info className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                        <div className="text-[10px] text-muted-foreground">
                          <span className="font-medium text-blue-600">Última saída registrada:</span><br />
                          {formatDateTime(m.previous_movement.movement_date, m.previous_movement.movement_time)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
