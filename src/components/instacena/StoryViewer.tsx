import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Trash2, Eye, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useDeleteStory,
  useMarkStoryViewed,
  useStoryViewers,
  type StoryGroup,
} from "@/hooks/useStories";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const IMAGE_DURATION_MS = 15_000;
const MAX_VIDEO_DURATION_MS = 30_000;

const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

interface StoryViewerProps {
  groups: StoryGroup[];
  startGroupIdx: number;
  onClose: () => void;
}

export function StoryViewer({ groups, startGroupIdx, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [groupIdx, setGroupIdx] = useState(startGroupIdx);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const markViewed = useMarkStoryViewed();
  const deleteStory = useDeleteStory();

  const currentGroup = groups[groupIdx];
  const currentStory = currentGroup?.stories[storyIdx];
  const isOwner = currentStory?.user_id === user?.id;

  const viewers = useStoryViewers(viewersOpen && isOwner ? currentStory?.id ?? null : null);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const goNext = useCallback(() => {
    if (!currentGroup) return;
    if (storyIdx + 1 < currentGroup.stories.length) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx + 1 < groups.length) {
      setGroupIdx((i) => i + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [currentGroup, storyIdx, groupIdx, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      const prevGroup = groups[groupIdx - 1];
      setGroupIdx((i) => i - 1);
      setStoryIdx(prevGroup.stories.length - 1);
    } else {
      onClose();
    }
  }, [storyIdx, groupIdx, groups, onClose]);

  // Mark current story as viewed
  useEffect(() => {
    if (currentStory && currentStory.user_id !== user?.id) {
      markViewed.mutate(currentStory.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStory?.id]);

  // Determine duration for the current story
  const duration = currentStory
    ? currentStory.media_type === "video"
      ? Math.min(currentStory.video_duration_ms || IMAGE_DURATION_MS, MAX_VIDEO_DURATION_MS)
      : IMAGE_DURATION_MS
    : IMAGE_DURATION_MS;

  // Progress timer (handles pause/resume)
  useEffect(() => {
    setProgress(0);
    accumulatedRef.current = 0;
    startRef.current = performance.now();

    const tick = (now: number) => {
      if (paused) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = accumulatedRef.current + (now - startRef.current);
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx, duration]);

  // Pause/resume control
  useEffect(() => {
    if (paused) {
      pausedAtRef.current = performance.now();
      videoRef.current?.pause();
    } else {
      if (pausedAtRef.current > 0) {
        // shift startRef so elapsed counter doesn't jump
        startRef.current += performance.now() - pausedAtRef.current;
        pausedAtRef.current = 0;
      }
      videoRef.current?.play().catch(() => {});
    }
  }, [paused]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  if (!currentStory || !currentGroup) return null;

  const handleDelete = async () => {
    if (!confirm("Excluir este status?")) return;
    try {
      await deleteStory.mutateAsync(currentStory.id);
      toast.success("Status excluído");
      // Move to next story or close
      if (currentGroup.stories.length === 1) {
        onClose();
      } else {
        goNext();
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir");
    }
  };

  return (
    <div className="fixed inset-0 z-[2147483647] bg-black flex items-center justify-center animate-in fade-in isolation-isolate">
      {/* Top: progress bars + author header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3 pt-3 pb-2 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex gap-1 mb-2">
          {currentGroup.stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full will-change-[width]"
                style={{
                  width:
                    i < storyIdx
                      ? "100%"
                      : i === storyIdx
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9 border border-white/30">
            <AvatarImage src={currentGroup.user_avatar || undefined} className="object-cover" />
            <AvatarFallback className="bg-primary/20 text-white text-xs">
              {getInitials(currentGroup.user_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {currentGroup.user_name}
            </p>
            <p className="text-white/70 text-[11px]">
              {formatDistanceToNow(new Date(currentStory.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-9 w-9 text-white hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Media */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-black"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
      >
        {currentStory.media_type === "image" ? (
          <img loading="lazy" decoding="async"
            src={currentStory.media_url}
            alt=""
            className="h-full w-full object-contain select-none"
            draggable={false}
          />
        ) : (
          <video
            ref={videoRef}
            src={currentStory.media_url}
            autoPlay
            playsInline
            controls={false}
            className="h-full w-full object-contain select-none"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              v.play().catch(() => {});
            }}
          />
        )}

        {/* Tap zones for navigation */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10 group"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-7 w-7 text-white/60 absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10 group"
          aria-label="Próximo"
        >
          <ChevronRight className="h-7 w-7 text-white/60 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* Caption strip (WhatsApp-style: full-width band with description) */}
      {currentStory.caption && (
        <div className="absolute left-0 right-0 z-20 px-4 py-3 bg-black/55 backdrop-blur-sm pointer-events-none"
          style={{ bottom: isOwner ? "64px" : "0" }}
        >
          <p className="text-white text-[15px] leading-snug max-w-2xl mx-auto text-center font-medium drop-shadow">
            {currentStory.caption}
          </p>
        </div>
      )}

      {/* Owner actions (kept separate, anchored to absolute bottom) */}
      {isOwner && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-3 pt-3 bg-gradient-to-t from-black/85 to-transparent">
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewersOpen(true)}
              className="text-white hover:bg-white/15 gap-1.5"
            >
              <Eye className="h-4 w-4" />
              Visualizações
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-white hover:bg-red-500/30 gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      )}

      {/* Viewers list (owner only) */}
      <Sheet open={viewersOpen} onOpenChange={setViewersOpen}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Visualizado por {viewers.data?.length || 0}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {viewers.isLoading && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {viewers.data?.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                Ninguém visualizou ainda.
              </p>
            )}
            {viewers.data?.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={v.viewer_avatar || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(v.viewer_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.viewer_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(v.viewed_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
