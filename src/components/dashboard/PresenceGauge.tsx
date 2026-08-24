import { ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";

interface PresenceGaugeProps {
  present: number;
  total: number;
  percentage: number;
}

export function PresenceGauge({ present, total, percentage }: PresenceGaugeProps) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(percentage), 100);
    return () => clearTimeout(t);
  }, [percentage]);

  const size = 200;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = r * 2 * Math.PI;
  const dash = (animated / 100) * c;

  return (
    <div className="relative flex flex-col items-center justify-between rounded-2xl p-5 h-full bg-card border border-border shadow-sm glass-card-dashboard">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground self-start">
        Presença
      </p>

      <div className="relative" style={{ width: size, height: size }}>
        <svg height={size} width={size}>
          <circle
            stroke="hsl(var(--muted))"
            fill="transparent"
            strokeWidth={stroke}
            r={r}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            stroke="url(#presenceOrange)"
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            r={r}
            cx={size / 2}
            cy={size / 2}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dasharray 1s ease-out",
            }}
          />
          <defs>
            <linearGradient id="presenceOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-extrabold leading-none text-foreground tracking-widest" style={{ fontFamily: "Brazil2026, sans-serif" }}>
            {present}
          </span>
          <span className="text-sm font-semibold text-muted-foreground mt-1">
            {percentage}%
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center text-center mt-2">
        <span className="text-sm text-muted-foreground">Presentes hoje</span>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-xl font-bold text-foreground tracking-widest" style={{ fontFamily: "Brazil2026, sans-serif" }}>{present}</span>
          <span className="text-sm text-muted-foreground">de {total}</span>
          <span className="ml-1 inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ArrowUp className="h-3 w-3" />
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}
