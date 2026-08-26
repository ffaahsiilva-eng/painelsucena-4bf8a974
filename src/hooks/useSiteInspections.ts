import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/utils/imageCompression";


export interface SiteInspection {
  id: string;
  inspection_date: string;
  created_by: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteInspectionTask {
  id: string;
  inspection_id: string;
  description: string;
  is_completed: boolean;
  completed_at: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  observation: string | null;
  created_at: string;
}

export function useUpdateTaskObservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, observation }: { id: string; observation: string | null }) => {
      const { error } = await supabase
        .from("site_inspection_tasks")
        .update({ observation })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-inspection-tasks"] });
    },
  });
}

export function useSiteInspections() {
  return useQuery({
    queryKey: ["site-inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_inspections")
        .select("*")
        .order("inspection_date", { ascending: false });
      if (error) throw error;
      return data as SiteInspection[];
    },
  });
}

export function useSiteInspectionTasks(inspectionId: string | null) {
  return useQuery({
    queryKey: ["site-inspection-tasks", inspectionId],
    enabled: !!inspectionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_inspection_tasks")
        .select("*")
        .eq("inspection_id", inspectionId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as SiteInspectionTask[];
    },
  });
}

export function useCreateSiteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { inspection_date: string; created_by: string; tasks: string[] }) => {
      const { data: inspection, error } = await supabase
        .from("site_inspections")
        .insert({ inspection_date: input.inspection_date, created_by: input.created_by })
        .select()
        .single();
      if (error) throw error;

      if (input.tasks.length > 0) {
        const taskRows = input.tasks.map((desc) => ({
          inspection_id: inspection.id,
          description: desc,
        }));
        const { error: taskError } = await supabase
          .from("site_inspection_tasks")
          .insert(taskRows);
        if (taskError) throw taskError;
      }

      return inspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
      queryClient.invalidateQueries({ queryKey: ["site-inspection-tasks"] });
    },
  });
}

export function useToggleLockInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_locked }: { id: string; is_locked: boolean }) => {
      const { error } = await supabase
        .from("site_inspections")
        .update({ is_locked })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
    },
  });
}

export function useToggleTaskCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from("site_inspection_tasks")
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-inspection-tasks"] });
    },
  });
}

export function useUpdateTaskPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, field, url }: { id: string; field: "before_photo_url" | "after_photo_url"; url: string }) => {
      const { error } = await supabase
        .from("site_inspection_tasks")
        .update({ [field]: url })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-inspection-tasks"] });
    },
  });
}

export function useDeleteSiteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("site_inspections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-inspections"] });
      queryClient.invalidateQueries({ queryKey: ["site-inspection-tasks"] });
    },
  });
}

export async function uploadInspectionPhoto(file: File, taskId: string, type: "before" | "after"): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${taskId}/${type}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("inspection-photos")
    .upload(path, await compressImage(file), { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("inspection-photos").getPublicUrl(path);
  return data.publicUrl;
}
