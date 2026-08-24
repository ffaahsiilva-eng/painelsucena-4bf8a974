import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useRDOLock = (date: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if RDO is locked for this date
  const { data: lockData, isLoading } = useQuery({
    queryKey: ["rdo_lock", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rdo_report_locks")
        .select("*")
        .eq("report_date", date)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!date,
  });

  const isLocked = !!lockData;

  // Lock the RDO
  const lockRDO = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("rdo_report_locks")
        .insert({
          report_date: date,
          locked_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rdo_lock", date] });
      queryClient.invalidateQueries({ queryKey: ["rdo-reports"] });
      queryClient.invalidateQueries({ queryKey: ["rdo-report"] });
    },
  });

  // Unlock the RDO (only by the person who locked it or admins)
  const unlockRDO = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("rdo_report_locks")
        .delete()
        .eq("report_date", date);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rdo_lock", date] });
      queryClient.invalidateQueries({ queryKey: ["rdo-reports"] });
      queryClient.invalidateQueries({ queryKey: ["rdo-report"] });
    },
  });

  return {
    isLocked,
    lockData,
    isLoading,
    lockRDO,
    unlockRDO,
    canUnlock: lockData?.locked_by === user?.id,
  };
};
