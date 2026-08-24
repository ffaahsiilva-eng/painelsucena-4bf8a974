import { createContext, useContext, ReactNode } from "react";
import { useOfflineSync, PendingAction } from "@/hooks/useOfflineSync";

interface OfflineSyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  addPendingAction: (type: PendingAction["type"], payload: Record<string, unknown>) => string;
  syncPendingActions: () => Promise<void>;
  triggerSync: () => void;
  clearPendingActions: () => void;
  getPendingActions: () => PendingAction[];
}

const OfflineSyncContext = createContext<OfflineSyncContextType | null>(null);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const offlineSync = useOfflineSync();

  return (
    <OfflineSyncContext.Provider value={offlineSync}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSyncContext() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error("useOfflineSyncContext must be used within an OfflineSyncProvider");
  }
  return context;
}
