import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const DEFAULT_SESSION_HOURS = 5;
const WARNING_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes before expiry
const SESSION_START_KEY = "session_start_time_persistent";
const SESSION_DURATION_KEY = "session_duration_hours";

// Driver roles that should have persistent sessions (no timeout)
const DRIVER_ROLES = ['motorista_pipa', 'motorista_munk'];

const getSessionTimeoutMs = (): number => {
  const storedHours = localStorage.getItem(SESSION_DURATION_KEY);
  const hours = storedHours ? parseInt(storedHours, 10) : DEFAULT_SESSION_HOURS;
  return hours * 60 * 60 * 1000;
};

export const useSessionTimeout = () => {
  const { user, session, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sessionDurationHours, setSessionDurationHours] = useState<number>(DEFAULT_SESSION_HOURS);
  const [isDriverUser, setIsDriverUser] = useState<boolean>(false);

  // Check if user is a driver (should have persistent session)
  useEffect(() => {
    const checkIfDriver = async () => {
      if (!user) {
        setIsDriverUser(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("cargo")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.cargo && DRIVER_ROLES.includes(data.cargo)) {
          setIsDriverUser(true);
          // Clear any existing timeout for drivers
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        } else {
          setIsDriverUser(false);
        }
      } catch (error) {
        console.error("Error checking driver status:", error);
        setIsDriverUser(false);
      }
    };

    checkIfDriver();
  }, [user]);

  // Fetch user's session duration preference (only for non-drivers)
  useEffect(() => {
    const fetchSessionDuration = async () => {
      if (!user || isDriverUser) return;

      try {
        const { data } = await supabase
          .from("user_preferences")
          .select("session_duration_hours")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.session_duration_hours) {
          setSessionDurationHours(data.session_duration_hours);
          localStorage.setItem(SESSION_DURATION_KEY, data.session_duration_hours.toString());
        }
      } catch (error) {
        console.error("Error fetching session duration:", error);
      }
    };

    fetchSessionDuration();
  }, [user, isDriverUser]);

  // Listen for session duration changes (only for non-drivers)
  useEffect(() => {
    if (isDriverUser) return; // Skip for drivers
    
    const handleDurationChange = () => {
      const newHours = parseInt(localStorage.getItem(SESSION_DURATION_KEY) || DEFAULT_SESSION_HOURS.toString(), 10);
      setSessionDurationHours(newHours);
      
      // Recalculate timeout with new duration
      if (session) {
        const sessionStartTime = localStorage.getItem(SESSION_START_KEY);
        if (sessionStartTime) {
          const startTime = parseInt(sessionStartTime, 10);
          const elapsed = Date.now() - startTime;
          const newTimeoutMs = newHours * 60 * 60 * 1000;
          const remaining = newTimeoutMs - elapsed;

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          if (remaining <= 0) {
            handleAutoLogout();
          } else {
            timeoutRef.current = setTimeout(() => {
              handleAutoLogout();
            }, remaining);
          }
        }
      }
    };

    window.addEventListener("session-duration-changed", handleDurationChange);
    return () => window.removeEventListener("session-duration-changed", handleDurationChange);
  }, [session, isDriverUser]);

  const renewSession = useCallback(() => {
    // Reset the session start time to now
    localStorage.setItem(SESSION_START_KEY, Date.now().toString());
    
    // Clear existing timeout and set a new one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const timeoutMs = getSessionTimeoutMs();
    timeoutRef.current = setTimeout(() => {
      handleAutoLogout();
    }, timeoutMs);
  }, []);

  const isInWarningPeriod = useCallback((): boolean => {
    if (!session) return false;
    if (isDriverUser) return false;

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(6, 0, 0, 0);
    if (now >= cutoff) cutoff.setDate(cutoff.getDate() + 1);

    const remaining = cutoff.getTime() - now.getTime();
    return remaining > 0 && remaining <= WARNING_THRESHOLD_MS;
  }, [session, isDriverUser]);

  const handleAutoLogout = async () => {
    // Store logout reason for the transition
    sessionStorage.setItem("logoutReason", "session_timeout");
    
    // Get user info for transition
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", session?.user?.id || "")
      .single();

    const userName = profile?.full_name || "Usuário";
    const userAvatar = profile?.avatar_url || "";

    // Trigger logout transition
    sessionStorage.setItem("logoutTransitionInProgress", "true");
    sessionStorage.setItem(
      "logoutTransitionPayload",
      JSON.stringify({ 
        userName, 
        userAvatar,
        reason: "timeout"
      })
    );
    window.dispatchEvent(new Event("logout-transition"));

    // Clear equipment assignment if driver
    const selectedVehicleId = localStorage.getItem("selectedVehicleId");
    if (selectedVehicleId) {
      await supabase
        .from("equipment")
        .update({ driver: "", helper: "" })
        .eq("id", selectedVehicleId);
      
      localStorage.removeItem("selectedVehicleId");
    }

    // Clear session start time
    localStorage.removeItem(SESSION_START_KEY);

    // Sign out
    await signOut();
  };

  // Driver 22:00 nightly auto-logout
  useEffect(() => {
    if (!isDriverUser || !session) return;

    const scheduleNightlyLogout = () => {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setHours(22, 0, 0, 0);
      // If already past 22:00 today, schedule for now (immediate logout)
      if (now >= cutoff) {
        handleAutoLogout();
        return null;
      }
      const ms = cutoff.getTime() - now.getTime();
      return setTimeout(() => handleAutoLogout(), ms);
    };

    const tid = scheduleNightlyLogout();

    return () => { if (tid) clearTimeout(tid); };
  }, [isDriverUser, session]);

  // Auto-logout às 06:00 da manhã seguinte (para usuários não-motoristas).
  // Regra: ao logar, calcula o próximo 06:00. Se já passou 06:00 hoje, agenda para 06:00 de amanhã.
  useEffect(() => {
    // Motoristas usam o logout das 22:00 acima
    if (isDriverUser) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    if (!session) {
      localStorage.removeItem(SESSION_START_KEY);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const computeNext6am = () => {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setHours(6, 0, 0, 0);
      // Se agora já é 06:00 ou depois, agenda para 06:00 de amanhã
      if (now >= cutoff) {
        cutoff.setDate(cutoff.getDate() + 1);
      }
      return cutoff.getTime() - now.getTime();
    };

    const ms = computeNext6am();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleAutoLogout();
    }, ms);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [session, isDriverUser]);

  // Tempo restante (minutos) até o auto-logout das 06:00 do dia seguinte
  const getRemainingTime = useCallback((): number | null => {
    if (isDriverUser) return null;
    if (!session) return null;

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(6, 0, 0, 0);
    if (now >= cutoff) cutoff.setDate(cutoff.getDate() + 1);

    const remaining = cutoff.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / 60000));
  }, [session, isDriverUser]);

  return { getRemainingTime, renewSession, isInWarningPeriod, sessionDurationHours, isDriverUser };
};
