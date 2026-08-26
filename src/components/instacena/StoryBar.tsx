import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Loader2, X, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStories, useCreateStory, type StoryGroup } from "@/hooks/useStories";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoryViewer } from "./StoryViewer";
import { compressImage } from "@/utils/imageCompression";


const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

/** Horizontal bar of story bubbles with "Add" CTA, like WhatsApp/Instagram. */
export function StoryBar() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: groups, isLoading } = useStories();
  const createStory = useCreateStory();
  const fileRef = useRef<HTMLInputElement>(null);

  const [openGroupIdx, setOpenGroupIdx] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video" | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImg = f.type.startsWith("image/");
    const isVid = f.type.startsWith("video/");
    if (!isImg && !isVid) {
      toast.error("Apenas imagens ou vídeos são aceitos");
      return;
    }
    setPreviewFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setPreviewType(isImg ? "image" : "video");
    setCaption("");
    setUploadOpen(true);
    e.target.value = "";
  };

  const closeUpload = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewType(null);
    setCaption("");
    setUploadOpen(false);
  };

  const getVideoDurationMs = (file: File): Promise<number | null> =>
    new Promise((resolve) => {
      try {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => {
          const ms = Math.round((v.duration || 0) * 1000);
          URL.revokeObjectURL(v.src);
          resolve(ms || null);
        };
        v.onerror = () => resolve(null);
        v.src = URL.createObjectURL(file);
      } catch {
        resolve(null);
      }
    });

  const handlePublish = async () => {
    if (!previewFile || !previewType) return;
    setUploading(true);
    try {
      // Upload original file (no compression — preserve quality)
      const ext = previewFile.name.split(".").pop() || (previewType === "image" ? "jpg" : "mp4");
      const path = `instacena/stories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("site-assets")
        .upload(path, await compressImage(previewFile), {
          cacheControl: "3600",
          upsert: false,
          contentType: previewFile.type,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const durationMs = previewType === "video" ? await getVideoDurationMs(previewFile) : null;

      await createStory.mutateAsync({
        media_url: publicUrl,
        media_type: previewType,
        video_duration_ms: durationMs,
        caption: caption.trim() || null,
      });

      toast.success("Status publicado! Visível por 24h.");
      closeUpload();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao publicar status");
    } finally {
      setUploading(false);
    }
  };

  const myGroup = groups?.find((g) => g.user_id === user?.id);
  const otherGroups = groups?.filter((g) => g.user_id !== user?.id) || [];

  return (
    <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-3 mb-2">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
        {/* My status / Add new */}
        <button
          onClick={() => {
            if (myGroup) {
              const idx = groups!.findIndex((g) => g.user_id === user?.id);
              setOpenGroupIdx(idx);
            } else {
              fileRef.current?.click();
            }
          }}
          className="flex flex-col items-center gap-1 shrink-0 group"
        >
          <div className="relative">
            <div
              className={`p-[2px] rounded-full ${
                myGroup
                  ? myGroup.hasUnseen
                    ? "bg-gradient-to-tr from-primary via-accent to-primary"
                    : "bg-muted"
                  : "bg-muted"
              }`}
            >
              {myGroup && myGroup.stories.length > 0 ? (
                <StoryThumb
                  story={myGroup.stories[myGroup.stories.length - 1]}
                  fallbackName={profile?.full_name || "EU"}
                />
              ) : (
                <Avatar className="h-14 w-14 border-2 border-card">
                  <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {profile?.full_name ? getInitials(profile.full_name) : "EU"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-card shadow group-hover:scale-110 transition-transform"
              title="Adicionar status"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground max-w-[64px] truncate">
            Seu status
          </span>
        </button>

        {/* Other users' stories */}
        {isLoading && (
          <div className="flex items-center gap-2 px-2 text-muted-foreground text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Carregando...
          </div>
        )}

        {otherGroups.map((g) => {
          const realIdx = groups!.findIndex((gr) => gr.user_id === g.user_id);
          return (
            <button
              key={g.user_id}
              onClick={() => setOpenGroupIdx(realIdx)}
              className="flex flex-col items-center gap-1 shrink-0 group"
            >
              <div
                className={`p-[2px] rounded-full ${
                  g.hasUnseen
                    ? "bg-gradient-to-tr from-primary via-accent to-primary animate-pulse"
                    : "bg-muted"
                }`}
              >
                <StoryThumb
                  story={g.stories[g.stories.length - 1]}
                  fallbackName={g.user_name}
                />
              </div>
              <span className="text-[11px] text-foreground max-w-[64px] truncate">
                {g.user_name.split(" ")[0]}
              </span>
            </button>
          );
        })}

        {!isLoading && (!groups || groups.length === 0) && (
          <span className="text-xs text-muted-foreground italic px-2">
            Seja o primeiro a postar um status hoje 📸
          </span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Upload preview dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => !o && !uploading && closeUpload()}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-0">
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <Button
                size="icon"
                variant="ghost"
                onClick={closeUpload}
                disabled={uploading}
                className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/40 text-white px-2.5 py-1 rounded-full text-xs">
              {previewType === "image" ? (
                <ImageIcon className="h-3.5 w-3.5" />
              ) : (
                <VideoIcon className="h-3.5 w-3.5" />
              )}
              Novo status • 24h
            </div>

            <div className="bg-black flex items-center justify-center min-h-[400px] max-h-[70vh]">
              {previewType === "image" && previewUrl && (
                <img loading="lazy" decoding="async"
                  src={previewUrl}
                  alt="Pré-visualização"
                  className="max-h-[70vh] w-full object-contain"
                />
              )}
              {previewType === "video" && previewUrl && (
                <video
                  src={previewUrl}
                  controls
                  className="max-h-[70vh] w-full object-contain"
                />
              )}
            </div>
          </div>

          <div className="bg-card p-3 space-y-3">
            <Input
              placeholder="Adicionar legenda (opcional)..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              disabled={uploading}
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>📤 Enviado em qualidade original</span>
              <span>{caption.length}/200</span>
            </div>
            <Button
              onClick={handlePublish}
              disabled={uploading}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                "Publicar status (24h)"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story viewer */}
      {openGroupIdx !== null && groups && groups[openGroupIdx] &&
        createPortal(
          <StoryViewer
            groups={groups}
            startGroupIdx={openGroupIdx}
            onClose={() => setOpenGroupIdx(null)}
          />,
          document.body,
        )}
    </div>
  );
}

/** Renders a 14x14 round preview of the latest story (image or video frame). */
function StoryThumb({
  story,
  fallbackName,
}: {
  story: { media_url: string; media_type: "image" | "video" };
  fallbackName: string;
}) {
  return (
    <div className="h-14 w-14 rounded-full border-2 border-card overflow-hidden bg-muted relative">
      {story.media_type === "image" ? (
        <img
          src={story.media_url}
          alt={fallbackName}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <>
          <video
            src={story.media_url}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
            // jump 0.1s in so we get a real frame, not a black one
            onLoadedMetadata={(e) => {
              try {
                (e.currentTarget as HTMLVideoElement).currentTime = 0.1;
              } catch {}
            }}
          />
          <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5">
            <VideoIcon className="h-2.5 w-2.5" />
          </div>
        </>
      )}
    </div>
  );
}
