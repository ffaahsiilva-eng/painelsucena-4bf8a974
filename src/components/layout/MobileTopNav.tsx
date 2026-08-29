import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LayoutModeToggle } from "@/components/theme/LayoutModeToggle";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import logoPrincipal from "@/assets/logo-principal.png";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLayoutMode } from "@/contexts/LayoutModeContext";

export function MobileTopNav() {
  const { data: profile } = useProfile();
  const location = useLocation();
  const { layoutMode } = useLayoutMode();
  const isLegacy = layoutMode === "legacy";

  // Helper to derive a short title based on current path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return "Dashboard";
    if (path.startsWith("/rh")) return "Recursos Humanos";
    if (path.startsWith("/painel-motorista")) return "Motorista";
    if (path.startsWith("/equipamentos")) return "Equipamentos";
    if (path.startsWith("/solicitacoes")) return "Solicitações";
    if (path.startsWith("/seguranca") || path.startsWith("/cipa")) return "Segurança";
    if (path.startsWith("/planejamento")) return "Planejamento";
    if (path.startsWith("/configuracoes")) return "Configurações";
    if (path.startsWith("/relatorios")) return "Relatórios";
    return "SUCENA";
  };

  return (
    <div className={`md:hidden sticky top-0 z-[100] w-full flex items-center justify-between px-3 py-2 border-b shadow-sm transition-colors ${isLegacy ? "bg-background border-border" : "border-white/20 bg-background/80 backdrop-blur-md"}`}>
      <div className="flex items-center gap-2">
        <SidebarTrigger
          className="h-9 w-9 border border-border bg-background/50 text-foreground flex items-center justify-center rounded-md shrink-0"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </SidebarTrigger>
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <img src={logoPrincipal} alt="Logo" className="h-6 w-auto shrink-0" />
          <span className="font-semibold text-sm truncate max-w-[110px] text-foreground">
            {getPageTitle()}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <LayoutModeToggle />
        <ThemeToggle />
        {profile && profile.avatar_url && (
          <Avatar className="h-8 w-8 border border-border shrink-0 ml-1">
            <AvatarImage src={profile.avatar_url} alt={profile.full_name || ""} loading="lazy" decoding="async" />
            <AvatarFallback>{profile.full_name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
