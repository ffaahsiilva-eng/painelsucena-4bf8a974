import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const SessionTimeIndicator = () => {
  const { getRemainingTime, isInWarningPeriod } = useSessionTimeout();
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () => {
      setRemainingMinutes(getRemainingTime());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [getRemainingTime]);

  if (remainingMinutes === null) return null;

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  const isWarning = isInWarningPeriod();

  const formatTime = () => {
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-default",
            isWarning
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          <Clock className={cn("h-3.5 w-3.5", isWarning && "animate-pulse")} />
          <span>{formatTime()}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <p className="text-sm">
          {isWarning
            ? "Sua sessão está expirando! Renove para continuar."
            : `Tempo restante da sessão: ${formatTime()}`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
