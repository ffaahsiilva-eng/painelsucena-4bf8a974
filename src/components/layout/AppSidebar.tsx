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
import { formatCargoLabel } from "@/lib/cargoUtils";
import sidebarCollapsedLogo from "@/assets/sidebar-collapsed-logo.png";
import admIconAsset from "@/assets/adm-icon.png.asset.json";
import { useEditMode } from "@/contexts/EditModeContext";
import { EditableText } from "@/components/cms/EditableText";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ModeratorBadge } from "@/components/ModeratorBadge";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  { id: "ia", icon: Sparkles, label: "IA (Gemini)", path: "/ia" },
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
        isActive={isActive}
        tooltip={item.label}
        className="group min-h-[44px] md:min-h-[32px] tap-target"
      >
        <Link to={item.path} onClick={onNavigate} className="flex items-center gap-2 md:gap-1.5 py-1.5">
          {!isCollapsed && showGrip && (
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              onClick={(e) => e.preventDefault()}
            >
              <GripVertical className="h-4 w-4 text-sidebar-foreground/50" />
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
              className={`font-medium text-sm md:text-base truncate block w-full ${item.isEmergency ? "text-red-500" : ""} ${item.id === "destaques" ? "font-weghorst" : ""}`}
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
        .from("site-assets").upload(path, file, { upsert: true });
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

  // Sidebar padrão global — personalizações por usuário foram removidas.
  // Sempre usa os tokens do tema (--sidebar-*) que respeitam tema claro/escuro.
  const sidebarStyle: React.CSSProperties = {};

  const particleColors = useMemo(() => {
    const colors = [settings.login_particles_color || "white"];
    if (settings.login_particles_color2) colors.push(settings.login_particles_color2);
    if (settings.login_particles_color3) colors.push(settings.login_particles_color3);
    return colors;
  }, [settings.login_particles_color, settings.login_particles_color2, settings.login_particles_color3]);

  return (
    <Sidebar collapsible="icon" className="border-r-0 relative shrink-0 h-screen sticky top-0 rounded-r-2xl md:rounded-r-2xl overflow-visible" style={sidebarStyle}>
      {/* Background com animação e cores personalizadas */}
      <div className="absolute inset-0 overflow-hidden rounded-r-2xl pointer-events-none bg-sidebar">
        <SidebarBackground 
          animation={settings.sidebar_animation || "particles"} 
          particleColors={particleColors}
        />
      </div>
      
      {/* Header with Logo - clickable for admin/moderator to change */}
      <SidebarHeader className={`border-sidebar-border/50 relative z-10 ${isCollapsed ? "p-1.5" : "p-2 md:p-3"}`}>
        <div className="flex items-center justify-center">
          {!isCollapsed ? (
            <div className={`relative group ${!settings.logo_url ? "border-b border-sidebar-border/50 w-full pb-2 md:pb-3 flex justify-center" : ""}`}>
              <img loading="lazy" decoding="async" 
                src={settings.logo_url || logoPrincipal} 
                alt="Logo" 
                className={settings.logo_url 
                  ? "h-20 md:h-24 max-w-[200px] md:max-w-[240px] object-contain -mt-2 mb-[-8px] transition-all duration-300" 
                  : "h-10 md:h-12 max-w-[140px] md:max-w-[160px] object-contain"} 
              />
              {isAdmin && isEditMode && (
                <>
                  <input
                    ref={logoEditRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoEditUpload}
                    className="hidden"
                  />
                  <div
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer rounded transition-opacity"
                    onClick={() => logoEditRef.current?.click()}
                  >
                    <span className="text-white text-[10px] font-medium">Trocar</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <img loading="lazy" decoding="async" 
              src={sidebarCollapsedLogo} 
              alt="Logo" 
              className="h-8 w-8 object-contain" 
            />
          )}
        </div>
      </SidebarHeader>

      {/* Floating collapse button - positioned in the middle of sidebar edge, half in half out */}
      {/* Floating collapse button - positioned in the middle of sidebar edge, half in half out */}
      {!sidebarIsMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!lockedCollapsed) toggleSidebar();
          }}
          disabled={lockedCollapsed}
          style={{ height: '32px', width: '32px' }}
          className={`absolute top-1/2 -translate-y-1/2 z-[101] hidden md:flex rounded-full bg-sidebar-accent/90 backdrop-blur-sm border border-sidebar-border/50 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent shadow-lg transition-all items-center justify-center ${isCollapsed ? "-right-10" : "-right-4"} ${
            lockedCollapsed ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Navigation */}
      <SidebarContent className="relative z-10">
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
                          {item.id === "emergencia" && sidebarIsMobile && (
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                tooltip="Recarregar e limpar cache"
                                className="group min-h-[48px]"
                                onClick={async () => {
                                  try {
                                    handleMobileClose();
                                    toast.info("Limpando cache e recarregando...");
                                    await hardRefreshToLatest();
                                  } catch (err) {
                                    console.error(err);
                                    window.location.reload();
                                  }
                                }}
                              >
                                <RefreshCw className="h-5 w-5 flex-shrink-0" />
                                <span className="flex-1 min-w-0 font-medium text-sm md:text-base truncate">
                                  Recarregar
                                </span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )}
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

      {/* Footer */}
      <SidebarFooter className={`border-t border-sidebar-border/50 relative z-10 safe-area-inset-bottom ${isCollapsed ? "p-1 py-4" : "p-2 md:p-2"}`}>
        {user ? (
          <>
            {/* User Info */}
            <div className={`flex flex-col gap-2 ${isCollapsed ? "items-center" : "p-2"}`}>
              <div className={`flex items-center gap-2 md:gap-3 ${isCollapsed ? "justify-center" : ""}`}>
                <NeonAvatar
                  src={profile?.avatar_url}
                  name={profile?.full_name || "Usuário"}
                  frameColor={profile?.frame_color}
                  neonColor={profile?.neon_color}
                  frameAnimation={profile?.frame_animation}
                  size={isCollapsed ? "xs" : "sm"}
                />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-sidebar-foreground">{profile?.full_name || "Usuário"}</p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">{formatCargoLabel(profile?.cargo) || "Membro"}</p>
                  </div>
                )}
              </div>
              
              {/* Horizontal Icon Bar */}
              <div className={`flex items-center justify-around gap-1 w-full mt-1 ${isCollapsed && !sidebarIsMobile ? "flex-col" : "flex-row"}`}>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/admin")}
                    className={`${isCollapsed && !sidebarIsMobile ? "h-8 w-8" : "h-10 w-10"} hover:bg-amber-500/20`}
                    title={isModerator ? "Moderação" : "Administração"}
                  >
                    <img loading="lazy" decoding="async" src={admIconAsset.url} alt="ADM" className="h-6 w-6 object-contain" />
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleEditMode}
                    className={`${isCollapsed && !sidebarIsMobile ? "h-8 w-8" : "h-10 w-10"} transition-colors border-none shadow-none bg-transparent ${
                      isEditMode 
                        ? "text-primary hover:bg-primary/10" 
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                    title={isEditMode ? "Desativar modo edição" : "Ativar modo edição"}
                  >
                    {isEditMode ? <PencilOff className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/selecao-ambiente")}
                    className={`${isCollapsed && !sidebarIsMobile ? "h-8 w-8" : "h-10 w-10"} text-sidebar-foreground/70 hover:text-emerald-500 hover:bg-emerald-500/20`}
                    title="Trocar de ambiente"
                  >
                    <Building2 className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/configuracoes")}
                  className={`${isCollapsed && !sidebarIsMobile ? "h-8 w-8" : "h-10 w-10"} text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent`}
                  title="Configurações"
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className={`${isCollapsed && !sidebarIsMobile ? "h-8 w-8" : "h-10 w-10"} text-sidebar-foreground/70 hover:text-red-500 hover:bg-red-500/20 border-none shadow-none bg-transparent`}
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Entrar">
                <Link to="/auth">
                  <LogIn className="h-5 w-5" />
                  <span className="font-medium">Entrar</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

      </SidebarFooter>
    </Sidebar>
  );
}
