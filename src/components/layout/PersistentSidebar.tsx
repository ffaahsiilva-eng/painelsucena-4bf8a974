import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopNavHeader } from "./TopNavHeader";
import { DockNavigation } from "./DockNavigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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

  if (!layoutReady) {
    return (
      <div className="h-screen w-full grid place-items-center bg-background" data-layout={layoutMode}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const DEFAULT_BG_URL =
    "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=2560&q=80";
  const globalBgUrl = settings?.global_background_url || DEFAULT_BG_URL;
  const isVideoBg = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(globalBgUrl);

  return (
    <SidebarProvider defaultOpen={isAvatarBlocked ? false : !isMobile}>
      <div
        className={`sucena-app w-full ${hasDesktopChrome ? "sucena-app--chrome" : "sucena-app--plain"} app-shell`}
        data-has-global-bg="true"
        data-layout={layoutMode}
      >
        {isVideoBg ? (
          <video
            src={globalBgUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/logo-sucena-pdf.png"
            className="sucena-bg-photo object-cover"
          />
        ) : (
          <div
            className="sucena-bg-photo"
            style={{ backgroundImage: `url(${globalBgUrl})` }}
          />
        )}
        <div className="sucena-bg-overlay" />
        <div className="sucena-bg-haze" />

        {hasDesktopChrome && (
          <div className={justCompletedTransition ? "animate-fade-in" : ""}>
            <AppSidebar lockedCollapsed={!!isAvatarBlocked} />
          </div>
        )}

        <div
          className={`sucena-main ${hasDesktopChrome ? "sucena-main--chrome" : "sucena-main--plain"} ${
            justCompletedTransition ? "animate-fade-in" : ""
          }`}
        >
          {hasDesktopChrome && !isAvatarBlocked && !isMobile && <TopNavHeader />}

          {!isDriver && hasDesktopChrome && (
            <SidebarTrigger
              aria-label="Abrir menu"
              className="fixed bottom-24 left-2 z-[101] md:hidden !h-8 !w-8 !min-h-0 !min-w-0 rounded-full bg-[#b58a48] text-white border border-white/60 shadow-lg p-0 flex items-center justify-center [&_svg]:!h-4 [&_svg]:!w-4"
            />
          )}

          <main className={`sucena-content ${hasDesktopChrome ? "sucena-content--chrome" : "sucena-content--plain"}`}>
            {children}
          </main>
        </div>

        {useDock && !isAuthPage && <DockNavigation />}
      </div>
    </SidebarProvider>
  );
};
