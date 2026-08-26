import { useState, useRef } from "react";
import { Camera, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImage } from "@/utils/imageCompression";


interface PhotoUploaderProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  disabled?: boolean;
  maxPhotos?: number;
  bucket?: string;
  folder?: string;
}

export function PhotoUploader({
  photos,
  onPhotosChange,
  disabled = false,
  maxPhotos = 10,
  bucket = "rdo-photos",
  folder = "atividades",
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      toast.error(`Máximo de ${maxPhotos} fotos permitido`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} não é uma imagem válida`);
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} excede o tamanho máximo de 10MB`);
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, await compressImage(file));

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        return urlData.publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onPhotosChange([...photos, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} foto(s) adicionada(s)`);
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Fotos ({photos.length}/{maxPhotos})
        </Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || photos.length >= maxPhotos}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 mr-2" />
              Adicionar Fotos
            </>
          )}
        </Button>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {photos.map((url, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
            >
              <img loading="lazy" decoding="async"
                src={url}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className={cn(
                    "absolute top-1 right-1 p-1 rounded-full",
                    "bg-destructive text-destructive-foreground",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "hover:bg-destructive/90"
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-muted-foreground">
          <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Nenhuma foto adicionada</p>
          <p className="text-xs">Clique em "Adicionar Fotos" para anexar</p>
        </div>
      )}
    </div>
  );
}
