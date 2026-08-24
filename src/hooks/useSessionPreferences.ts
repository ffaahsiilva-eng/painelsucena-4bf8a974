import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const SESSION_DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

export const useSessionPreferences = () => {
  const { user } = useAuth();
  const [sessionDurationHours, setSessionDurationHours] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("session_duration_hours")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSessionDurationHours(data.session_duration_hours);
      }
    } catch (error) {
      console.error("Error fetching session preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updateSessionDuration = async (hours: number): Promise<boolean> => {
    if (!user) return false;

    try {
      // Try to upsert the preference
      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          { 
            user_id: user.id, 
            session_duration_hours: hours,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      setSessionDurationHours(hours);
      
      // Update localStorage to trigger immediate effect
      localStorage.setItem("session_duration_hours", hours.toString());
      window.dispatchEvent(new Event("session-duration-changed"));
      
      return true;
    } catch (error) {
      console.error("Error updating session duration:", error);
      return false;
    }
  };

  return {
    sessionDurationHours,
    updateSessionDuration,
    isLoading,
    SESSION_DURATION_OPTIONS,
  };
};
