import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Shield } from "lucide-react";
import { allNavItems, type NavItem } from "./AppSidebar";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useUserNavOrder } from "@/hooks/useUserNavOrder";
import { useNavVisibilityRules } from "@/hooks/useNavVisibilityRules";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/hooks/useAuth";
import logoPrincipal from "@/assets/logo-principal.png";

import cipaLogo from "@/assets/cipa-logo.png.asset.json";
import { ContractNumberBadge } from "./ContractNumberBadge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";


/**
 * Desktop-only top navigation header.
 * Renders nav items in a horizontal scrollable row replacing the lateral sidebar.
 */
export function TopNavHeader() {
  const location = useLocation();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const { navOrder } = useUserNavOrder();
  const { getHiddenItemsForCargo } = useNavVisibilityRules();
  const { settings } = useSiteSettings();
  const { signOut } = useAuth();


  const effectiveNavOrder = useMemo(() => {
    if (isAdmin) {
      return Array.isArray(settings?.nav_order) && settings.nav_order.length > 0
        ? settings.nav_order
        : navOrder;
    }
    return navOrder;
  }, [isAdmin, navOrder, settings?.nav_order]);

  const visibleNavItems = useMemo(() => {
    const dynamicHiddenItems = profile?.cargo ? getHiddenItemsForCargo(profile.cargo) : [];
    return allNavItems.filter((item) => {
      if (isAdmin) return true;
      if (dynamicHiddenItems.includes(item.id)) return false;
      if (item.hiddenFrom && profile?.cargo && item.hiddenFrom.includes(profile.cargo)) return false;
      if (!item.restrictedTo) return true;
      if (profile?.cargo && item.restrictedTo.includes(profile.cargo)) return true;
      return false;
    });
  }, [isAdmin, profile?.cargo, getHiddenItemsForCargo]);

  const orderedNavItems = useMemo<NavItem[]>(() => {
    if (!effectiveNavOrder || effectiveNavOrder.length === 0) return visibleNavItems;
    const ordered: NavItem[] = [];
    effectiveNavOrder.forEach((id: string) => {
      const item = visibleNavItems.find((nav) => nav.id === id);
      if (item) ordered.push(item);
    });
    visibleNavItems.forEach((item) => {
      if (!ordered.find((o) => o.id === item.id)) ordered.push(item);
    });
    return ordered;
  }, [effectiveNavOrder, visibleNavItems]);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav className="hidden md:flex shrink-0 w-full border-b-0 bg-sidebar text-sidebar-foreground relative z-30 after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-10 after:h-10 after:pointer-events-none after:bg-[linear-gradient(to_bottom,hsl(var(--sidebar-background))_0%,hsl(var(--sidebar-background)/0.65)_45%,hsl(var(--sidebar-background)/0.25)_80%,transparent_100%)]">
      <div className="flex items-center gap-1 lg:gap-2 px-1 lg:px-2 py-2 w-full max-w-full">
        <div className="relative shrink-0 w-[70px] lg:w-[100px] xl:w-[130px] flex justify-center">
          {/* Logo movida para o rodapé inferior centralizado */}
          {profile?.avatar_url && (
            <>
              {/* Extensão da barra descendo atrás da foto, centralizada com a logo */}
              <div
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 -top-2 h-[130px] w-[80px] bg-sidebar rounded-b-[28px] z-30 pointer-events-none"
              />
              <ContractNumberBadge />

              <Link
                to="/configuracoes"
                className="absolute left-1/2 -translate-x-1/2 top-[60px] z-40"
                title={profile?.full_name || "Meu perfil"}
              >
                <img loading="lazy" decoding="async"
                  src={profile.avatar_url}
                  alt="Foto de perfil"
                  className="h-14 w-14 rounded-full object-cover drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] hover:scale-105 transition-transform"
                />

              </Link>


            </>
          )}
        </div>



        <div className="flex-1 min-w-0 relative z-50 overflow-hidden">
          <ul className="flex items-center justify-center flex-nowrap gap-x-0 w-full overflow-x-auto overflow-y-hidden overscroll-x-contain whitespace-nowrap scrollbar-none">

            {orderedNavItems.map((item) => {
              const active = isActive(item.path);
              return (
                <li key={item.id} className="shrink-0">
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center justify-center px-0.5 md:px-1 lg:px-1.5 xl:px-2 py-1 rounded-md whitespace-nowrap transition-all text-center",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active && !item.isEmergency && "topnav-active-glow font-medium",
                      active && item.isEmergency && "topnav-active-emergency font-medium",
                      item.isEmergency && "text-red-500 hover:text-red-400"
                    )}
                    title={item.label}
                  >
                    {item.id === "cipa" ? (
                      <img loading="lazy" decoding="async" src={cipaLogo.url} alt="CIPA" className="h-7 w-7 lg:h-9 lg:w-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
                    ) : (
                      <span className={cn("font-topnav text-[9px] md:text-[10px] lg:text-[12px] xl:text-[15px] leading-tight", item.isEmergency && "emergency-neon", item.id === "destaques" && "font-weghorst")}>{item.label}</span>
                    )}
                  </Link>

                </li>
              );
            })}
          </ul>
        </div>

        {/* Espelho direito para manter as mesmas margens laterais da barra */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              const userName = profile?.full_name || "Usuário";
              const userAvatar = profile?.avatar_url || undefined;
              const userCargo = profile?.cargo || undefined;

              sessionStorage.setItem("logoutTransitionInProgress", "true");
              sessionStorage.setItem("logoutTransitionPayload", JSON.stringify({
                userName,
                userAvatar,
                userCargo,
              }));
              window.dispatchEvent(new Event("logout-transition"));
              setTimeout(async () => {
                await signOut();
              }, 100);
            }}
            className="text-sidebar-foreground/70 hover:text-red-400 transition-colors shadow-none border-none bg-transparent hover:bg-red-400/10"
            title="Sair do sistema"
          >
            <LogOut className="h-5 w-5" />
          </Button>
          <div aria-hidden className="hidden 2xl:block shrink-0 w-[130px]" />
        </div>
      </div>
    </nav>
  );
}
