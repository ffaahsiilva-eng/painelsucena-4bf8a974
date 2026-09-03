import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SECURITY_FILE_CATEGORIES = [
  "Encarregado",
  "Tec Meio Ambiente",
  "Tec Segurança",
  "Preposto",
  "Planejamento",
  "Administrativo",
  "Almoxarifado",
  "Transporte",
  "Confidencial",
] as const;

export const ADMIN_ONLY_CATEGORIES: readonly string[] = ["Confidencial"];

export type SecurityFileCategory = typeof SECURITY_FILE_CATEGORIES[number];

export interface SecurityFile {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string;
  uploaded_by_name: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export function useSecurityFiles() {
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["security-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_files")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SecurityFile[];
    },
  });

  const uploadFile = useMutation({
    mutationFn: async ({
      file,
      userId,
      userName,
      category,
    }: {
      file: File;
      userId: string;
      userName: string;
      category: string;
    }) => {
      // Upload to storage
      const fileExt = file.name.split(".").pop();
      // Sanitize filename to avoid storage path issues
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${userId}/${Date.now()}-${safeName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("security-files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });


      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("security-files")
        .getPublicUrl(fileName);

      // Get current authenticated user id for RLS compliance
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authenticatedUserId = authUser?.id;

      if (!authenticatedUserId) {
        throw new Error("Usuário não autenticado");
      }


      // Save to database - use authenticated user id to match RLS policy
      const { error: dbError } = await supabase.from("security_files").insert({
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type || fileExt,
        uploaded_by: authenticatedUserId,
        uploaded_by_name: userName,
        category: category,
      } as any);

      if (dbError) {
        console.error("DB insert error:", dbError);
        throw dbError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-files"] });
      toast.success("Arquivo enviado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error uploading file:", error);
      const msg = error?.message || error?.statusCode || JSON.stringify(error);
      toast.error(`Erro ao enviar: ${msg}`);
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (file: SecurityFile) => {
      // Extract file name from URL
      const urlParts = file.file_url.split("/");
      const storagePath = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("security-files")
        .remove([storagePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("security_files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-files"] });
      toast.success("Arquivo excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting file:", error);
      toast.error("Erro ao excluir arquivo");
    },
  });

  return {
    files,
    isLoading,
    uploadFile,
    deleteFile,
  };
}
