import { useMemo } from "react";
import { Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { usePlanejamentoMetas } from "@/hooks/usePlanejamentoMetas";
import { cn } from "@/lib/utils";

// Linhas do planejamento que pertencem ao escopo de Jardinagem (replantio + manutenção DRS)
const JARDINAGEM_LINHAS = [50, 60, 70, 80, 100, 110, 120, 130, 140];

function pct(realizado: number, meta: number) {
  if (!meta || meta <= 0) return 0;
  return Math.min(100, (realizado / meta) * 100);
}

function tone(p: number) {
  if (p >= 100) return "text-emerald-600";
  if (p >= 50) return "text-amber-600";
  if (p > 0) return "text-orange-600";
  return "text-muted-foreground";
}

interface MetasSummaryProps {
  linhas?: number[];
  title?: string;
  iconColor?: string;
  borderColor?: string;
}

export function JardinagemMetasSummary({
  linhas = JARDINAGEM_LINHAS,
  title = "Metas do mês — Jardinagem",
  iconColor = "text-green-600",
  borderColor = "border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5",
}: MetasSummaryProps = {}) {
  const { data: metas = [], isLoading } = usePlanejamentoMetas();

  const items = useMemo(
    () =>
      metas.filter(
        (m) => !m.is_section_header && m.linha !== null && linhas.includes(m.linha) && m.meta > 0
      ),
    [metas, linhas]
  );

  const overall = useMemo(() => {
    if (items.length === 0) return 0;
    const totalMeta = items.reduce((s, m) => s + m.meta, 0);
    const totalReal = items.reduce((s, m) => s + Math.min(m.realizado, m.meta), 0);
    return totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;
  }, [items]);

  if (isLoading || items.length === 0) return null;

  return (
    <Card className={borderColor}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Target className={cn("h-4 w-4", iconColor)} />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <TrendingUp className={cn("h-4 w-4", iconColor)} />
            <span className={cn("text-sm font-bold tabular-nums", tone(overall))}>
              {overall.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.map((m) => {
          const p = pct(m.realizado, m.meta);
          const completed = p >= 100;
          return (
            <div key={m.id} className="space-y-1">
              <div className="flex items-start justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Badge variant="outline" className="font-mono text-[10px] h-4 px-1 shrink-0">
                    {m.linha}
                  </Badge>
                  <span className="truncate font-medium" title={m.atividade}>
                    {m.atividade}
                  </span>
                </div>
                <span className="text-muted-foreground tabular-nums shrink-0">
                  <span className="font-semibold text-foreground">
                    {m.realizado.toLocaleString("pt-BR")}
                  </span>
                  {" / "}
                  {m.meta.toLocaleString("pt-BR")}
                  {m.unidade ? ` ${m.unidade}` : ""}
                  {completed && (
                    <Badge className="ml-1.5 h-4 px-1 bg-emerald-500/15 text-emerald-700 border-emerald-300 text-[9px]">
                      OK
                    </Badge>
                  )}
                </span>
              </div>
              <Progress value={p} className="h-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default JardinagemMetasSummary;
