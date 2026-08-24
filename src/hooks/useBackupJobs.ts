import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BackupSegment {
  name: string;
  id: string;
  size: number;
  link: string;
  kind: string;
}

export interface BackupBucketState {
  name: string;
  part: number;
  stack?: unknown[];
}

export interface BackupJob {
  id: string;
  kind: "daily" | "weekly" | "monthly" | "manual" | "pre_update";
  status: "pending" | "running" | "success" | "failed";
  started_at: string;
  finished_at: string | null;
  size_bytes: number | null;
  file_count: number | null;
  table_count: number | null;
  drive_file_id: string | null;
  drive_path: string | null;
  drive_web_view_link: string | null;
  sha256: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  stage?: string | null;
  pending_buckets?: BackupBucketState[] | null;
  uploaded_segments?: BackupSegment[] | null;
  last_progress_at?: string | null;
  failed_files?: Array<{ bucket: string; path: string; error: string }> | null;
  manifest_drive_id?: string | null;
  manifest_web_link?: string | null;
}

export function useBackupJobs() {
  return useQuery({
    queryKey: ["backup-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_jobs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as BackupJob[];
    },
    refetchInterval: (query) => {
      const jobs = (query.state.data as BackupJob[] | undefined) || [];
      return jobs.some((j) => j.status === "running" || j.status === "pending")
        ? 5000
        : 60000;
    },
  });
}

export function useBackupDriveStatus() {
  return useQuery({
    queryKey: ["backup-drive-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "backup-drive-status",
        { body: {} },
      );
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useRunBackup() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, boolean | undefined>({
    mutationFn: async (includeStorage = false) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("backup-run", {
        body: { kind: "manual", created_by: userData.user?.id || null, include_storage: includeStorage },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backup-jobs"] });
      qc.invalidateQueries({ queryKey: ["backup-drive-status"] });
    },
  });
}

export function useCancelBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (backup_id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("backup-cancel", {
        body: { backup_id, user_id: userData.user?.id || null },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backup-jobs"] });
    },
  });
}

export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (backup_id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("backup-delete", {
        body: { backup_id, user_id: userData.user?.id || null },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backup-jobs"] });
      qc.invalidateQueries({ queryKey: ["backup-drive-status"] });
    },
  });
}

export async function downloadBackup(backupId: string) {
  const { data: userData } = await supabase.auth.getUser();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-download`;
  const session = (await supabase.auth.getSession()).data.session;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ backup_id: backupId, user_id: userData.user?.id }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(t);
  }
  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `backup-${backupId}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
