import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { MessageCircle, ThumbsUp, Trash2, MoreHorizontal, Bot, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useInstaCenaComments, useInstaCenaReactions, useToggleReaction, useDeletePost, type InstaCenaPost } from "@/hooks/useInstaCena";
import { useEnvironmentsList } from "@/hooks/useEnvironmentsList";
import { ENVIRONMENTS } from "@/hooks/useEnvironment";
import { toast } from "sonner";
import { MentionText } from "./MentionText";
import { CommentSection } from "./CommentSection";
import { PhotoViewer } from "@/components/orders/PhotoViewer";
import { AvatarPreviewDialog } from "@/components/ui/AvatarPreviewDialog";

import thumbsUpAsset from "@/assets/emoji_thumbs_up.png.asset.json";
import heartRedAsset from "@/assets/emoji_heart_red.png.asset.json";
import crylaughAsset from "@/assets/emoji_crylaugh.png.asset.json";
import shockOpenMouthAsset from "@/assets/emoji_shock_open_mouth.png.asset.json";
import cryAsset from "@/assets/emoji_cry.png.asset.json";
import angryAsset from "@/assets/emoji_angry.png.asset.json";
import checkmarkAsset from "@/assets/emoji_Checkmark.png.asset.json";
import armAsset from "@/assets/emoji_arm.png.asset.json";
import airplaneAsset from "@/assets/emoji_ariplane.png.asset.json";
import coffeeAsset from "@/assets/emoji_coffee_espresso.png.asset.json";
import leavesAsset from "@/assets/emoji_autumn_fall_leaves_leaf.png.asset.json";
import surpriseAsset from "@/assets/emoji_eyes_wide_open_surprise_unbelievable.png.asset.json";
import fireAsset from "@/assets/emoji_fire.png.asset.json";

const REACTIONS = [
  { type: "like", emoji: "👍", label: "Curtir", icon: ThumbsUp, image: thumbsUpAsset.url },
  { type: "love", emoji: "❤️", label: "Amei", image: heartRedAsset.url },
  { type: "haha", emoji: "😂", label: "Haha", image: crylaughAsset.url },
  { type: "wow", emoji: "😮", label: "Uau", image: shockOpenMouthAsset.url },
  { type: "sad", emoji: "😢", label: "Triste", image: cryAsset.url },
  { type: "angry", emoji: "😡", label: "Grr", image: angryAsset.url },
  { type: "check", emoji: "✅", label: "Check", image: checkmarkAsset.url },
  { type: "strong", emoji: "💪", label: "Forte", image: armAsset.url },
  { type: "plane", emoji: "✈️", label: "Partiu", image: airplaneAsset.url },
  { type: "coffee", emoji: "☕", label: "Café", image: coffeeAsset.url },
  { type: "nature", emoji: "🍃", label: "Natureza", image: leavesAsset.url },
  { type: "eyes", emoji: "👀", label: "Olha só", image: surpriseAsset.url },
  { type: "fire", emoji: "🔥", label: "Fogo", image: fireAsset.url },
];

