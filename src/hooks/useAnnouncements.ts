import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "./useEnvironment";
import { toast } from "sonner";
import { playIOSNotificationSound } from "@/lib/sounds";
export interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  target_type: string;
  target_users: string[];
  scheduled_at: string | null;
  published_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export function useAnnouncements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const announcementsRef = useRef<Announcement[]>([]);

  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";

  // Fetch all announcements (admin view) for current environment
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements", currentEnv],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, content, image_url, target_type, target_users, scheduled_at, published_at, created_by, created_at, updated_at, environment")
        .eq("environment", currentEnv)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const results = (data || []) as Announcement[];
      announcementsRef.current = results;
      return results;
    },
    enabled: !!user,
  });

  // Fetch reads for all announcements (admin view)
  const { data: allReads = [] } = useQuery({
    queryKey: ["announcement-reads-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcement_reads")
        .select("id, announcement_id, user_id, read_at");

      if (error) throw error;
      return data as AnnouncementRead[];
    },
    enabled: !!user,
  });

  // Create announcement mutation
  const createAnnouncement = useMutation({
    mutationFn: async (announcement: {
      title: string;
      content: string;
      image_url?: string | null;
      target_type: string;
      target_users?: string[];
      scheduled_at?: string | null;
      environments?: string[]; // ambientes alvo (default: ambiente atual)
    }) => {
      const now = new Date().toISOString();
      const isScheduled = announcement.scheduled_at && new Date(announcement.scheduled_at) > new Date();
      const publishedAt = isScheduled ? announcement.scheduled_at : now;

      const { environments, ...rest } = announcement;
      const targetEnvs = environments && environments.length > 0 ? environments : [undefined];

      const inserted: any[] = [];
      for (const env of targetEnvs) {
        const payload: any = {
          ...rest,
          created_by: user!.id,
          published_at: publishedAt,
        };
        if (env) payload.environment = env;

        const { data, error } = await supabase
          .from("announcements")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        inserted.push(data);
      }
      return inserted[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", currentEnv] });
      toast.success("Comunicado criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar comunicado: ${error.message}`);
    },
  });

  // Delete announcement mutation
  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", currentEnv] });
      toast.success("Comunicado excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir comunicado: ${error.message}`);
    },
  });

  return {
    announcements,
    allReads,
    isLoading,
    createAnnouncement,
    deleteAnnouncement,
  };
}

