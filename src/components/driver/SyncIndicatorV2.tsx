import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Check,
  AlertCircle,
  Loader2,
  Database,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SyncIndicatorV2Props {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  syncError: string | null;
  isInitialized: boolean;
  onSync: () => void;
}

export function SyncIndicatorV2({
  isOnline,
  isSyncing,
  pendingCount,
  lastSyncTime,
  syncError,
  isInitialized,
  onSync,
}: SyncIndicatorV2Props) {
  const [open, setOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  // Pulse animation when pending count increases
  useEffect(() => {
    if (pendingCount > 0) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [pendingCount]);

  const getStatusIcon = () => {
    if (!isInitialized) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-orange-500" />;
    }
    if (syncError) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (pendingCount > 0) {
      return <CloudOff className="h-4 w-4 text-yellow-500" />;
    }
    return <Cloud className="h-4 w-4 text-green-500" />;
  };

  const getStatusColor = () => {
    if (!isInitialized) return "bg-muted text-muted-foreground border-muted";
    if (isSyncing) return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";
    if (!isOnline) return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800";
    if (syncError) return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800";
    if (pendingCount > 0) return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800";
    return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800";
  };

  const getStatusText = () => {
    if (!isInitialized) return "Carregando...";
    if (isSyncing) return "Sincronizando...";
    if (!isOnline) return "Offline";
    if (syncError) return "Erro";
    if (pendingCount > 0) return `${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`;
    return "Sincronizado";
  };

  const getProgressValue = () => {
    if (!isInitialized) return 0;
    if (pendingCount === 0) return 100;
    // Simulated progress based on sync state
    if (isSyncing) return 50;
    return 0;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 gap-1.5 transition-all touch-manipulation border",
            getStatusColor(),
            showPulse && "animate-pulse"
          )}
        >
          {getStatusIcon()}
          <span className="text-xs font-medium hidden xs:inline">{getStatusText()}</span>
          {pendingCount > 0 && !isSyncing && (
            <Badge
              variant="secondary"
              className="h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-yellow-500 text-white"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-full",
                isOnline ? "bg-green-100 dark:bg-green-950" : "bg-orange-100 dark:bg-orange-950"
              )}
            >
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {isOnline ? "Conectado à Internet" : "Modo Offline"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOnline
                  ? "Alterações sincronizam automaticamente"
                  : "Alterações salvas localmente"}
              </p>
            </div>
          </div>

          {/* Sync Progress */}
          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sincronizando...</span>
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
              <Progress value={getProgressValue()} className="h-1" />
            </div>
          )}

          {/* Pending Actions Card */}
          {pendingCount > 0 && !isSyncing && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <Database className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {pendingCount} {pendingCount === 1 ? "alteração pendente" : "alterações pendentes"}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                  {isOnline
                    ? "Clique para sincronizar agora"
                    : "Será sincronizado quando online"}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {syncError && (
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Erro na sincronização
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                  {syncError}
                </p>
              </div>
            </div>
          )}

          {/* All Synced Card */}
          {pendingCount === 0 && isOnline && !isSyncing && !syncError && (
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Tudo sincronizado!
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                  Seus dados estão atualizados
                </p>
              </div>
            </div>
          )}

          {/* Last Sync Time */}
          {lastSyncTime && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Última sincronização:{" "}
                {format(new Date(lastSyncTime), "HH:mm 'de' dd/MM", { locale: ptBR })}
              </span>
            </div>
          )}

          {/* Sync Button */}
          <Button
            onClick={() => {
              onSync();
              setOpen(false);
            }}
            disabled={!isOnline || isSyncing || (pendingCount === 0 && !syncError)}
            className="w-full h-11 touch-manipulation gap-2"
            variant={pendingCount > 0 || syncError ? "default" : "outline"}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {syncError ? "Tentar Novamente" : "Sincronizar Agora"}
              </>
            )}
          </Button>

          {!isOnline && (
            <p className="text-xs text-center text-muted-foreground">
              Conecte-se à internet para sincronizar
            </p>
          )}

          {/* Offline Mode Info */}
          {!isOnline && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center">
                💡 Você pode continuar trabalhando. Suas alterações serão sincronizadas automaticamente quando a conexão for restaurada.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
