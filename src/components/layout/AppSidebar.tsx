import * as React from "react";
import { Users, ClipboardList, Grid3X3, LayoutDashboard, FileBarChart, LogOut, LogIn, AlertTriangle, PanelLeftClose, PanelLeft, Settings, Sun, Truck, Bell, FileText, LucideIcon, Heart, ShoppingCart, Package, GripVertical, User, FolderOpen, ShieldCheck, Leaf, Hammer, ClipboardCheck, BadgeCheck, Link2, ArrowLeftRight, Clock, FolderLock, Droplets, Wrench, Presentation, Newspaper, HardHat, CalendarDays, Gamepad2, TriangleAlert, Target, Receipt, FlameKindling, Pencil, PencilOff, Shield, Warehouse, Building2, Video, RefreshCw, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { hardRefreshToLatest } from "@/lib/appRefresh";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProfile } from "@/hooks/useProfile";
import { useUserNavOrder } from "@/hooks/useUserNavOrder";
import { useNavVisibilityRules } from "@/hooks/useNavVisibilityRules";
import logoPrincipal from "@/assets/logo-principal.png";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { toast } from "sonner";
import { SidebarBackground } from "./SidebarBackground";
import { ForbiddenColorButton } from "./ForbiddenColorButton";
import { formatCargoLabel } from "@/lib/cargoUtils";
import sidebarCollapsedLogo from "@/assets/sidebar-collapsed-logo.png";
import admIconAsset from "@/assets/adm-icon.png.asset.json";
import { useEditMode } from "@/contexts/EditModeContext";
import { EditableText } from "@/components/cms/EditableText";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ModeratorBadge } from "@/components/ModeratorBadge";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { compressImage } from "@/utils/imageCompression";


export interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
  isEmergency?: boolean;
  restrictedTo?: string[]; // cargo types that can see this item (admin always sees all)
  hiddenFrom?: string[]; // cargo types that CANNOT see this item (admin still sees all)
}

export const allNavItems: NavItem[] = [
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
  { id: "cipa", icon: Heart, label: "CIPA", path: "/cipa" },
];

// Sortable nav item component
function SortableNavItemComponent({
  item,
  isActive,
  isCollapsed,
  showGrip,
  onNavigate,
  editMode,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  showGrip: boolean;
  onNavigate?: () => void;
  editMode?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id } as any);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <SidebarMenuItem ref={setNodeRef} style={style}>
      <SidebarMenuButton
        asChild
        tooltip={item.label}
        className="group !p-0 bg-transparent hover:bg-transparent hover:text-inherit !shadow-none border-none outline-none h-auto"
      >
        <Link 
          to={item.path} 
          onClick={onNavigate} 
          className="sucena-nav-item w-full gap-2 py-1.5 px-3"
          data-active={isActive}
        >
          {!isCollapsed && showGrip && (
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              onClick={(e) => e.preventDefault()}
            >
              <GripVertical className="h-4 w-4 opacity-50" />
            </span>
          )}
          <item.icon
            className={`h-5 w-5 flex-shrink-0 ${
              item.isEmergency ? "text-red-500 animate-pulse" : ""
            }`}
          />
          <span className="flex-1 min-w-0 flex items-center">
            <EditableText
              pageKey="sidebar"
              elementKey={`nav-${item.id}`}
              defaultValue={item.label}
              className={`font-medium text-xs md:text-[13px] truncate block w-full ${item.isEmergency ? "text-red-500" : ""}`}
              as="span"
              canEdit={!!editMode}
            />
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
const SortableNavItem = React.memo(SortableNavItemComponent);

