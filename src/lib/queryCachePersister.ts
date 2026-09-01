import type { QueryClient } from "@tanstack/query-core";

const STORAGE_KEY = "driver_query_cache_v1";
const MAX_AGE = 1000 * 60 * 60 * 24; // 24h

type PersistedEntry = {
  queryKey: unknown;
  state: { data: unknown; dataUpdatedAt: number };
};

/** Restaura queries salvas no localStorage para o cache do React Query. */
export function hydrateQueryCache(queryClient: QueryClient) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as PersistedEntry[];
    if (!Array.isArray(entries)) return;
    const now = Date.now();
    for (const entry of entries) {
      if (!entry?.queryKey || !entry?.state) continue;
      if (now - (entry.state.dataUpdatedAt || 0) > MAX_AGE) continue;
      queryClient.setQueryData(entry.queryKey as any, entry.state.data, {
        updatedAt: entry.state.dataUpdatedAt,
      });
    }
  } catch (e) {
    console.warn("[queryCachePersister] hydrate failed", e);
  }
}

/** Persiste periodicamente as queries com dados no localStorage. */
export function startQueryCachePersistence(queryClient: QueryClient) {
  const persist = () => {
    try {
      const entries: PersistedEntry[] = [];
      for (const query of queryClient.getQueryCache().getAll()) {
        const data = query.state.data;
        if (data === undefined) continue;
        entries.push({
          queryKey: query.queryKey,
          state: { data, dataUpdatedAt: query.state.dataUpdatedAt },
        });
      }
      const payload = JSON.stringify(entries);
      // Evita estourar a quota do localStorage (~5MB)
      if (payload.length > 2_500_000) return;
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  };

  const interval = setInterval(persist, 30_000);
  window.addEventListener("beforeunload", persist);
  return () => {
    clearInterval(interval);
    window.removeEventListener("beforeunload", persist);
  };
}
