import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTables } from "@/lib/realtimeManager";
import { useAuth } from "./useAuth";
import { playSoundFile } from "@/lib/sounds";
import type { Tables } from "@/integrations/supabase/types";

export type ChatMessage = Tables<"chat_messages">;

export const useChatMessages = (otherUserId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastMessageIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const markingReadRef = useRef(false);

  // Fetch messages between current user and selected user
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return [];

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!otherUserId,
  });

  // Mark incoming messages as delivered and read (separate from queryFn to avoid loops)
  useEffect(() => {
    if (!user?.id || !otherUserId || messages.length === 0 || markingReadRef.current) return;

    const undelivered = messages.filter(
      (m) => m.sender_id === otherUserId && !m.delivered_at
    );
    const unread = messages.filter(
      (m) => m.sender_id === otherUserId && !m.read_at
    );

    if (undelivered.length === 0 && unread.length === 0) return;

    markingReadRef.current = true;

    const markMessages = async () => {
      try {
        const now = new Date().toISOString();

        if (undelivered.length > 0) {
          await supabase
            .from("chat_messages")
            .update({ delivered_at: now })
            .in("id", undelivered.map((m) => m.id));
        }

        if (unread.length > 0) {
          await supabase
            .from("chat_messages")
            .update({ read_at: now })
            .in("id", unread.map((m) => m.id));
        }

        // Single invalidation after both updates
        queryClient.invalidateQueries({
          queryKey: ["chat-messages", user.id, otherUserId],
        });
      } finally {
        // Delay to prevent immediate re-triggering
        setTimeout(() => {
          markingReadRef.current = false;
        }, 2000);
      }
    };

    markMessages();
  }, [messages, user?.id, otherUserId, queryClient]);

  // Track initial load to prevent sound on first load
  useEffect(() => {
    if (messages.length > 0 && isInitialLoadRef.current) {
      lastMessageIdRef.current = messages[messages.length - 1]?.id || null;
      isInitialLoadRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    const handleInsert = (payload: any) => {
      const newMessage = payload.new as ChatMessage;
      if (
        (newMessage.sender_id === user.id && newMessage.receiver_id === otherUserId) ||
        (newMessage.sender_id === otherUserId && newMessage.receiver_id === user.id)
      ) {
        if (newMessage.sender_id === otherUserId && newMessage.id !== lastMessageIdRef.current) {
          playSoundFile("/sounds/msn-chat.mp3");
        }
        lastMessageIdRef.current = newMessage.id;
        queryClient.invalidateQueries({ queryKey: ["chat-messages", user.id, otherUserId] });
      }
    };

    const handleUpdate = (payload: any) => {
      const updated = payload.new as ChatMessage;
      if (
        (updated.sender_id === user.id && updated.receiver_id === otherUserId) ||
        (updated.sender_id === otherUserId && updated.receiver_id === user.id)
      ) {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", user.id, otherUserId] });
      }
    };

    return subscribeToTables([
      { cfg: { event: "INSERT", table: "chat_messages" }, callback: handleInsert },
      { cfg: { event: "UPDATE", table: "chat_messages" }, callback: handleUpdate },
    ]);
  }, [user?.id, otherUserId, queryClient]);

  // Reset initial load flag when conversation changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    lastMessageIdRef.current = null;
    markingReadRef.current = false;
  }, [otherUserId]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      imageUrl,
      audioUrl,
    }: {
      content?: string;
      imageUrl?: string;
      audioUrl?: string;
    }) => {
      if (!user?.id || !otherUserId) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          content: content || null,
          image_url: imageUrl || null,
          audio_url: audioUrl || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", user?.id, otherUserId],
      });
    },
  });

  const uploadImage = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error("User not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-images")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("chat-images")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const uploadAudio = async (blob: Blob): Promise<string> => {
    if (!user?.id) throw new Error("User not authenticated");

    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const fileName = `${user.id}/audio-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-images")
      .upload(fileName, blob, { contentType: blob.type || "audio/webm" });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("chat-images")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const clearConversation = async () => {
    if (!user?.id || !otherUserId) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      );

    if (error) throw error;

    queryClient.invalidateQueries({
      queryKey: ["chat-messages", user.id, otherUserId],
    });
  };

  return {
    messages,
    isLoading,
    sendMessage,
    uploadImage,
    uploadAudio,
    clearConversation,
  };
};
