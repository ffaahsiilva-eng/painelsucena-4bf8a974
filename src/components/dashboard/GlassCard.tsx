import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[20px] border border-white/50 p-6 transition-all duration-300 ease-out",
        "shadow-[0_10px_35px_rgba(0,0,0,0.07),inset_0_1px_0_rgba(255,255,255,0.45)]",
        "hover:-translate-y-[2px] hover:shadow-[0_16px_45px_rgba(0,0,0,0.09)] hover:bg-white/40",
        "overflow-hidden",
        className
      )}
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.48), rgba(255,255,255,0.30))",
        backdropFilter: "blur(22px) saturate(125%)",
        WebkitBackdropFilter: "blur(22px) saturate(125%)",
      }}
    >
      {children}
    </div>
  );
}
