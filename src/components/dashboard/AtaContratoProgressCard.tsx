import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAllMeetingMinuteItems } from "@/hooks/useMeetingMinutes";

export function AtaContratoProgressCard() {
  const { data: items = [], isLoading } = useAllMeetingMinuteItems();

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.completed).length;
    const pending = total - done;
    const pct = total ? (done / total) * 100 : 0;
    return { total, done, pending, pct };
  }, [items]);

  const data = [
    { name: "Concluídos", value: stats.done, color: "hsl(160 84% 39%)" },
    { name: "Pendentes", value: stats.pending, color: "hsl(25 95% 53%)" },
  ];

  return (
    <Card className="h-full overflow-hidden glass-card-dashboard">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Ata de Contrato</CardTitle>
          </div>
          <Link
            to="/ata-reuniao-contrato"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Ver <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <CardDescription className="text-xs">Itens da última ata importada</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">
            Carregando...
          </div>
        ) : stats.total === 0 ? (
          <div className="h-[140px] flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
            <FileText className="w-8 h-8 opacity-30" />
            Nenhuma ata importada
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-[120px] h-[120px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    innerRadius={36}
                    outerRadius={56}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold tabular-nums tracking-widest" style={{ fontFamily: "Brazil2026, sans-serif" }}>{stats.pct.toFixed(0)}%</span>
                <span className="text-[10px] text-muted-foreground">concluído</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: "hsl(160 84% 39%)" }} />
                <span className="text-xs text-muted-foreground flex-1">Concluídos</span>
                <Badge variant="outline" className="tabular-nums">{stats.done}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: "hsl(25 95% 53%)" }} />
                <span className="text-xs text-muted-foreground flex-1">Pendentes</span>
                <Badge variant="outline" className="tabular-nums">{stats.pending}</Badge>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t">
                <span className="text-xs text-muted-foreground flex-1">Total de itens</span>
                <Badge className="tabular-nums">{stats.total}</Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
