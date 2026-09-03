import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ["admin-user-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "moderator"]);

      if (error) throw error;

      const adminSet = new Set<string>();
      const moderatorSet = new Set<string>();

      data?.forEach((row) => {
        if (row.role === "admin") adminSet.add(row.user_id);
        if (row.role === "moderator") moderatorSet.add(row.user_id);
      });

      // Combined set for backward compatibility (isAdmin checks)
      const combinedSet = new Set([...adminSet, ...moderatorSet]);

      return { admins: adminSet, moderators: moderatorSet, all: combinedSet };
    },
    staleTime: 5 * 60 * 1000,
    select: (data) => data,
  });
};
