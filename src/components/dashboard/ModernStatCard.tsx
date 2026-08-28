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

import { GlassCard } from "./GlassCard";

const ORANGE = "#B38A45"; // Gold from premium palette

const SparklineChart = memo(({ data }: { data: number[] }) => {
  const isMobile = useIsMobile();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), isMobile ? 50 : 150);
    return () => clearTimeout(t);
  }, [isMobile]);
  const chartData = (show ? data : data.map(() => 0)).map((v, i) => ({ v, i }));
  return (
    <div className="w-full h-16 mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sparkGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ORANGE} stopOpacity={0.5} />
              <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={ORANGE}
            fill="url(#sparkGold)"
            strokeWidth={3}
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
    <div className="w-full h-16 mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Bar
            dataKey="v"
            fill={ORANGE}
            radius={[4, 4, 0, 0]}
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
      <GlassCard className="flex flex-col h-full py-8 text-center items-center justify-center">
        <p className="text-[13px] font-semibold text-[#6D7175] uppercase tracking-widest mb-1">{title}</p>
        <div className="flex flex-col items-center justify-center flex-1 min-w-0 py-2">
          <div className="flex flex-col items-center min-w-0 z-10 my-4">
            <span className="text-[52px] text-[#292C2E] leading-none font-extrabold px-2">
              {value}
            </span>
            {percentage > 0 && (
              <span className="text-xs font-semibold text-[#B38A45] inline-flex items-center mt-2 bg-[#B38A45]/10 px-2.5 py-1 rounded-full">
                {percentage}%
                <ArrowUp className="h-3 w-3 ml-0.5" />
              </span>
            )}
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col h-full p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[13px] font-semibold text-[#6D7175] uppercase tracking-widest">{title}</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-4xl text-[#292C2E] leading-none font-extrabold">
              {value}
            </span>
            {percentage > 0 && (
              <span className="text-xs font-semibold text-[#B38A45] inline-flex items-center ml-2 bg-[#B38A45]/10 px-2 py-0.5 rounded-full">
                {percentage}%
                <ArrowUp className="h-3 w-3 ml-0.5" />
              </span>
            )}
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-[#B38A45] shadow-sm">
          <Icon className="h-5 w-5" strokeWidth={2.5} />
        </div>
      </div>
      {variant === "sparkline" && <SparklineChart data={sparklineData} />}
      {variant === "bars" && <MiniBarChart data={barData} />}
    </GlassCard>
  );
};

export default ModernStatCard;
