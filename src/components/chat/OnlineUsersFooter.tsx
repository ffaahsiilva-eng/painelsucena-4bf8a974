import { useEffect, useState } from "react";
import { NewsTicker } from "@/components/footer/NewsTicker";
import { ChevronDown, Pencil, Check, X, Save, LogOut } from "lucide-react";
import chatIcon from "@/assets/chat-icon.png.asset.json";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProfile } from "@/hooks/useProfile";
import { useEditMode } from "@/contexts/EditModeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logoPrincipal from "@/assets/logo-principal.png";
import { Link } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { getBrazilNorthMonth } from "@/lib/timezone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllUsers } from "@/hooks/useAllUsers";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface OnlineUsersFooterProps {
  onUserClick: (user: any) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onSignOut?: () => void;
}

export const OnlineUsersFooter = ({ onUserClick, onToggleSidebar, isSidebarOpen, onSignOut }: OnlineUsersFooterProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const { state } = useSidebar();
  const { allUsers } = useAllUsers();
  const { settings, updateSettings } = useSiteSettings();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const { canEdit, isEditMode, toggleEditMode } = useEditMode();

  const onlineCount = allUsers.filter(u => u.isOnline && !u.isCurrentUser && !u.cargo?.startsWith("motorista_")).length;

  return (
    <div className={cn(
      "sucena-online-footer fixed bottom-0 right-0 left-0 z-[60] overflow-visible transition-[left] duration-200 ease-linear safe-area-bottom-fixed",
      isMinimized ? "bg-transparent" : "text-sidebar-foreground border-none",
      "flex items-center"
    )}>

      {!isMinimized && (
        <Link
          to="/"
          aria-label="Início"
          className="sucena-footer-logo-link hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-[70] items-center justify-center pointer-events-auto"
        >
          <img loading="lazy" decoding="async"
            src={settings?.logo_url || logoPrincipal}
            alt="Logo"
            className="sucena-footer-logo h-12 sm:h-16 max-w-[250px] object-contain drop-shadow-md"
          />
        </Link>
      )}




      {!isMinimized && (
        <div className="flex w-full min-w-0 items-center gap-1 md:gap-3 px-2 md:px-4 py-1 overflow-visible">
          <div className="hidden md:flex shrink-0 items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden" />
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex md:hidden shrink-0 items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSignOut?.();
              }}
              className="sucena-footer-chat relative p-1.5 rounded-full transition-all group flex items-center justify-center bg-red-500/10 hover:bg-red-500/20"
              title="Sair"
            >
              <LogOut className="h-5 w-5 text-red-500" />
            </button>
          </div>

          <div className="flex-1 min-w-0 overflow-hidden flex items-center justify-end gap-4">
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new Event("toggle-ia-chat"));
              }}
              className="sucena-footer-chat relative p-1 rounded-full transition-all group flex items-center gap-1.5"
              title="Assistente IA"
            >
              <span className="text-white font-semibold text-xs whitespace-nowrap">Assistente IA</span>
              <svg viewBox="0 0 24 24" className={cn(
                "w-6 h-6 object-contain cursor-pointer group-hover:scale-110 transition-transform"
              )}>
                <defs>
                  <linearGradient id="gemini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4285F4"/>
                    <stop offset="25%" stopColor="#9B72CB"/>
                    <stop offset="50%" stopColor="#D96570"/>
                    <stop offset="75%" stopColor="#D96570"/>
                    <stop offset="100%" stopColor="#9B72CB"/>
                  </linearGradient>
                </defs>
                <path d="M12 2C12 2 14.5 7.5 17 10C19.5 12.5 22 12 22 12C22 12 19.5 12.5 17 15C14.5 17.5 12 22 12 22C12 22 9.5 17.5 7 15C4.5 12.5 2 12 2 12C2 12 4.5 12.5 7 10C9.5 7.5 12 2 12 2Z" fill="url(#gemini-grad)"/>
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSidebar();
              }}
              className="sucena-footer-chat relative p-1 rounded-full transition-all group"
              title={isSidebarOpen ? "Fechar conversas" : "Abrir conversas"}
            >
              <img loading="lazy" decoding="async" 
                src={chatIcon.url} 
                className={cn(
                  "w-6 h-6 object-contain cursor-pointer group-hover:scale-110 transition-transform",
                  isSidebarOpen && "scale-110"
                )} 
                alt="Chat"
              />
              <span className={cn(
                "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm",
                onlineCount > 0 ? "bg-green-500" : "bg-gray-400"
              )}>
                {onlineCount}
              </span>
            </button>
          </div>
        </div>
      )}


      <NewsTicker />
    </div>
  );
};
