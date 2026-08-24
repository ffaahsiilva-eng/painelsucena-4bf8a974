import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import { resolveStorageUrl } from "@/lib/storage";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useEnvironment } from "./useEnvironment";
import { useEffect } from "react";

export interface InstaCenaPost {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  content: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  user_cargo?: string | null;
  is_admin?: boolean;
  is_system_post?: boolean;
  frame_color?: string | null;
  neon_color?: string | null;
  frame_animation?: string | null;
  environment?: string | null;
}

export interface InstaCenaComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  content: string;
  created_at: string;
  frame_color?: string | null;
  neon_color?: string | null;
  frame_animation?: string | null;
}

export interface InstaCenaReaction {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  reaction_type: string;
  created_at: string;
}

export const useInstaCenaPosts = () => {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";

  const query = useQuery({
    queryKey: ["instacena-posts", currentEnv],
    queryFn: async () => {
      // Posts manuais são compartilhados entre ambientes; somente logs do sistema
      // ficam isolados por ambiente.
      const { data, error } = await supabase
        .from("instacena_posts")
        .select("id, user_id, user_name, user_avatar_url, content, image_urls, created_at, updated_at, is_system_post, environment")
        .or(`is_system_post.is.null,is_system_post.eq.false,and(is_system_post.eq.true,environment.eq.${currentEnv})`)
        .order("created_at", { ascending: false });
      if (error) throw error;



      // Fetch cargos and admin status for post authors
      const userIds = [...new Set((data || []).map((p) => p.user_id))];
      const [profilesRes, adminRes] = await Promise.all([
        supabase.from("profiles").select("user_id, cargo, frame_color, neon_color, frame_animation").in("user_id", userIds),
        supabase.from("user_roles").select("user_id").in("user_id", userIds).eq("role", "admin"),
      ]);
      type ProfileFrame = { user_id: string; cargo: string; frame_color: string | null; neon_color: string | null; frame_animation: string | null };
      const profileMap = new Map<string, ProfileFrame>((profilesRes.data || []).map((p) => [p.user_id, p as ProfileFrame]));
      const adminSet = new Set((adminRes.data || []).map((r) => r.user_id));

      const postsWithResolvedImages = await Promise.all((data || []).map(async (post) => {
        const prof = profileMap.get(post.user_id);
        
        // Resolve avatar and post images
        const [resolvedAvatar, ...resolvedImages] = await Promise.all([
          resolveStorageUrl(post.user_avatar_url),
          ...(post.image_urls || []).map(img => resolveStorageUrl(img))
        ]);

        return {
          ...post,
          user_avatar_url: resolvedAvatar,
          image_urls: resolvedImages.filter(img => !!img) as string[],
          user_cargo: prof?.cargo || null,
          is_admin: adminSet.has(post.user_id),
          frame_color: prof?.frame_color || null,
          neon_color: prof?.neon_color || null,
          frame_animation: prof?.frame_animation || null,
        };
      }));

      return postsWithResolvedImages as InstaCenaPost[];
    },
  });

  useEffect(() => {
    return subscribeToTable(
      { event: "*", table: "instacena_posts" },
      () => queryClient.invalidateQueries({ queryKey: ["instacena-posts"] })
    );
  }, [queryClient]);

  return query;
};

export const useInstaCenaComments = (postId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["instacena-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instacena_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      
      const userIds = [...new Set((data || []).map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, frame_color, neon_color, frame_animation")
        .in("user_id", userIds);
      type FrameInfo = { user_id: string; frame_color: string | null; neon_color: string | null; frame_animation: string | null };
      const frameMap = new Map<string, FrameInfo>((profiles || []).map((p) => [p.user_id, p as FrameInfo]));
      
      const resolvedComments = await Promise.all((data || []).map(async (c) => {
        const f = frameMap.get(c.user_id);
        const resolvedAvatar = await resolveStorageUrl(c.user_avatar_url);
        return { 
          ...c, 
          user_avatar_url: resolvedAvatar,
          frame_color: f?.frame_color || null, 
          neon_color: f?.neon_color || null, 
          frame_animation: f?.frame_animation || null 
        };
      }));

      return resolvedComments as InstaCenaComment[];
    },
    enabled: !!postId,
  });

  useEffect(() => {
    return subscribeToTable(
      { event: "*", table: "instacena_comments", filter: `post_id=eq.${postId}` },
      () => queryClient.invalidateQueries({ queryKey: ["instacena-comments", postId] })
    );
  }, [queryClient, postId]);

  return query;
};

export const useInstaCenaReactions = (postId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["instacena-reactions", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instacena_reactions")
        .select("*")
        .eq("post_id", postId);
      if (error) throw error;
      return data as InstaCenaReaction[];
    },
    enabled: !!postId,
  });

  useEffect(() => {
    return subscribeToTable(
      { event: "*", table: "instacena_reactions", filter: `post_id=eq.${postId}` },
      () => queryClient.invalidateQueries({ queryKey: ["instacena-reactions", postId] })
    );
  }, [queryClient, postId]);

  return query;
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { environment } = useEnvironment();

  return useMutation({
    mutationFn: async ({ content, imageUrls }: { content: string; imageUrls?: string[] }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("instacena_posts").insert({
        user_id: user.id,
        user_name: profile?.full_name || "Usuário",
        user_avatar_url: profile?.avatar_url || null,
        content,
        image_urls: imageUrls || [],
        environment: environment || "barcarena",
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instacena-posts"] });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("instacena_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instacena-posts"] });
    },
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("instacena_comments").insert({
        post_id: postId,
        user_id: user.id,
        user_name: profile?.full_name || "Usuário",
        user_avatar_url: profile?.avatar_url || null,
        content,
      }).select().single();
      if (error) throw error;
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["instacena-comments", postId] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      const { error } = await supabase.from("instacena_comments").delete().eq("id", commentId);
      if (error) throw error;
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: ["instacena-comments", postId] });
    },
  });
};

export const useToggleReaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if user already reacted to this post
      const { data: existing } = await supabase
        .from("instacena_reactions")
        .select("id, reaction_type")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Remove reaction
          await supabase.from("instacena_reactions").delete().eq("id", existing.id);
        } else {
          // Update reaction type
          await supabase
            .from("instacena_reactions")
            .update({ reaction_type: reactionType })
            .eq("id", existing.id);
        }
      } else {
        // Insert new reaction
        const { error } = await supabase.from("instacena_reactions").insert({
          post_id: postId,
          user_id: user.id,
          user_name: profile?.full_name || "Usuário",
          reaction_type: reactionType,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["instacena-reactions", postId] });
    },
  });
};
