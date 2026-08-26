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

interface PersistentSidebarProps {
  children: ReactNode;
}

const DRIVER_ROLES = ["motorista_pipa", "motorista_munk"];

export const PersistentSidebar = ({ children }: PersistentSidebarProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { settings } = useSiteSettings();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [justCompletedTransition, setJustCompletedTransition] = useState(false);

  const isAuthPage = location.pathname === "/auth";
  const isEnvSelectionPage = location.pathname === "/selecao-ambiente";
  const isDriver = profile?.cargo && DRIVER_ROLES.includes(profile.cargo);
  const isAvatarBlocked = user && profile && (!profile.avatar_url || profile.avatar_url.trim().length === 0) && !isDriver;
  
  // Use global theme from site_settings
  const uiTheme = settings?.ui_theme || "classic";
  const useDock = user && !isDriver && !isAvatarBlocked && !isEnvSelectionPage && uiTheme === "macos-dock";

  // Apply global theme colors and background settings from site_settings
  // Optimized: useMemo style object to avoid frequent DOM mutations
  useEffect(() => {
    const root = document.documentElement;
    const primaryColor = settings?.primary_color;
    
    // Batch DOM updates
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

  // Wait only for auth/profile. Remote visual settings must never block the
  // whole app, otherwise transient network/cache aborts leave the preview in an
  // infinite spinner.
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

  useEffect(() => {
    const handler = () => {
    };
    window.addEventListener("logout-transition", handler);
    return () => window.removeEventListener("logout-transition", handler);
  }, []);

  if (!layoutReady) {
    return (
      <div className="h-screen w-full grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const DEFAULT_BG_URL = "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=2560&q=80"; // Mountains landscape
  const globalBgUrl = settings?.global_background_url || DEFAULT_BG_URL;
  const isVideoBg = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(globalBgUrl);

  return (
    <SidebarProvider defaultOpen={isAvatarBlocked ? false : !isMobile}>
      <div 
        className={`h-screen flex flex-row w-full overflow-x-clip overflow-y-hidden bg-transparent`}
        data-has-global-bg="true"
      >
        {user && !isDriver && !useDock && !isAuthPage && !isEnvSelectionPage && (
          <div className={`overflow-visible ${justCompletedTransition ? "animate-fade-in" : ""}`}>
            <AppSidebar lockedCollapsed={!!isAvatarBlocked} />
          </div>
        )}
        <div
          className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden relative ${
            justCompletedTransition ? "animate-fade-in" : ""
          }`}
        >
          {isVideoBg ? (
            <video
              src={globalBgUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              poster="/logo-sucena-pdf.png"
              className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0 transition-opacity duration-300"

              style={{ opacity: settings?.global_background_opacity ?? 0.1 }}
            />
          ) : (
            <div 
              className="fixed inset-0 pointer-events-none z-0 bg-center bg-cover bg-no-repeat transition-opacity duration-300"
              style={{ 
                backgroundImage: `url(${globalBgUrl})`,
                opacity: settings?.global_background_opacity ?? 0.15
              }}
            />
          )}

          <div className="relative z-10 flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {user && !isDriver && !useDock && !isAuthPage && !isEnvSelectionPage && !isAvatarBlocked && !isMobile && (
              <TopNavHeader />
            )}
            {!isDriver && (
              <SidebarTrigger
                aria-label="Abrir menu"
                className="fixed bottom-24 left-2 z-[101] md:hidden !h-7 !w-7 !min-h-0 !min-w-0 rounded-full bg-sidebar-accent/85 backdrop-blur-sm border border-sidebar-border/50 text-sidebar-foreground/90 shadow-lg p-0 flex items-center justify-center [&_svg]:!h-3.5 [&_svg]:!w-3.5 [&_img]:!h-3.5 [&_img]:!w-3.5"
              />
            )}
            {children}
          </div>
        </div>
        {useDock && !isAuthPage && <DockNavigation />}
      </div>
    </SidebarProvider>
  );
};
