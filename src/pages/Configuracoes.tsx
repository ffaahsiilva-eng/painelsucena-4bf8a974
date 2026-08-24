import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Mail, Lock, Camera, Upload, Eye, EyeOff, ArrowLeft, Check, AlertTriangle, MessageCircle } from "lucide-react";
import { formatBR, isValidBR } from "@/components/auth/WhatsAppGate";
import { z } from "zod";
import { AnnouncementHistory } from "@/components/settings/AnnouncementHistory";
import { NeonFramePicker } from "@/components/settings/NeonFramePicker";
import { GifAvatarCreator } from "@/components/settings/GifAvatarCreator";
import { ImageEditor } from "@/components/settings/ImageEditor";
import { WeatherMediaSettings } from "@/components/settings/WeatherMediaSettings";
// SidebarCustomizer removido — sidebar é global e padrão
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { SessionDurationSetting } from "@/components/settings/SessionDurationSetting";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { PrimaryColorPicker } from "@/components/settings/PrimaryColorPicker";
import { useQueryClient } from "@tanstack/react-query";
import { resolveStorageUrl } from "@/lib/storage";

const nameSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome deve ter no máximo 100 caracteres");
const emailSchema = z.string().trim().email("Email inválido").max(255, "Email deve ter no máximo 255 caracteres");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(72, "Senha deve ter no máximo 72 caracteres");

