import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useIsAdmin } from "./useUserRole";
import { getBrazilNorthTodayString } from "@/lib/timezone";

export type AreaType = "gabiao" | "jardinagem" | "administrativo";

export interface AreaLockData {
  id: string;
  date: string;
  area: string;
  locked_by: string;
  locked_at: string;
}

const DAILY_UNLOCK_KEY = "daily_auto_unlock";

const ENCARREGADO_CARGOS = ["encarregado_geral", "encarregado_i", "encarregado_ii"];

export const useReportLock = (date: string) => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();

  // Fetch user cargo to allow encarregados to unlock saved reports
  const { data: userCargo } = useQuery({
    queryKey: ["user_cargo_for_lock", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("cargo")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.cargo ?? null;
    },
  });

  const isEncarregado = !!userCargo && ENCARREGADO_CARGOS.includes(userCargo);
  const canManage = isAdmin || isEncarregado;

  // Auto-unlock today's reports once per day on first load
  useEffect(() => {
    const today = getBrazilNorthTodayString();
    if (date !== today || !user) return;

    const lastUnlock = localStorage.getItem(DAILY_UNLOCK_KEY);
    if (lastUnlock === today) return;

    // Clear all locks for today so reports start unlocked
    const autoUnlock = async () => {
      await supabase
        .from("attendance_report_locks")
        .delete()
        .eq("date", today)
        .in("area", ["gabiao", "jardinagem"]);

      localStorage.setItem(DAILY_UNLOCK_KEY, today);
      queryClient.invalidateQueries({ queryKey: ["report_lock", today] });
    };

    autoUnlock();
  }, [date, user, queryClient]);

  // Check if reports are locked for this date (both areas)
  const { data: lockData, isLoading } = useQuery({
    queryKey: ["report_lock", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_report_locks")
        .select("*")
        .eq("date", date);

      if (error) throw error;
      return data as AreaLockData[];
    },
  });

  // Check if specific area is locked
  const isAreaLocked = (area: AreaType) => {
    if (!lockData) return false;
    return lockData.some(lock => lock.area === area);
  };

  // Check if user can unlock specific area (owner or admin)
  const canUnlockArea = (area: AreaType) => {
    if (!lockData || !user) return false;
    // Admins and encarregados can unlock any area
    if (canManage) return true;
    const areaLock = lockData.find(lock => lock.area === area);
    return areaLock?.locked_by === user.id;
  };

  // Get lock data for specific area
  const getAreaLockData = (area: AreaType) => {
    if (!lockData) return null;
    return lockData.find(lock => lock.area === area) || null;
  };

  // Lock specific area
  const lockArea = useMutation({
    mutationFn: async (area: AreaType) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("attendance_report_locks")
        .insert({
          date,
          area,
          locked_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_lock", date] });
      queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
    },
  });

  // Unlock specific area (by the person who locked it OR admin)
  const unlockArea = useMutation({
    mutationFn: async (area: AreaType) => {
      if (!user) throw new Error("User not authenticated");

      // If admin or encarregado, delete regardless of who locked it
      if (canManage) {
        const { error } = await supabase
          .from("attendance_report_locks")
          .delete()
          .eq("date", date)
          .eq("area", area);

        if (error) throw error;
      } else {
        // Regular user can only unlock their own locks
        const { error } = await supabase
          .from("attendance_report_locks")
          .delete()
          .eq("date", date)
          .eq("area", area)
          .eq("locked_by", user.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_lock", date] });
      queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
    },
  });

  // Legacy compatibility: check if any area is locked
  const isLocked = lockData && lockData.length > 0;
  const isFullyLocked = lockData && lockData.length >= 2;

  return {
    lockData,
    isLoading,
    isLocked,
    isFullyLocked,
    isAreaLocked,
    canUnlockArea,
    getAreaLockData,
    lockArea,
    unlockArea,
    isAdmin,
  };
};
