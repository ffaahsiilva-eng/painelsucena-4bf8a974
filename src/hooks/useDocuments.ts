import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { getDaysUntilEventBrazilNorth } from "@/lib/timezone";

export type DocumentType = "pt" | "analise_risco" | "aso" | "treinamento" | "certificado" | "licenca" | "outro";
export type DocumentStatus = "pending" | "updated" | "cancelled";

export interface Document {
  id: string;
  title: string;
  document_type: DocumentType;
  description: string | null;
  expiry_date: string;
  status: DocumentStatus;
  file_url: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentInsert {
  title: string;
  document_type: DocumentType;
  description?: string;
  expiry_date: string;
  file_url?: string;
  notes?: string;
  created_by: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  pt: "PT (Permissão de Trabalho)",
  analise_risco: "Análise de Risco",
  aso: "ASO",
  treinamento: "Treinamento",
  certificado: "Certificado",
  licenca: "Licença",
  outro: "Outro",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "Pendente",
  updated: "Atualizado",
  cancelled: "Cancelado",
};

export const useDocuments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["documents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("documents")
        .select("id, title, document_type, description, expiry_date, status, file_url, notes, created_at")
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      return data as Document[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id) return;
    return subscribeToTable(
      { event: "*", table: "documents" },
      () => {
        queryClient.invalidateQueries({ queryKey: ["documents", user.id] });
        queryClient.invalidateQueries({ queryKey: ["expiring-documents", user.id] });
      }
    );
  }, [user?.id, queryClient]);

  return query;
};

// Get documents expiring within X days (for dashboard alerts)
export const useExpiringDocuments = (daysThreshold: number = 5) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["expiring-documents", user?.id, daysThreshold],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("status", "pending")
        .order("expiry_date", { ascending: true });

      if (error) throw error;

      const documents = data as Document[];

      // Filter documents expiring within threshold
      return documents.filter((doc) => {
        const daysUntilExpiry = getDaysUntilEventBrazilNorth(doc.expiry_date);
        return daysUntilExpiry >= 0 && daysUntilExpiry <= daysThreshold;
      });
    },
    enabled: !!user?.id,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (document: Omit<DocumentInsert, "created_by">) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("documents")
        .insert({
          ...document,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-documents"] });
    },
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Document> & { id: string }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("documents")
        .update({
          ...updates,
          updated_by: user.id,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-documents"] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-documents"] });
    },
  });
};
