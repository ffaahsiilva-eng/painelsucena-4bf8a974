import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "./useEnvironment";

export interface NavVisibilityRule {
  id: string;
  nav_item_id: string;
  cargo: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export function useNavVisibilityRules() {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ["nav-visibility-rules", currentEnv],
    queryFn: async (): Promise<NavVisibilityRule[]> => {
      const { data, error } = await supabase
        .from("nav_visibility_rules")
        .select("*")
        .eq("environment", currentEnv);

      if (error) {
        console.error("Error fetching nav visibility rules:", error);
        throw error;
      }

      return (data || []) as NavVisibilityRule[];
    },
    staleTime: 1000 * 60 * 15, // Increased to 15 minutes
  });

  const upsertRule = useMutation({
    mutationFn: async ({ nav_item_id, cargo, is_hidden }: { nav_item_id: string; cargo: string; is_hidden: boolean }) => {
      const existingRule = rules.find(r => r.nav_item_id === nav_item_id && r.cargo === cargo);
      
      if (existingRule) {
        const { error } = await supabase
          .from("nav_visibility_rules")
          .update({ is_hidden, updated_at: new Date().toISOString() })
          .eq("id", existingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("nav_visibility_rules")
          .insert({ nav_item_id, cargo, is_hidden, environment: currentEnv });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-visibility-rules", currentEnv] });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("nav_visibility_rules")
        .delete()
        .eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-visibility-rules", currentEnv] });
    },
  });

  // Helper to check if an item is hidden for a cargo
  const isHiddenForCargo = (navItemId: string, cargo: string): boolean => {
    const rule = rules.find(r => r.nav_item_id === navItemId && r.cargo === cargo);
    return rule?.is_hidden ?? false;
  };

  // Helper to get all hidden items for a cargo
  const getHiddenItemsForCargo = (cargo: string): string[] => {
    return rules
      .filter(r => r.cargo === cargo && r.is_hidden)
      .map(r => r.nav_item_id);
  };

  return {
    rules,
    isLoading,
    error,
    upsertRule,
    deleteRule,
    isHiddenForCargo,
    getHiddenItemsForCargo,
  };
}
