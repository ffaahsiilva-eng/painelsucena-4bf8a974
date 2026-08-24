/// <reference types="vite/client" />

declare const __APP_BUILD_VERSION__: string;
/// <reference types="vite-plugin-pwa/client" />

interface DesktopCaptureSource {
  id: string;
  name: string;
  display_id?: string;
  appIcon?: string | null;
  thumbnail?: string | null;
}

interface Window {
  desktopApp?: {
    isElectron?: boolean;
    reloadToLatest?: () => Promise<boolean>;
    listScreenSources?: () => Promise<DesktopCaptureSource[]>;
  };
}

// Virtual module declarations for PWA
declare module "virtual:pwa-register" {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
