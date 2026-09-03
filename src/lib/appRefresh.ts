export const PREVIEW_CACHE_RESET_KEY = "preview-sw-reset-attempts";
export const MAX_PREVIEW_CACHE_RESET_ATTEMPTS = 3;

const PREVIEW_DOCUMENT_VERSION_KEY = "preview-document-version";
const VERSION_STORAGE_KEY = "app-build-version";
const ELECTRON_REFRESH_GUARD_KEY = "electron-version-refresh-guard";
const ELECTRON_REFRESH_GUARD_TTL_MS = 15_000;
const BUILD_VERSION = __APP_BUILD_VERSION__;
const PREVIEW_HOST_FRAGMENTS = ["id-preview--", "lovableproject.com"];
export const ELECTRON_VERSION_POLL_INTERVAL_MS = 5_000;

export type CacheResetResult = {
  hadCaches: boolean;
  hadController: boolean;
  hadRegistrations: boolean;
  remainingCaches: number;
  remainingRegistrations: number;
};

export function isPreviewHost() {
  const hostname = window.location.hostname.toLowerCase();

  return PREVIEW_HOST_FRAGMENTS.some((fragment) => hostname.includes(fragment));
}

export function isEmbeddedPreview() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isElectronRuntime() {
  const searchParams = new URLSearchParams(window.location.search);
  const userAgent = navigator.userAgent.toLowerCase();
  const navigatorWithBrands = navigator as Navigator & {
    userAgentData?: {
      brands?: Array<{ brand: string; version: string }>;
    };
  };
  const runtimeProcess = (globalThis as typeof globalThis & {
    process?: {
      versions?: Record<string, string | undefined>;
    };
  }).process;

  return Boolean(
    searchParams.get("desktop-shell") === "electron" ||
    runtimeProcess?.versions?.electron ||
      userAgent.includes(" electron/") ||
      navigatorWithBrands.userAgentData?.brands?.some((brand) => brand.brand.toLowerCase().includes("electron")),
  );
}

export function shouldDisableServiceWorker() {
  return import.meta.env.DEV || isPreviewHost() || isEmbeddedPreview() || isElectronRuntime();
}

export function getPreviewCacheResetAttempts() {
  const rawValue = sessionStorage.getItem(PREVIEW_CACHE_RESET_KEY);
  const attempts = Number.parseInt(rawValue ?? "0", 10);

  return Number.isFinite(attempts) ? attempts : 0;
}

export function setPreviewCacheResetAttempts(attempts: number) {
  sessionStorage.setItem(PREVIEW_CACHE_RESET_KEY, String(attempts));
}

export function clearPreviewCacheResetAttempts() {
  sessionStorage.removeItem(PREVIEW_CACHE_RESET_KEY);
}

