import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ImagePlus, Trash2, Loader2, Film, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface GifAvatarCreatorProps {
  userId: string;
  onAvatarCreated: (url: string) => void;
}

const MAX_PHOTOS = 4;
const CANVAS_SIZE = 256;

export function GifAvatarCreator({ userId, onAvatarCreated }: GifAvatarCreatorProps) {
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [speed, setSpeed] = useState(800); // ms per frame
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleAddPhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining);

    toAdd.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Cada imagem deve ter no máximo 10MB.");
        return;
      }
      const preview = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { file, preview }]);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [photos.length]);

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const loadImageOnCanvas = (
    ctx: CanvasRenderingContext2D,
    src: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Cover-fill: crop to center square
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Clip to circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, sx, sy, size, size, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.restore();

        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const generateGif = async () => {
    if (photos.length < 2) {
      toast.error("Adicione pelo menos 2 fotos");
      return;
    }

    setIsGenerating(true);
    try {
      // Dynamically import modern-gif
      const { encode } = await import("modern-gif");

      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d")!;

      // Build frames with cross-fade transitions
      const frames: { data: ImageData; delay: number }[] = [];
      const TRANSITION_STEPS = 6;
      const TRANSITION_FRAME_DELAY = 50; // ms per transition frame

      // Pre-render all photos to ImageData
      const photoFrames: ImageData[] = [];
      for (const photo of photos) {
        await loadImageOnCanvas(ctx, photo.preview);
        photoFrames.push(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
      }

      for (let i = 0; i < photoFrames.length; i++) {
        // Add the main frame (full photo displayed)
        frames.push({ data: photoFrames[i], delay: speed });

        // Add cross-fade transition to the next photo
        const nextIndex = (i + 1) % photoFrames.length;
        const currentData = photoFrames[i];
        const nextData = photoFrames[nextIndex];

        for (let step = 1; step <= TRANSITION_STEPS; step++) {
          const alpha = step / (TRANSITION_STEPS + 1);
          const blended = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);

          for (let p = 0; p < blended.data.length; p += 4) {
            blended.data[p]     = Math.round(currentData.data[p]     * (1 - alpha) + nextData.data[p]     * alpha);
            blended.data[p + 1] = Math.round(currentData.data[p + 1] * (1 - alpha) + nextData.data[p + 1] * alpha);
            blended.data[p + 2] = Math.round(currentData.data[p + 2] * (1 - alpha) + nextData.data[p + 2] * alpha);
            blended.data[p + 3] = Math.round(currentData.data[p + 3] * (1 - alpha) + nextData.data[p + 3] * alpha);
          }

          frames.push({ data: blended, delay: TRANSITION_FRAME_DELAY });
        }
      }

      // Encode GIF
      const output = await encode({
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        frames: frames.map((f) => ({
          data: f.data.data,
          delay: f.delay,
        })),
      });

      const blob = new Blob([output], { type: "image/gif" });

      // Upload
      const fileName = `${userId}/avatar-gif.gif`;
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(fileName, blob, { upsert: true, contentType: "image/gif" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(fileName);

      const newUrl = urlData.publicUrl + "?t=" + Date.now();

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      onAvatarCreated(newUrl);
      toast.success("GIF de perfil criado com sucesso!");
    } catch (error: any) {
      console.error("Error generating GIF:", error);
      toast.error("Erro ao gerar GIF: " + (error.message || "Tente novamente"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="w-5 h-5" />
          Avatar Animado (GIF)
        </CardTitle>
        <CardDescription>
          Adicione até 4 fotos para criar um GIF animado como foto de perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Photo grid */}
        <div className="grid grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
              <img loading="lazy" decoding="async"
                src={photo.preview}
                alt={`Foto ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-1 left-1 bg-background/80 text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                {i + 1}
              </div>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ImagePlus className="w-5 h-5" />
              <span className="text-[10px]">Adicionar</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleAddPhoto}
          className="hidden"
        />

        {/* Speed control */}
        {photos.length >= 2 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Velocidade da animação</Label>
              <span className="text-xs text-muted-foreground">{(speed / 1000).toFixed(1)}s por foto</span>
            </div>
            <Slider
              value={[speed]}
              onValueChange={(v) => setSpeed(v[0])}
              min={200}
              max={2000}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Rápido</span>
              <span>Lento</span>
            </div>
          </div>
        )}

        {/* Generate button */}
        <Button
          onClick={generateGif}
          disabled={photos.length < 2 || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando GIF...
            </>
          ) : (
            <>
              <Film className="w-4 h-4 mr-2" />
              Gerar GIF ({photos.length}/{MAX_PHOTOS} fotos)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
