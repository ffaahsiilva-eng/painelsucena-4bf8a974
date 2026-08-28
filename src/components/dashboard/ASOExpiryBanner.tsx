import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import asoIcon from "@/assets/aso-icon.png.asset.json";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { getEffectiveAsoExpiry, getEffectiveAsoExpiryStr } from "@/lib/asoValidity";

interface ExpiringASO {
  colaboradorNome: string;
  validade: string;
  diasRestantes: number;
}

export function ASOExpiryBanner() {
  const { data: rhData } = useRHEfetivo();

  const expiringAsos = useMemo<ExpiringASO[]>(() => {
    if (!rhData?.colaboradores) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results: ExpiringASO[] = [];

    for (const colab of rhData.colaboradores) {
      const vencDate = getEffectiveAsoExpiry(colab.aso, colab.admissao);
      const vencStr = getEffectiveAsoExpiryStr(colab.aso, colab.admissao);
      if (!vencDate || !vencStr) continue;

      const diffTime = vencDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 15 && diffDays >= 0) {
        results.push({
          colaboradorNome: colab.nome,
          validade: vencStr,
          diasRestantes: diffDays,
        });
      }
    }

    return results.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [rhData]);

  if (expiringAsos.length === 0) return null;

  return (
    <div className="mb-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <img loading="lazy" decoding="async" src={asoIcon.url} alt="ASO" className="h-6 w-6 object-contain" />
        <h3 className="font-semibold text-lg expiry-neon-title">ASOs a Vencer</h3>
        <Badge variant="destructive">{expiringAsos.length}</Badge>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 px-2 pt-3 pb-4">
          {expiringAsos.map((item, idx) => {
            const isUrgent = item.diasRestantes <= 3;
            return (
              <Card
                key={`${item.colaboradorNome}-aso-${idx}`}
                className="expiry-neon-card min-w-[280px] max-w-[320px] glass-card-dashboard"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate !text-slate-900 dark:!text-white">{item.colaboradorNome}</p>
                      <Badge variant="secondary" className="text-xs mt-1 !bg-slate-700 !text-white border-none">
                        ASO
                      </Badge>
                    </div>
                    <AlertTriangle
                      className={`h-5 w-5 flex-shrink-0 ${
                        isUrgent ? "text-red-500 animate-pulse" : "text-orange-500"
                      }`}
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={isUrgent ? "destructive" : "secondary"} className={!isUrgent ? "!bg-slate-700 !text-white border-none" : ""}>
                      {item.diasRestantes === 0
                        ? "Vence hoje!"
                        : item.diasRestantes === 1
                        ? "Vence amanhã"
                        : `${item.diasRestantes} dias`}
                    </Badge>
                    <span className="text-xs text-muted-foreground dark:!text-slate-300">
                      {item.validade}
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
