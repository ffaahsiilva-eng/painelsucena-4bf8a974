import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { resolveStorageUrl } from "@/lib/storage";

export type Profile = Tables<"profiles">;

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      if (data && data.avatar_url) {
        data.avatar_url = await resolveStorageUrl(data.avatar_url);
      }
      return data;
    },
    enabled: !!user?.id,
  });
};
