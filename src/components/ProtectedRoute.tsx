import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineDriverRedirect } from "@/hooks/useOfflineDriverRedirect";
import { getStoredEnvironment, clearStoredEnvironment } from "@/hooks/useEnvironment";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

type Session = any;

// Driver roles that should be redirected to the driver panel
const DRIVER_ROLES = ["motorista_pipa", "motorista_munk"];

const SESSION_TAB_KEY = "session_tab_active";

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCargo, setUserCargo] = useState<string | null>(null);
  const [cargoChecked, setCargoChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAvatar, setHasAvatar] = useState<boolean | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Hook for automatic offline redirect for drivers on mobile
  useOfflineDriverRedirect();

  useEffect(() => {
    const authClient = supabase.auth as any;

    const checkDailyLogout = async () => {
      // Motoristas permanecem logados indefinidamente — sem logout diário.
      if (localStorage.getItem("is_driver_session") === "true") {
        return false;
      }

      const lastLoginDate = localStorage.getItem("last_login_date");
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      
      const sixAM = new Date();
      sixAM.setHours(6, 0, 0, 0);

      const effectiveTodayStr = today < sixAM 
        ? new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        : todayStr;

      if (lastLoginDate && lastLoginDate !== effectiveTodayStr) {
        localStorage.removeItem("last_login_date");
        await authClient.signOut({ scope: "local" });
        setSession(null);
        navigate("/auth", { replace: true });
        return true;
      }
      return false;
    };

    const {
      data: { subscription },
    } = authClient.onAuthStateChange((event: string, currentSession: Session | null) => {
      setSession(currentSession);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        setUserCargo(null);
        setCargoChecked(false);
        localStorage.removeItem("last_login_date");
        localStorage.removeItem("is_driver_session");
        clearStoredEnvironment();
        
        // If a transition is in progress, don't navigate immediately
        // The LogoutTransitionGate will handle the final redirect
        if (sessionStorage.getItem("logoutTransitionInProgress") !== "true") {
          navigate("/auth", { replace: true });
        }
      }

      if (event === "SIGNED_IN" && currentSession?.user) {
        const today = new Date();
        const sixAM = new Date();
        sixAM.setHours(6, 0, 0, 0);
        
        // Salva a data efetiva do login considerando o corte das 06:00
        const loginDateStr = today < sixAM 
          ? new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          : today.toISOString().split("T")[0];

        localStorage.setItem("last_login_date", loginDateStr);
        
        setTimeout(() => {
          fetchUserCargo(currentSession.user.id);
        }, 0);
      }
    });

    const initSession = async () => {
      try {
        const loggedOut = await checkDailyLogout();
        if (loggedOut) return;

        const {
          data: { session: existingSession },
        } = await authClient.getSession();

        if (existingSession) {
          setSession(existingSession);
          setLoading(false);
          await fetchUserCargo(existingSession.user.id);
          return;
        }

        const {
          data: { session: refreshedSession },
        } = await authClient.refreshSession();
        setSession(refreshedSession);
        setLoading(false);
        if (refreshedSession?.user) {
          await fetchUserCargo(refreshedSession.user.id);
        } else {
          setCargoChecked(true);
        }
      } catch (error) {
        console.warn("Falha ao inicializar sessão protegida:", error);
        setSession(null);
        setUserCargo(null);
        setHasAvatar(null);
        setLoading(false);
        setCargoChecked(true);
      }
    };

    initSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchUserCargo = async (userId: string) => {
    // Cache apenas cargo/admin (estáticos na sessão). Avatar é sempre
    // consultado fresco para evitar redirect em loop caso o cache
    // esteja desatualizado após upload de foto.
    const cacheKey = `user_profile_${userId}`;
    const cached = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setUserCargo(data.cargo);
        setIsAdmin(data.admin);
        // Sempre revalida avatar em background
        supabase
          .from("profiles")
          .select("avatar_url")
          .eq("user_id", userId)
          .maybeSingle()
          .then(({ data: p }) => {
            const url = p?.avatar_url;
            setHasAvatar(!!url && url.trim().length > 0);
          });
        setCargoChecked(true);
        return data;
      } catch { /* fallthrough para refetch */ }
    }

    try {
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("cargo, avatar_url")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["admin", "moderator"])
          .maybeSingle()
      ]);

      const cargo = profileResult.data?.cargo || null;
      const admin = !!roleResult.data;
      const avatarUrl = profileResult.data?.avatar_url;
      const hasAvatarVal = !!avatarUrl && avatarUrl.trim().length > 0;

      setUserCargo(cargo);
      setIsAdmin(admin);
      setHasAvatar(hasAvatarVal);

      const result = { cargo, admin };
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      localStorage.setItem(cacheKey, JSON.stringify(result));
      return { ...result, hasAvatar: hasAvatarVal };
    } catch (err) {
      console.error("Error fetching user cargo:", err);
      return { cargo: null, admin: false, hasAvatar: null };
    } finally {
      setCargoChecked(true);
    }
  };

  // Show nothing while loading session or checking cargo
  if (loading || !cargoChecked) {
    return null;
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const isDriver = userCargo && DRIVER_ROLES.includes(userCargo);

  // Pages that drivers are allowed to access
  const DRIVER_ALLOWED_PATHS = ['/selecao-veiculo', '/painel-motorista', '/registro-movimento-motorista', '/hora-extra', '/equipamentos-motorista', '/relatorios-motorista', '/pontos-abastecimento', '/lembretes'];

  // Check if driver has selected a vehicle
  const hasSelectedVehicle = localStorage.getItem("selectedVehicleId");

  // Environment gate: TODOS os usuários devem escolher
  // ambiente após o login. O acesso a ambientes não autorizados é bloqueado
  // dentro da própria tela de seleção (useMyEnvironmentAccess).
  const environment = getStoredEnvironment();
  if (!environment && location.pathname !== "/selecao-ambiente") {
    return <Navigate to="/selecao-ambiente" replace />;
  }

  // If user is a driver
  if (isDriver && !isAdmin) {
    // Marca sessão como motorista para manter login persistente (sem logout diário).
    if (localStorage.getItem("is_driver_session") !== "true") {
      try { localStorage.setItem("is_driver_session", "true"); } catch { /* ignore */ }
    }

    // If no vehicle selected and not already on vehicle selection page or environment selection, redirect to vehicle selection
    if (!hasSelectedVehicle && location.pathname !== '/selecao-veiculo' && location.pathname !== '/selecao-ambiente') {
      return <Navigate to="/selecao-veiculo" replace />;
    }
    
    // If vehicle is selected but on selection page, redirect to panel
    if (hasSelectedVehicle && location.pathname === '/selecao-veiculo') {
      return <Navigate to="/painel-motorista" replace />;
    }
    
    // If trying to access a page not in allowed list (and not selecting environment), redirect to driver panel
    if (!DRIVER_ALLOWED_PATHS.includes(location.pathname) && location.pathname !== '/selecao-ambiente') {
      return <Navigate to="/painel-motorista" replace />;
    }
  }

  // If user is NOT a driver and NOT an admin, trying to access driver panel, redirect to home
  if (!isDriver && !isAdmin && location.pathname === '/painel-motorista') {
    return <Navigate to="/" replace />;
  }

  // Block users without profile photo - redirect to settings (drivers are exempt)
  if (hasAvatar === false && !isDriver && location.pathname !== '/configuracoes') {
    return <Navigate to="/configuracoes" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
