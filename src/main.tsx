import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installEnvironmentHeader } from "@/lib/environmentHeader";

// Supress ResizeObserver loop error
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.("ResizeObserver loop completed with undelivered notifications")) {
      return;
    }
    originalError.apply(console, args);
  };
  
  window.addEventListener("error", (e) => {
    if (e.message?.includes?.("ResizeObserver loop completed with undelivered notifications")) {
      e.stopImmediatePropagation();
    }
  });
}


// Injeta o header x-environment em toda chamada ao Supabase para
// que as RLS policies filtrem os dados do ambiente selecionado.
installEnvironmentHeader();
import { markPreviewDocumentFresh, shouldDisableServiceWorker } from "@/lib/appRefresh";
import { registerAppServiceWorker } from "@/lib/registerServiceWorker";
import { prefetchMainRoutes } from "@/lib/routePrefetch";
import { installChunkErrorRecovery } from "@/lib/chunkErrorRecovery";

// Evita o loop de recarregamento no celular quando um chunk de rota falha.
installChunkErrorRecovery();


async function bootstrap() {
  // Automatic service-worker/version reloads were causing an infinite reload
  // loop in the preview. Never clear caches during boot because that can abort
  // auth/data requests and leave the layout stuck on the loading screen.
  if (shouldDisableServiceWorker()) {
    markPreviewDocumentFresh();
  }

  createRoot(document.getElementById("root")!).render(<App />);

  // Registra o service worker fora do caminho crítico do LCP.
  // requestIdleCallback (com fallback para setTimeout) garante que o SW
  // não compita com a renderização inicial da rota.
  if (typeof window !== "undefined") {
    const scheduleSW = () => { void registerAppServiceWorker(); };
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) {
      ric(scheduleSW, { timeout: 3000 });
    } else {
      setTimeout(scheduleSW, 1500);
  }

  // Prefetch das rotas principais na ordem do menu (Destaques → Planejamento).
  prefetchMainRoutes();
  }
}

void bootstrap();

