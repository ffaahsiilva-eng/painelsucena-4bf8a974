import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAuth } from "@/hooks/useAuth";
import { UserWithStatus } from "@/hooks/useAllUsers";
import { EmojiPicker } from "./EmojiPicker";
import { Send, X, Loader2, ArrowLeft, Mic, Paperclip, Check, CheckCheck, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ModeratorBadge } from "@/components/ModeratorBadge";
import { formatCargoLabel } from "@/lib/cargoUtils";

// Format last seen time in a user-friendly way
const formatLastSeen = (lastSeen?: string): string => {
  if (!lastSeen) return "";
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  // If less than 1 minute ago
  if (diffMinutes < 1) {
    return "visto agora";
  }
  
  // If less than 1 hour ago
  if (diffMinutes < 60) {
    return `visto há ${diffMinutes} min`;
  }
  
  // If less than 24 hours ago
  if (diffHours < 24) {
    return `visto hoje às ${format(lastSeenDate, "HH:mm", { locale: ptBR })}`;
  }
  
  // If yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (lastSeenDate.toDateString() === yesterday.toDateString()) {
    return `visto ontem às ${format(lastSeenDate, "HH:mm", { locale: ptBR })}`;
  }
  
  // Otherwise show full date
  return `visto em ${format(lastSeenDate, "dd/MM 'às' HH:mm", { locale: ptBR })}`;
};

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: UserWithStatus | null;
}
const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
};

// WhatsApp-style typing indicator
const TypingIndicator = () => <div className="flex justify-start mb-2">
    <div className="bg-white dark:bg-[#202c33] rounded-lg rounded-bl-none px-3 py-2 shadow-sm max-w-[80%]">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{
        animationDelay: "0ms"
      }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{
        animationDelay: "150ms"
      }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{
        animationDelay: "300ms"
      }} />
      </div>
    </div>
  </div>;
