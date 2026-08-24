import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MacOSDock from "@/components/ui/mac-os-dock";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useUserNavOrder } from "@/hooks/useUserNavOrder";
import { useNavVisibilityRules } from "@/hooks/useNavVisibilityRules";
import {
  Users, ClipboardList, Grid3X3, LayoutDashboard, FileBarChart,
  Sun, Truck, Bell, FileText, Heart, ShoppingCart,
  Package, FolderOpen, ShieldCheck, Leaf, Hammer, ClipboardCheck,
  BadgeCheck, Link2, ArrowLeftRight, Clock, FolderLock, Droplets,
  Wrench, Presentation, Newspaper, HardHat, CalendarDays, Gamepad2,
  TriangleAlert, Target, Receipt, FlameKindling, AlertTriangle, Shield, Warehouse, Settings, type LucideIcon
} from "lucide-react";

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
  isEmergency?: boolean;
  restrictedTo?: string[];
  hiddenFrom?: string[];
}

const allNavItems: NavItem[] = [
  { id: "destaques", icon: LayoutDashboard, label: "Destaques", path: "/" },
  { id: "lembretes", icon: Bell, label: "Lembretes", path: "/lembretes" },
  { id: "instacena", icon: Newspaper, label: "InstaCena", path: "/instacena" },
  { id: "almoxarifado", icon: Warehouse, label: "Almoxarifado", path: "/almoxarifado" },
  { id: "arquivos-seguranca", icon: FolderLock, label: "Documentos", path: "/arquivos-seguranca" },
  { id: "equipamentos", icon: Settings, label: "Equipamentos", path: "/equipamentos" },
  { id: "seguranca", icon: Shield, label: "Segurança", path: "/seguranca" },
  { id: "rh-hub", icon: Users, label: "RH", path: "/recursos-humanos" },
  { id: "rdo-hub", icon: FileText, label: "Relatório Diário Obra", path: "/relatorio-diario-obra" },
  { id: "meio-ambiente", icon: Leaf, label: "Meio Ambiente", path: "/meio-ambiente" },
  { id: "planejamento", icon: Target, label: "Planejamento", path: "/planejamento" },
  { id: "emergencia", icon: AlertTriangle, label: "Emergência", path: "/emergencia", isEmergency: true },
];

export const DockNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const { navOrder } = useUserNavOrder();
  const { settings } = useSiteSettings();
  const { getHiddenItemsForCargo } = useNavVisibilityRules();

  const effectiveNavOrder = useMemo(() => {
    if (isAdmin) {
      return Array.isArray(settings?.nav_order) && settings.nav_order.length > 0
        ? settings.nav_order : navOrder;
    }
    return navOrder;
  }, [isAdmin, navOrder, settings?.nav_order]);

  const visibleNavItems = useMemo(() => {
    const dynamicHiddenItems = profile?.cargo ? getHiddenItemsForCargo(profile.cargo) : [];
    return allNavItems.filter(item => {
      if (isAdmin) return true;
      if (dynamicHiddenItems.includes(item.id)) return false;
      if (item.hiddenFrom && profile?.cargo && item.hiddenFrom.includes(profile.cargo)) return false;
      if (!item.restrictedTo) return true;
      return profile?.cargo ? item.restrictedTo.includes(profile.cargo) : false;
    });
  }, [isAdmin, profile?.cargo, getHiddenItemsForCargo]);

  const orderedNavItems = useMemo(() => {
    if (!effectiveNavOrder || effectiveNavOrder.length === 0) return visibleNavItems;
    const ordered: NavItem[] = [];
    effectiveNavOrder.forEach((id: string) => {
      const item = visibleNavItems.find(nav => nav.id === id);
      if (item) ordered.push(item);
    });
    visibleNavItems.forEach(item => {
      if (!ordered.find(o => o.id === item.id)) ordered.push(item);
    });
    return ordered;
  }, [effectiveNavOrder, visibleNavItems]);

  const dockApps = useMemo(() => {
    return orderedNavItems.map(item => ({
      id: item.id,
      name: item.label,
      icon: <item.icon className="h-4 w-4" />,
      isActive: location.pathname === item.path,
      isEmergency: item.isEmergency,
    }));
  }, [orderedNavItems, location.pathname]);

  const pathMap = useMemo(() => {
    const map: Record<string, string> = {};
    orderedNavItems.forEach(item => { map[item.id] = item.path; });
    return map;
  }, [orderedNavItems]);

  const handleAppClick = (appId: string) => {
    const path = pathMap[appId];
    if (path) navigate(path);
  };

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 max-w-[98vw]">
      <MacOSDock
        apps={dockApps}
        onAppClick={handleAppClick}
      />
    </div>
  );
};
