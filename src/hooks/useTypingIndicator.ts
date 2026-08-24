import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const useTypingIndicator = (otherUserId: string | null) => {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const globalChannelRef = useRef<RealtimeChannel | null>(null);

  // Subscribe to typing events from the other user
  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    const channelName = `typing-${[user.id, otherUserId].sort().join("-")}`;
    
    const channel = supabase.channel(channelName)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.userId === otherUserId) {
          setIsOtherTyping(true);
          
          // Clear existing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          // Set timeout to hide typing indicator after 3 seconds
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, 3000);
        }
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        if (payload.payload.userId === otherUserId) {
          setIsOtherTyping(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    // Also subscribe to global typing channel for sending global events
    const globalChannel = supabase.channel("global-typing").subscribe();
    globalChannelRef.current = globalChannel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      if (globalChannelRef.current) {
        supabase.removeChannel(globalChannelRef.current);
      }
      channelRef.current = null;
      globalChannelRef.current = null;
    };
  }, [user?.id, otherUserId]);

  // Broadcast typing event (throttled)
  const sendTypingEvent = useCallback(() => {
    if (!user?.id || !otherUserId || !channelRef.current) return;

    const now = Date.now();
    // Only send typing event every 2 seconds
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;

    // Send to direct channel
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id },
    });

    // Also send to global channel for footer indicator
    if (globalChannelRef.current) {
      globalChannelRef.current.send({
        type: "broadcast",
        event: "user_typing",
        payload: { userId: user.id },
      });
    }
  }, [user?.id, otherUserId]);

  // Broadcast stop typing event
  const sendStopTypingEvent = useCallback(() => {
    if (!user?.id || !otherUserId || !channelRef.current) return;

    // Send to direct channel
    channelRef.current.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { userId: user.id },
    });

    // Also send to global channel
    if (globalChannelRef.current) {
      globalChannelRef.current.send({
        type: "broadcast",
        event: "user_stop_typing",
        payload: { userId: user.id },
      });
    }
  }, [user?.id, otherUserId]);

  return {
    isOtherTyping,
    sendTypingEvent,
    sendStopTypingEvent,
  };
};
