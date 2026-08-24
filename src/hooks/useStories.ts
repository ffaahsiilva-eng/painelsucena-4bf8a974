import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import { resolveStorageUrl } from "@/lib/storage";
import { useAuth } from "./useAuth";

export interface Story {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  media_url: string;
  media_type: "image" | "video";
  video_duration_ms: number | null;
  caption: string | null;
  environment: string | null;
  created_at: string;
  expires_at: string;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  viewer_name: string;
  viewer_avatar: string | null;
  viewed_at: string;
}

export interface StoryGroup {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  stories: Story[];
  hasUnseen: boolean;
  latestAt: string;
}

/**
 * Lists all active stories grouped by user, ordered by most recent first.
 * Includes which stories the current viewer has already seen.
 */
export const useStories = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["instacena-stories"],
    queryFn: async (): Promise<StoryGroup[]> => {
      const { data: stories, error } = await supabase
        .from("instacena_stories")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!stories) return [];

      // Fetch which stories THIS user already viewed
      let viewedIds = new Set<string>();
      if (user?.id && stories.length > 0) {
        const { data: views } = await supabase
          .from("instacena_story_views")
          .select("story_id")
          .eq("viewer_id", user.id)
          .in("story_id", stories.map((s) => s.id));
        viewedIds = new Set((views || []).map((v) => v.story_id));
      }

      // Group by user_id
      const groupMap = new Map<string, StoryGroup>();
      const resolvedStories = await Promise.all((stories as Story[]).map(async (s) => {
        const [resolvedAvatar, resolvedMedia] = await Promise.all([
          resolveStorageUrl(s.user_avatar),
          resolveStorageUrl(s.media_url)
        ]);
        return {
          ...s,
          user_avatar: resolvedAvatar,
          media_url: resolvedMedia || s.media_url
        };
      }));

      for (const s of resolvedStories) {
        const existing = groupMap.get(s.user_id);
        if (existing) {
          existing.stories.push(s);
          if (!viewedIds.has(s.id)) existing.hasUnseen = true;
          if (s.created_at > existing.latestAt) existing.latestAt = s.created_at;
        } else {
          groupMap.set(s.user_id, {
            user_id: s.user_id,
            user_name: s.user_name,
            user_avatar: s.user_avatar,
            stories: [s],
            hasUnseen: !viewedIds.has(s.id),
            latestAt: s.created_at,
          });
        }
      }

      // Sort: own user first (if has stories), then unseen, then by latestAt desc
      const groups = Array.from(groupMap.values()).sort((a, b) => {
        if (user?.id) {
          if (a.user_id === user.id && b.user_id !== user.id) return -1;
          if (b.user_id === user.id && a.user_id !== user.id) return 1;
        }
        if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
        return b.latestAt.localeCompare(a.latestAt);
      });

      return groups;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    return subscribeToTable(
      { event: "*", table: "instacena_stories" },
      () => qc.invalidateQueries({ queryKey: ["instacena-stories"] })
    );
  }, [qc]);

  return query;
};

interface CreateStoryInput {
  media_url: string;
  media_type: "image" | "video";
  video_duration_ms?: number | null;
  caption?: string | null;
}

export const useCreateStory = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStoryInput) => {
      if (!user?.id) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from("instacena_stories")
        .insert({
          user_id: user.id,
          user_name: profile?.full_name || "Usuário",
          user_avatar: profile?.avatar_url || null,
          media_url: input.media_url,
          media_type: input.media_type,
          video_duration_ms: input.video_duration_ms ?? null,
          caption: input.caption ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instacena-stories"] }),
  });
};

export const useDeleteStory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      const { error } = await supabase
        .from("instacena_stories")
        .delete()
        .eq("id", storyId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instacena-stories"] }),
  });
};

/** Records a view; safely no-ops on duplicate (unique constraint). */
export const useMarkStoryViewed = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      if (!user?.id) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      await supabase
        .from("instacena_story_views")
        .insert({
          story_id: storyId,
          viewer_id: user.id,
          viewer_name: profile?.full_name || "Usuário",
          viewer_avatar: profile?.avatar_url || null,
        })
        .select();
      // Ignore duplicate-key errors silently — they just mean already viewed.
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instacena-stories"] }),
  });
};

/** Fetches the list of viewers for a given story (only for the story author). */
export const useStoryViewers = (storyId: string | null) => {
  return useQuery({
    queryKey: ["story-viewers", storyId],
    queryFn: async (): Promise<StoryView[]> => {
      if (!storyId) return [];
      const { data, error } = await supabase
        .from("instacena_story_views")
        .select("*")
        .eq("story_id", storyId)
        .order("viewed_at", { ascending: false });
      if (error) throw error;
      
      const resolvedViews = await Promise.all((data || []).map(async (v) => {
        const resolvedAvatar = await resolveStorageUrl(v.viewer_avatar);
        return {
          ...v,
          viewer_avatar: resolvedAvatar
        };
      }));

      return resolvedViews as StoryView[];
    },
    enabled: !!storyId,
  });
};
