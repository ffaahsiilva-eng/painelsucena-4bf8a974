import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import logoPrincipal from "@/assets/logo-principal.png";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function MobileTopNav() {
  const { data: profile } = useProfile();
  const location = useLocation();

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
    <div className="md:hidden sticky top-0 z-[100] w-full flex items-center justify-between px-4 py-2 border-b border-white/20 bg-background/80 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger
          className="h-9 w-9 border border-border bg-background/50 text-foreground flex items-center justify-center rounded-md"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </SidebarTrigger>
        <Link to="/" className="flex items-center gap-2">
          <img src={logoPrincipal} alt="Logo" className="h-6 w-auto" />
          <span className="font-semibold text-sm truncate max-w-[140px] text-foreground">
            {getPageTitle()}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {profile && profile.avatar_url && (
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={profile.avatar_url} alt={profile.full_name || ""} loading="lazy" decoding="async" />
            <AvatarFallback>{profile.full_name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
