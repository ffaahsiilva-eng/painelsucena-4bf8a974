import { createContext, useContext, ReactNode } from "react";
import { useOfflineSyncV2, SyncState } from "@/hooks/useOfflineSyncV2";
import { SyncQueueItem } from "@/lib/offlineDb";

interface OfflineSyncContextType extends SyncState {
  addPendingAction: (
    type: SyncQueueItem["type"],
    payload: Record<string, unknown>,
    priority?: number
  ) => Promise<string>;
  syncPendingActions: () => Promise<void>;
  triggerSync: () => void;
  clearPendingActions: () => Promise<void>;
  getPendingActions: () => Promise<SyncQueueItem[]>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | null>(null);

export function OfflineSyncProviderV2({ children }: { children: ReactNode }) {
  const offlineSync = useOfflineSyncV2();

  return (
    <OfflineSyncContext.Provider value={offlineSync}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSyncContextV2() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error(
      "useOfflineSyncContextV2 must be used within an OfflineSyncProviderV2"
    );
  }
  return context;
}
