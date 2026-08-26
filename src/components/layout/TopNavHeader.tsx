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
    <nav className="sucena-topbar hidden md:flex" data-topbar>
      <div className="sucena-topbar-scroll">
        <ul className="sucena-topbar-nav scrollbar-none">
          {orderedNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <li key={item.id} className={cn("sucena-topbar-item-wrap", item.id === "cipa" && "sucena-topbar-cipa-wrap")}>
                <Link
                  to={item.path}
                  className={cn("sucena-topbar-link", item.isEmergency && "text-red-500 hover:text-red-400", item.id === "cipa" && "sucena-topbar-cipa")}
                  data-active={active}
                  title={item.label}
                >
                  {item.id === "cipa" ? (
                    <img loading="lazy" decoding="async" src={cipaLogo.url} alt="CIPA" className="sucena-cipa-icon" />
                  ) : null}
                  {item.id !== "cipa" && (
                    <span className={cn(item.isEmergency && "emergency-neon")}>{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => signOut()}
          className="sucena-topbar-logout"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
