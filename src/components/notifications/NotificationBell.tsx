import { Bell, Check, CheckCheck, Trash2, Calendar, BellRing, Volume2, MessageCircle, Heart, AtSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useCreateNotification,
} from "@/hooks/useNotifications";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const createNotification = useCreateNotification();
  const { isSupported, isGranted, isDenied, requestPermission } = useBrowserNotifications();

  // Calculate unread count directly from notifications
  const unreadCount = useMemo(() => {
    return notifications?.filter((n) => !n.read).length || 0;
  }, [notifications]);

  const handleEnablePushNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success("Notificações push ativadas!");
    } else {
      toast.error("Permissão negada. Você pode ativar nas configurações do navegador.");
    }
  };

  const handleTestNotification = async () => {
    if (!user?.id) {
      toast.error("Você precisa estar logado para testar");
      return;
    }
    
    try {
      await createNotification.mutateAsync({
        user_id: user.id,
        type: "test",
        title: "🔔 Teste de Notificação!",
        message: "Esta é uma notificação de teste. Se você ouviu o som, está funcionando!",
      });
      toast.success("Notificação de teste criada!");
    } catch (error) {
      console.error("Error creating test notification:", error);
      toast.error("Erro ao criar notificação de teste");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "dds_mention":
        return <Calendar className="h-4 w-4 text-amber-500" />;
      case "instacena_reaction":
        return <Heart className="h-4 w-4 text-red-500" />;
      case "instacena_comment":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "instacena_mention":
        return <AtSign className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: { id: string; read: boolean; type: string; reference_type: string | null; reference_id: string | null; message?: string | null }) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    const refType = notification.reference_type;
    const nType = notification.type;
    const refId = notification.reference_id;

    if (refType === "instacena_post") {
      navigate(refId ? `/instacena?post=${refId}` : "/instacena");
    } else if (refType === "dds_schedule" || nType === "dds_mention") {
      navigate("/dds");
    } else if (refType === "order" || nType === "order") {
      navigate(refId ? `/pedidos?order=${refId}` : "/pedidos");
    } else if (refType === "campaign" || nType === "campaign") {
      navigate("/campanhas");
    } else if (nType === "desvio") {
      navigate(refId ? `/desvios?desvio=${refId}` : "/desvios");
    } else if (nType === "document") {
      navigate("/documentos");
    } else if (nType === "reminder") {
      navigate("/lembretes");
    } else if (refType === "meeting" || nType === "meeting_invite") {
      // Extrai o room_name do link embutido na mensagem
      let room: string | null = null;
      const msg = notification.message || "";
      const match = msg.match(/[?&]room=([^\s&]+)/);
      if (match) {
        try {
          room = decodeURIComponent(match[1]);
        } catch {
          room = match[1];
        }
      }
      navigate(room ? `/reunioes?room=${encodeURIComponent(room)}` : "/reunioes");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-amber-500/10"
        >
          <Bell className="h-5 w-5 text-amber-500" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex items-center gap-1">
            {isSupported && !isGranted && !isDenied && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-amber-600 hover:text-amber-700"
                onClick={handleEnablePushNotifications}
              >
                <BellRing className="h-3 w-3 mr-1" />
                Ativar push
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        {/* Push notification status banner with test button */}
        <div className="px-4 py-2 bg-muted/50 border-b text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            {isSupported && isGranted && (
              <>
                <BellRing className="h-3 w-3 text-green-600" />
                <span className="text-green-600">Push ativado</span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6 px-2"
            onClick={handleTestNotification}
            disabled={createNotification.isPending}
          >
            <Volume2 className="h-3 w-3 mr-1" />
            Testar som
          </Button>
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : notifications?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications?.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 transition-colors cursor-pointer group",
                    !notification.read && "bg-amber-500/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            !notification.read && "text-amber-600"
                          )}
                        >
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead.mutate(notification.id);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification.mutate(notification.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
