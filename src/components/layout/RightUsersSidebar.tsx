import { useState } from "react";
import { useAllUsers, UserWithStatus } from "@/hooks/useAllUsers";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, ChevronRight, MessageCircle } from "lucide-react";
import chatBubbleIcon from "@/assets/instacena-chat-icon.png";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ModeratorBadge } from "@/components/ModeratorBadge";
import { AvatarPreviewDialog } from "@/components/ui/AvatarPreviewDialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { useGlobalTypingIndicator } from "@/hooks/useGlobalTypingIndicator";

interface RightUsersSidebarProps {
  onUserClick: (user: UserWithStatus) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const formatLastSeen = (lastSeen?: string) => {
  if (!lastSeen) return null;
  try {
    return formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: ptBR });
  } catch {
    return null;
  }
};

export const RightUsersSidebar = ({ onUserClick, isOpen, setIsOpen }: RightUsersSidebarProps) => {
  const { allUsers } = useAllUsers();
  const { isUserTyping } = useGlobalTypingIndicator();

  const currentUser = allUsers.find(u => u.isCurrentUser);
  const isDriver = currentUser?.cargo?.startsWith("motorista_");

  const filteredUsers = allUsers.filter((u) => !u.cargo?.startsWith("motorista_"));
  const onlineUsers = filteredUsers.filter((u) => u.isOnline);
  const offlineUsers = filteredUsers.filter((u) => !u.isOnline);
  
  const onlineCount = onlineUsers.length;

  if (isDriver) return null;

  return (
    <>
      {/* Sidebar panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-30 bg-background border-l border-border shadow-lg transition-transform duration-300",
          "w-[220px] md:w-[240px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Usuários</span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {onlineCount} online
          </span>
        </div>

        <ScrollArea className="h-[calc(100%-40px)]">
          {/* Online section */}
          {onlineUsers.length > 0 && (
            <div className="px-2 pt-2">
              <p className="text-[10px] font-semibold text-green-500 uppercase tracking-wider px-1 mb-1">
                Online ({onlineUsers.length})
              </p>
              {onlineUsers.map((user) => (
                <UserRow key={user.user_id} user={user} isTyping={isUserTyping(user.user_id)} onClick={() => onUserClick(user)} />
              ))}
            </div>
          )}

          {/* Offline section */}
          {offlineUsers.length > 0 && (
            <div className="px-2 pt-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                Offline ({offlineUsers.length})
              </p>
              {offlineUsers.map((user) => (
                <UserRow key={user.user_id} user={user} isTyping={false} onClick={() => onUserClick(user)} />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
};

const UserRow = ({ user, isTyping, onClick }: { user: UserWithStatus; isTyping: boolean; onClick: () => void }) => {
  const lastSeen = formatLastSeen(user.lastSeen);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-muted/60 transition-colors group text-left cursor-pointer"
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAvatarPreviewOpen(true); }}
              className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-transform hover:scale-110"
              aria-label={`Ver foto de ${user.full_name}`}
            >
              <NeonAvatar
                src={user.avatar_url}
                name={user.full_name}
                frameColor={user.frame_color}
                neonColor={user.neon_color}
                frameAnimation={user.frame_animation}
                size="xs"
              />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                  user.isOnline ? "bg-green-500" : "bg-muted-foreground/40"
                )}
              />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium truncate text-foreground">
                  {user.full_name.split(" ")[0]}
                </span>
                {user.isModerator ? <ModeratorBadge size="xs" /> : user.isAdmin && <VerifiedBadge size="xs" />}
              </div>
              {isTyping ? (
                <span className="text-[10px] text-green-500 italic">digitando...</span>
              ) : (
                <span className="text-[10px] text-muted-foreground truncate block">
                  {user.isOnline ? formatCargoLabel(user.cargo) : (lastSeen || formatCargoLabel(user.cargo))}
                </span>
              )}
            </div>
            <MessageCircle className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">{user.full_name}</p>
          <p className="text-[10px] text-muted-foreground">{formatCargoLabel(user.cargo)}</p>
        </TooltipContent>
      </Tooltip>
      <AvatarPreviewDialog
        open={avatarPreviewOpen}
        onOpenChange={setAvatarPreviewOpen}
        src={user.avatar_url}
        name={user.full_name}
      />
    </>
  );
};
