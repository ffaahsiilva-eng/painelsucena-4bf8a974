// @ts-nocheck
import { LucideIcon, ArrowUp } from "lucide-react";
import { useState, useEffect, memo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import { HalfGauge } from "@/components/dashboard/HalfGauge";

type ChartVariant = "gauge" | "sparkline" | "bars" | "circular";

interface ModernStatCardProps {
  title: string;
  value: string | number;
  percentage?: number;
  icon: LucideIcon;
  variant: ChartVariant;
  color?: string;
  accentColor?: string;
  sparklineData?: number[];
  barData?: number[];
  bgTint?: string;
}

const ORANGE = "hsl(var(--primary))";

const SparklineChart = memo(({ data }: { data: number[] }) => {
  const isMobile = useIsMobile();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), isMobile ? 50 : 150);
    return () => clearTimeout(t);
  }, [isMobile]);
  const chartData = (show ? data : data.map(() => 0)).map((v, i) => ({ v, i }));
  return (
    <div className="w-full h-16 mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sparkOrange" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ORANGE} stopOpacity={0.45} />
              <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={ORANGE}
            fill="url(#sparkOrange)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={!isMobile}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

const MiniBarChart = ({ data }: { data: number[] }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(t);
  }, []);
  const chartData = (show ? data : data.map(() => 0)).map((v, i) => ({ v, i }));
  return (
    <div className="w-full h-16 mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Bar
            dataKey="v"
            fill={ORANGE}
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


const ModernStatCard = ({
  title,
  value,
  percentage = 0,
  icon: Icon,
  variant,
  sparklineData = [4, 7, 5, 8, 6, 9, 7],
  barData = [3, 7, 5, 9, 4, 8, 6],
}: ModernStatCardProps) => {
  // Special compact layout for "Total de Funcionários" gauge variant
  if (variant === "gauge") {
    return (
      <div className="rounded-2xl p-4 bg-card border border-border shadow-sm overflow-hidden flex flex-col h-full hover:scale-[1.01] transition-transform glass-card-dashboard relative">
        <p className="text-xs text-muted-foreground mb-2 truncate uppercase tracking-wider font-semibold text-center">{title}</p>
        <div className="flex flex-col items-center justify-center flex-1 min-w-0 py-2">
          <div className="flex flex-col items-center min-w-0 z-10">
            <span className="text-6xl text-foreground leading-[1.1] truncate tracking-widest px-2" style={{ fontFamily: "Brazil2026, sans-serif" }}>
              {value}
            </span>
            {percentage > 0 && (
              <span className="text-xs font-bold text-emerald-500 inline-flex items-center">
                {percentage}%
                <ArrowUp className="h-3 w-3 ml-0.5" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 bg-card border border-border shadow-sm overflow-hidden flex flex-col h-full hover:scale-[1.01] transition-transform glass-card-dashboard">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{title}</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-4xl text-foreground leading-none tracking-widest" style={{ fontFamily: "Brazil2026, sans-serif" }}>
              {value}
            </span>
            {percentage > 0 && (
              <span className="text-[10px] font-bold text-emerald-500 inline-flex items-center">
                {percentage}%
                <ArrowUp className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
        </div>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
      </div>
      {variant === "sparkline" && <SparklineChart data={sparklineData} />}
      {variant === "bars" && <MiniBarChart data={barData} />}
    </div>
  );
};

export default ModernStatCard;
