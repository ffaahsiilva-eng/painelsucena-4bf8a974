import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { DocumentStatus } from "./useDocuments";

export interface DocumentHistoryEntry {
  id: string;
  document_id: string;
  changed_by: string;
  changed_by_name: string;
  change_type: string;
  previous_status: DocumentStatus | null;
  new_status: DocumentStatus | null;
  notes: string | null;
  created_at: string;
}

export const useDocumentHistory = (documentId: string) => {
  return useQuery({
    queryKey: ["document-history", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_history")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DocumentHistoryEntry[];
    },
    enabled: !!documentId,
  });
};

export const useCreateDocumentHistory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({
      document_id,
      change_type,
      previous_status,
      new_status,
      notes,
    }: {
      document_id: string;
      change_type: string;
      previous_status?: DocumentStatus | null;
      new_status?: DocumentStatus | null;
      notes?: string | null;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase.from("document_history").insert({
        document_id,
        changed_by: user.id,
        changed_by_name: profile?.full_name || "Usuário",
        change_type,
        previous_status: previous_status || null,
        new_status: new_status || null,
        notes: notes || null,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["document-history", variables.document_id] });
    },
  });
};
