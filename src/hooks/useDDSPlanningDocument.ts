import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface DDSPlanningDocument {
  id: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
}

export const useDDSPlanningDocument = () => {
  const [document, setDocument] = useState<DDSPlanningDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchDocument = async () => {
    try {
      const { data, error } = await supabase
        .from("dds_planning_document")
        .select("*")
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setDocument(data);
    } catch (error) {
      console.error("Error fetching DDS planning document:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDocument = async (file: File) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer upload.",
        variant: "destructive",
      });
      return false;
    }

    if (file.type !== "application/pdf") {
      toast({
        title: "Erro",
        description: "Apenas arquivos PDF são permitidos.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 18 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 18MB.",
        variant: "destructive",
      });
      return false;
    }

    setIsUploading(true);

    try {
      // Upload file to storage
      const fileName = `dds-planning-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("dds-documents")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("dds-documents")
        .getPublicUrl(fileName);

      // Delete old document record if exists
      if (document) {
        // Delete old file from storage
        const oldFileName = document.file_url.split("/").pop();
        if (oldFileName) {
          await supabase.storage.from("dds-documents").remove([oldFileName]);
        }
        await supabase.from("dds_planning_document").delete().eq("id", document.id);
      }

      // Insert new document record
      const { error: insertError } = await supabase
        .from("dds_planning_document")
        .insert({
          file_url: urlData.publicUrl,
          file_name: file.name,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Documento de planejamento DDS atualizado com sucesso!",
      });

      await fetchDocument();
      return true;
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Erro",
        description: "Falha ao fazer upload do documento.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async () => {
    if (!document) return false;

    try {
      // Delete file from storage
      const fileName = document.file_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("dds-documents").remove([fileName]);
      }

      // Delete record
      const { error } = await supabase
        .from("dds_planning_document")
        .delete()
        .eq("id", document.id);

      if (error) throw error;

      setDocument(null);
      toast({
        title: "Sucesso",
        description: "Documento removido com sucesso!",
      });
      return true;
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Erro",
        description: "Falha ao remover o documento.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchDocument();
  }, []);

  return {
    document,
    isLoading,
    isUploading,
    uploadDocument,
    deleteDocument,
    refetch: fetchDocument,
  };
};
