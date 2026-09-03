import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Image, Upload, Trash2, Wallpaper } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const GlobalBackgroundSettings = () => {
  const { settings, updateSettings, isLoading } = useSiteSettings();
  const [isUploading, setIsUploading] = useState(false);
  const [localOpacity, setLocalOpacity] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = (url?: string | null) => !!url && /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Por favor, selecione uma imagem ou vídeo válido.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `global-bg-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      await updateSettings.mutateAsync({ global_background_url: data.publicUrl });
      toast.success("Fundo atualizado com sucesso!");
    } catch (error: any) {
      console.error("Error uploading background:", error);
      toast.error(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };


  const handleRemove = async () => {
    try {
      await updateSettings.mutateAsync({ global_background_url: null });
      toast.success("Imagem de fundo removida.");
    } catch (error) {
      toast.error("Erro ao remover imagem.");
    }
  };

  const handleOpacityChange = (value: number[]) => {
    setLocalOpacity(value[0]);
  };

  const handleOpacityCommit = async (value: number[]) => {
    try {
      await updateSettings.mutateAsync({ global_background_opacity: value[0] });
      setLocalOpacity(null);
    } catch (error) {
      console.error("Error updating opacity:", error);
      toast.error("Erro ao salvar opacidade.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallpaper className="w-5 h-5" />
          Fundo Global do Sistema
        </CardTitle>
        <CardDescription>
          Defina uma imagem ou vídeo de fundo que será exibido em todas as páginas do sistema. Vídeos rodam em loop automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-full sm:w-48 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted flex-shrink-0">
            {settings.global_background_url ? (
              isVideo(settings.global_background_url) ? (
                <video
                  src={settings.global_background_url}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img loading="lazy" decoding="async"
                  src={settings.global_background_url}
                  alt="Fundo atual"
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <Image className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 space-y-4 w-full">
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isLoading}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Alterar Imagem/Vídeo
                  </>
                )}
              </Button>

              
              {settings.global_background_url && (
                <Button
                  onClick={handleRemove}
                  disabled={isLoading}
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Opacidade da Imagem</Label>
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                  {Math.round((localOpacity !== null ? localOpacity : (settings.global_background_opacity || 0.1)) * 100)}%
                </span>
              </div>
              <Slider
                value={[localOpacity !== null ? localOpacity : (settings.global_background_opacity || 0.1)]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={handleOpacityChange}
                onValueCommit={handleOpacityCommit}
                disabled={isLoading || !settings.global_background_url}
              />
              <p className="text-xs text-muted-foreground">
                Ajuste a visibilidade da imagem de fundo para não atrapalhar a leitura do conteúdo.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};