export function AppSidebar({ lockedCollapsed = false }: { lockedCollapsed?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isModerator } = useIsAdmin();
  const { isEditMode, toggleEditMode, canEdit } = useEditMode();
  const { state, toggleSidebar, setOpen, isMobile: sidebarIsMobile, setOpenMobile } = useSidebar();
  const { settings, updateSettings } = useSiteSettings();
  const { data: profile } = useProfile();
  const { navOrder } = useUserNavOrder();
  const { getHiddenItemsForCargo } = useNavVisibilityRules();
  const isCollapsed = state === "collapsed";
  const logoEditRef = React.useRef<HTMLInputElement>(null);

  const handleLogoEditUpload = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await (await import("@/integrations/supabase/client")).supabase.storage
        .from("site-assets").upload(path, await compressImage(file), { upsert: true });
      if (upErr) throw upErr;
      const { data } = await (await import("@/integrations/supabase/client")).supabase.storage
        .from("site-assets").createSignedUrl(path, 315360000, { transform: { width: 500, height: 500, resize: 'contain' } });
      if (!data?.signedUrl) throw new Error("Erro ao gerar URL");
      await updateSettings.mutateAsync({ logo_url: data.signedUrl });
    } catch (err) {
      console.error("Logo upload error:", err);
    }
    if (logoEditRef.current) logoEditRef.current.value = "";
  }, [updateSettings]);

  const handleMobileClose = React.useCallback(() => {
    if (sidebarIsMobile) {
      setOpenMobile(false);
    }
  }, [sidebarIsMobile, setOpenMobile]);

  // Force collapsed state when locked
  React.useEffect(() => {
    if (lockedCollapsed) {
      setOpen(false);
    }
  }, [lockedCollapsed, setOpen]);

  // Admin sempre edita/visualiza a ordem GLOBAL do menu.
  // Usuários comuns seguem a hierarquia definida no hook (ordem pessoal -> global -> default).
  const effectiveNavOrder = useMemo(() => {
    if (isAdmin) {
      return Array.isArray(settings?.nav_order) && settings.nav_order.length > 0
        ? settings.nav_order
        : navOrder;
    }
    return navOrder;
  }, [isAdmin, navOrder, settings?.nav_order]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter nav items based on permissions
  const visibleNavItems = useMemo(() => {
    // Get dynamically hidden items from the database for this user's cargo
    const dynamicHiddenItems = profile?.cargo ? getHiddenItemsForCargo(profile.cargo) : [];
    
    return allNavItems.filter(item => {
      // If admin, show everything
      if (isAdmin) return true;
      
      // Check if item is dynamically hidden for this cargo
      if (dynamicHiddenItems.includes(item.id)) {
        return false;
      }
      
      // Check if user's cargo is in the hardcoded hidden list (legacy)
      if (item.hiddenFrom && profile?.cargo && item.hiddenFrom.includes(profile.cargo)) {
        return false;
      }
      
      // If no restrictions, show to everyone
      if (!item.restrictedTo) return true;
      
      // Check if user's cargo is in the allowed list
      if (profile?.cargo && item.restrictedTo.includes(profile.cargo)) {
        return true;
      }
      
      return false;
    });
  }, [isAdmin, profile?.cargo, getHiddenItemsForCargo]);

  // Order nav items based on user's personal nav order
  const orderedNavItems = useMemo(() => {
    if (!effectiveNavOrder || effectiveNavOrder.length === 0) {
      return visibleNavItems;
    }
    
    const ordered: NavItem[] = [];
    effectiveNavOrder.forEach((id: string) => {
      const item = visibleNavItems.find(nav => nav.id === id);
      if (item) ordered.push(item);
    });
    
    // Add any items not in the order (shouldn't happen but safety)
    visibleNavItems.forEach(item => {
      if (!ordered.find(o => o.id === item.id)) {
        ordered.push(item);
      }
    });
    
    return ordered;
  }, [effectiveNavOrder, visibleNavItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    // Only admins can reorder the global sidebar
    if (!isAdmin) return;
    
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedNavItems.findIndex((item) => item.id === active.id);
      const newIndex = orderedNavItems.findIndex((item) => item.id === over.id);

      const newVisibleOrder = arrayMove(orderedNavItems, oldIndex, newIndex);
      const newVisibleIds = newVisibleOrder.map((item) => item.id);
      
      // Preserve hidden items' positions from the original nav_order
      // (para admin, a referência deve ser a ordem global)
      const currentNavOrder =
        (Array.isArray(settings?.nav_order) && settings.nav_order.length > 0
          ? settings.nav_order
          : allNavItems.map((item) => item.id));
      const hiddenIds = currentNavOrder.filter((id: string) => !visibleNavItems.find(item => item.id === id));
      
      // Build final order: start with all items from allNavItems in their relative positions
      const allItemIds = allNavItems.map(item => item.id);
      const finalOrder: string[] = [];
      
      // For each position, check if it should be a visible item (from new order) or hidden item
      let visibleIndex = 0;
      
      for (const itemId of allItemIds) {
        if (newVisibleIds.includes(itemId)) {
          // This is a visible item - use the new order
          if (visibleIndex < newVisibleIds.length) {
            finalOrder.push(newVisibleIds[visibleIndex]);
            visibleIndex++;
          }
        } else if (hiddenIds.includes(itemId)) {
          // This is a hidden item - preserve its position
          finalOrder.push(itemId);
        }
      }
      
      // Add any remaining visible items
      while (visibleIndex < newVisibleIds.length) {
        if (!finalOrder.includes(newVisibleIds[visibleIndex])) {
          finalOrder.push(newVisibleIds[visibleIndex]);
        }
        visibleIndex++;
      }

      // Admin saves to global site_settings
      updateSettings.mutate({ nav_order: finalOrder }, {
        onSuccess: () => {
          toast.success("Ordem global do menu salva!");
        },
        onError: () => {
          toast.error("Erro ao salvar ordem do menu");
        },
      });
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      const names = profile.full_name.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0].substring(0, 2).toUpperCase();
    }
    return "US";
  };

  const handleSignOut = async () => {
    // Get user info before signing out for the transition
    const userName = profile?.full_name || "Usuário";
    const userAvatar = profile?.avatar_url || undefined;
    const userCargo = profile?.cargo || undefined;

    // Start logout transition
    sessionStorage.setItem("logoutTransitionInProgress", "true");
    sessionStorage.setItem("logoutTransitionPayload", JSON.stringify({
      userName,
      userAvatar,
      userCargo,
    }));
    window.dispatchEvent(new Event("logout-transition"));
    
    // Pequeno delay para garantir que o evento foi processado antes do signOut
    setTimeout(async () => {
      await signOut();
    }, 100);

    // The redirect will happen after the animation completes in LogoutTransitionGate
  };

  return (
    <Sidebar
      collapsible="icon"
      className="sucena-sidebar border-none h-screen"
      style={{ width: "var(--sidebar-w)", "--sidebar-width": "var(--sidebar-w)" } as any}
    >
      <SidebarHeader className={`sucena-sidebar-header border-none relative z-10 ${isCollapsed ? "px-2 pt-6" : "px-0"}`}>
        {!isCollapsed ? (
          <div className="sucena-contract-block">
            <span className="sucena-contract-label">CONTRATO</span>
            <strong className="sucena-contract-number">460001269</strong>
          </div>
        ) : (
          <div className="sucena-contract-collapsed">4600</div>
        )}
      </SidebarHeader>

      {user && !isCollapsed && (
        <div className="sucena-sidebar-profile relative z-10">
          <NeonAvatar
            src={profile?.avatar_url}
            name={profile?.full_name || "Usuário"}
            frameColor={profile?.frame_color}
            neonColor={profile?.neon_color}
            frameAnimation={profile?.frame_animation}
            size="sidebar"
          />
          <div className="sucena-sidebar-profile-copy">
            <p className="sucena-sidebar-name">{profile?.full_name || "Usuário"}</p>
            <p className="sucena-sidebar-role">{formatCargoLabel(profile?.cargo) || "Membro"}</p>
          </div>
          <div className="sucena-sidebar-divider" />
          
          <div className="mt-4 flex justify-center w-full relative z-10 px-1 lg:px-2">
            <button
              onClick={async () => {
                await hardRefreshToLatest({ clearVisualState: true });
              }}
              className="sucena-sidebar-refresh flex w-[95%] lg:w-[90%] justify-center items-center gap-1 lg:gap-1.5 px-1 lg:px-2 py-1.5 rounded-full bg-[#2a2d30]/90 border border-white/10 shadow-lg hover:bg-black/60 transition-colors"
              aria-label="Recarregar sistema"
            >
              <RefreshCw className="h-2.5 w-2.5 lg:h-3.5 lg:w-3.5 flex-shrink-0 text-white animate-[spin_10s_linear_infinite] hover:animate-[spin_2s_linear_infinite]" />
              <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold tracking-tight uppercase !text-white !block truncate" style={{ color: 'white', display: 'block' }}>
                Recarregar
              </div>
            </button>
          </div>
          <ForbiddenColorButton />
        </div>
      )}



      <SidebarContent className="relative z-10 md:hidden">
        <ScrollArea className="flex-1">
          <SidebarGroup className="py-2">
            <SidebarGroupContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedNavItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <SidebarMenu>
                    {orderedNavItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <React.Fragment key={item.id}>
                          <SortableNavItem
                            item={item}
                            isActive={isActive}
                            isCollapsed={isCollapsed}
                            showGrip={isAdmin}
                            onNavigate={handleMobileClose}
                            editMode={isEditMode}
                          />
                        </React.Fragment>
                      );
                    })}
                  </SidebarMenu>
                </SortableContext>
              </DndContext>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className={`sucena-sidebar-footer border-none relative z-10 safe-area-inset-bottom ${isCollapsed ? "p-2" : "px-4 pb-7"}`}>
        {user ? (
          <div className="flex flex-col gap-2 w-full">
            <div className={`sucena-sidebar-actions justify-center ${isCollapsed ? "flex-col" : "flex-row"}`}>
              {isAdmin && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to="/admin"
                        className="sucena-sidebar-action-icon w-auto px-2 flex items-center justify-center transition-transform hover:scale-110 relative rounded-md"
                        aria-label="Painel Admin"
                      >
                        <span className="text-[10px] font-bold text-[#b58a48] uppercase tracking-wider bg-[#b58a48]/10 border border-[#b58a48]/30 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(181,138,72,0.2)] whitespace-nowrap">
                          ADMIN
                        </span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Painel Admin</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

            </div>

            <div className={`sucena-sidebar-actions justify-between ${isCollapsed ? "flex-col" : "flex-row"}`}>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/configuracoes")}
                        className="sucena-sidebar-action-icon"
                        aria-label="Configurações"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Configurações</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {isAdmin && isEditMode && (
                  <>
                    <input
                      ref={logoEditRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoEditUpload}
                      className="hidden"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => logoEditRef.current?.click()}
                      className="sucena-sidebar-action-icon"
                      aria-label="Alterar logo"
                      title="Alterar logo"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="ghost"
                className={`sucena-sidebar-logout ${isCollapsed ? "h-9 w-9 p-0" : ""}`}
                onClick={handleSignOut}
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
                {!isCollapsed && <span>SAIR</span>}
              </Button>
            </div>
          </div>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Entrar">
                <Link to="/auth">
                  <LogIn className="h-5 w-5" />
                  <span>Entrar</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
