import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff,
  Check,
  AlertCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SyncIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  onSync: () => void;
}

export function SyncIndicator({
  isOnline,
  isSyncing,
  pendingCount,
  lastSyncTime,
  onSync,
}: SyncIndicatorProps) {
  const [open, setOpen] = useState(false);

  const getStatusIcon = () => {
    if (isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-orange-500" />;
    }
    if (pendingCount > 0) {
      return <CloudOff className="h-4 w-4 text-yellow-500" />;
    }
    return <Cloud className="h-4 w-4 text-green-500" />;
  };

  const getStatusColor = () => {
    if (isSyncing) return "bg-blue-100 text-blue-700 border-blue-200";
    if (!isOnline) return "bg-orange-100 text-orange-700 border-orange-200";
    if (pendingCount > 0) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-green-100 text-green-700 border-green-200";
  };

  const getStatusText = () => {
    if (isSyncing) return "Sincronizando...";
    if (!isOnline) return "Offline";
    if (pendingCount > 0) return `${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`;
    return "Sincronizado";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-2 gap-1.5 ${getStatusColor()} hover:opacity-80 transition-all touch-manipulation`}
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
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          {/* Status Header */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-orange-500" />
            )}
            <div>
              <p className="font-medium text-sm">
                {isOnline ? "Conectado" : "Sem conexão"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOnline 
                  ? "Suas alterações serão sincronizadas automaticamente" 
                  : "Alterações serão salvas localmente"}
              </p>
            </div>
          </div>

          {/* Pending Actions */}
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div className="flex-1">
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                  {pendingCount} {pendingCount === 1 ? "alteração pendente" : "alterações pendentes"}
                </p>
              </div>
            </div>
          )}

          {/* Synced Status */}
          {pendingCount === 0 && isOnline && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600" />
              <p className="text-xs font-medium text-green-700 dark:text-green-300">
                Tudo sincronizado!
              </p>
            </div>
          )}

          {/* Last Sync Time */}
          {lastSyncTime && (
            <p className="text-xs text-muted-foreground text-center">
              Última sincronização: {format(new Date(lastSyncTime), "HH:mm 'de' dd/MM", { locale: ptBR })}
            </p>
          )}

          {/* Sync Button */}
          <Button
            onClick={() => {
              onSync();
              setOpen(false);
            }}
            disabled={!isOnline || isSyncing || pendingCount === 0}
            className="w-full h-10 touch-manipulation"
            variant={pendingCount > 0 ? "default" : "outline"}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar Agora
              </>
            )}
          </Button>

          {!isOnline && (
            <p className="text-xs text-center text-muted-foreground">
              Conecte-se à internet para sincronizar
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
