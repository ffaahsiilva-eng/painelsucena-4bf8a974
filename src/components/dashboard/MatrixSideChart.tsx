// @ts-nocheck
import { useEffect, useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBrazilNorthMonthYear } from "@/lib/timezone";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBrazilNorthDate } from "@/lib/timezone";
import { Skeleton } from "@/components/ui/skeleton";

const cargoDefinitions = [
  { id: "preposto", cargo: "Preposto", tarefas: ["p1", "p2", "p3", "p4", "p5"] },
  { id: "encarregado-geral", cargo: "Enc. Geral", tarefas: ["eg1", "eg2", "eg3"] },
  { id: "encarregado-i", cargo: "Enc. I", tarefas: ["e1-1", "e1-2", "e1-3"] },
  { id: "encarregado-ii", cargo: "Enc. II", tarefas: ["e2-1", "e2-2", "e2-3"] },
  { id: "tecnico-seguranca-i", cargo: "Téc. Seg. I", tarefas: ["ts1-1", "ts1-2", "ts1-3", "ts1-4", "ts1-5", "ts1-6"] },
  { id: "tecnico-seguranca-ii", cargo: "Téc. Seg. II", tarefas: ["ts2-1", "ts2-2", "ts2-3", "ts2-4", "ts2-5", "ts2-6"] },
];

export function MatrixSideChart() {
  const [overallProgress, setOverallProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [progressByRole, setProgressByRole] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const monthYear = getBrazilNorthMonthYear();
        const [{ data: completions, error }, { data: custom }, { data: hidden }] = await Promise.all([
          supabase.from("matrix_task_completions").select("task_id").eq("month_year", monthYear),
          supabase.from("matrix_custom_tasks").select("id, cargo_id"),
          supabase.from("matrix_hidden_tasks").select("task_id"),
        ]);
        if (error) throw error;

        const completedIds = new Set(completions?.map((d) => d.task_id) || []);
        const hiddenSet = new Set((hidden || []).map((h: any) => h.task_id));

        const folders = cargoDefinitions.map((c) => {
          const extraIds = (custom || [])
            .filter((ct: any) => ct.cargo_id === c.id)
            .map((ct: any) => ct.id);
          return { ...c, tarefas: [...c.tarefas.filter((t) => !hiddenSet.has(t)), ...extraIds] };
        });

        const totalTasks = folders.reduce((s, c) => s + c.tarefas.length, 0);
        const completedTasks = folders.reduce(
          (s, c) => s + c.tarefas.filter((t) => completedIds.has(t)).length,
          0
        );

        setOverallProgress(totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

        setProgressByRole(
          folders.map((c) => ({
            name: c.cargo,
            value: c.tarefas.length === 0 ? 0 : Math.round(
              (c.tarefas.filter((t) => completedIds.has(t)).length / c.tarefas.length) * 100
            ),
          }))
        );
      } catch {
        console.error("Error fetching matrix data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProgress();
  }, []);

  const currentMonth = format(getBrazilNorthDate(), "MMMM", { locale: ptBR });

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5 glass-card-dashboard">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 animate-fade-in glass-card-dashboard">
      <h3 className="text-lg font-bold capitalize mb-1">Matriz em {currentMonth}</h3>
      <p className="text-xs text-muted-foreground mb-4">Progresso por cargo</p>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={progressByRole} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 9 }}
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 14, fontFamily: "Brazil2026, sans-serif", letterSpacing: '0.08em' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
              }}
              formatter={(value: number) => [`${value}%`, "Progresso"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom stats */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium tracking-widest" style={{ fontFamily: "Brazil2026, sans-serif" }}>{overallProgress}%</span>
          <span className="text-xs text-muted-foreground">concluído</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-4 h-4 text-destructive" />
          <span className="text-sm font-medium tracking-widest" style={{ fontFamily: "Brazil2026, sans-serif" }}>{100 - overallProgress}%</span>
          <span className="text-xs text-muted-foreground">pendente</span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-3 italic">
        Atualizado diariamente
      </p>
    </div>
  );
}
