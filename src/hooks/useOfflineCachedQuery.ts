import { useState, useEffect, useCallback } from "react";
import { setCachedData, getCachedData } from "@/lib/offlineDb";

interface CacheOptions {
  /** Cache key - should be unique per query */
  cacheKey: string;
  /** Time to live in seconds (default: 3600 = 1 hour) */
  ttl?: number;
  /** Whether to fetch fresh data when online (default: true) */
  fetchWhenOnline?: boolean;
  /** Whether to return stale cache while fetching (default: true) */
  staleWhileRevalidate?: boolean;
}

interface CachedQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isFromCache: boolean;
  isStale: boolean;
  refetch: () => Promise<void>;
  lastFetched: Date | null;
}

/**
 * Hook for offline-first data fetching with IndexedDB caching
 * 
 * @param fetcher - Async function that fetches data
 * @param options - Cache configuration options
 * @returns Cached query result with data, loading state, and cache info
 * 
 * @example
 * ```tsx
 * const { data, isLoading, isFromCache } = useOfflineCachedQuery(
 *   async () => {
 *     const { data } = await supabase.from('equipment').select('*');
 *     return data;
 *   },
 *   { cacheKey: 'equipment-list', ttl: 300 }
 * );
 * ```
 */
export function useOfflineCachedQuery<T>(
  fetcher: () => Promise<T>,
  options: CacheOptions
): CachedQueryResult<T> {
  const {
    cacheKey,
    ttl = 3600,
    fetchWhenOnline = true,
    staleWhileRevalidate = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchAndCache = useCallback(async (showLoading = true) => {
    if (showLoading && !staleWhileRevalidate) {
      setIsLoading(true);
    }

    try {
      const freshData = await fetcher();
      
      // Cache the fresh data
      await setCachedData(cacheKey, freshData, ttl);
      
      setData(freshData);
      setIsFromCache(false);
      setIsStale(false);
      setLastFetched(new Date());
      setError(null);
    } catch (err) {
      console.error(`Error fetching data for cache key "${cacheKey}":`, err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      
      // If we have cached data, keep using it
      if (!data) {
        // Try to get from cache as fallback
        const cached = await getCachedData<T>(cacheKey);
        if (cached) {
          setData(cached);
          setIsFromCache(true);
          setIsStale(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, fetcher, ttl, staleWhileRevalidate, data]);

  const refetch = useCallback(async () => {
    if (!navigator.onLine) {
      return;
    }
    await fetchAndCache(true);
  }, [fetchAndCache, cacheKey]);

  // Initial load - try cache first, then fetch if online
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);

      // 1. Try to get from cache first
      try {
        const cached = await getCachedData<T>(cacheKey);
        
        if (cached && isMounted) {
          setData(cached);
          setIsFromCache(true);
          
          // If we're online and should fetch fresh data
          if (navigator.onLine && fetchWhenOnline) {
            setIsStale(true);
            
            if (staleWhileRevalidate) {
              // Show cached data immediately, fetch in background
              setIsLoading(false);
              fetchAndCache(false);
            } else {
              // Wait for fresh data
              await fetchAndCache(true);
            }
          } else {
            // Offline or not fetching - use cache
            setIsLoading(false);
          }
          return;
        }
      } catch (cacheError) {
        console.warn(`Cache read error for "${cacheKey}":`, cacheError);
      }

      // 2. No cache - try to fetch if online
      if (navigator.onLine && isMounted) {
        await fetchAndCache(true);
      } else if (isMounted) {
        // Offline and no cache
        setIsLoading(false);
        setError(new Error("Offline e sem dados em cache"));
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [cacheKey]); // Only re-run when cache key changes

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      // When coming back online, refetch to get fresh data
      if (data && isFromCache) {
        fetchAndCache(false);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [data, isFromCache, fetchAndCache]);

  return {
    data,
    isLoading,
    error,
    isFromCache,
    isStale,
    refetch,
    lastFetched,
  };
}

/**
 * Prefetch data and store in cache for offline use
 */
export async function prefetchForOffline<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  try {
    const data = await fetcher();
    await setCachedData(cacheKey, data, ttl);
    return true;
  } catch (error) {
    console.error(`Error prefetching "${cacheKey}":`, error);
    return false;
  }
}

/**
 * Cache keys used in the driver panel
 */
export const CACHE_KEYS = {
  EQUIPMENT_LIST: "driver_equipment_list",
  SELECTED_EQUIPMENT: (id: string) => `driver_equipment_${id}`,
  SHIFT_RECORDS: (date: string) => `driver_shift_records_${date}`,
  REFUELING_POINTS: "driver_refueling_points",
  PROFILE: "driver_profile",
} as const;
