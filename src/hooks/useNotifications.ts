import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTables } from "@/lib/realtimeManager";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

// Play default notification sound
const playNotificationSound = () => {
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 0.5;
    audio.play().catch((e) => {
    });
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
};

// Show browser push notification when page is in background
const showBrowserNotification = (notification: Notification) => {
  // Check if browser supports notifications and permission is granted
  if (!("Notification" in window) || window.Notification.permission !== "granted") {
    return;
  }

  // Only show if page is not visible (in background)
  if (document.visibilityState === "hidden") {
    try {
      const browserNotification = new window.Notification(notification.title, {
        body: notification.message,
        icon: "/pwa-192x192.png",
        tag: `notification-${notification.id}`,
      });

      // Focus window when notification is clicked
      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => browserNotification.close(), 5000);
    } catch (error) {
      console.error("Error showing browser notification:", error);
    }
  }
};

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  // Realtime subscription with sound and browser notification
  useEffect(() => {
    if (!user?.id) return;

    return subscribeToTables([
      {
        cfg: { event: "INSERT", table: "notifications", filter: `user_id=eq.${user.id}` },
        callback: (payload) => {
          playNotificationSound();
          showBrowserNotification(payload.new as Notification);
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        },
      },
      {
        cfg: { event: "UPDATE", table: "notifications", filter: `user_id=eq.${user.id}` },
        callback: () => queryClient.invalidateQueries({ queryKey: ["notifications", user.id] }),
      },
      {
        cfg: { event: "DELETE", table: "notifications", filter: `user_id=eq.${user.id}` },
        callback: () => queryClient.invalidateQueries({ queryKey: ["notifications", user.id] }),
      },
    ]);
  }, [user?.id, queryClient]);

  return query;
};

export const useUnreadCount = () => {
  const { data: notifications } = useNotifications();
  return notifications?.filter((n) => !n.read).length || 0;
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: {
      user_id: string;
      type: string;
      title: string;
      message: string;
      reference_id?: string;
      reference_type?: string;
    }) => {
      const { error } = await supabase.from("notifications").insert(notification);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
};
