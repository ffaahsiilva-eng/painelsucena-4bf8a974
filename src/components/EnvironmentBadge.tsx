import { Building2, TreePine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEnvironment } from "@/hooks/useEnvironment";
import { cn } from "@/lib/utils";

interface EnvironmentBadgeProps {
  className?: string;
  compact?: boolean;
}

/**
 * Small pill that shows which environment the user is currently in.
 * Click to go back to the selection screen.
 */
export function EnvironmentBadge({ className, compact = false }: EnvironmentBadgeProps) {
  const { info } = useEnvironment();
  const navigate = useNavigate();

  if (!info) return null;

  const Icon = info.id === "paragominas" ? TreePine : Building2;
  const tone =
    info.id === "paragominas"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30"
      : "bg-sky-500/10 text-sky-700 dark:text-sky-400 ring-sky-500/30";

  return (
    <button
      type="button"
      onClick={() => navigate("/selecao-ambiente")}
      title="Trocar de ambiente"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors hover:opacity-90",
        tone,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {!compact && <span>{info.shortLabel}</span>}
    </button>
  );
}
