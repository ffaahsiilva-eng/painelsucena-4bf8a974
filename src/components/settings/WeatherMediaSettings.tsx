import { useRef, useState } from "react";
import { Sun, CloudRain, Snowflake, Moon, Flame, Upload, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SlotKey =
  | "day_sunny"
  | "day_rainy"
  | "day_cold"
  | "night_hot"
  | "night_cold"
  | "night_rainy";

type SlotField =
  | "weather_day_sunny_media_urls"
  | "weather_day_rainy_media_urls"
  | "weather_day_cold_media_urls"
  | "weather_night_hot_media_urls"
  | "weather_night_cold_media_urls"
  | "weather_night_rainy_media_urls";

const slotConfig: Record<SlotKey, { label: string; description: string; icon: React.ReactNode; field: SlotField; group: "day" | "night" }> = {
  day_sunny: { label: "Dia • Ensolarado", description: "Dia (07:00–18:19) com sol", icon: <Sun className="w-5 h-5 text-amber-500" />, field: "weather_day_sunny_media_urls", group: "day" },
  day_rainy: { label: "Dia • Chuvoso", description: "Dia com chuva", icon: <CloudRain className="w-5 h-5 text-sky-500" />, field: "weather_day_rainy_media_urls", group: "day" },
  day_cold: { label: "Dia • Frio", description: "Dia com temperatura baixa (< 22°C)", icon: <Snowflake className="w-5 h-5 text-blue-400" />, field: "weather_day_cold_media_urls", group: "day" },
  night_hot: { label: "Noite • Quente", description: "Noite (a partir de 18:20) com temperatura ≥ 22°C", icon: <Flame className="w-5 h-5 text-orange-500" />, field: "weather_night_hot_media_urls", group: "night" },
  night_cold: { label: "Noite • Fria", description: "Noite com temperatura baixa (< 22°C)", icon: <Moon className="w-5 h-5 text-indigo-400" />, field: "weather_night_cold_media_urls", group: "night" },
  night_rainy: { label: "Noite • Chuvosa", description: "Noite com chuva", icon: <CloudRain className="w-5 h-5 text-indigo-500" />, field: "weather_night_rainy_media_urls", group: "night" },
};

const ORDER: SlotKey[] = ["day_sunny", "day_rainy", "day_cold", "night_hot", "night_cold", "night_rainy"];

export function WeatherMediaSettings() {
  const { settings, updateSettings } = useSiteSettings();
  const [uploadingSlot, setUploadingSlot] = useState<SlotKey | null>(null);
  const inputRefs = useRef<Record<SlotKey, HTMLInputElement | null>>({
    day_sunny: null, day_rainy: null, day_cold: null,
    night_hot: null, night_cold: null, night_rainy: null,
  });

  const getList = (slot: SlotKey): string[] => {
    const v = (settings as any)?.[slotConfig[slot].field];
    return Array.isArray(v) ? v : [];
  };

  const handleUpload = async (slot: SlotKey, file: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Envie apenas imagem ou vídeo");
      return;
    }

    setUploadingSlot(slot);
    try {
      const ext = file.name.split(".").pop();
      const path = `weather/${slot}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      const current = getList(slot);
      const next = [...current, data.publicUrl];
      await updateSettings.mutateAsync({ [slotConfig[slot].field]: next } as any);
      toast.success(`Mídia adicionada em "${slotConfig[slot].label}"`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao enviar");
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRemoveOne = async (slot: SlotKey, url: string) => {
    try {
      const next = getList(slot).filter((u) => u !== url);
      await updateSettings.mutateAsync({ [slotConfig[slot].field]: next } as any);
      toast.success("Mídia removida");
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  const renderPreview = (url: string, slot: SlotKey) => {
    const isVideo = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
    return (
      <div key={url} className="relative rounded-lg overflow-hidden border border-border bg-muted aspect-video w-40 group">
        {isVideo ? (
          <video src={url} className="w-full h-full object-cover" muted loop playsInline />
        ) : (
          <img loading="lazy" decoding="async" src={url} alt="Preview" className="w-full h-full object-cover" />
        )}
        <Button
          size="icon"
          variant="destructive"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => handleRemoveOne(slot, url)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="w-5 h-5" />
          Mídia do Clima (Dashboard)
        </CardTitle>
        <CardDescription>
          Envie vários vídeos ou imagens para cada combinação de período e clima. A cada dia, um item de cada slot será sorteado aleatoriamente. Dia: 07:00–18:19. Noite: a partir de 18:20.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ORDER.map((slot) => {
          const cfg = slotConfig[slot];
          const list = getList(slot);
          const isUploading = uploadingSlot === slot;
          return (
            <div key={slot} className="space-y-2 pb-4 border-b border-border last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                {cfg.icon}
                <div className="flex-1">
                  <p className="font-medium text-sm">{cfg.label}</p>
                  <p className="text-xs text-muted-foreground">{cfg.description}</p>
                </div>
                <span className="text-xs text-muted-foreground">{list.length} mídia(s)</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                <input
                  ref={(el) => (inputRefs.current[slot] = el)}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(slot, f);
                    e.target.value = "";
                  }}
                />
                <Button size="sm" onClick={() => inputRefs.current[slot]?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Adicionar mídia
                </Button>
              </div>

              {list.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {list.map((u) => renderPreview(u, slot))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
