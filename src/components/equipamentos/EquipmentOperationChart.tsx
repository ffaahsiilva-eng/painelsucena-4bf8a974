// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { useEquipment, useEquipmentStopHistory } from "@/hooks/useEquipment";
import { Loader2, BarChart3 } from "lucide-react";
import { startOfWeek, endOfWeek, differenceInMinutes, parseISO, isWithinInterval } from "date-fns";

const COLORS = {
  operating: "hsl(var(--success))",
  stopped: "hsl(var(--destructive))",
};

interface ChartDataItem {
  name: string;
  operando: number;
  parado: number;
  plate: string;
}

export function EquipmentOperationChart() {
  const { data: equipment, isLoading: isLoadingEquipment } = useEquipment();
  const { data: stopHistory, isLoading: isLoadingHistory } = useEquipmentStopHistory();

  const chartData = useMemo(() => {
    if (!equipment || !stopHistory) return [];

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return equipment.map((eq) => {
      // Get stop history for this equipment that overlaps with this week
      const equipmentStops = stopHistory.filter((stop) => {
        if (stop.equipment_id !== eq.id) return false;
        const stopStart = parseISO(stop.started_at);
        const stopEnd = stop.ended_at ? parseISO(stop.ended_at) : now;
        
        // Include if the stop overlaps with the current week (started before week end AND ended after week start)
        return stopStart <= weekEnd && stopEnd >= weekStart;
      });

      // Calculate total stopped time in minutes (only maintenance counts as stopped)
      let totalStoppedMinutes = 0;
      equipmentStops.forEach((stop) => {
        // Only count maintenance as stopped time
        if (stop.stop_reason !== "maintenance") return;
        
        const stopStart = parseISO(stop.started_at);
        const stopEnd = stop.ended_at ? parseISO(stop.ended_at) : now;
        
        // Clamp the stop period to the current week boundaries
        const effectiveStart = stopStart < weekStart ? weekStart : stopStart;
        const effectiveEnd = stopEnd > weekEnd ? weekEnd : stopEnd;
        
        if (effectiveEnd > effectiveStart) {
          totalStoppedMinutes += differenceInMinutes(effectiveEnd, effectiveStart);
        }
      });

      // Calculate expected operating hours for the week (considering work hours)
      const workHoursPerDay = eq.end_hour - eq.start_hour;
      const daysInWeek = 5; // Monday to Friday
      const totalExpectedMinutes = workHoursPerDay * 60 * daysInWeek;

      // Operating time = expected time - stopped time
      const operatingMinutes = Math.max(0, totalExpectedMinutes - totalStoppedMinutes);

      // Convert to hours for display
      const operatingHours = Math.round((operatingMinutes / 60) * 10) / 10;
      const stoppedHours = Math.round((totalStoppedMinutes / 60) * 10) / 10;

      return {
        name: eq.name,
        operando: operatingHours,
        parado: stoppedHours,
        plate: eq.plate,
      };
    });
  }, [equipment, stopHistory]);

  const isLoading = isLoadingEquipment || isLoadingHistory;

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!equipment || equipment.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem;
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-muted-foreground text-xs mb-2">{data.plate}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.operating }} />
              <span className="text-muted-foreground">Operando:</span>
              <span className="font-medium text-foreground">{data.operando}h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.stopped }} />
              <span className="text-muted-foreground">Parado:</span>
              <span className="font-medium text-foreground">{data.parado}h</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <CardTitle className="text-base font-medium">Tempo Operando vs Parado (Semana)</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              barCategoryGap="20%"
            >
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(value) => `${value}h`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10 }}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">
                    {value === "operando" ? "Operando" : "Parado"}
                  </span>
                )}
              />
              <Bar
                dataKey="operando"
                stackId="a"
                fill={COLORS.operating}
                radius={[0, 0, 0, 0]}
                name="operando"
              />
              <Bar
                dataKey="parado"
                stackId="a"
                fill={COLORS.stopped}
                radius={[4, 4, 0, 0]}
                name="parado"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/50">
          {chartData.map((item) => {
            const total = item.operando + item.parado;
            const operatingPercent = total > 0 ? Math.round((item.operando / total) * 100) : 0;
            return (
              <div key={item.name} className="text-center">
                <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                <p className="text-lg font-semibold text-foreground">{operatingPercent}%</p>
                <p className="text-[10px] text-muted-foreground">disponibilidade</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
