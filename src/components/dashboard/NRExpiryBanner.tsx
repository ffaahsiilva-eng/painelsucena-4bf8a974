import { useMemo } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";

interface ExpiringNr {
  colaboradorNome: string;
  nr: string;
  vencimento: string;
  diasRestantes: number;
}

function parseDateBR(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (isNaN(d.getTime())) return null;
  return d;
}

export function NRExpiryBanner() {
  const { data: rhData } = useRHEfetivo();

  const expiringNrs = useMemo<ExpiringNr[]>(() => {
    if (!rhData?.colaboradores) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results: ExpiringNr[] = [];

    for (const colab of rhData.colaboradores) {
      if (!colab.nrDates) continue;
      for (const [nr, dates] of Object.entries(colab.nrDates)) {
        if (!dates.vencimento) continue;
        const vencDate = parseDateBR(dates.vencimento);
        if (!vencDate) continue;

        const diffTime = vencDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 10 && diffDays >= 0) {
          results.push({
            colaboradorNome: colab.nome,
            nr,
            vencimento: dates.vencimento,
            diasRestantes: diffDays,
          });
        }
      }
    }

    return results.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [rhData]);

  if (expiringNrs.length === 0) return null;

  return (
    <div className="mb-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-5 w-5 text-red-500" />
        <h3 className="font-semibold text-lg expiry-neon-title">NRs a Vencer</h3>
        <Badge variant="destructive">{expiringNrs.length}</Badge>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {expiringNrs.map((item, idx) => {
            const isUrgent = item.diasRestantes <= 3;
            return (
              <Card
                key={`${item.colaboradorNome}-${item.nr}-${idx}`}
                className="expiry-neon-card min-w-[280px] max-w-[320px] glass-card-dashboard"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.colaboradorNome}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {item.nr}
                      </Badge>
                    </div>
                    <AlertTriangle
                      className={`h-5 w-5 flex-shrink-0 ${
                        isUrgent ? "text-red-500 animate-pulse" : "text-orange-500"
                      }`}
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={isUrgent ? "destructive" : "secondary"}>
                      {item.diasRestantes === 0
                        ? "Vence hoje!"
                        : item.diasRestantes === 1
                        ? "Vence amanhã"
                        : `${item.diasRestantes} dias`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.vencimento}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