const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export function PostCard({ post }: { post: InstaCenaPost }) {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { data: comments = [] } = useInstaCenaComments(post.id);
  const { data: reactions = [] } = useInstaCenaReactions(post.id);
  const toggleReaction = useToggleReaction();
  const deletePost = useDeletePost();
  const { environments } = useEnvironmentsList();

  const envLabel = post.environment
    ? (environments.find((e) => e.id === post.environment)?.label
        ?? ENVIRONMENTS[post.environment]?.shortLabel
        ?? post.environment.charAt(0).toUpperCase() + post.environment.slice(1))
    : null;

  const [showComments, setShowComments] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [showReactionsDialog, setShowReactionsDialog] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);

  const myReaction = reactions.find((r) => r.user_id === user?.id);
  const isOwner = post.user_id === user?.id;

  // Group reactions by type
  const reactionGroups = reactions.reduce((acc, r) => {
    acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleReact = (type: string) => {
    toggleReaction.mutate({ postId: post.id, reactionType: type });
    setReactionsOpen(false);
  };




  const handleDelete = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => toast.success("Publicação excluída"),
    });
  };

  const currentReactionEmoji = myReaction
    ? REACTIONS.find((r) => r.type === myReaction.reaction_type)?.emoji || "👍"
    : null;

  return (
    <Card className={`shadow-sm ${post.is_system_post ? "border-primary/30 bg-primary/5" : "border-border/50"}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {post.is_system_post ? (
            <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 border border-primary/20">
              <img loading="lazy" decoding="async" src="/logo-sucena-system.jpg" alt="Sistema" className="h-full w-full object-cover" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAvatarPreviewOpen(true)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-transform hover:scale-105"
              aria-label={`Ver foto de ${post.user_name}`}
            >
              <NeonAvatar
                src={post.user_avatar_url}
                name={post.user_name}
                frameColor={post.frame_color}
                neonColor={post.neon_color}
                frameAnimation={post.frame_animation}
                size="sm"
              />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              {post.is_system_post ? (
                <>
                  <span className="text-primary">Sistema</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary font-medium">
                    LOG
                  </Badge>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAvatarPreviewOpen(true)}
                    className="hover:underline focus:outline-none focus:underline text-black font-bold animate-neon-green-text"
                  >
                    {post.user_name}
                  </button>
                  {post.is_admin && <VerifiedBadge size="sm" />}
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span>
                {post.is_system_post
                  ? `por ${post.user_name} · ${formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}`
                  : `${formatCargoLabel(post.user_cargo)} · ${formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}`
                }
              </span>
              {envLabel && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 gap-0.5 border-primary/40 text-primary font-medium"
                  title={`Publicado em ${envLabel}`}
                >
                  <MapPin className="h-2.5 w-2.5" />
                  {envLabel}
                </Badge>
              )}
            </p>

          </div>

          {/* Avatar preview dialog */}
          {!post.is_system_post && (
            <AvatarPreviewDialog
              open={avatarPreviewOpen}
              onOpenChange={setAvatarPreviewOpen}
              src={post.user_avatar_url}
              name={post.user_name}
            />
          )}
          {(isOwner || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        {post.content && (
          <p className="text-sm whitespace-pre-wrap mb-3">
            <MentionText content={post.content} />
          </p>
        )}

        {/* Images & Videos */}
        {post.image_urls && post.image_urls.length > 0 && (
          <div className={`grid gap-2 mb-3 ${post.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.image_urls.map((url, i) => {
              const isVideo = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url);
              return isVideo ? (
                <video key={i} src={url} controls playsInline preload="metadata" onContextMenu={(e) => e.preventDefault()} className="rounded-lg w-full object-contain bg-black/5" />
              ) : (
                <img loading="lazy" decoding="async"
                  key={i}
                  src={url}
                  alt=""
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={() => { setPhotoViewerIndex(i); setPhotoViewerOpen(true); }}
                  className={`rounded-lg w-full select-none cursor-pointer hover:opacity-90 transition-opacity bg-black/5 ${post.image_urls.length === 1 ? "object-contain" : "object-cover max-h-80"}`}
                  draggable={false}
                />
              );
            })}
          </div>
        )}

        {/* Photo viewer */}
        {post.image_urls && post.image_urls.length > 0 && (
          <PhotoViewer
            photos={post.image_urls.filter(url => !/\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url))}
            initialIndex={photoViewerIndex}
            open={photoViewerOpen}
            onOpenChange={setPhotoViewerOpen}
          />
        )}

        {/* Reaction summary - clickable */}
        {reactions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowReactionsDialog(true)}
            className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground hover:underline cursor-pointer flex-wrap"
          >
            <span className="flex items-center gap-0.5">
              {Object.entries(reactionGroups).map(([type]) => {
                const r = REACTIONS.find((rx) => rx.type === type);
                return r?.image ? (
                  <img key={type} src={r.image} alt={r.label} className="h-4 w-4 object-contain" />
                ) : (
                  <span key={type} className="text-sm">{r?.emoji}</span>
                );
              })}
            </span>
            <span>
              {reactions.length === 1
                ? reactions[0].user_name
                : reactions.length === 2
                  ? `${reactions[0].user_name} e ${reactions[1].user_name}`
                  : `${reactions[0].user_name}, ${reactions[1].user_name} e outras ${reactions.length - 2} pessoas reagiram`}
            </span>
          </button>
        )}

        {/* Reactions detail dialog */}
        <Dialog open={showReactionsDialog} onOpenChange={setShowReactionsDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Reações</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {reactions.map((r) => {
                const reactionDef = REACTIONS.find((rx) => rx.type === r.reaction_type);
                return (
                  <div key={r.id} className="flex items-center justify-between py-1.5 px-1">
                    <span className="text-sm truncate">{r.user_name}</span>
                    <span className="text-lg" title={reactionDef?.label}>
                      {reactionDef?.image ? (
                        <img src={reactionDef.image} alt={reactionDef.label} className="h-6 w-6 object-contain inline-block" />
                      ) : (
                        reactionDef?.emoji || "👍"
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Action bar */}
        <div className="flex items-center border-t border-b border-border/50 py-1 -mx-4 px-4 gap-1">
          <Popover open={reactionsOpen} onOpenChange={setReactionsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`flex-1 gap-1.5 text-xs ${myReaction ? "text-primary font-semibold" : "text-muted-foreground"}`}
              >
                {currentReactionEmoji ? (
                  REACTIONS.find((r) => r.type === myReaction?.reaction_type)?.image ? (
                    <img src={REACTIONS.find((r) => r.type === myReaction?.reaction_type)?.image} alt="Like" className="h-5 w-5 object-contain" />
                  ) : (
                    <span className="text-base">{currentReactionEmoji}</span>
                  )
                ) : (
                  <ThumbsUp className="h-4 w-4" />
                )}
                {myReaction ? REACTIONS.find((r) => r.type === myReaction.reaction_type)?.label || "Curtir" : "Curtir"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1.5 flex gap-1" side="top" align="start">
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={() => handleReact(r.type)}
                  className="text-xl hover:scale-125 transition-transform p-1 rounded-md hover:bg-accent"
                  title={r.label}
                >
                  {r.image ? (
                    <img src={r.image} alt={r.label} className="h-8 w-8 object-contain hover:scale-125 transition-transform" />
                  ) : (
                    r.emoji
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-1.5 text-xs text-muted-foreground"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4" />
            Comentar {comments.length > 0 && `(${comments.length})`}
          </Button>
        </div>

        {/* Comments section */}
        {showComments && <CommentSection postId={post.id} />}
      </CardContent>
    </Card>
  );
}