const Configuracoes = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const isDriver = profile?.cargo && (profile.cargo === "motorista_pipa" || profile.cargo === "motorista_munk");
  const isAvatarBlocked = profile && (!profile.avatar_url || profile.avatar_url.trim().length === 0) && !isDriver;

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [frameColor, setFrameColor] = useState<string | null>(null);
  const [neonColor, setNeonColor] = useState<string | null>(null);
  const [frameAnimation, setFrameAnimation] = useState<string | null>(null);
  const [sidebarColor, setSidebarColor] = useState<string | null>(null);
  const [sidebarAnimation, setSidebarAnimation] = useState<string | null>(null);
  const [sidebarFont, setSidebarFont] = useState<string | null>(null);
  const [sidebarFontColor, setSidebarFontColor] = useState<string | null>(null);
  const [sidebarActiveColor, setSidebarActiveColor] = useState<string | null>(null);
  const [sidebarActiveFontColor, setSidebarActiveFontColor] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [isUpdatingWhatsapp, setIsUpdatingWhatsapp] = useState(false);

  // UI states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Load profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, frame_color, neon_color, frame_animation, sidebar_color, sidebar_animation, sidebar_font, sidebar_font_color, sidebar_active_color, sidebar_active_font_color, whatsapp_number")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        setFullName(profile.full_name || "");
        const resolvedAvatar = profile.avatar_url ? await resolveStorageUrl(profile.avatar_url) : null;
        setAvatarUrl(resolvedAvatar);
        setFrameColor(profile.frame_color || null);
        setNeonColor(profile.neon_color || null);
        setFrameAnimation(profile.frame_animation || null);
        setSidebarColor(profile.sidebar_color || null);
        setSidebarAnimation(profile.sidebar_animation || null);
        setSidebarFont(profile.sidebar_font || null);
        setSidebarFontColor(profile.sidebar_font_color || null);
        setSidebarActiveColor(profile.sidebar_active_color || null);
        setSidebarActiveFontColor(profile.sidebar_active_font_color || null);
        setWhatsapp(formatBR((profile as any).whatsapp_number || ""));
      }
    };

    fetchProfile();
  }, [user]);

  // Update name
  const handleUpdateName = async () => {
    if (!user) return;

    const validation = nameSchema.safeParse(fullName);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsUpdatingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Nome atualizado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao atualizar nome: " + error.message);
    } finally {
      setIsUpdatingName(false);
    }
  };

  // Update WhatsApp
  const handleUpdateWhatsapp = async () => {
    if (!user) return;
    if (!isValidBR(whatsapp)) {
      toast.error("Informe um WhatsApp válido com DDD (ex: (91) 98888-7777)");
      return;
    }
    setIsUpdatingWhatsapp(true);
    try {
      const digits = whatsapp.replace(/\D/g, "");
      const { error } = await supabase
        .from("profiles")
        .update({ whatsapp_number: digits })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("WhatsApp atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (error: any) {
      toast.error("Erro ao atualizar WhatsApp: " + error.message);
    } finally {
      setIsUpdatingWhatsapp(false);
    }
  };

  // Update email
  const handleUpdateEmail = async () => {
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
      });

      if (error) throw error;
      toast.success("Um email de confirmação foi enviado para o novo endereço.");
    } catch (error: any) {
      toast.error("Erro ao atualizar email: " + error.message);
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Update password
  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    const validation = passwordSchema.safeParse(newPassword);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      
      toast.success("Senha atualizada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Erro ao atualizar senha: " + error.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Upload avatar
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditingImage(reader.result as string);
      setIsEditorOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Clear input so same file can be selected again
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleSaveEditedImage = async (blob: Blob) => {
    if (!user) return;
    
    setIsUploadingAvatar(true);
    try {
      const fileName = `${user.id}/avatar.jpg`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      // Save the path, not the public URL
      const newAvatarPath = fileName;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarPath })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      const resolvedAvatar = await resolveStorageUrl(newAvatarPath);
      setAvatarUrl(resolvedAvatar);
      toast.success("Foto de perfil atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });

      // Se o usuário estava bloqueado por falta de foto, limpa cache e recarrega
      // para liberar o acesso imediatamente sem erros.
      const wasBlocked = isAvatarBlocked;
      try { sessionStorage.removeItem(`user_profile_${user.id}`); } catch {}
      if (wasBlocked) {
        setTimeout(() => { window.location.href = "/"; }, 600);
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar foto: " + error.message);
    } finally {
      setIsUploadingAvatar(false);
      setIsEditorOpen(false);
    }
  };


  const getInitials = () => {
    if (fullName) {
      const names = fullName.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0].substring(0, 2).toUpperCase();
    }
    return "US";
  };

  return (
    <Layout>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-8 max-w-2xl">
        <div className="mb-6 sm:mb-8">
          {!isAvatarBlocked && (
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-3 sm:mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          <EditablePageTitle pageKey="configuracoes" defaultValue="Configurações" className="text-xl sm:text-3xl font-bold" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie suas informações pessoais e configurações de conta.
          </p>
        </div>

        {isAvatarBlocked && (
          <div className="mb-6 p-4 rounded-lg border border-destructive/50 bg-destructive/10 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Foto de perfil obrigatória</p>
              <p className="text-sm text-muted-foreground">
                Você precisa enviar uma foto de perfil para acessar o sistema. Envie sua foto abaixo para desbloquear o acesso.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Photo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Foto de Perfil
              </CardTitle>
              <CardDescription>
                Altere sua foto de perfil exibida no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <NeonAvatar
                    src={avatarUrl}
                    name={fullName || "U"}
                    frameColor={frameColor}
                    neonColor={neonColor}
                    frameAnimation={frameAnimation}
                    size="lg"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors z-20"
                  >
                    {isUploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploadingAvatar ? "Enviando..." : "Enviar Nova Foto"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG ou GIF. Máximo 10MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Neon Frame Picker */}
          {user && (
            <NeonFramePicker
              userId={user.id}
              avatarUrl={avatarUrl}
              fullName={fullName}
              currentFrameColor={frameColor}
              currentNeonColor={neonColor}
              currentFrameAnimation={frameAnimation}
            />
          )}

          {/* GIF Avatar Creator */}
          {user && (
            <GifAvatarCreator
              userId={user.id}
              onAvatarCreated={(url) => setAvatarUrl(url)}
            />
          )}

          {/* Image Editor Dialog */}
          {editingImage && (
            <ImageEditor
              image={editingImage}
              open={isEditorOpen}
              onOpenChange={setIsEditorOpen}
              onSave={handleSaveEditedImage}
            />
          )}

          {/* Name */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Nome Completo
              </CardTitle>
              <CardDescription>
                Seu nome exibido no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
              <Button onClick={handleUpdateName} disabled={isUpdatingName}>
                {isUpdatingName ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Salvar Nome
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                WhatsApp
              </CardTitle>
              <CardDescription>
                Mantenha seu número atualizado para receber comunicados e novas funcionalidades do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">Número com DDD</Label>
                <Input
                  id="whatsapp"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatBR(e.target.value))}
                  placeholder="(91) 98888-7777"
                  maxLength={16}
                />
              </div>
              <Button onClick={handleUpdateWhatsapp} disabled={isUpdatingWhatsapp}>
                {isUpdatingWhatsapp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Salvar WhatsApp
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email
              </CardTitle>
              <CardDescription>
                Altere o email associado à sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              <Button onClick={handleUpdateEmail} disabled={isUpdatingEmail}>
                {isUpdatingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Atualizar Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Session Duration */}
          <SessionDurationSetting />

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Senha
              </CardTitle>
              <CardDescription>
                Altere sua senha de acesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword || !newPassword || !confirmPassword}>
                {isUpdatingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Atualizar Senha
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Admin-only sections */}
          {isAdmin && user && (
            <>
              {/* Theme Picker - Global */}
              <ThemePicker
                userId={user.id}
                currentTheme={(profile as any)?.ui_theme || "classic"}
              />

              {/* Primary Color Picker - Global */}
              <PrimaryColorPicker />

              {/* SidebarCustomizer removido — sidebar agora é padrão global para todos os usuários */}


              {/* Weather Media Settings */}
              <WeatherMediaSettings />

              {/* Announcement History */}
              <AnnouncementHistory />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Configuracoes;
