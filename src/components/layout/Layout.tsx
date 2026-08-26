import { ReactNode, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { RefreshCw, Settings, ShieldCheck, LogOut, ArrowLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CampaignRibbon } from "@/components/campaigns/CampaignRibbon";
import { PageTransition } from "./PageTransition";
// AnnouncementModal agora é montado globalmente em App.tsx
import { SessionExpiryWarning } from "@/components/session/SessionExpiryWarning";
import { SessionTimeIndicator } from "@/components/session/SessionTimeIndicator";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { useInstaCenaNotifications } from "@/hooks/useInstaCenaNotifications";
import { useInstaCenaBellNotifications } from "@/hooks/useInstaCenaBellNotifications";

import { useVisualizadorContext } from "@/contexts/VisualizadorContext";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Eye } from "lucide-react";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { Button } from "@/components/ui/button";
import { NewsButton } from "./NewsButton";
import { useEditMode } from "@/contexts/EditModeContext";
import { Pencil, PencilOff } from "lucide-react";
import { hardRefreshToLatest } from "@/lib/appRefresh";

const motivationalPhrases = [
  "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
  "Acredite em você mesmo e tudo será possível.",
  "Cada dia é uma nova oportunidade de ser melhor.",
  "A persistência é o caminho do êxito.",
  "Trabalho em equipe divide a tarefa e multiplica o sucesso.",
  "Sua atitude determina sua direção.",
  "Grandes conquistas começam com pequenos passos.",
  "O único lugar onde o sucesso vem antes do trabalho é no dicionário.",
  "Faça hoje o que outros não querem, faça amanhã o que outros não podem.",
  "A segurança não é um acidente, é uma escolha.",
  "Juntos somos mais fortes.",
  "Excelência não é um ato, mas um hábito.",
  "O comprometimento transforma promessas em realidade.",
  "Quem planta segurança, colhe resultados.",
  "A qualidade nunca é um acidente, é sempre resultado do esforço inteligente.",
  "O impossível é apenas o que ainda não foi tentado.",
  "Disciplina é a ponte entre metas e realizações.",
  "Cada obstáculo é uma oportunidade disfarçada.",
  "O trabalho bem feito é a melhor recompensa.",
  "Segurança em primeiro lugar, sempre.",
  "A união faz a força.",
  "Pequenas ações criam grandes mudanças.",
  "O melhor momento para agir é agora.",
  "Construímos o futuro com as ações de hoje.",
  "Sua dedicação faz a diferença.",
  "Respeito e colaboração são a base do sucesso.",
  "Cada dia é uma chance de superar seus limites.",
  "O esforço de hoje é o resultado de amanhã.",
  "Trabalhe com propósito, viva com paixão.",
  "A excelência está nos detalhes.",
];

const getDailyPhrase = (): string => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return motivationalPhrases[dayOfYear % motivationalPhrases.length];
};

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const dailyPhrase = useMemo(() => getDailyPhrase(), []);
  const { isVisualizador } = useVisualizadorContext();
  const { data: profile } = useProfile();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isEditMode, toggleEditMode, canEdit } = useEditMode();
  const navigate = useNavigate();
  const location = useLocation();
  const showBackButton = location.pathname !== "/dashboard" && location.pathname !== "/";
  
  const isDriver = profile?.cargo && (profile.cargo === "motorista_pipa" || profile.cargo === "motorista_munk");
  const isAvatarBlocked = profile && (!profile.avatar_url || profile.avatar_url.trim().length === 0) && !isDriver;
  const uiTheme = (profile as any)?.ui_theme || "classic";
  const isDockTheme = uiTheme === "macos-dock";
  
  // Enable global chat push notifications
  useChatNotifications();
  useInstaCenaNotifications();
  useInstaCenaBellNotifications();

  const handleSignOut = async () => {
    const userName = profile?.full_name || "Usuário";
    const userAvatar = profile?.avatar_url || undefined;
    sessionStorage.setItem("logoutTransitionInProgress", "true");
    sessionStorage.setItem("logoutTransitionPayload", JSON.stringify({ userName, userAvatar }));
    window.dispatchEvent(new Event("logout-transition"));
    try { await signOut(); } catch {}
  };

  return (
    <SidebarInset className="sucena-page-layout flex flex-col bg-transparent min-w-0 w-full max-w-full">
      <main className="sucena-page-main flex-1 bg-transparent w-full max-w-full min-w-0 safe-area-inset-bottom">
        {isEditMode && (
          <div className="bg-primary/10 border-b border-primary/30 px-4 py-1.5 flex items-center gap-2 text-primary text-sm">
            <Pencil className="h-3.5 w-3.5 shrink-0 animate-pulse" />
            <span className="text-xs font-medium">Modo Edição ativo — Clique em qualquer título ou nome para editar em tempo real</span>
          </div>
        )}
        {isVisualizador && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
            <Eye className="h-4 w-4 shrink-0" />
            <span>Modo Visualização — Você tem acesso somente leitura. Edições e downloads estão desabilitados.</span>
          </div>
        )}
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      
      {/* AnnouncementModal montado globalmente em App.tsx */}
      <SessionExpiryWarning />
      
      
    </SidebarInset>
  );
};

export default Layout;
