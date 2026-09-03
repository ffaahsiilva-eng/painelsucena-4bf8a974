/**
 * IndexedDB wrapper for offline data persistence
 * Provides robust storage for cached API data, sync queue, and local state
 */

const DB_NAME = "driver_panel_offline";
const DB_VERSION = 1;

// Store names
export const STORES = {
  SYNC_QUEUE: "sync_queue",
  CACHED_DATA: "cached_data",
  METADATA: "metadata",
} as const;

export interface SyncQueueItem {
  id: string;
  type:
    | "equipment_status"
    | "equipment_movement"
    | "stop_history"
    | "shift_record"
    | "driver_checklist";
  payload: Record<string, unknown>;
  timestamp: string;
  retries: number;
  version: number;
  priority: number; // Higher = more important
}


export interface CachedDataItem {
  key: string;
  data: unknown;
  timestamp: string;
  ttl: number; // Time to live in seconds
}

export interface MetadataItem {
  key: string;
  value: unknown;
}

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize IndexedDB database
 */
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Error opening IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Sync queue store - for pending actions
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" });
        syncStore.createIndex("by_timestamp", "timestamp", { unique: false });
        syncStore.createIndex("by_type", "type", { unique: false });
        syncStore.createIndex("by_priority", "priority", { unique: false });
      }

      // Cached data store - for API responses
      if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
        const cacheStore = db.createObjectStore(STORES.CACHED_DATA, { keyPath: "key" });
        cacheStore.createIndex("by_timestamp", "timestamp", { unique: false });
      }

      // Metadata store - for sync state, last sync time, etc.
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: "key" });
      }
    };
  });

  return dbPromise;
}

/**
 * Generic transaction helper
 */
async function withTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all items from a store
 */
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============ Sync Queue Operations ============

export async function addToSyncQueue(item: Omit<SyncQueueItem, "id" | "version" | "retries">): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullItem: SyncQueueItem = {
    ...item,
    id,
    version: 1,
    retries: 0,
    priority: item.priority ?? 1,
  };

  await withTransaction(STORES.SYNC_QUEUE, "readwrite", (store) => 
    store.add(fullItem)
  );

  return id;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const items = await getAllFromStore<SyncQueueItem>(STORES.SYNC_QUEUE);
  // Strict FIFO by client timestamp — preserves the exact order the driver
  // performed actions offline. Priority is intentionally ignored here so a
  // late high-priority event cannot jump ahead of earlier ones.
  return items.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  await withTransaction(STORES.SYNC_QUEUE, "readwrite", (store) =>
    store.delete(id)
  );
}

export async function updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        const updatedItem = { ...item, ...updates };
        const putRequest = store.put(updatedItem);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve(); // Item not found, nothing to update
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function clearSyncQueue(): Promise<void> {
  await withTransaction(STORES.SYNC_QUEUE, "readwrite", (store) =>
    store.clear()
  );
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_QUEUE, "readonly");
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============ Cached Data Operations ============

export async function setCachedData<T>(key: string, data: T, ttlSeconds: number = 3600): Promise<void> {
  const item: CachedDataItem = {
    key,
    data,
    timestamp: new Date().toISOString(),
    ttl: ttlSeconds,
  };

  await withTransaction(STORES.CACHED_DATA, "readwrite", (store) =>
    store.put(item)
  );
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const item = await withTransaction<CachedDataItem | undefined>(
    STORES.CACHED_DATA,
    "readonly",
    (store) => store.get(key)
  );

  if (!item) return null;

  // Check if cache is expired
  const now = new Date().getTime();
  const cachedTime = new Date(item.timestamp).getTime();
  const expiry = cachedTime + (item.ttl * 1000);

  if (now > expiry) {
    // Cache expired, delete it
    await withTransaction(STORES.CACHED_DATA, "readwrite", (store) =>
      store.delete(key)
    );
    return null;
  }

  return item.data as T;
}

export async function clearExpiredCache(): Promise<number> {
  const db = await initDB();
  const now = new Date().getTime();
  let deletedCount = 0;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CACHED_DATA, "readwrite");
    const store = transaction.objectStore(STORES.CACHED_DATA);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const item = cursor.value as CachedDataItem;
        const cachedTime = new Date(item.timestamp).getTime();
        const expiry = cachedTime + (item.ttl * 1000);

        if (now > expiry) {
          cursor.delete();
          deletedCount++;
        }
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllCachedData(): Promise<void> {
  await withTransaction(STORES.CACHED_DATA, "readwrite", (store) =>
    store.clear()
  );
}

// ============ Metadata Operations ============

export async function setMetadata(key: string, value: unknown): Promise<void> {
  await withTransaction(STORES.METADATA, "readwrite", (store) =>
    store.put({ key, value })
  );
}

export async function getMetadata<T>(key: string): Promise<T | null> {
  const item = await withTransaction<MetadataItem | undefined>(
    STORES.METADATA,
    "readonly",
    (store) => store.get(key)
  );

  return item ? (item.value as T) : null;
}

// ============ Migration from localStorage ============

export async function migrateFromLocalStorage(): Promise<void> {
  const STORAGE_KEY = "driver_panel_pending_actions";
  const LAST_SYNC_KEY = "driver_panel_last_sync";

  try {
    // Migrate pending actions
    const storedActions = localStorage.getItem(STORAGE_KEY);
    if (storedActions) {
      const actions = JSON.parse(storedActions) as Array<{
        id: string;
        type: SyncQueueItem["type"];
        payload: Record<string, unknown>;
        timestamp: string;
        retries: number;
      }>;

      for (const action of actions) {
        await addToSyncQueue({
          type: action.type,
          payload: action.payload,
          timestamp: action.timestamp,
          priority: 1,
        });
      }

      // Clear localStorage after migration
      localStorage.removeItem(STORAGE_KEY);
    }

    // Migrate last sync time
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (lastSync) {
      await setMetadata("lastSyncTime", lastSync);
      localStorage.removeItem(LAST_SYNC_KEY);
    }
  } catch (error) {
    console.error("Error migrating from localStorage:", error);
  }
}

// ============ Database cleanup ============

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    dbPromise = null;
  }
}

// Initialize and migrate on first load
export async function initOfflineDB(): Promise<void> {
  await initDB();
  await migrateFromLocalStorage();
  await clearExpiredCache();
}