export const ChatDialog = ({
  open,
  onOpenChange,
  selectedUser
}: ChatDialogProps) => {
  const {
    user
  } = useAuth();
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const {
    messages,
    isLoading,
    sendMessage,
    uploadImage,
    clearConversation
  } = useChatMessages(selectedUser?.user_id || null);
  const {
    isOtherTyping,
    sendTypingEvent,
    sendStopTypingEvent
  } = useTypingIndicator(selectedUser?.user_id || null);

  // Auto-scroll to bottom when new messages arrive or typing indicator shows
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOtherTyping]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle typing events
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);
    if (value.trim()) {
      sendTypingEvent();

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to send stop typing after 2 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        sendStopTypingEvent();
      }, 2000);
    } else {
      sendStopTypingEvent();
    }
  };
  const handleSend = async () => {
    if (!message.trim() && !pendingFile) return;

    // Clear typing timeout and send stop event
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendStopTypingEvent();
    try {
      let imageUrl: string | undefined;
      if (pendingFile) {
        setIsUploading(true);
        imageUrl = await uploadImage(pendingFile);
      }
      await sendMessage.mutateAsync({
        content: message.trim() || undefined,
        imageUrl
      });
      setMessage("");
      setPreviewImage(null);
      setPendingFile(null);
    } catch (error: any) {
      toast.error("Erro ao enviar mensagem: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
    sendTypingEvent();
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = e => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  const clearPreview = () => {
    setPreviewImage(null);
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  const handleClearConversation = async () => {
    try {
      await clearConversation();
      toast.success("Conversa limpa com sucesso!");
    } catch {
      toast.error("Erro ao limpar conversa");
    } finally {
      setClearDialogOpen(false);
    }
  };

  if (!selectedUser) return null;
  return <>
    <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Limpar conversa?</AlertDialogTitle>
          <AlertDialogDescription>
            Todas as mensagens desta conversa serão excluídas permanentemente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleClearConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Limpar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md h-[80vh] sm:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-0 rounded-xl [&>button]:hidden" aria-describedby="chat-description">
        <DialogDescription id="chat-description" className="sr-only">
          Chat com {selectedUser.full_name}
        </DialogDescription>
        
        {/* WhatsApp-style Header */}
        <DialogHeader className="flex-shrink-0 bg-[#008069] dark:bg-[#1f2c34] px-2 py-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/10 rounded-full" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
            
            <div className="relative">
              <NeonAvatar
                src={selectedUser.avatar_url}
                name={selectedUser.full_name}
                frameColor={selectedUser.frame_color}
                neonColor={selectedUser.neon_color}
                frameAnimation={selectedUser.frame_animation}
                size="sm"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white text-base font-medium flex items-center gap-1 truncate">
                {selectedUser.full_name}
                {selectedUser.isModerator ? <ModeratorBadge size="xs" /> : selectedUser.isAdmin && <VerifiedBadge size="xs" />}
              </DialogTitle>
              <p className="text-white/70 text-xs truncate">
                {isOtherTyping ? (
                  <span className="text-[#25d366]">digitando...</span>
                ) : selectedUser.isOnline ? (
                  "online"
                ) : selectedUser.lastSeen ? (
                  formatLastSeen(selectedUser.lastSeen)
                ) : (
                  formatCargoLabel(selectedUser.cargo)
                )}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/10 rounded-full"
              onClick={() => onOpenChange(false)}
              title="Fechar chat"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogHeader>

        {/* WhatsApp-style Chat Background */}
        <div className="flex-1 overflow-hidden relative" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundColor: '#e5ddd5'
      }}>
          <div className="absolute inset-0 bg-[#efeae2] dark:bg-[#0b141a] opacity-95" />
          
          <ScrollArea className="h-full relative z-10" ref={scrollRef}>
            <div className="px-4 py-3 space-y-1">
              {isLoading ? <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#008069]" />
                </div> : messages.length === 0 ? <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="bg-[#fffffff2] dark:bg-[#1f2c34] rounded-lg px-4 py-2 shadow-sm text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      📱 Inicie uma conversa
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      As mensagens são criptografadas
                    </p>
                  </div>
                </div> : messages.map((msg, index) => {
              const isOwn = msg.sender_id === user?.id;
              const showTail = index === 0 || messages[index - 1]?.sender_id !== msg.sender_id;
              return <div key={msg.id} className={cn("flex mb-0.5", isOwn ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] px-2.5 py-1.5 shadow-sm relative", isOwn ? "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-lg" : "bg-white dark:bg-[#202c33] rounded-lg", showTail && isOwn && "rounded-tr-none", showTail && !isOwn && "rounded-tl-none")}>
                        {/* Message tail */}
                        {showTail && <div className={cn("absolute top-0 w-3 h-3", isOwn ? "-right-1.5 border-l-8 border-l-[#d9fdd3] dark:border-l-[#005c4b] border-y-8 border-y-transparent border-r-0" : "-left-1.5 border-r-8 border-r-white dark:border-r-[#202c33] border-y-8 border-y-transparent border-l-0")} />}
                        
                        {msg.image_url && <img loading="lazy" decoding="async" src={msg.image_url} alt="Imagem" className="max-w-full rounded-md mb-1" />}
                        
                        <div className="flex items-end gap-1">
                          {msg.content && <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>}
                          <span className={cn("text-[10px] flex items-center gap-0.5 shrink-0 ml-1", isOwn ? "text-gray-500 dark:text-gray-400" : "text-gray-500 dark:text-gray-400")}>
                            {format(new Date(msg.created_at), "HH:mm", {
                        locale: ptBR
                      })}
                            {isOwn && <CheckCheck className={cn("h-3.5 w-3.5", msg.read_at ? "text-[#53bdeb]" : "text-gray-400")} />}
                          </span>
                        </div>
                      </div>
                    </div>;
            })}
              
              {/* Typing indicator */}
              {isOtherTyping && <TypingIndicator />}
            </div>
          </ScrollArea>
        </div>

        {/* Image Preview */}
        {previewImage && <div className="px-3 py-2 bg-[#f0f2f5] dark:bg-[#1f2c34] border-t border-gray-200 dark:border-gray-700">
            <div className="relative inline-block">
              <img loading="lazy" decoding="async" src={previewImage} alt="Preview" className="h-20 rounded-lg shadow-md" />
              <button onClick={clearPreview} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-700 text-white flex items-center justify-center shadow-md hover:bg-gray-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>}

        {/* WhatsApp-style Input Area */}
        <div className="flex items-center gap-1.5 px-2 py-2 bg-[#f0f2f5] dark:bg-[#1f2c34] flex-shrink-0">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />

          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
          
          <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full shrink-0" onClick={() => fileInputRef.current?.click()} type="button">
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full shrink-0" onClick={() => setClearDialogOpen(true)} type="button" title="Limpar conversa">
            <Trash2 className="h-5 w-5" />
          </Button>

          <div className="flex-1 relative">
            <Input ref={inputRef} value={message} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Mensagem" className="rounded-full bg-white dark:bg-[#2a3942] border-0 pl-4 pr-10 h-10 text-sm focus-visible:ring-0 focus-visible:ring-offset-0" disabled={isUploading || sendMessage.isPending} />
          </div>

          <Button size="icon" className={cn("h-10 w-10 rounded-full shrink-0 transition-colors", message.trim() || pendingFile ? "bg-[#008069] hover:bg-[#017561] text-white" : "bg-[#008069] hover:bg-[#017561] text-white")} onClick={handleSend} disabled={!message.trim() && !pendingFile || isUploading || sendMessage.isPending}>
            {isUploading || sendMessage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : message.trim() || pendingFile ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
};