import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import { resolveStorageUrl } from "@/lib/storage";
import { useAuth } from "./useAuth";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useAdminUsers } from "./useAdminUsers";
import { playSoundFile } from "@/lib/sounds";
import { toast } from "sonner";

export type UserWithStatus = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  cargo: string;
  frame_color?: string | null;
  neon_color?: string | null;
  frame_animation?: string | null;
  isOnline: boolean;
  isCurrentUser: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  online_at?: string;
  lastSeen?: string;
  justCameOnline?: boolean;
};

type ProfileData = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  cargo: string;
  frame_color?: string | null;
  neon_color?: string | null;
  frame_animation?: string | null;
};

type PresenceData = {
  user_id: string;
  online_at: string | null;
  last_seen_at: string | null;
};

export const useAllUsers = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { data: adminUserIds } = useAdminUsers();
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map());
  const [justOnlineIds, setJustOnlineIds] = useState<Set<string>>(new Set());
  const previousOnlineIdsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const justOnlineTimeoutRef = useRef<number | null>(null);
  const ONLINE_GRACE_MS = 1800_000;
  const GRACE_CLEANUP_INTERVAL_MS = 300_000; // Increased to 5 minutes to reduce background work

  const lastSeenTimestampRef = useRef<Map<string, number>>(new Map());
  const graceCleanupRef = useRef<number | null>(null);
  const cachedProfileRef = useRef<ProfileData | null>(null);
  const lastPersistedAtRef = useRef<number>(0);
  const [, setRefreshKey] = useState(0);

  const persistPresence = useCallback(
    async ({ online_at, last_seen_at }: { online_at: string | null; last_seen_at: string }) => {
      if (!user) return;

      const { error } = await supabase.from("user_presence").upsert(
        {
          user_id: user.id,
          online_at,
          last_seen_at,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.warn("Error persisting user presence:", error);
      }
    },
    [user]
  );

  const syncPresenceRowsToLastSeenMap = useCallback((rows: PresenceData[]) => {
    setLastSeenMap((prev) => {
      const next = new Map(prev);

      rows.forEach((row) => {
        const lastSeen = row.last_seen_at ?? row.online_at;
        if (lastSeen) {
          next.set(row.user_id, lastSeen);
        }
      });

      return next;
    });
  }, []);

  const trackCurrentUser = useCallback(
    async (presenceChannel: RealtimeChannel) => {
      if (!user) return;

      if (!cachedProfileRef.current) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, avatar_url, cargo, frame_color, neon_color, frame_animation")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          if (profile.avatar_url) {
            profile.avatar_url = await resolveStorageUrl(profile.avatar_url);
          }
          cachedProfileRef.current = profile;
        }
      }

      const now = new Date().toISOString();
      const cached = cachedProfileRef.current;
      const payload = cached
        ? {
            id: cached.id,
            user_id: user.id,
            full_name: cached.full_name,
            avatar_url: cached.avatar_url,
            cargo: cached.cargo,
            frame_color: cached.frame_color,
            neon_color: cached.neon_color,
            frame_animation: cached.frame_animation,
            online_at: now,
          }
        : {
            user_id: user.id,
            online_at: now,
          };

      try {
        await presenceChannel.track(payload as any);
      } catch (err) {
        console.warn("Presence track failed, will retry on next heartbeat:", err);
      }

      // Só grava na DB no máximo 1x a cada 10 min para reduzir carga.
      // O canal Realtime já mantém "online" em tempo real via track().
      const nowMs = Date.now();
      if (nowMs - lastPersistedAtRef.current > 600_000) {
        lastPersistedAtRef.current = nowMs;
        void persistPresence({ online_at: now, last_seen_at: now });
      }
    },
    [user, persistPresence]
  );

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url, cargo, frame_color, neon_color, frame_animation")
        .order("full_name");

      if (error) {
        console.error("Error fetching profiles:", error);
        setIsLoading(false);
        return;
      }

      if (data) {
        await Promise.all(
          data.map(async (p) => {
            if (p.avatar_url) {
              p.avatar_url = await resolveStorageUrl(p.avatar_url);
            }
          })
        );
      }
      setProfiles(data || []);
      setIsLoading(false);
    };

    fetchProfiles();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchPersistedPresence = async () => {
      const { data, error } = await supabase
        .from("user_presence")
        .select("user_id, online_at, last_seen_at");

      if (error) {
        console.error("Error fetching persisted presence:", error);
        return;
      }

      syncPresenceRowsToLastSeenMap((data as PresenceData[]) || []);
    };

    const unsubscribe = subscribeToTable(
      { event: "*", table: "user_presence" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          const oldRow = payload.old as PresenceData;
          setLastSeenMap((prev) => {
            const next = new Map(prev);
            next.delete(oldRow.user_id);
            return next;
          });
          return;
        }
        const newRow = payload.new as PresenceData;
        syncPresenceRowsToLastSeenMap([newRow]);
      }
    );

    void fetchPersistedPresence();

    return () => {
      unsubscribe();
    };
  }, [user, syncPresenceRowsToLastSeenMap]);

  useEffect(() => {
    if (!user) return;

    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (justOnlineTimeoutRef.current) {
      window.clearTimeout(justOnlineTimeoutRef.current);
      justOnlineTimeoutRef.current = null;
    }
    if (graceCleanupRef.current) {
      window.clearInterval(graceCleanupRef.current);
      graceCleanupRef.current = null;
    }

    cachedProfileRef.current = null;

    const presenceChannel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = presenceChannel;

    const handlePresenceSync = () => {
      const state = presenceChannel.presenceState();
      const presenceOnlineIds = new Set<string>();
      const onlineAtTimes = new Map<string, string>();
      const now = Date.now();

      Object.values(state).forEach((presences: any[]) => {
        presences.forEach((presence) => {
          if (presence?.user_id) {
            presenceOnlineIds.add(presence.user_id);
            if (presence.online_at) {
              onlineAtTimes.set(presence.user_id, presence.online_at);
            }
          }
        });
      });

      presenceOnlineIds.forEach((id) => {
        lastSeenTimestampRef.current.set(id, now);
      });

      const effectiveOnlineIds = new Set<string>(presenceOnlineIds);
      lastSeenTimestampRef.current.forEach((ts, id) => {
        if (now - ts < ONLINE_GRACE_MS) {
          effectiveOnlineIds.add(id);
        } else {
          lastSeenTimestampRef.current.delete(id);
        }
      });

      effectiveOnlineIds.add(user.id);

      const newlyOnline = new Set<string>();
      effectiveOnlineIds.forEach((id) => {
        if (!previousOnlineIdsRef.current.has(id) && id !== user.id) {
          newlyOnline.add(id);
        }
      });

      if (newlyOnline.size > 0) {
        setJustOnlineIds(newlyOnline);
        playSoundFile("/sounds/online.mp3");

        if (justOnlineTimeoutRef.current) {
          window.clearTimeout(justOnlineTimeoutRef.current);
        }
        justOnlineTimeoutRef.current = window.setTimeout(() => {
          setJustOnlineIds(new Set());
        }, 3000);
      }

      setLastSeenMap((prev) => {
        const next = new Map(prev);

        previousOnlineIdsRef.current.forEach((id) => {
          if (!effectiveOnlineIds.has(id)) {
            const lastTimestamp = lastSeenTimestampRef.current.get(id);
            next.set(id, new Date(lastTimestamp ?? now).toISOString());
          }
        });

        onlineAtTimes.forEach((onlineAt, id) => {
          next.set(id, onlineAt);
        });

        return next;
      });

      previousOnlineIdsRef.current = effectiveOnlineIds;
      setOnlineUserIds(new Set(effectiveOnlineIds));
    };

    setOnlineUserIds((prev) => {
      const next = new Set(prev);
      next.add(user.id);
      return next;
    });

    presenceChannel
      .on("presence", { event: "sync" }, handlePresenceSync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await trackCurrentUser(presenceChannel);

          heartbeatRef.current = window.setInterval(() => {
            void trackCurrentUser(presenceChannel);
          }, 300000); // Increased to 5 minutes to reduce WebSocket traffic
        }
      });

    graceCleanupRef.current = window.setInterval(() => {
      const now = Date.now();
      const expiredEntries: Array<{ id: string; ts: number }> = [];

      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        let changed = false;

        prev.forEach((id) => {
          if (id === user.id) return;

          const lastTs = lastSeenTimestampRef.current.get(id);
          if (lastTs && now - lastTs >= ONLINE_GRACE_MS) {
            expiredEntries.push({ id, ts: lastTs });
            next.delete(id);
            lastSeenTimestampRef.current.delete(id);
            changed = true;
          }
        });

        if (changed) {
          previousOnlineIdsRef.current = new Set(next);
          return next;
        }

        return prev;
      });

      if (expiredEntries.length > 0) {
        setLastSeenMap((prev) => {
          const next = new Map(prev);
          expiredEntries.forEach(({ id, ts }) => {
            next.set(id, new Date(ts).toISOString());
          });
          return next;
        });
      }
    }, GRACE_CLEANUP_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (channelRef.current) {
        void trackCurrentUser(channelRef.current);
      }
    };

    const handleOnline = () => {
      if (channelRef.current) {
        void trackCurrentUser(channelRef.current);
      }
    };

    const handleFocus = () => {
      if (channelRef.current) {
        void trackCurrentUser(channelRef.current);
      }
    };

    const handlePageHide = () => {
      // Don't set online_at to null immediately on pagehide to avoid flickering during refreshes
      // The grace period will naturally mark them as offline if they don't come back
      void persistPresence({
        online_at: new Date().toISOString(), 
        last_seen_at: new Date().toISOString(),
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pagehide", handlePageHide);


    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pagehide", handlePageHide);

      void persistPresence({
        online_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });


      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (justOnlineTimeoutRef.current) {
        window.clearTimeout(justOnlineTimeoutRef.current);
        justOnlineTimeoutRef.current = null;
      }
      if (graceCleanupRef.current) {
        window.clearInterval(graceCleanupRef.current);
        graceCleanupRef.current = null;
      }

      presenceChannel.unsubscribe();
      channelRef.current = null;
    };
  }, [user, trackCurrentUser, persistPresence]);

  useEffect(() => {
    // Refresh throttled to 60s — presence updates already arrive via Realtime channel.
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const allUsers: UserWithStatus[] = profiles
    .map((profile) => {
      const isCurrentUser = profile.user_id === user?.id;
      const inMemoryLastSeen = lastSeenMap.get(profile.user_id);
      const liveLastSeenTs = lastSeenTimestampRef.current.get(profile.user_id);
      
      const isRecentInDb = inMemoryLastSeen && (Date.now() - new Date(inMemoryLastSeen).getTime() < ONLINE_GRACE_MS);
      const isOnline = isCurrentUser || onlineUserIds.has(profile.user_id) || isRecentInDb;
      
      const fallbackLastSeen = inMemoryLastSeen ?? (liveLastSeenTs ? new Date(liveLastSeenTs).toISOString() : undefined);

      return {
        ...profile,
        isOnline,
        isCurrentUser,
        isAdmin: Array.isArray(adminUserIds?.all) ? adminUserIds.all.includes(profile.user_id) : false,
        isModerator: Array.isArray(adminUserIds?.moderators) ? adminUserIds.moderators.includes(profile.user_id) : false,
        lastSeen: isOnline ? undefined : fallbackLastSeen,
        justCameOnline: justOnlineIds.has(profile.user_id),
      };
    })
    .sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.full_name.localeCompare(b.full_name);
    });

  const onlineCount = onlineUserIds.size;
  const offlineCount = allUsers.filter((u) => !u.isOnline).length;

  return {
    allUsers,
    onlineCount,
    offlineCount,
    isLoading,
  };
};
