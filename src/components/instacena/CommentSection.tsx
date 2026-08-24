import { useState, useRef, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useInstaCenaComments, useCreateComment, useDeleteComment } from "@/hooks/useInstaCena";
import { MentionText } from "./MentionText";
import { MentionPicker } from "./MentionPicker";
import { AvatarPreviewDialog } from "@/components/ui/AvatarPreviewDialog";
import { toast } from "sonner";

const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export function CommentSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { data: comments = [] } = useInstaCenaComments(postId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  const [commentText, setCommentText] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMention, setShowMention] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [previewAvatar, setPreviewAvatar] = useState<{ src?: string | null; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCommentText(val);

    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMention(true);
      setMentionQuery(atMatch[1]);
      setMentionCursorPos(cursorPos - atMatch[0].length);
    } else {
      setShowMention(false);
      setMentionQuery("");
    }
  }, []);

  const handleMentionSelect = useCallback((profile: { user_id: string; full_name: string }) => {
    const before = commentText.slice(0, mentionCursorPos);
    const after = commentText.slice(mentionCursorPos).replace(/^@\w*/, "");
    const mention = `@[${profile.full_name}](${profile.user_id}) `;
    setCommentText(before + mention + after);
    setShowMention(false);
    setMentionQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [commentText, mentionCursorPos]);

  const handleComment = () => {
    if (!commentText.trim()) return;
    createComment.mutate({ postId, content: commentText.trim() }, {
      onSuccess: () => setCommentText(""),
    });
  };

  const handleDelete = (commentId: string) => {
    deleteComment.mutate({ commentId, postId }, {
      onSuccess: () => toast.success("Comentário excluído"),
    });
  };

  return (
    <div className="mt-3 space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2 group">
          <button
            type="button"
            onClick={() => setPreviewAvatar({ src: c.user_avatar_url, name: c.user_name })}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-transform hover:scale-105 shrink-0"
            aria-label={`Ver foto de ${c.user_name}`}
          >
            <NeonAvatar
              src={c.user_avatar_url}
              name={c.user_name}
              frameColor={c.frame_color}
              neonColor={c.neon_color}
              frameAnimation={c.frame_animation}
              size="xs"
            />
          </button>
          <div className="bg-muted/50 rounded-xl px-3 py-1.5 flex-1">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewAvatar({ src: c.user_avatar_url, name: c.user_name })}
                className="text-xs font-semibold hover:underline focus:outline-none focus:underline text-left"
              >
                {c.user_name}
              </button>
              {(c.user_id === user?.id || isAdmin) && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5"
                  title="Excluir comentário"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-xs">
              <MentionText content={c.content} />
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        </div>
      ))}

      <AvatarPreviewDialog
        open={previewAvatar !== null}
        onOpenChange={(open) => !open && setPreviewAvatar(null)}
        src={previewAvatar?.src}
        name={previewAvatar?.name ?? ""}
      />

      {/* Comment input with mention support */}
      <div className="flex gap-2 items-end relative">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={commentText}
            onChange={handleContentChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !showMention) {
                e.preventDefault();
                handleComment();
              }
            }}
            placeholder="Escreva um comentário... Use @ para mencionar"
            className="w-full rounded-full bg-muted/50 border border-border/50 px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30"
          />
          <MentionPicker
            query={mentionQuery}
            visible={showMention}
            onSelect={handleMentionSelect}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={handleComment} disabled={!commentText.trim()}>
          Enviar
        </Button>
      </div>
    </div>
  );
}
