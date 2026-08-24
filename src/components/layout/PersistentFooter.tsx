import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { OnlineUsersFooter } from "@/components/chat/OnlineUsersFooter";
import { ChatPopupManager, ChatPopupManagerHandle } from "@/components/chat/ChatPopupManager";
import { UserWithStatus } from "@/hooks/useAllUsers";
import { useAuth } from "@/hooks/useAuth";
import { RightUsersSidebar } from "./RightUsersSidebar";
import { useProfile } from "@/hooks/useProfile";

export const PersistentFooter = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const location = useLocation();
  const popupManagerRef = useRef<ChatPopupManagerHandle>(null);
  const [justCompletedTransition, setJustCompletedTransition] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isDriverPage = ["/painel-motorista", "/registro-movimento-motorista", "/selecao-veiculo", "/equipamentos-motorista", "/relatorios-motorista", "/pontos-abastecimento"].includes(location.pathname);
  const isEnvSelection = location.pathname === "/selecao-ambiente";
  

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handler = () => {
      const isActive = sessionStorage.getItem("loginTransitionInProgress") === "true";
      if (!isActive && user) {
        setJustCompletedTransition(true);
        const timeout = setTimeout(() => setJustCompletedTransition(false), 600);
        return () => clearTimeout(timeout);
      }
    };

    window.addEventListener("login-transition", handler);
    return () => window.removeEventListener("login-transition", handler);
  }, [user]);

  const handleSignOut = async () => {
    // Get user info before signing out for the transition
    const payloadRaw = sessionStorage.getItem("logoutTransitionPayload");
    const payload = payloadRaw ? JSON.parse(payloadRaw) : {};
    
    // Fallback to profile if payload is empty (e.g. first time)
    const userName = payload.userName || profile?.full_name || "Usuário";
    const userAvatar = payload.userAvatar || profile?.avatar_url || undefined;
    const userCargo = payload.userCargo || profile?.cargo || undefined;

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
  };

  const handleUserClick = (userClicked: UserWithStatus) => {
    popupManagerRef.current?.openPopup(userClicked);
  };

  if (!isMounted || !user || isDriverPage || isEnvSelection) return null;

  return createPortal(
    <div className={justCompletedTransition ? "animate-fade-in" : ""}>
      <OnlineUsersFooter 
        onUserClick={handleUserClick} 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        onSignOut={handleSignOut}
      />
      <ChatPopupManager ref={popupManagerRef} />
      <RightUsersSidebar 
        onUserClick={handleUserClick} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
    </div>,
    document.body
  );
};
