import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  checkServerVersion,
  clearClientCaches,
  clearPreviewCacheResetAttempts,
  getCacheBustedUrl,
  isPreviewHost,
  markPreviewDocumentFresh,
} from "@/lib/appRefresh";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Polls the server for new builds. When detected, shows a fullscreen overlay
 * "Nova atualização encontrada, atualizando o sistema..." then clears caches
 * and reloads to the latest build.
 */
export function AppUpdateChecker() {
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Somente o preview do Lovable faz auto-refresh quando há nova build.
    if (!isPreviewHost() || window.location.hostname === 'localhost') return;
    
    // Check if the user has explicitly requested to stop the update check for this session
    if (sessionStorage.getItem("disable-auto-update-check") === "true") return;

    let cancelled = false;
    let timer: number | undefined;

    const performUpdate = async (target: string) => {
      if (cancelled) return;
      setUpdating(true);
      try {
        await clearClientCaches();
      } catch {
        // ignore
      }
      clearPreviewCacheResetAttempts();
      markPreviewDocumentFresh();
      // Pequena pausa para o usuário ver a mensagem
      setTimeout(() => {
        window.location.replace(
          getCacheBustedUrl({
            "server-build": target,
            "update-trigger": "auto-checker",
          }),
        );
      }, 1500);
    };

    const tick = async () => {
      try {
        const mismatch = await checkServerVersion();
        if (mismatch && !cancelled) {
          await performUpdate(mismatch);
          return;
        }
      } catch {
        // ignore
      }
      if (!cancelled) {
        timer = window.setTimeout(tick, CHECK_INTERVAL_MS);
      }
    };

    // Primeira verificação após 10s para não competir com o boot
    timer = window.setTimeout(tick, 10_000);

    const onFocus = () => {
      // Verifica imediatamente ao voltar para a aba
      if (!cancelled) tick();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!updating) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="alertdialog"
      aria-live="assertive"
    >
      <div className="mx-4 max-w-sm rounded-2xl border border-white/10 bg-background/95 p-6 text-center shadow-2xl relative">
        <button 
          onClick={() => {
            setUpdating(false);
            sessionStorage.setItem("disable-auto-update-check", "true");
          }}
          className="absolute top-2 right-2 p-2 hover:bg-white/10 rounded-full transition-colors"
          title="Fechar e ignorar atualização"
        >
          <span className="text-lg">×</span>
        </button>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <RefreshCw className="h-7 w-7 animate-spin text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Nova atualização encontrada
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Estamos atualizando o sistema para a versão mais recente. Aguarde…
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Limpando cache e recarregando
        </div>
      </div>
    </div>
  );
}
