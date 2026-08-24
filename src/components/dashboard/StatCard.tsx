import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }: StatCardProps) => {
  return (
    <div className="group relative bg-card rounded-xl p-4 md:p-6 hover-lift border border-border/50 overflow-hidden glass-card-dashboard">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="p-2 md:p-3 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          {trend && trendValue && (
            <span
              className={`text-xs md:text-sm font-medium ${
                trend === "up"
                  ? "text-success"
                  : trend === "down"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {trendValue}
            </span>
          )}
        </div>
        
        <h3 className="text-4xl md:text-5xl font-bold mb-1 md:mb-2 tracking-widest leading-none" style={{ fontFamily: "Brazil2026, sans-serif" }}>{value}</h3>
        <p className="text-sm md:text-base text-muted-foreground font-medium">{title}</p>
        {subtitle && (
          <p className="text-xs md:text-sm text-muted-foreground/70 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
