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
    <nav 
      className="hidden md:flex shrink-0 w-full relative z-30 px-6 py-2"
      style={{ minHeight: "68px" }}
    >
      <div 
        className="w-full h-full flex items-center px-4 rounded-b-[18px] shadow-[0_4px_30px_rgba(0,0,0,0.05)] border border-white/40"
        style={{
          background: "rgba(255,255,255,0.52)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="flex-1 min-w-0 relative z-50 overflow-hidden">
          <ul className="flex items-center justify-center flex-nowrap gap-x-2 w-full overflow-x-auto overflow-y-hidden overscroll-x-contain whitespace-nowrap scrollbar-none py-2">
            {orderedNavItems.map((item) => {
              const active = isActive(item.path);
              return (
                <li key={item.id} className="shrink-0 relative">
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center justify-center px-3 md:px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 text-center font-medium",
                      "hover:bg-white/40",
                      active && !item.isEmergency && "bg-white/60 shadow-sm text-[#B38A45]",
                      active && item.isEmergency && "bg-red-500/10 text-red-600",
                      !active && !item.isEmergency && "text-[#6D7175]",
                      item.isEmergency && "text-red-500 hover:text-red-400"
                    )}
                    title={item.label}
                  >
                    {item.id === "cipa" ? (
                      <img loading="lazy" decoding="async" src={cipaLogo.url} alt="CIPA" className="h-6 w-6 object-contain opacity-80 hover:opacity-100" />
                    ) : (
                      <span className={cn("text-[13px] tracking-wide", item.isEmergency && "emergency-neon", item.id === "destaques" && "font-weghorst text-[15px]")}>
                        {item.label}
                      </span>
                    )}
                    
                    {/* Active Indicator Line (Gold) */}
                    {active && !item.isEmergency && (
                      <div className="absolute -bottom-1 left-1/2 w-1/2 h-[3px] bg-[#B38A45] rounded-t-md transform -translate-x-1/2" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
