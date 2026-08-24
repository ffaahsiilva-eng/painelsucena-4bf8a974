import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageCustomizations } from "@/hooks/usePageCustomizations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditableImageProps {
  pageKey: string;
  elementKey: string;
  defaultSrc: string;
  alt?: string;
  className?: string;
  canEdit: boolean;
  imgClassName?: string;
}

export const EditableImage = ({
  pageKey,
  elementKey,
  defaultSrc,
  alt = "Image",
  className,
  canEdit,
  imgClassName,
}: EditableImageProps) => {
  const { getCustomValue, upsertCustomization } = usePageCustomizations(pageKey);
  const customUrl = getCustomValue(elementKey, "image");
  const displaySrc = customUrl ?? defaultSrc;

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 5MB)");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `cms/${pageKey}/${elementKey}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);

      await upsertCustomization.mutateAsync({
        page_key: pageKey,
        element_key: elementKey,
        element_type: "image",
        image_url: data.publicUrl,
      });
      toast.success("Imagem atualizada!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className={cn("relative group", className)}>
      <img loading="lazy" decoding="async"
        src={displaySrc}
        alt={alt}
        className={cn("w-full object-cover", imgClassName)}
      />
      {canEdit && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <div
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
            onClick={() => !uploading && fileRef.current?.click()}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-white">
                <Camera className="w-6 h-6" />
                <span className="text-xs font-medium">Trocar imagem</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
