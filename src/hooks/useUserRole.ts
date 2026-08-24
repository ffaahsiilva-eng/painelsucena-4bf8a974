import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "user" | "visualizador";

export const useUserRole = () => {
  // IMPORTANT:
  // Do NOT depend on useAuth() here.
  // useAuth() is currently a plain hook (not a context), so multiple instances can race.
  // That race can cause pages (like /admin) to redirect before the role query runs.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    // Resolve current session once
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
    });

    // Keep in sync across sign-in / sign-out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const query = useQuery({
    queryKey: ["user-role", userId ?? "unknown"],
    enabled: userId !== undefined,
    queryFn: async () => {
      if (!userId) return null;

      const { data: rpcIsAdmin, error: rpcAdminError } = await supabase.rpc("is_admin", { _user_id: userId });
      if (!rpcAdminError && rpcIsAdmin) return "admin";

      const { data: rpcIsAdminOrModerator, error: rpcAdminOrModeratorError } = await supabase.rpc("is_admin_or_moderator", { _user_id: userId });
      if (!rpcAdminOrModeratorError && rpcIsAdminOrModerator) return "moderator";

      // A user may have more than one role row; prefer the highest permission
      // instead of only the newest row to avoid hiding admin-only controls.
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const roles = (data || []).map((row) => row.role as AppRole);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("moderator")) return "moderator";
      if (roles.includes("visualizador")) return "visualizador";
      return roles[0] ?? null;
    },
  });

  // Expose auth readiness for guards (keeps existing destructuring intact)
  return {
    ...query,
    authReady: userId !== undefined,
  } as typeof query & { authReady: boolean };
};

export const useIsAdmin = () => {
  const { data: role, isLoading, isFetching, authReady } = useUserRole();
  return {
    isAdmin: role === "admin" || role === "moderator",
    isStrictAdmin: role === "admin",
    isModerator: role === "moderator",
    isVisualizador: role === "visualizador",
    role,
    // Avoid "false negatives" while auth/role is still being resolved.
    isLoading: !authReady || isLoading || isFetching,
    authReady,
  };
};
