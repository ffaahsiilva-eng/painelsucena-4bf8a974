import { useState, useRef, useCallback, useEffect, useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Image, Upload, RotateCcw, Sparkles, Palette, Hash, Zap, MonitorPlay, Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/utils/imageCompression";


export function LoginBackgroundSettings() {
  const { settings, updateSettings } = useSiteSettings();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transitionLogoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingTransitionLogo, setIsUploadingTransitionLogo] = useState(false);
  const loadingImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLoadingImage, setIsUploadingLoadingImage] = useState(false);
  const transitionMediaInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingTransitionMedia, setIsUploadingTransitionMedia] = useState(false);
  const envBgInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingEnvBg, setIsUploadingEnvBg] = useState(false);

  const handleTransitionMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Selecione uma imagem ou vídeo válido.");
      return;
    }
    setIsUploadingTransitionMedia(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `transitions/login-transition-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, await compressImage(file), { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = await supabase.storage.from("site-assets").createSignedUrl(filePath, 315360000);
      if (!data?.signedUrl) throw new Error("Erro ao gerar URL");
      await updateSettings.mutateAsync({ login_transition_media_url: filePath }); // Salva o PATH, não a URL
      toast.success(`${isVideo ? "Vídeo" : "Imagem"} da transição de login atualizado!`);
    } catch (error: any) {
      toast.error("Erro ao enviar mídia da transição.");
    } finally {
      setIsUploadingTransitionMedia(false);
      if (transitionMediaInputRef.current) transitionMediaInputRef.current.value = "";
    }
  };

  const handleResetTransitionMedia = async () => {
    try {
      await updateSettings.mutateAsync({ login_transition_media_url: null });
      toast.success("Transição de login voltou para a animação padrão.");
    } catch {
      toast.error("Erro ao resetar mídia da transição.");
    }
  };
  
  // Delay removido: aplica direto no clique/arrasto do slider/color.
  const debouncedUpdate = useCallback(
    (updates: any) => {
      updateSettings.mutate(updates);
    },
    [updateSettings.mutate]
  );

  // (cancel stub para compatibilidade com chamadas antigas de cleanup)
  useEffect(() => {
    return () => {};
  }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Por favor, selecione uma imagem ou vídeo válido.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `login-bg-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, await compressImage(file), { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = await supabase.storage
        .from("site-assets")
        .createSignedUrl(filePath, 315360000);

      if (!data?.signedUrl) throw new Error("Erro ao gerar URL");

      await updateSettings.mutateAsync({ login_background_url: filePath }); // Salva o PATH
      toast.success(`${isVideo ? "Vídeo" : "Imagem"} de fundo atualizado!`);
    } catch (error) {
      console.error("Error uploading background:", error);
      toast.error("Erro ao fazer upload do plano de fundo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  const handleReset = async () => {
    try {
      await updateSettings.mutateAsync({ login_background_url: null });
      toast.success("Plano de fundo resetado para o padrão.");
    } catch (error) {
      console.error("Error resetting background:", error);
      toast.error("Erro ao resetar plano de fundo.");
    }
  };
  
  const handleTransitionLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    setIsUploadingTransitionLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `transition-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, await compressImage(file), { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = await supabase.storage
        .from("site-assets")
        .createSignedUrl(filePath, 315360000);

      if (!data?.signedUrl) throw new Error("Erro ao gerar URL");

      await updateSettings.mutateAsync({ transition_logo_url: filePath }); // Salva o PATH
      toast.success("Logo de transição atualizada!");
    } catch (error) {
      console.error("Error uploading transition logo:", error);
      toast.error("Erro ao fazer upload da logo de transição.");
    } finally {
      setIsUploadingTransitionLogo(false);
      if (transitionLogoInputRef.current) transitionLogoInputRef.current.value = "";
    }
  };

  const handleResetTransitionLogo = async () => {
    try {
      await updateSettings.mutateAsync({ transition_logo_url: null });
      toast.success("Logo de transição resetada para o padrão.");
    } catch (error) {
      console.error("Error resetting transition logo:", error);
      toast.error("Erro ao resetar logo de transição.");
    }
  };

  const handleParticleReset = async () => {
    try {
      await updateSettings.mutateAsync({
        login_particles_enabled: true,
        login_particles_color: "white",
        login_particles_color2: null,
        login_particles_color3: null,
        login_particles_count: 100,
        login_particles_speed: 1.0,
      });
      toast.success("Configurações de partículas resetadas para o padrão.");
    } catch (error) {
      console.error("Error resetting particles:", error);
      toast.error("Erro ao resetar partículas.");
    }
  };

  const handleLoadingImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    setIsUploadingLoadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `loading-img-${Date.now()}.${fileExt}`;
      const filePath = `loading/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, await compressImage(file), { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = await supabase.storage
        .from("site-assets")
        .createSignedUrl(filePath, 315360000);

      if (!data?.signedUrl) throw new Error("Erro ao gerar URL");

      await updateSettings.mutateAsync({ page_loading_img_url: filePath }); // Salva o PATH
      toast.success("Imagem de carregamento atualizada!");
    } catch (error) {
      console.error("Error uploading loading image:", error);
      toast.error("Erro ao fazer upload da imagem de carregamento.");
    } finally {
      setIsUploadingLoadingImage(false);
      if (loadingImageInputRef.current) loadingImageInputRef.current.value = "";
    }
  };

  const handleResetLoadingImage = async () => {
    try {
      await updateSettings.mutateAsync({ page_loading_img_url: null });
      toast.success("Imagem de carregamento resetada para o padrão.");
    } catch (error) {
      console.error("Error resetting loading image:", error);
      toast.error("Erro ao resetar imagem de carregamento.");
    }
  };

  const handleEnvBgUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Por favor, selecione uma imagem ou vídeo válido.");
      return;
    }

    setIsUploadingEnvBg(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `env-selection-bg-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, await compressImage(file), { 
          upsert: true, 
          contentType: file.type,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error("Supabase Storage Error:", uploadError);
        throw uploadError;
      }

      const { data } = await supabase.storage
        .from("site-assets")
        .createSignedUrl(filePath, 315360000); // 10 years expiration
      
      if (!data?.signedUrl) throw new Error("Erro ao gerar URL assinada");

      await updateSettings.mutateAsync({ environment_selection_background_url: filePath }); // Salva o PATH
      toast.success(`${isVideo ? "Vídeo" : "Imagem"} de fundo da seleção de ambiente atualizado!`);
    } catch (error: any) {
      console.error("Full Error Object:", error);
      toast.error(`Erro: ${error.message || "Erro ao fazer upload do plano de fundo."}`);
    } finally {
      setIsUploadingEnvBg(false);
      if (envBgInputRef.current) envBgInputRef.current.value = "";
    }
  };

  const handleResetEnvBg = async () => {
    try {
      await updateSettings.mutateAsync({ environment_selection_background_url: null });
      toast.success("Plano de fundo da seleção de ambiente resetado.");
    } catch (error) {
      toast.error("Erro ao resetar plano de fundo.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Fundo da Tela de Login
          </CardTitle>
          <CardDescription>
            Altere a imagem de fundo exibida na tela de autenticação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-full sm:w-48 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted relative">
              {settings.login_background_url ? (
                /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(settings.login_background_url) ? (
                  <video
                    src={settings.login_background_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img loading="lazy" decoding="async" 
                    src={settings.login_background_url} 
                    alt="Fundo atual" 
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Image className="w-8 h-8" />
                  <span className="text-xs">Padrão do Sistema</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleUpload}
                className="hidden"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload de Imagem ou Vídeo
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleReset}
                disabled={!settings.login_background_url || isUploading}
                variant="ghost"
                className="w-full sm:w-auto text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Voltar ao Padrão
              </Button>
              
              <p className="text-xs text-muted-foreground mt-1">
                Imagem recomendada: 1920x1080px. Vídeo: MP4/WebM. Sem limite de tamanho.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Fundo da Seleção de Ambiente
          </CardTitle>
          <CardDescription>
            Altere a imagem ou vídeo de fundo exibido na tela de escolha de unidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-full sm:w-48 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted relative">
              {settings.environment_selection_background_url ? (
                /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(settings.environment_selection_background_url) ? (
                  <video
                    src={settings.environment_selection_background_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img loading="lazy" decoding="async" 
                    src={settings.environment_selection_background_url} 
                    alt="Fundo Seleção atual" 
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Image className="w-8 h-8" />
                  <span className="text-xs">Padrão da Montanha</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <input
                ref={envBgInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleEnvBgUpload}
                className="hidden"
              />
              
              <Button
                onClick={() => envBgInputRef.current?.click()}
                disabled={isUploadingEnvBg}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isUploadingEnvBg ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload de Mídia
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleResetEnvBg}
                disabled={!settings.environment_selection_background_url || isUploadingEnvBg}
                variant="ghost"
                className="w-full sm:w-auto text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Voltar ao Padrão
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Partículas em Movimento
          </CardTitle>
          <CardDescription>
            Personalize as partículas que flutuam na tela de login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar Partículas</Label>
              <p className="text-sm text-muted-foreground">
                Exibe partículas animadas sobre o fundo.
              </p>
            </div>
            <Switch
              checked={settings.login_particles_enabled}
              onCheckedChange={(checked) => updateSettings.mutate({ login_particles_enabled: checked })}
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Cores das Partículas
              </Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.login_particles_color && settings.login_particles_color.startsWith("#") ? settings.login_particles_color : "#ffffff"}
                    onChange={(e) => debouncedUpdate({ login_particles_color: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    defaultValue={settings.login_particles_color}
                    onChange={(e) => debouncedUpdate({ login_particles_color: e.target.value })}
                    placeholder="Cor 1 (Ex: white ou #ffffff)"
                    className="flex-1"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.login_particles_color2 && settings.login_particles_color2.startsWith("#") ? settings.login_particles_color2 : "#ffffff"}
                    onChange={(e) => debouncedUpdate({ login_particles_color2: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    defaultValue={settings.login_particles_color2 || ""}
                    onChange={(e) => debouncedUpdate({ login_particles_color2: e.target.value || null })}
                    placeholder="Cor 2 (Opcional)"
                    className="flex-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.login_particles_color3 && settings.login_particles_color3.startsWith("#") ? settings.login_particles_color3 : "#ffffff"}
                    onChange={(e) => debouncedUpdate({ login_particles_color3: e.target.value })}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    defaultValue={settings.login_particles_color3 || ""}
                    onChange={(e) => debouncedUpdate({ login_particles_color3: e.target.value || null })}
                    placeholder="Cor 3 (Opcional)"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Quantidade
                </Label>
                <span className="text-sm font-medium">{settings.login_particles_count}</span>
              </div>
              <Slider
                value={[settings.login_particles_count]}
                min={0}
                max={300}
                step={10}
                onValueChange={(vals) => debouncedUpdate({ login_particles_count: vals[0] })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Velocidade
                </Label>
                <span className="text-sm font-medium">{settings.login_particles_speed.toFixed(1)}x</span>
              </div>
              <Slider
                value={[settings.login_particles_speed]}
                min={0.1}
                max={5}
                step={0.1}
                onValueChange={(vals) => debouncedUpdate({ login_particles_speed: vals[0] })}
              />
            </div>

            <Button
              onClick={handleParticleReset}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar para Padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorPlay className="w-5 h-5" />
            Tela de Transição do Login
          </CardTitle>
          <CardDescription>
            Envie um vídeo ou imagem para o fundo da animação exibida após o login. Sem mídia, a animação padrão do sistema é usada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-full sm:w-48 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted">
              {settings.login_transition_media_url ? (
                /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(settings.login_transition_media_url) ? (
                  <video
                    src={settings.login_transition_media_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={settings.login_transition_media_url}
                    alt="Mídia da transição"
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <MonitorPlay className="w-8 h-8" />
                  <span className="text-xs">Animação Padrão</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <input
                ref={transitionMediaInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleTransitionMediaUpload}
                className="hidden"
              />
              <Button
                onClick={() => transitionMediaInputRef.current?.click()}
                disabled={isUploadingTransitionMedia}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isUploadingTransitionMedia ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload de Vídeo ou Imagem
                  </>
                )}
              </Button>
              <Button
                onClick={handleResetTransitionMedia}
                disabled={!settings.login_transition_media_url || isUploadingTransitionMedia}
                variant="ghost"
                className="w-full sm:w-auto text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Usar Animação Padrão
              </Button>
            </div>
          </div>

          <div className="pt-2 border-t space-y-6">
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4" />
                Intensidade da Animação: {settings.login_anim_intensity ?? 100}%
              </Label>
              <Slider
                value={[settings.login_anim_intensity ?? 100]}
                onValueChange={([v]) => updateSettings.mutate({ login_anim_intensity: v })}
                min={0}
                max={200}
                step={5}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Controla o quanto a logo e o nome se movem, ampliam e desfocam (0% = sem movimento).
              </p>
            </div>

            <div>
              <Label className="mb-3 block">
                Duração da Animação da Logo: {((settings.login_anim_logo_duration_ms ?? 1400) / 1000).toFixed(1)}s
              </Label>
              <Slider
                value={[settings.login_anim_logo_duration_ms ?? 1400]}
                onValueChange={([v]) => updateSettings.mutate({ login_anim_logo_duration_ms: v })}
                min={200}
                max={4000}
                step={100}
              />
            </div>

            <div>
              <Label className="mb-3 block">
                Duração da Animação do Nome: {((settings.login_anim_name_duration_ms ?? 1100) / 1000).toFixed(1)}s
              </Label>
              <Slider
                value={[settings.login_anim_name_duration_ms ?? 1100]}
                onValueChange={([v]) => updateSettings.mutate({ login_anim_name_duration_ms: v })}
                min={200}
                max={4000}
                step={100}
              />
            </div>

            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() =>
                updateSettings.mutate({
                  login_anim_intensity: 100,
                  login_anim_logo_duration_ms: 1400,
                  login_anim_name_duration_ms: 1100,
                })
              }
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar Animação
            </Button>
          </div>
        </CardContent>
      </Card>




      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorPlay className="w-5 h-5" />
            Logo de Transição
          </CardTitle>
          <CardDescription>
            Personalize a logo que aparece durante a animação de login e logout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-full sm:w-48 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted relative">
              {settings.transition_logo_url ? (
                <img loading="lazy" decoding="async" 
                  src={settings.transition_logo_url} 
                  alt="Logo de transição" 
                  className="max-w-[80%] max-h-[80%] object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <MonitorPlay className="w-8 h-8" />
                  <span className="text-xs">Logo Padrão</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <input
                ref={transitionLogoInputRef}
                type="file"
                accept="image/*"
                onChange={handleTransitionLogoUpload}
                className="hidden"
              />
              
              <Button
                onClick={() => transitionLogoInputRef.current?.click()}
                disabled={isUploadingTransitionLogo}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isUploadingTransitionLogo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload de Logo
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleResetTransitionLogo}
                disabled={!settings.transition_logo_url || isUploadingTransitionLogo}
                variant="ghost"
                className="w-full sm:w-auto text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Voltar ao Padrão
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5" />
            Imagem de Carregamento
          </CardTitle>
          <CardDescription>
            Personalize a imagem exibida enquanto as páginas do sistema estão carregando.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-full sm:w-48 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted relative">
              {settings.page_loading_img_url ? (
                <img loading="lazy" decoding="async" 
                  src={settings.page_loading_img_url} 
                  alt="Imagem de carregamento" 
                  className="max-w-[80%] max-h-[80%] object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs">Padrão do Sistema</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <input
                ref={loadingImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleLoadingImageUpload}
                className="hidden"
              />
              
              <Button
                onClick={() => loadingImageInputRef.current?.click()}
                disabled={isUploadingLoadingImage}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isUploadingLoadingImage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload de Imagem
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleResetLoadingImage}
                disabled={!settings.page_loading_img_url || isUploadingLoadingImage}
                variant="ghost"
                className="w-full sm:w-auto text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Voltar ao Padrão
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
