import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { useDesvioComments, useCreateDesvioComment, useDeleteDesvioComment } from "@/hooks/useDesvioComments";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface DesvioCommentSectionProps {
  desvioId: string;
}

export function DesvioCommentSection({ desvioId }: DesvioCommentSectionProps) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useDesvioComments(desvioId);
  const createComment = useCreateDesvioComment();
  const deleteComment = useDeleteDesvioComment();
  const [newComment, setNewComment] = useState("");
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await createComment.mutateAsync({ desvioId, content: newComment });
    setNewComment("");
  };

  return (
    <div className="border-t pt-3 mt-1 space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>Comentários{comments.length > 0 ? ` (${comments.length})` : ""}</span>
      </button>

      {expanded && (
        <div className="space-y-2">
          {/* Comments list */}
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : comments.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 group">
                  <Avatar className="w-6 h-6 mt-0.5">
                    <AvatarImage src={c.user_avatar_url || undefined} />
                    <AvatarFallback className="text-[9px]">{c.user_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground">{c.user_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(c.created_at), "dd/MM HH:mm")}
                      </span>
                      {c.user_id === user?.id && (
                        <button
                          onClick={() => deleteComment.mutate({ commentId: c.id, desvioId })}
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-foreground/80 break-words">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhum comentário ainda.</p>
          )}

          {/* New comment input */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Escreva um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
              className="text-xs h-8"
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 shrink-0"
              disabled={!newComment.trim() || createComment.isPending}
              onClick={handleSubmit}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
