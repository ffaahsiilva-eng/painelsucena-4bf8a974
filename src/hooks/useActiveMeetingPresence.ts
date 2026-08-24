import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL_NAME = "meetings-active-presence";

/**
 * Subscribes to a global presence channel that JitsiRoom joins while a user
 * is actively in a meeting. Returns the number of users currently in any
 * meeting room.
 */
export function useActiveMeetingPresence() {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    const updateCount = () => {
      const state = channel.presenceState() as Record<string, unknown[]>;
      let total = 0;
      for (const arr of Object.values(state)) {
        if (Array.isArray(arr)) total += arr.length;
      }
      setActiveCount(total);
    };

    channel
      .on("presence", { event: "sync" }, updateCount)
      .on("presence", { event: "join" }, updateCount)
      .on("presence", { event: "leave" }, updateCount)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { activeCount, hasActive: activeCount > 0 };
}

/**
 * Tracks the current user as "in a meeting" on the global presence channel
 * for as long as the component using this hook is mounted.
 */
export function useTrackMeetingPresence(roomName: string | null | undefined) {
  useEffect(() => {
    if (!roomName) return;
    const key = `${roomName}-${crypto.randomUUID()}`;
    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key } },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ room: roomName, joined_at: Date.now() });
      }
    });

    return () => {
      try {
        channel.untrack();
      } catch {
        /* ignore */
      }
      supabase.removeChannel(channel);
    };
  }, [roomName]);
}
