import { WifiOff, Database, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  isVisible?: boolean;
  className?: string;
}

/**
 * A banner that appears when the user is offline
 * Shows pending actions count and offline status
 */
export function OfflineBanner({
  isOnline,
  pendingCount,
  isVisible = true,
  className,
}: OfflineBannerProps) {
  if (isOnline || !isVisible) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 safe-area-inset-top",
        "bg-gradient-to-r from-orange-500 to-amber-500",
        "text-white px-4 py-2",
        "flex items-center justify-center gap-3",
        "shadow-lg",
        "animate-in slide-in-from-top duration-300",
        className
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">Você está offline</span>
      
      {pendingCount > 0 && (
        <>
          <span className="text-white/70">•</span>
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            <span className="text-sm">
              {pendingCount} {pendingCount === 1 ? "alteração" : "alterações"} pendente{pendingCount > 1 ? "s" : ""}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

interface OfflinePageFallbackProps {
  title?: string;
  message?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

/**
 * Full page fallback when content cannot be loaded offline
 */
export function OfflinePageFallback({
  title = "Conteúdo não disponível offline",
  message = "Esta página requer conexão com a internet. Conecte-se para acessar o conteúdo.",
  showRetry = true,
  onRetry,
}: OfflinePageFallbackProps) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 bg-orange-100 dark:bg-orange-950/30 rounded-full mb-4">
        <WifiOff className="h-12 w-12 text-orange-500" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-sm mb-6">{message}</p>
      
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Tentar Novamente
        </button>
      )}
    </div>
  );
}

interface OfflineDataIndicatorProps {
  isFromCache: boolean;
  isStale: boolean;
  lastFetched?: Date | null;
}

/**
 * Small indicator showing data is from cache
 */
export function OfflineDataIndicator({
  isFromCache,
  isStale,
  lastFetched,
}: OfflineDataIndicatorProps) {
  if (!isFromCache) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        isStale
          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300"
          : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
      )}
    >
      <Database className="h-3 w-3" />
      <span>
        {isStale ? "Dados em cache (atualizando...)" : "Dados em cache"}
      </span>
      {lastFetched && (
        <span className="text-[10px] opacity-70">
          • {lastFetched.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}

interface SyncWarningProps {
  pendingCount: number;
  className?: string;
}

/**
 * Warning message about pending sync
 */
export function SyncWarning({ pendingCount, className }: SyncWarningProps) {
  if (pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg",
        "bg-yellow-50 dark:bg-yellow-950/30",
        "border border-yellow-200 dark:border-yellow-800",
        "text-yellow-800 dark:text-yellow-200",
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <p className="text-sm">
        Você tem {pendingCount} {pendingCount === 1 ? "alteração" : "alterações"} que ainda não foram sincronizadas.
        {navigator.onLine
          ? " A sincronização acontecerá automaticamente."
          : " Conecte-se à internet para sincronizar."}
      </p>
    </div>
  );
}
