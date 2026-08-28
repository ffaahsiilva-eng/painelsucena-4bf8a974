import { forwardRef } from "react";
import adminBadge from "@/assets/verified-badge.png";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-8 h-8",
};

const glowSizeClasses = {
  xs: "w-[18px] h-[18px]",
  sm: "w-[22px] h-[22px]",
  md: "w-[30px] h-[30px]",
  lg: "w-[34px] h-[34px]",
};

export const VerifiedBadge = forwardRef<HTMLDivElement, VerifiedBadgeProps>(
  function VerifiedBadge({ size = "sm", className }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center flex-shrink-0 ml-2",
          className
        )}
        title="Administrador verificado"
      >
        <span
          className={cn(
            "text-[10px] font-bold text-[#b58a48] uppercase tracking-wider bg-[#b58a48]/10 border border-[#b58a48]/30 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(181,138,72,0.2)]"
          )}
        >
          ADMIN
        </span>
      </div>
    );
  }
);
