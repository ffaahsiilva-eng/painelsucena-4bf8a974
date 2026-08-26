import { useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageCustomizations } from "@/hooks/usePageCustomizations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEditMode } from "@/contexts/EditModeContext";
import { compressImage } from "@/utils/imageCompression";


interface EditableIconProps {
  pageKey: string;
  elementKey: string;
  defaultIcon: React.ReactNode;
  className?: string;
  iconSize?: number;
}

export const EditableIcon = ({
  pageKey,
  elementKey,
  defaultIcon,
  className,
  iconSize = 32,
}: EditableIconProps) => {
  const { isEditMode } = useEditMode();
  const { getCustomValue, upsertCustomization } = usePageCustomizations(pageKey);
  const customUrl = getCustomValue(elementKey, "image");
  const customSize = getCustomValue(`${elementKey}-size`, "text");
  const displaySize = customSize ? parseInt(customSize) : iconSize;

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [resizing, setResizing] = useState(false);

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
        .upload(path, await compressImage(file), { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      await upsertCustomization.mutateAsync({
        page_key: pageKey,
        element_key: elementKey,
        element_type: "image",
        image_url: data.publicUrl,
      });
      toast.success("Ícone atualizado!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleResetIcon = async () => {
    try {
      await upsertCustomization.mutateAsync({
        page_key: pageKey,
        element_key: elementKey,
        element_type: "image",
        image_url: null,
      });
      toast.success("Ícone restaurado!");
    } catch {
      toast.error("Erro ao restaurar");
    }
  };

  const handleSizeChange = async (newSize: number) => {
    setResizing(true);
    try {
      await upsertCustomization.mutateAsync({
        page_key: pageKey,
        element_key: `${elementKey}-size`,
        element_type: "text",
        text_value: String(newSize),
      });
    } catch {
      toast.error("Erro ao salvar tamanho");
    } finally {
      setResizing(false);
    }
  };

  if (!isEditMode) {
    return customUrl ? (
      <img loading="lazy" decoding="async"
        src={customUrl}
        alt="icon"
        style={{ width: displaySize, height: displaySize }}
        className={cn("object-contain shrink-0", className)}
      />
    ) : (
      <span className={className}>{defaultIcon}</span>
    );
  }

  return (
    <div className={cn("relative group inline-flex items-center", className)}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      {customUrl ? (
        <img loading="lazy" decoding="async"
          src={customUrl}
          alt="icon"
          style={{ width: displaySize, height: displaySize }}
          className="object-contain shrink-0 cursor-pointer ring-2 ring-primary/40 rounded"
          onClick={() => !uploading && fileRef.current?.click()}
          title="Clique para trocar ícone"
        />
      ) : (
        <span
          className="cursor-pointer ring-2 ring-primary/40 rounded p-0.5"
          onClick={() => !uploading && fileRef.current?.click()}
          title="Clique para trocar ícone"
        >
          {defaultIcon}
        </span>
      )}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
        </div>
      )}
      <div className="absolute -bottom-8 left-0 hidden group-hover:flex items-center gap-1 bg-card border rounded shadow-lg p-1 z-50">
        <button
          onClick={() => handleSizeChange(Math.max(16, displaySize - 4))}
          className="text-xs px-1 hover:bg-muted rounded"
          title="Diminuir"
        >−</button>
        <span className="text-[10px] text-muted-foreground w-6 text-center">{displaySize}</span>
        <button
          onClick={() => handleSizeChange(Math.min(128, displaySize + 4))}
          className="text-xs px-1 hover:bg-muted rounded"
          title="Aumentar"
        >+</button>
        {customUrl && (
          <button
            onClick={handleResetIcon}
            className="text-xs px-1 hover:bg-destructive/20 text-destructive rounded"
            title="Restaurar ícone original"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
