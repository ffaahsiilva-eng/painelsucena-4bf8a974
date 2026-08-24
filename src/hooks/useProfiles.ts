import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from "@/lib/storage";

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, whatsapp_number, cargo")
        .order("full_name", { ascending: true });
      if (error) throw error;
      if (data) {
        for (const p of data) {
          if (p.avatar_url) p.avatar_url = await resolveStorageUrl(p.avatar_url);
        }
      }
      return data;
    },
  });
}
