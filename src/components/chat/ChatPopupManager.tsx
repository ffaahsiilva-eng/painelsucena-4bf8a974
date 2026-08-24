import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import { useAuth } from "@/hooks/useAuth";
import { useAllUsers, UserWithStatus } from "@/hooks/useAllUsers";
import { ChatPopup } from "./ChatPopup";
import type { Tables } from "@/integrations/supabase/types";

type ChatMessage = Tables<"chat_messages">;

interface PopupChat {
  user: UserWithStatus;
  minimized: boolean;
}

export interface ChatPopupManagerHandle {
  openPopup: (user: UserWithStatus) => void;
}

export const ChatPopupManager = forwardRef<ChatPopupManagerHandle>((_props, ref) => {
  const { user } = useAuth();
  const { allUsers: rawUsers } = useAllUsers();
  const allUsers = rawUsers.filter(u => !u.cargo?.startsWith("motorista_"));
  const [openPopups, setOpenPopups] = useState<PopupChat[]>([]);

  const currentUser = rawUsers.find(u => u.isCurrentUser);
  const isDriver = currentUser?.cargo?.startsWith("motorista_");

  const closePopup = useCallback((userId: string) => {
    setOpenPopups(prev => prev.filter(p => p.user.user_id !== userId));
  }, []);

  const openPopup = useCallback((senderUser: UserWithStatus) => {
    setOpenPopups(prev => {
      if (prev.find(p => p.user.user_id === senderUser.user_id)) {
        return prev.map(p => 
          p.user.user_id === senderUser.user_id 
            ? { ...p, minimized: false } 
            : p
        );
      }
      const newPopups = [...prev, { user: senderUser, minimized: false }];
      if (newPopups.length > 3) {
        return newPopups.slice(-3);
      }
      return newPopups;
    });
  }, []);

  useImperativeHandle(ref, () => ({ openPopup }), [openPopup]);

  // On mount: check for unread messages and open popups
  const hasCheckedUnread = useRef(false);
  useEffect(() => {
    if (!user?.id || allUsers.length === 0 || hasCheckedUnread.current) return;
    hasCheckedUnread.current = true;

    const checkUnread = async () => {
      const { data: unreadMessages } = await supabase
        .from("chat_messages")
        .select("sender_id")
        .eq("receiver_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false });

      if (!unreadMessages || unreadMessages.length === 0) return;

      const uniqueSenderIds = [...new Set(unreadMessages.map(m => m.sender_id))];

      for (const senderId of uniqueSenderIds.slice(0, 3)) {
        const senderUser = allUsers.find(u => u.user_id === senderId);
        if (senderUser) {
          openPopup(senderUser);
        }
      }
    };

    checkUnread();
  }, [user?.id, allUsers, openPopup]);

  useEffect(() => {
    if (!user?.id) return;

    return subscribeToTable(
      {
        event: "INSERT",
        table: "chat_messages",
        filter: `receiver_id=eq.${user.id}`,
      },
      async (payload) => {
        const newMessage = payload.new as ChatMessage;
        const senderUser = allUsers.find((u) => u.user_id === newMessage.sender_id);

        if (senderUser) {
          openPopup(senderUser);
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", newMessage.sender_id)
            .single();

          if (profile) {
            const newUser: UserWithStatus = {
              id: profile.id,
              user_id: profile.user_id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              cargo: profile.cargo,
              frame_color: profile.frame_color,
              neon_color: profile.neon_color,
              frame_animation: profile.frame_animation,
              isOnline: false,
              isCurrentUser: false,
              isAdmin: false,
              isModerator: false,
            };
            openPopup(newUser);
          }
        }
      }
    );
  }, [user?.id, allUsers, openPopup]);

  if (!user || openPopups.length === 0 || isDriver) return null;

  return (
    <div className="fixed bottom-14 right-4 z-50 flex items-end gap-3">
      {openPopups.map((popup) => (
        <ChatPopup
          key={popup.user.user_id}
          user={popup.user}
          onClose={() => closePopup(popup.user.user_id)}
          onExpand={() => {}} // No-op on desktop, always stays as popup
        />
      ))}
    </div>
  );
});

ChatPopupManager.displayName = "ChatPopupManager";
