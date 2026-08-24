import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useGlobalTypingIndicator = () => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to a global typing channel
    const channel = supabase.channel("global-typing")
      .on("broadcast", { event: "user_typing" }, (payload) => {
        const typingUserId = payload.payload.userId as string;
        
        // Ignore own typing events
        if (typingUserId === user.id) return;

        setTypingUsers(prev => new Set(prev).add(typingUserId));

        // Clear existing timeout for this user
        const existingTimeout = typingTimeoutsRef.current.get(typingUserId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set timeout to remove typing indicator after 3 seconds
        const timeout = setTimeout(() => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(typingUserId);
            return newSet;
          });
          typingTimeoutsRef.current.delete(typingUserId);
        }, 3000);

        typingTimeoutsRef.current.set(typingUserId, timeout);
      })
      .on("broadcast", { event: "user_stop_typing" }, (payload) => {
        const typingUserId = payload.payload.userId as string;
        
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(typingUserId);
          return newSet;
        });

        const existingTimeout = typingTimeoutsRef.current.get(typingUserId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeoutsRef.current.delete(typingUserId);
        }
      })
      .subscribe();

    return () => {
      // Clear all timeouts
      typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const isUserTyping = (userId: string) => typingUsers.has(userId);

  return {
    typingUsers,
    isUserTyping,
  };
};
