import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

interface ModeratorBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export const ModeratorBadge = forwardRef<HTMLSpanElement, ModeratorBadgeProps>(
  function ModeratorBadge({ size = "sm", className }, ref) {
    return (
      <span ref={ref} className={cn("inline-flex items-center justify-center text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]", className)} title="Moderador">
        <ShieldCheck className={cn(sizeClasses[size], "fill-purple-500/20 stroke-[2.2]")} />
      </span>
    );
  }
);

