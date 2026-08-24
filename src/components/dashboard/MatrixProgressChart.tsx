// @ts-nocheck
import { useEffect, useState, useMemo } from "react";
import { format, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { AlertTriangle, TrendingUp, PieChartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getBrazilNorthDate, getBrazilNorthMonthYear } from "@/lib/timezone";

interface CargoProgress {
  cargo: string;
  cargoId: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
}

// Cargo definitions with their tasks (same as Matriz page)
const cargoDefinitions = [
  {
    id: "preposto",
    cargo: "Preposto",
    tarefas: ["p1", "p2", "p3", "p4", "p5"],
  },
  {
    id: "encarregado-geral",
    cargo: "Enc. Geral",
    tarefas: ["eg1", "eg2", "eg3"],
  },
  {
    id: "encarregado-i",
    cargo: "Enc. I",
    tarefas: ["e1-1", "e1-2", "e1-3"],
  },
  {
    id: "encarregado-ii",
    cargo: "Enc. II",
    tarefas: ["e2-1", "e2-2", "e2-3"],
  },
  {
    id: "tecnico-seguranca-i",
    cargo: "Téc. Seg. I",
    tarefas: ["ts1-1", "ts1-2", "ts1-3", "ts1-4", "ts1-5", "ts1-6"],
  },
  {
    id: "tecnico-seguranca-ii",
    cargo: "Téc. Seg. II",
    tarefas: ["ts2-1", "ts2-2", "ts2-3", "ts2-4", "ts2-5", "ts2-6"],
  },
];

const cargoColors: Record<string, string> = {
  "preposto": "#3B82F6",
  "encarregado-geral": "#8B5CF6",
  "encarregado-i": "#F97316",
  "encarregado-ii": "#22C55E",
  "tecnico-seguranca-i": "#EF4444",
  "tecnico-seguranca-ii": "#F43F5E",
};

export function MatrixProgressChart() {
  const [progressData, setProgressData] = useState<CargoProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllProgress = async () => {
      try {
        const monthYear = getBrazilNorthMonthYear();
        
        // Fetch all completions for this month
        const { data, error } = await supabase
          .from("matrix_task_completions")
          .select("task_id, user_id")
          .eq("month_year", monthYear);

        if (error) throw error;

        const completedTaskIds = new Set(data?.map((item) => item.task_id) || []);

        // Calculate progress for each cargo
        const progress: CargoProgress[] = cargoDefinitions.map((cargo) => {
          const completedCount = cargo.tarefas.filter((taskId) => 
            completedTaskIds.has(taskId)
          ).length;
          
          return {
            cargo: cargo.cargo,
            cargoId: cargo.id,
            totalTasks: cargo.tarefas.length,
            completedTasks: completedCount,
            progress: Math.round((completedCount / cargo.tarefas.length) * 100),
          };
        });

        setProgressData(progress);
      } catch (error) {
        console.error("Error fetching matrix progress:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllProgress();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  const currentMonth = format(getBrazilNorthDate(), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">

      {/* Charts Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Progress by Role */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold">Progresso por Cargo - {currentMonth}</h3>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={progressData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontFamily: "Brazil2026, sans-serif", fontSize: 16, letterSpacing: '0.08em' }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  type="category" 
                  dataKey="cargo" 
                  width={80}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value}% (${props.payload.completedTasks}/${props.payload.totalTasks} tarefas)`,
                    "Progresso"
                  ]}
                />
                <Bar 
                  dataKey="progress" 
                  radius={[0, 4, 4, 0]}
                  maxBarSize={40}
                >
                  {progressData.map((entry) => (
                    <Cell 
                      key={entry.cargoId} 
                      fill={entry.progress === 100 ? "#22C55E" : cargoColors[entry.cargoId] || "#6B7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Concluído (100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm text-muted-foreground">Em progresso</span>
            </div>
          </div>
        </div>

        {/* Pie Chart - Overall Completion */}
        <PieChartSection progressData={progressData} />
      </div>
    </div>
  );
}

interface PieChartSectionProps {
  progressData: CargoProgress[];
}

function PieChartSection({ progressData }: PieChartSectionProps) {
  const pieData = useMemo(() => {
    const totalTasks = progressData.reduce((sum, p) => sum + p.totalTasks, 0);
    const completedTasks = progressData.reduce((sum, p) => sum + p.completedTasks, 0);
    const pendingTasks = totalTasks - completedTasks;
    
    return {
      data: [
        { name: "Concluídas", value: completedTasks, color: "#22C55E" },
        { name: "Pendentes", value: pendingTasks, color: "#6B7280" },
      ],
      totalTasks,
      completedTasks,
      percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }, [progressData]);

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <PieChartIcon className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-bold">Conclusão Geral</h3>
      </div>

      <div className="h-[220px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData.data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {pieData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`${value} tarefas`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center percentage */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <span className="text-3xl font-bold text-primary tracking-widest" style={{ fontFamily: "Brazil2026, sans-serif" }}>{pieData.percentage}%</span>
            <p className="text-xs text-muted-foreground">concluído</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="text-center p-3 bg-green-500/10 rounded-xl">
          <p className="text-2xl font-bold text-green-500 tracking-widest" style={{ fontFamily: "Brazil2026, sans-serif" }}>{pieData.completedTasks}</p>
          <p className="text-xs text-muted-foreground">Concluídas</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-xl">
          <p className="text-2xl font-bold text-muted-foreground tracking-widest" style={{ fontFamily: "Brazil2026, sans-serif" }}>{pieData.data[1].value}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 mt-4">
        {pieData.data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }} 
              />
              <span className="text-sm text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-sm font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
