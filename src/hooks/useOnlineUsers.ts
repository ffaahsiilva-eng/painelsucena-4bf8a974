// This hook is deprecated - use useAllUsers instead.
// Kept for backward compatibility but now delegates to useAllUsers.
import { useAllUsers } from "./useAllUsers";

export type OnlineUser = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  cargo: string;
  online_at: string;
};

export const useOnlineUsers = () => {
  const { allUsers } = useAllUsers();

  const onlineUsers: OnlineUser[] = allUsers
    .filter((u) => u.isOnline && !u.isCurrentUser)
    .map((u) => ({
      id: u.id,
      user_id: u.user_id,
      full_name: u.full_name,
      avatar_url: u.avatar_url,
      cargo: u.cargo,
      online_at: u.online_at || new Date().toISOString(),
    }));

  return { onlineUsers };
};