function getElectronRefreshGuard() {
  const rawValue = sessionStorage.getItem(ELECTRON_REFRESH_GUARD_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      expiresAt?: number;
      target?: string;
    };

    if (!parsed.target || typeof parsed.expiresAt !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearElectronRefreshGuard() {
  sessionStorage.removeItem(ELECTRON_REFRESH_GUARD_KEY);
}

export function shouldForcePreviewDocumentReload() {
  return sessionStorage.getItem(PREVIEW_DOCUMENT_VERSION_KEY) !== BUILD_VERSION;
}

export function markPreviewDocumentFresh() {
  sessionStorage.setItem(PREVIEW_DOCUMENT_VERSION_KEY, BUILD_VERSION);
}

export function getCacheBustedUrl(extraSearchParams: Record<string, string | number> = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set("preview-bust", `${Date.now()}`);
  url.searchParams.set("app-build", BUILD_VERSION);

  Object.entries(extraSearchParams).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export function checkVersionAndReset(): boolean {
  const stored = localStorage.getItem(VERSION_STORAGE_KEY);

  if (stored !== BUILD_VERSION) {
    localStorage.setItem(VERSION_STORAGE_KEY, BUILD_VERSION);
    return true;
  }

  return false;
}

export async function clearClientCaches(): Promise<CacheResetResult> {
  const hadController = "serviceWorker" in navigator && Boolean(navigator.serviceWorker.controller);
  let hadRegistrations = false;
  let remainingRegistrations = 0;
  let hadCaches = false;
  let remainingCaches = 0;

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    hadRegistrations = registrations.length > 0;

    if (hadRegistrations) {
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
    }

    remainingRegistrations = (await navigator.serviceWorker.getRegistrations()).length;
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    hadCaches = keys.length > 0;

    if (hadCaches) {
      await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
    }

    remainingCaches = (await caches.keys()).length;
  }

  return {
    hadCaches,
    hadController,
    hadRegistrations,
    remainingCaches,
    remainingRegistrations,
  };
}

function clearVisualCacheKeys() {
  const keysToRemove: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && (key.startsWith("theme") || key.startsWith("sidebar") || key.startsWith("vite-"))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

async function clearAllIndexedDatabases() {
  try {
    const anyIndexed = indexedDB as IDBFactory & {
      databases?: () => Promise<Array<{ name?: string }>>;
    };
    if (typeof anyIndexed.databases === "function") {
      const dbs = await anyIndexed.databases();
      await Promise.all(
        dbs
          .map((db) => db?.name)
          .filter((name): name is string => Boolean(name))
          .map(
            (name) =>
              new Promise<void>((resolve) => {
                const req = indexedDB.deleteDatabase(name);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
              }),
          ),
      );
    }
  } catch {
    // ignore
  }
}

export async function hardRefreshToLatest(options: { clearVisualState?: boolean } = {}) {
  await clearClientCaches();

  if (options.clearVisualState) {
    clearVisualCacheKeys();
  }

  clearPreviewCacheResetAttempts();
  markPreviewDocumentFresh();
  window.location.replace(getCacheBustedUrl());
}

/**
 * Wipe EVERYTHING: caches, service workers, IndexedDB, localStorage,
 * sessionStorage, then reload to the latest build. Used by the user-facing
 * "Recarregar e atualizar" button. Will sign the user out.
 */
export async function nukeAndReload() {
  try {
    await clearClientCaches();
  } catch {
    // ignore
  }
  try {
    await clearAllIndexedDatabases();
  } catch {
    // ignore
  }
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
  markPreviewDocumentFresh();
  window.location.replace(getCacheBustedUrl({ "full-reset": Date.now() }));
}

/**
 * Fetches the live index.html from the server (bypassing SW/browser cache)
 * and extracts the embedded build version to compare against the running one.
 * Returns the server version string if different, or null if up-to-date.
 */
export async function checkServerVersion(): Promise<string | null> {
  try {
    const url = new URL("/index.html", window.location.origin);
    url.searchParams.set("preview-version-probe", `${Date.now()}`);

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache" },
    });
    if (!res.ok) return null;

    const html = await res.text();

    const serverScriptMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
    const currentScript = Array.from(document.querySelectorAll("script[src]"))
      .map((script) => script.getAttribute("src") || "")
      .map((src) => {
        try {
          return new URL(src, window.location.origin).pathname;
        } catch {
          return src;
        }
      })
      .find((src) => src.startsWith("/assets/") && src.endsWith(".js"));

    if (serverScriptMatch?.[1] && currentScript && serverScriptMatch[1] !== currentScript) {
      return serverScriptMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

export async function refreshIfDocumentStale(trigger = "runtime-check"): Promise<boolean> {
  const serverVersionMismatch = await checkServerVersion();

  if (!serverVersionMismatch) {
    clearElectronRefreshGuard();
    return false;
  }

  if (isElectronRuntime()) {
    const refreshGuard = getElectronRefreshGuard();

    if (refreshGuard && refreshGuard.target === serverVersionMismatch && refreshGuard.expiresAt > Date.now()) {
      return false;
    }

    sessionStorage.setItem(
      ELECTRON_REFRESH_GUARD_KEY,
      JSON.stringify({
        target: serverVersionMismatch,
        expiresAt: Date.now() + ELECTRON_REFRESH_GUARD_TTL_MS,
      }),
    );
  }

  await clearClientCaches();
  clearPreviewCacheResetAttempts();
  markPreviewDocumentFresh();
  window.location.replace(
    getCacheBustedUrl({
      "server-build": serverVersionMismatch,
      "update-trigger": trigger,
    }),
  );

  return true;
}

/**
 * Listens for SW controller changes (new SW activated) and forces a clean reload.
 */
export function listenForControllerChange() {
  if (!("serviceWorker" in navigator)) return;
  // Só o preview do Lovable recarrega automaticamente ao trocar de SW.
  // Em produção mantemos o SW atual até o usuário fechar/abrir o app
  // ou clicar em "Recarregar" para evitar reloads no meio de uma tarefa.
  if (!isPreviewHost()) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.replace(getCacheBustedUrl());
  });
}