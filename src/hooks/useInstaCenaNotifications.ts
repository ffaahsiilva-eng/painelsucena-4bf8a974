import { createElement, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTables } from "@/lib/realtimeManager";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { playSoundFile } from "@/lib/sounds";
import instaCenaLogo from "@/assets/instacena-logo.png";

const getInstaCenaToastIcon = () =>
  createElement("img", {
    src: instaCenaLogo,
    alt: "InstaCena",
    className: "h-6 w-6 rounded-full object-cover",
  });

const navigateToPost = (postId: string) => {
  const path = `/instacena?highlight=${postId}`;
  if (window.location.pathname === "/instacena") {
    const el = document.getElementById(`post-${postId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "rounded-lg");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary", "rounded-lg"), 3000);
    } else {
      window.location.href = path;
    }
  } else {
    window.location.href = path;
  }
};

const showInstaCenaToast = (title: string, description: string, postId: string) => {
  playSoundFile("/sounds/instacena-post.mp3");

  toast(title, {
    description,
    duration: 8000,
    icon: getInstaCenaToastIcon(),
    action: {
      label: "Ver",
      onClick: () => navigateToPost(postId),
    },
  });
};

export const useInstaCenaNotifications = () => {
  const { user } = useAuth();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
    }

    return subscribeToTables([
      {
        cfg: { event: "INSERT", table: "instacena_posts" },
        callback: (payload) => {
          const newPost = payload.new as {
            id: string;
            user_id: string;
            user_name: string;
            content: string | null;
            is_system_post: boolean;
            image_urls: string[];
          };
          if (newPost.user_id === user.id) return;
          if (newPost.is_system_post) return;

          const truncatedContent = newPost.content
            ? newPost.content.length > 80
              ? `${newPost.content.substring(0, 80)}...`
              : newPost.content
            : "Nova publicação com foto";
          const hasImages = newPost.image_urls && newPost.image_urls.length > 0;

          showInstaCenaToast(
            `📢 ${newPost.user_name}`,
            `${truncatedContent}${hasImages ? " 📸" : ""}`,
            newPost.id,
          );
        },
      },
      {
        cfg: { event: "INSERT", table: "instacena_comments" },
        callback: async (payload) => {
          const comment = payload.new as {
            id: string;
            post_id: string;
            user_id: string;
            user_name: string;
            content: string;
          };
          if (comment.user_id === user.id) return;

          const { data: post } = await supabase
            .from("instacena_posts")
            .select("user_id")
            .eq("id", comment.post_id)
            .maybeSingle();
          if (!post || post.user_id !== user.id) return;

          const truncated = comment.content.length > 60
            ? `${comment.content.substring(0, 60)}...`
            : comment.content;

          showInstaCenaToast(
            `💬 ${comment.user_name} comentou`,
            truncated,
            comment.post_id,
          );
        },
      },
      {
        cfg: { event: "INSERT", table: "instacena_reactions" },
        callback: async (payload) => {
          const reaction = payload.new as {
            id: string;
            post_id: string;
            user_id: string;
            user_name: string;
            reaction_type: string;
          };
          if (reaction.user_id === user.id) return;

          const { data: post } = await supabase
            .from("instacena_posts")
            .select("user_id")
            .eq("id", reaction.post_id)
            .maybeSingle();
          if (!post || post.user_id !== user.id) return;

          const emojiMap: Record<string, string> = {
            like: "👍", love: "❤️", haha: "😂", wow: "😮", sad: "😢", angry: "😡",
          };
          const emoji = emojiMap[reaction.reaction_type] || "👍";

          showInstaCenaToast(
            `${emoji} ${reaction.user_name} reagiu`,
            "Reagiu à sua publicação",
            reaction.post_id,
          );
        },
      },
      {
        cfg: { event: "UPDATE", table: "dds_schedule" },
        callback: (payload) => {
          const updated = payload.new as {
            id: string;
            event_photo_url: string | null;
            theme: string;
          };
          const old = payload.old as { event_photo_url: string | null };
          if (!updated.event_photo_url || old.event_photo_url === updated.event_photo_url) return;

          playSoundFile("/sounds/instacena-post.mp3");
          toast("📋 Foto do DDS postada!", {
            description: `Tema: ${updated.theme}`,
            duration: 8000,
            icon: getInstaCenaToastIcon(),
            action: {
              label: "Ver no InstaCena",
              onClick: () => { window.location.href = "/instacena"; },
            },
          });
        },
      },
    ]);
  }, [user?.id]);
};
