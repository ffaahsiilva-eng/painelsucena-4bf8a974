/**
 * Persiste seletivamente o cache do React Query em localStorage
 * para garantir leituras offline (em especial no Painel do Motorista).
 *
 * Apenas chaves de queries críticas para uso offline são salvas, para
 * evitar bloating de armazenamento.
 */
import type { QueryClient } from "@tanstack/query-core";

const STORAGE_KEY = "driver_query_cache_v1";
const PERSIST_DEBOUNCE_MS = 1500;

// Prefixos de queryKey[0] (string) que devem ser persistidos
const PERSISTED_PREFIXES = [
  "equipment",
  "equipment-movements",
  "equipment-stop-history",
  "profile",
  "daily-shift-records",
  "user-roles",
];

function shouldPersist(queryKey: readonly unknown[]): boolean {
  const k = queryKey?.[0];
  if (typeof k !== "string") return false;
  return PERSISTED_PREFIXES.some((p) => k === p || k.startsWith(p));
}

interface PersistedEntry {
  queryKey: readonly unknown[];
  data: unknown;
}

export function hydrateQueryCache(qc: QueryClient): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as PersistedEntry[];
    for (const { queryKey, data } of entries) {
      if (data !== undefined && shouldPersist(queryKey)) {
        qc.setQueryData(queryKey, data);
      }
    }
  } catch (e) {
    console.warn("[queryCachePersister] hydrate failed", e);
  }
}

export function startQueryCachePersistence(qc: QueryClient): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const save = () => {
    try {
      const entries: PersistedEntry[] = qc
        .getQueryCache()
        .getAll()
        .filter((q) => shouldPersist(q.queryKey))
        .filter((q) => q.state.data !== undefined && q.state.status === "success")
        .map((q) => ({ queryKey: q.queryKey, data: q.state.data }));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      // Quota etc. — ignora silenciosamente
      console.warn("[queryCachePersister] save failed", e);
    }
  };

  const scheduleSave = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, PERSIST_DEBOUNCE_MS);
  };

  const unsubscribe = qc.getQueryCache().subscribe((event) => {
    if (event.type === "updated" || event.type === "added") {
      scheduleSave();
    }
  });

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}
