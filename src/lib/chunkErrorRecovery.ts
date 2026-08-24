/**
 * Recuperação de falhas ao carregar chunks lazy (código dividido por rota).
 *
 * Sintoma corrigido: no celular, após um novo deploy, abrir outra página
 * (ex.: InstaCena) falhava com "Failed to fetch dynamically imported module"
 * e o app recarregava voltando para a tela inicial, em loop.
 *
 * Estratégia: ao detectar erro de import dinâmico, limpar caches/service worker
 * UMA única vez por sessão e recarregar MANTENDO a rota atual (sem voltar para "/").
 */

const GUARD_KEY = "chunk-reload-guard";
const GUARD_TTL_MS = 30_000;

const CHUNK_ERROR_PATTERNS = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  "unable to preload css",
  "failed to import",
];

function isChunkError(message: unknown): boolean {
  if (typeof message !== "string") return false;
  const lower = message.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
}

function canReload(): boolean {
  try {
    const raw = sessionStorage.getItem(GUARD_KEY);
    if (raw) {
      const expiresAt = Number.parseInt(raw, 10);
      if (Number.isFinite(expiresAt) && expiresAt > Date.now()) return false;
    }
    sessionStorage.setItem(GUARD_KEY, String(Date.now() + GUARD_TTL_MS));
    return true;
  } catch {
    return true;
  }
}

async function recover() {
  if (!canReload()) return;

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister().catch(() => false)));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
    }
  } catch {
    // ignore
  }

  // Recarrega a MESMA rota (sem redirecionar para a home).
  const url = new URL(window.location.href);
  url.searchParams.set("chunk-retry", `${Date.now()}`);
  window.location.replace(url.toString());
}

export function installChunkErrorRecovery() {
  if (typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    void recover();
  });

  window.addEventListener("error", (event) => {
    if (isChunkError(event.message) || isChunkError((event.error as Error | undefined)?.message)) {
      void recover();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { message?: string } | string | undefined;
    const message = typeof reason === "string" ? reason : reason?.message;
    if (isChunkError(message)) {
      void recover();
    }
  });
}