export function useUnreadAnnouncements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const unreadAnnouncementsRef = useRef<Announcement[]>([]);
  const previousCountRef = useRef<number>(0);
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";

  // Fetch unread announcements for current user in current environment
  const { data: unreadAnnouncements = [], isLoading } = useQuery({
    queryKey: ["unread-announcements", user?.id, currentEnv],
    queryFn: async () => {
      if (!user) return [];

      const now = new Date().toISOString();
      const userCreatedAt = user.created_at || now;

      // Get announcements for current environment
      const { data: announcements, error: annError } = await supabase
        .from("announcements")
        .select("id, title, content, image_url, target_type, target_users, published_at, environment")
        .eq("environment", currentEnv)
        .lte("published_at", now)
        .gte("published_at", userCreatedAt);

      if (annError) throw annError;

      // Get user's reads
      const { data: reads, error: readsError } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);

      if (readsError) throw readsError;

      const readIds = new Set(reads?.map((r) => r.announcement_id) || []);

      // Filter to unread announcements
      const unread = (announcements || []).filter((a) => {
        const isTargeted = a.target_type === "all" || a.target_users?.includes(user.id);
        const isUnread = !readIds.has(a.id);
        return isTargeted && isUnread;
      });

      const results = unread as Announcement[];
      unreadAnnouncementsRef.current = results;
      return results;
    },
    enabled: !!user,

  });

  // Play sound when new announcements arrive
  useEffect(() => {
    if (unreadAnnouncements.length > previousCountRef.current && previousCountRef.current > 0) {
      playIOSNotificationSound();
      toast.info("Novo comunicado recebido!", {
        description: unreadAnnouncements[0]?.title,
      });
    }
    previousCountRef.current = unreadAnnouncements.length;
  }, [unreadAnnouncements]);
  // Mark announcement as read
  const markAsRead = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user) return;
      // Localiza o anúncio para usar o environment correto (evita falhas de RLS quando
      // o usuário troca de ambiente)
      const ann = (unreadAnnouncements as Announcement[] | undefined)?.find(
        (a) => a.id === announcementId
      );
      const env = (ann as any)?.environment;

      const payload: Record<string, any> = {
        announcement_id: announcementId,
        user_id: user.id,
      };
      if (env) payload.environment = env;

      const { error } = await supabase.from("announcement_reads").insert(payload);
      if (error && !error.message.includes("duplicate")) {
        console.error("[markAsRead] erro:", error);
        throw error;
      }
    },
    onMutate: async (announcementId: string) => {
      // Atualiza otimisticamente removendo o anúncio da lista
      await queryClient.cancelQueries({ queryKey: ["unread-announcements", user?.id] });
      const previous = queryClient.getQueryData<Announcement[]>([
        "unread-announcements",
        user?.id,
      ]);
      queryClient.setQueryData<Announcement[]>(
        ["unread-announcements", user?.id],
        (old) => (old || []).filter((a) => a.id !== announcementId)
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["unread-announcements", user?.id], ctx.previous);
      }
      toast.error("Não foi possível marcar como lido. Tente novamente.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-announcements"] });
    },
  });

  // Mark all unread announcements as read at once
  const markAllAsRead = useMutation({
    mutationFn: async (announcementIds: string[]) => {
      if (!user || announcementIds.length === 0) return;
      const list = (unreadAnnouncements as Announcement[] | undefined) || [];
      // Inserções individuais para respeitar RLS por ambiente e tolerar duplicatas
      const results = await Promise.allSettled(
        announcementIds.map(async (id) => {
          const ann = list.find((a) => a.id === id);
          const env = (ann as any)?.environment;
          const payload: Record<string, any> = {
            announcement_id: id,
            user_id: user.id,
          };
          if (env) payload.environment = env;
          const { error } = await supabase.from("announcement_reads").insert(payload);
          if (error && !error.message.includes("duplicate")) {
            console.error("[markAllAsRead] erro ao marcar", id, error);
            throw error;
          }
        })
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        console.warn(`[markAllAsRead] ${failed}/${announcementIds.length} falharam`);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["unread-announcements", user?.id] });
      const previous = queryClient.getQueryData<Announcement[]>([
        "unread-announcements",
        user?.id,
      ]);
      // Limpa otimisticamente
      queryClient.setQueryData<Announcement[]>(
        ["unread-announcements", user?.id],
        []
      );
      return { previous };
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["unread-announcements", user?.id], ctx.previous);
      }
      toast.error("Falha ao fechar todos. Tente novamente.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-announcements"] });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user || !environment) return;

    return subscribeToTable(
      { event: "INSERT", table: "announcements" },
      async (payload) => {
        const announcement = payload.new as Announcement;
        
        if ((announcement as any).environment !== currentEnv) return;

        const isTargeted = announcement.target_type === "all" ||
          announcement.target_users?.includes(user.id);
        
        if (isTargeted) {
          playIOSNotificationSound();
          toast.info("Novo comunicado!", { description: announcement.title });
          
          queryClient.setQueryData<Announcement[]>(
            ["unread-announcements", user?.id, currentEnv],
            (old) => {
              const list = old || [];
              if (list.some(a => a.id === announcement.id)) return list;
              return [announcement, ...list];
            }
          );
        }
        
        queryClient.invalidateQueries({ queryKey: ["unread-announcements", user?.id, currentEnv] });
        queryClient.invalidateQueries({ queryKey: ["announcements", currentEnv] });
      }
    );
  }, [user, environment, currentEnv, queryClient]);


  return {
    unreadAnnouncements,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}
