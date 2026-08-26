import { useState, useRef, useCallback } from "react";
import { ImagePlus, Video, Send, X, Loader2, Smile } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { useProfile } from "@/hooks/useProfile";
import { useCreatePost } from "@/hooks/useInstaCena";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MentionPicker } from "./MentionPicker";
import { FormattingToolbar } from "./FormattingToolbar";
import { RichTextInput, RichTextInputHandle } from "./RichTextInput";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { AnimatedEmojiPicker } from "./AnimatedEmojiPicker";
import { compressImage } from "@/utils/imageCompression";


const getInitials = (name: string) => {
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export function CreatePostCard() {
  const { data: profile } = useProfile();
  const createPost = useCreatePost();
  const [hasContent, setHasContent] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMention, setShowMention] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<RichTextInputHandle>(null);

  const handleInput = useCallback((plainText: string) => {
    setHasContent(plainText.trim().length > 0);

    // Detect @mention trigger from plain text
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const textNode = range.startContainer;
      if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
        const text = textNode.textContent;
        const cursorPos = range.startOffset;
        const beforeCursor = text.slice(0, cursorPos);
        const atMatch = beforeCursor.match(/@(\w*)$/);
        if (atMatch) {
          setShowMention(true);
          setMentionQuery(atMatch[1]);
          return;
        }
      }
    }
    setShowMention(false);
    setMentionQuery("");
  }, []);

  const handleMentionSelect = useCallback((profile: { user_id: string; full_name: string }) => {
    editorRef.current?.insertMention(profile.full_name, profile.user_id);
    setShowMention(false);
    setMentionQuery("");
  }, []);

  const handleFormat = useCallback((prefix: string, suffix: string) => {
    // Map old prefix/suffix format to new format types
    if (prefix === "**") {
      editorRef.current?.applyFormat("bold");
    } else if (prefix === "_") {
      editorRef.current?.applyFormat("italic");
    } else if (prefix === "__") {
      editorRef.current?.applyFormat("underline");
    } else if (prefix.startsWith("{glow")) {
      const glowColor = prefix.match(/\{glow:(\w+)\}/)?.[1] || "gold";
      editorRef.current?.applyFormat("glow", glowColor);
    } else if (prefix.startsWith("{color:")) {
      const color = prefix.match(/\{color:(\w+)\}/)?.[1] || "yellow";
      editorRef.current?.applyFormat("color", color);
    } else if (prefix.startsWith("{font:")) {
      const font = prefix.match(/\{font:(\w+)\}/)?.[1] || "normal";
      editorRef.current?.applyFormat("font", font);
    } else if (prefix.startsWith("{fx:")) {
      const fx = prefix.match(/\{fx:(\w+)\}/)?.[1] || "sparkle";
      editorRef.current?.applyFormat("fx", fx);
    }
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `instacena/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, await compressImage(file));
      if (error) {
        toast.error("Erro ao enviar imagem");
        continue;
      }
      const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
      urls.push(pub.publicUrl);
    }

    setImages((prev) => [...prev, ...urls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Vídeo muito grande (máx. 50MB)");
        continue;
      }

      const duration = await getVideoDuration(file);
      if (duration > 30) {
        toast.error("Vídeo deve ter no máximo 30 segundos");
        continue;
      }

      const ext = file.name.split(".").pop();
      const path = `instacena/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, await compressImage(file));
      if (error) {
        toast.error("Erro ao enviar vídeo");
        continue;
      }
      const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
      urls.push(pub.publicUrl);
    }

    setVideos((prev) => [...prev, ...urls]);
    setUploading(false);
    if (videoRef.current) videoRef.current.value = "";
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = () => {
    const content = editorRef.current?.getContent() || "";
    if (!content.trim() && images.length === 0 && videos.length === 0) return;
    createPost.mutate(
      { content: content.trim(), imageUrls: [...images, ...videos] },
      {
        onSuccess: () => {
          editorRef.current?.clear();
          setHasContent(false);
          setImages([]);
          setVideos([]);
          toast.success("Publicação criada!");
        },
        onError: () => toast.error("Erro ao publicar"),
      }
    );
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <NeonAvatar
            src={profile?.avatar_url}
            name={profile?.full_name || "U"}
            frameColor={profile?.frame_color}
            neonColor={profile?.neon_color}
            frameAnimation={profile?.frame_animation}
            size="sm"
          />
          <div className="flex-1 relative">
            <RichTextInput
              ref={editorRef}
              placeholder="No que você está pensando? Use @ para mencionar"
              onInput={handleInput}
            />
            <MentionPicker
              query={mentionQuery}
              visible={showMention}
              onSelect={handleMentionSelect}
            />
          </div>
        </div>

        {/* Preview images */}
        {images.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {images.map((url, i) => (
              <div key={i} className="relative">
                <img loading="lazy" decoding="async" src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Preview videos */}
        {videos.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {videos.map((url, i) => (
              <div key={i} className="relative">
                <video src={url} className="h-20 w-20 rounded-lg object-contain bg-black/10" autoPlay loop muted playsInline />
                <button
                  onClick={() => setVideos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Formatting toolbar */}
        <div className="mt-2 px-1">
          <FormattingToolbar onFormat={handleFormat} />
        </div>

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
          <div className="flex gap-1 items-center">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-muted-foreground gap-1.5 text-xs">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Foto
            </Button>
            <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
            <Button variant="ghost" size="sm" onClick={() => videoRef.current?.click()} disabled={uploading} className="text-muted-foreground gap-1.5 text-xs">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Vídeo
            </Button>
            <EmojiPicker onEmojiSelect={(emoji) => editorRef.current?.insertText(emoji)} />
            <AnimatedEmojiPicker onSelect={(id) => editorRef.current?.insertAnimatedEmoji(id)} />
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={(!hasContent && images.length === 0 && videos.length === 0) || createPost.isPending}
            className="gap-1.5"
          >
            {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
