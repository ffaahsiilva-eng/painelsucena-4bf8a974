import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAllMeetingMinuteItems } from "@/hooks/useMeetingMinutes";
import { GlassCard } from "./GlassCard";

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
    <div className="h-full">
      <GlassCard className="flex flex-col h-full p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#B38A45]" />
            <span className="text-[13px] font-semibold text-[#6D7175] uppercase tracking-widest">
              Ata de Contrato
            </span>
          </div>
          <Link
            to="/ata-reuniao-contrato"
            className="text-xs font-semibold text-[#B38A45] hover:text-[#D8B16B] transition-colors flex items-center gap-1"
          >
            Ver <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-xs font-medium text-[#92969A] mb-4">Itens da última ata importada</p>
        
        <div className="flex-1">
          {isLoading ? (
            <div className="h-[140px] flex items-center justify-center text-xs font-medium text-[#92969A]">
              Carregando...
            </div>
          ) : stats.total === 0 ? (
            <div className="h-[140px] flex flex-col items-center justify-center text-xs font-medium text-[#92969A] gap-2">
              <FileText className="w-8 h-8 opacity-30" />
              Nenhuma ata importada
            </div>
          ) : (
            <div className="flex items-center gap-6 h-full mt-2">
              <div className="w-[140px] h-[140px] relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      innerRadius={45}
                      outerRadius={65}
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
                        background: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid rgba(0, 0, 0, 0.1)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#292C2E",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      }}
                      itemStyle={{ color: "#292C2E", fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-extrabold tabular-nums tracking-widest text-[#292C2E]" style={{ fontFamily: "Brazil2026, sans-serif" }}>
                    {stats.pct.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-[#92969A] uppercase tracking-wider font-semibold">concluído</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-3 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(160 84% 39%)" }} />
                    <span className="text-sm font-medium text-[#6D7175]">Concluídos</span>
                  </div>
                  <span className="font-bold text-[#292C2E] text-sm tabular-nums">{stats.done}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(25 95% 53%)" }} />
                    <span className="text-sm font-medium text-[#6D7175]">Pendentes</span>
                  </div>
                  <span className="font-bold text-[#292C2E] text-sm tabular-nums">{stats.pending}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-black/5">
                  <span className="text-sm font-semibold text-[#292C2E]">Total de itens</span>
                  <span className="font-extrabold text-[#292C2E] text-base tabular-nums">{stats.total}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
