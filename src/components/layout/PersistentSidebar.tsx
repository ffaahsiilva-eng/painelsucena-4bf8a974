import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopNavHeader } from "./TopNavHeader";
import { DockNavigation } from "./DockNavigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MobileTopNav } from "./MobileTopNav";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Loader2 } from "lucide-react";
import { useLayoutMode } from "@/contexts/LayoutModeContext";

interface PersistentSidebarProps {
  children: ReactNode;
}

const DRIVER_ROLES = ["motorista_pipa", "motorista_munk"];

export const PersistentSidebar = ({ children }: PersistentSidebarProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const { settings } = useSiteSettings();
  const { layoutMode } = useLayoutMode();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [justCompletedTransition, setJustCompletedTransition] = useState(false);

  const isAuthPage = location.pathname === "/auth";
  const isEnvSelectionPage = location.pathname === "/selecao-ambiente";
  const isDriver = !!(profile?.cargo && DRIVER_ROLES.includes(profile.cargo));
  const isAvatarBlocked = !!(
    user &&
    profile &&
    (!profile.avatar_url || profile.avatar_url.trim().length === 0) &&
    !isDriver
  );

  const uiTheme = settings?.ui_theme || "classic";
  const useDock = !!(
    user &&
    !isDriver &&
    !isAvatarBlocked &&
    !isEnvSelectionPage &&
    uiTheme === "macos-dock"
  );

  const hasDesktopChrome = !!(
    user &&
    !isDriver &&
    !useDock &&
    !isAuthPage &&
    !isEnvSelectionPage
  );

  useEffect(() => {
    const root = document.documentElement;
    const primaryColor = settings?.primary_color;

    if (primaryColor) {
      root.style.setProperty("--primary", primaryColor);
      root.style.setProperty("--ring", primaryColor);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
    }

    root.style.setProperty("--bg-opacity", settings?.global_background_url ? "0.85" : "1");

    const cardOpacity = settings?.card_opacity ?? 0.45;
    root.style.setProperty("--card-opacity", String(cardOpacity));
    root.style.setProperty("--card-opacity-dark", String(Math.max(0, cardOpacity - 0.1)));

    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--bg-opacity");
      root.style.removeProperty("--card-opacity");
      root.style.removeProperty("--card-opacity-dark");
    };
  }, [settings?.primary_color, settings?.global_background_url, settings?.card_opacity]);

  const layoutReady = isAuthPage || !authLoading;

  useEffect(() => {
    const handler = () => {
      const isActive = sessionStorage.getItem("loginTransitionInProgress") === "true";
      if (!isActive && user) {
        setJustCompletedTransition(true);
        const timeout = setTimeout(() => setJustCompletedTransition(false), 600);
        return () => clearTimeout(timeout);
      }
    };
    window.addEventListener("login-transition", handler);
    return () => window.removeEventListener("login-transition", handler);
  }, [user]);

  const DEFAULT_BG_URL =
    "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=1920&q=60";
  const cachedBgUrl = localStorage.getItem("sucena_global_bg_url");
  const globalBgUrl = settings?.global_background_url || cachedBgUrl || DEFAULT_BG_URL;
  const isVideoBg = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(globalBgUrl);
  
  const [localBgUrl, setLocalBgUrl] = useState<string>(globalBgUrl);

  useEffect(() => {
    if (settings?.global_background_url) {
      localStorage.setItem("sucena_global_bg_url", settings.global_background_url);
    }
  }, [settings?.global_background_url]);

  useEffect(() => {
    let isMounted = true;
    const fetchAndCacheBg = async () => {
      try {
        if (!globalBgUrl || isVideoBg) {
          if (isMounted) setLocalBgUrl(globalBgUrl);
          return;
        }
        
        if ('caches' in window) {
          const cache = await caches.open('sucena-bg-cache-v1');
          const cachedResponse = await cache.match(globalBgUrl);
          
          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            if (isMounted) setLocalBgUrl(URL.createObjectURL(blob));
            return;
          }

          const response = await fetch(globalBgUrl, { mode: 'cors' });
          if (response.ok) {
            await cache.put(globalBgUrl, response.clone());
            const blob = await response.blob();
            if (isMounted) setLocalBgUrl(URL.createObjectURL(blob));
          } else {
            if (isMounted) setLocalBgUrl(globalBgUrl);
          }
        } else {
          if (isMounted) setLocalBgUrl(globalBgUrl);
        }
      } catch (error) {
        console.warn("Could not cache background image, using normal URL", error);
        if (isMounted) setLocalBgUrl(globalBgUrl);
      }
    };
    fetchAndCacheBg();
    return () => { isMounted = false; };
  }, [globalBgUrl, isVideoBg]);

  if (!layoutReady) {
    return (
      <div className="sucena-app w-full app-shell" data-has-global-bg="true" data-layout={layoutMode}>
        {isVideoBg ? (
          <video src={localBgUrl} autoPlay loop muted playsInline preload="metadata" className="sucena-bg-photo object-cover" />
        ) : (
          <div className="sucena-bg-photo" style={{ backgroundImage: `url(${localBgUrl})` }} />
        )}
        <div className="sucena-bg-overlay" />
        <div className="sucena-bg-haze" />
        <div className="h-screen w-full grid place-items-center relative z-50">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }



  return (
    <SidebarProvider defaultOpen={isAvatarBlocked ? false : !isMobile}>
      <div
        className={hasDesktopChrome ? "app-shell-v6" : `sucena-app w-full sucena-app--plain app-shell`}
        data-has-global-bg="true"
        data-layout={layoutMode}
      >
        {isVideoBg ? (
          <video
            src={localBgUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/logo-sucena-pdf.png"
            className={hasDesktopChrome ? "app-bg-v6 object-cover" : "sucena-bg-photo object-cover"}
          />
        ) : (
          <div
            className={hasDesktopChrome ? "app-bg-v6" : "sucena-bg-photo"}
            style={{ backgroundImage: `url(${localBgUrl})` }}
          />
        )}
        
        {hasDesktopChrome ? (
          <div className="app-overlay-v6" />
        ) : (
          <>
            <div className="sucena-bg-overlay" />
            <div className="sucena-bg-haze" />
          </>
        )}

        {hasDesktopChrome && (
          <div className={`app-sidebar-v6 ${justCompletedTransition ? "animate-fade-in" : ""}`}>
            <AppSidebar lockedCollapsed={!!isAvatarBlocked} />
          </div>
        )}

        {hasDesktopChrome && !isAvatarBlocked && !isMobile && (
          <div className="app-topbar-v6">
             <TopNavHeader />
          </div>
        )}
        
        {hasDesktopChrome && !isAvatarBlocked && isMobile && (
          <MobileTopNav />
        )}

        {hasDesktopChrome ? (
          <>
            <main className={`app-main-v6 ${justCompletedTransition ? "animate-fade-in" : ""}`}>
              {children}
            </main>
            <div className="app-footer-v6"></div>
          </>
        ) : (
          <div
            className={`sucena-main sucena-main--plain ${
              justCompletedTransition ? "animate-fade-in" : ""
            }`}
          >
            <main className="sucena-content sucena-content--plain">
              {children}
            </main>
          </div>
        )}

        {useDock && !isAuthPage && <DockNavigation />}
      </div>
    </SidebarProvider>
  );
};
