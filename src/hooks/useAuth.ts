import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

const clearAuthStorage = () => {
  // Vite exposes env vars as strings at build time
  const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  if (!projectRef) return;

  const prefix = `sb-${projectRef}-`;

  const safeClear = (storage: Storage) => {
    try {
      // Remove only auth-related keys for this project
      for (const key of Object.keys(storage)) {
        if (key.startsWith(prefix) && key.includes("auth")) {
          storage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  };

  safeClear(localStorage);
  safeClear(sessionStorage);
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((error) => {
        console.warn("Falha ao recuperar sessão local:", error);
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clear local state first
    setSession(null);
    setUser(null);

    // Clear environment selection so the user is asked again on next login.
    try {
      sessionStorage.removeItem("selected_environment");
      localStorage.removeItem("selected_environment");
    } catch {
      /* ignore */
    }

    // We are seeing `/logout` returning session_not_found; ensure we still fully
    // log out locally by clearing stored tokens.
    clearAuthStorage();

    // Best-effort: attempt the SDK signOut, but never block the UX on failures.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore
    }
  };

  return { user, session, loading, signOut };
};
