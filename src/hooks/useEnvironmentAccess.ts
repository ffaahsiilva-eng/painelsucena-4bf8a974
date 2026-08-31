import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useUserRole";
import type { EnvironmentId } from "@/hooks/useEnvironment";

/**
 * Returns the list of environments the CURRENT logged-in user has access to.
 * Admins always have access to all environments.
 */
export function useMyEnvironmentAccess() {
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const query = useQuery({
    queryKey: ["my-environment-access", userId, isAdmin],
    enabled: !!userId && !adminLoading,
    queryFn: async (): Promise<EnvironmentId[]> => {
      if (isAdmin) {
        const { data, error } = await supabase.from("environments").select("id");
        if (error) throw error;
        return (data ?? []).map((r) => r.id as EnvironmentId);
      }
      const { data, error } = await supabase
        .from("user_environment_access")
        .select("environment")
        .eq("user_id", userId!);
      if (error) throw error;
      let envs = (data ?? []).map((r) => r.environment as EnvironmentId);
      
      // Default to barcarena for existing users without explicit grants
      if (envs.length === 0) {
        envs = ["barcarena"];
      }
      
      return Array.from(new Set(envs)) as EnvironmentId[];
    },
  });


  return {
    environments: (query.data ?? []) as EnvironmentId[],
    isLoading: adminLoading || query.isLoading,
    isAdmin,
  };
}

/**
 * Admin-only hook: lists access for all users and exposes mutations.
 */
export function useAllEnvironmentAccess() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["all-environment-access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_environment_access")
        .select("user_id, environment");
      if (error) throw error;
      const map = new Map<string, EnvironmentId[]>();
      (data ?? []).forEach((row) => {
        const list = map.get(row.user_id) ?? [];
        list.push(row.environment as EnvironmentId);
        map.set(row.user_id, list);
      });
      return map;
    },
  });

  const grantMutation = useMutation({
    mutationFn: async ({ userId, environment }: { userId: string; environment: EnvironmentId }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("user_environment_access")
        .insert({ user_id: userId, environment, granted_by: auth.user?.id ?? null });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-environment-access"] }),
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ userId, environment }: { userId: string; environment: EnvironmentId }) => {
      const { error } = await supabase
        .from("user_environment_access")
        .delete()
        .eq("user_id", userId)
        .eq("environment", environment);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-environment-access"] }),
  });

  return { accessMap: query.data ?? new Map(), isLoading: query.isLoading, grantMutation, revokeMutation };
}
