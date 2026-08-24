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
          "relative inline-flex items-center justify-center flex-shrink-0",
          sizeClasses[size],
          className
        )}
        title="Administrador verificado"
      >
        {/* Subtle animated gold glow behind the badge */}
        <span
          aria-hidden
          className={cn(
            "absolute rounded-full pointer-events-none animate-admin-glow",
            glowSizeClasses[size]
          )}
          style={{
            background:
              "radial-gradient(circle, rgba(56,182,255,0.35) 0%, rgba(30,144,255,0.12) 45%, rgba(30,144,255,0) 75%)",
            filter: "blur(2px)",
          }}
        />
        <img loading="lazy" decoding="async"
          src={adminBadge}
          alt="Administrador"
          className={cn(sizeClasses[size], "relative z-10 object-contain")}
        />
      </div>
    );
  }
);
