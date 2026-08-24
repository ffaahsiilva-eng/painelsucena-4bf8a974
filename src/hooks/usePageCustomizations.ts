import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "@/hooks/useEnvironment";

export interface PageCustomization {
  id: string;
  page_key: string;
  element_key: string;
  element_type: string;
  text_value: string | null;
  image_url: string | null;
  color_value: string | null;
  metadata: Record<string, any> | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePageCustomizations(pageKey?: string) {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();

  const { data: customizations, isLoading } = useQuery({
    queryKey: ["page-customizations", pageKey ?? "all", environment ?? "barcarena"],
    queryFn: async () => {
      const currentEnv = environment || 'barcarena';
      let query = supabase
        .from("page_customizations")
        .select("*")
        .eq("environment", currentEnv);

      if (pageKey) {
        query = query.eq("page_key", pageKey);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as unknown as PageCustomization[];
    },
    staleTime: 1000 * 60 * 15, // Increased to 15 minutes
  });

  const getCustomValue = (elementKey: string, type: "text" | "image" | "color" = "text") => {
    const item = customizations?.find(c => c.element_key === elementKey);
    if (!item) return null;
    switch (type) {
      case "text": return item.text_value;
      case "image": return item.image_url;
      case "color": return item.color_value;
      default: return null;
    }
  };

  const upsertCustomization = useMutation({
    mutationFn: async (params: {
      page_key: string;
      element_key: string;
      element_type: string;
      text_value?: string | null;
      image_url?: string | null;
      color_value?: string | null;
      metadata?: Record<string, any> | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentEnv = environment || 'barcarena';

      const { error } = await supabase
        .from("page_customizations")
        .upsert({
          page_key: params.page_key,
          element_key: params.element_key,
          element_type: params.element_type,
          text_value: params.text_value ?? null,
          image_url: params.image_url ?? null,
          color_value: params.color_value ?? null,
          metadata: params.metadata ?? null,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
          environment: currentEnv,
        }, { onConflict: "page_key,element_key,environment" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-customizations"] });
    },
  });

  // (environment is set automatically by the database trigger via x-environment header)

  return {
    customizations: customizations ?? [],
    isLoading,
    getCustomValue,
    upsertCustomization,
  };
}
