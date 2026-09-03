import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePageCustomizations } from "@/hooks/usePageCustomizations";
import { useEnvironment, ENVIRONMENTS } from "@/hooks/useEnvironment";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, ShieldCheck, Trash2, UserPlus, Users, Image, Upload, UserCog, Megaphone, Pencil, LayoutList, Truck, RotateCcw, Key, Ribbon, Coins, UserCheck, Eye, Globe, MonitorOff } from "lucide-react";
import { ModeratorBadge } from "@/components/ModeratorBadge";
import { Switch } from "@/components/ui/switch";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { Label } from "@/components/ui/label";
import { ClearEquipmentDialog } from "@/components/driver/ClearEquipmentDialog";
import { BulkEmployeeEditor } from "@/components/admin/BulkEmployeeEditor";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog";
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog";
import { NavVisibilityManager } from "@/components/admin/NavVisibilityManager";
import { EnvironmentAccessManager } from "@/components/admin/EnvironmentAccessManager";
import { EnvironmentAccessDialog } from "@/components/admin/EnvironmentAccessDialog";
import { LoginBackgroundSettings } from "@/components/admin/LoginBackgroundSettings";
import { GlobalBackgroundSettings } from "@/components/admin/GlobalBackgroundSettings";
import { CardOpacitySettings } from "@/components/admin/CardOpacitySettings";
import { WeatherMediaSettings } from "@/components/settings/WeatherMediaSettings";
import { Navigate, useNavigate } from "react-router-dom";
import { getCurrentMonthCampaigns } from "@/data/campaignData";
import instaCenaLogo from "@/assets/instacena-logo.png";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
  role_id: string | null;
}


const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isStrictAdmin, isModerator, isLoading: adminLoading } = useIsAdmin();
  const { settings, updateSettings, uploadLogo, isLoading: settingsLoading } = useSiteSettings();
  const { upsertCustomization, getCustomValue } = usePageCustomizations("instacena");
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | undefined>(undefined);
  const [selectedRole, setSelectedRole] = useState<AppRole>("user");
  
  // Edit/Delete/Password dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState<UserWithRole | null>(null);
  
  // Site settings state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingInstaCenaLogo, setIsUploadingInstaCenaLogo] = useState(false);
  const [isResendingCampaign, setIsResendingCampaign] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const instaCenaLogoInputRef = useRef<HTMLInputElement>(null);

  // Fetch all users with their profiles and roles, filtered by environment access
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users-with-roles", currentEnv],
    queryFn: async () => {
      // Get users who have access to the current environment
      const { data: envAccess, error: envError } = await supabase
        .from("user_environment_access")
        .select("user_id")
        .eq("environment", currentEnv);

      if (envError) throw envError;
      
      const authorizedUserIds = envAccess?.map(a => a.user_id) || [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role");

      if (rolesError) throw rolesError;

      const usersMap = new Map<string, UserWithRole>();

      profiles?.forEach((profile) => {
        const userRole = roles?.find(r => r.user_id === profile.user_id)?.role;
        const isGlobalUser = userRole === 'admin' || userRole === 'moderator';
        const hasAccessToEnv = authorizedUserIds.includes(profile.user_id);

        if (isGlobalUser || hasAccessToEnv || currentEnv === 'barcarena') {
          usersMap.set(profile.user_id, {
            user_id: profile.user_id,
            email: "",
            full_name: profile.full_name,
            role: null,
            role_id: null,
          });
        }
      });

      roles?.forEach((role) => {
        const existing = usersMap.get(role.user_id);
        if (existing) {
          existing.role = role.role;
          existing.role_id = role.id;
        } else if (role.role === 'admin' || role.role === 'moderator' || authorizedUserIds.includes(role.user_id) || currentEnv === 'barcarena') {
          usersMap.set(role.user_id, {
            user_id: role.user_id,
            email: "",
            full_name: null,
            role: role.role,
            role_id: role.id,
          });
        }
      });

      return Array.from(usersMap.values());
    },
    enabled: isAdmin,

  });

  // Moderator restriction flags
  const canManageRoles = isStrictAdmin;
  const canDeleteUsers = isStrictAdmin;

  // Fetch emails separately (não fica cacheado com a lista de usuários)
  const { data: emailsMap } = useQuery({
    queryKey: ["admin-user-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-list-user-emails");
      if (error) throw error;
      return ((data as any)?.emails || {}) as Record<string, string>;
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Safety: protect against cache pollution / unexpected shapes
  const users: UserWithRole[] = (Array.isArray(usersData) ? usersData : []).map((u) => ({
    ...u,
    email: emailsMap?.[u.user_id] || u.email || "",
  }));

  // Role mutations
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
      toast.success("Role adicionada com sucesso!");
      setSelectedUser(undefined);
      setSelectedRole("user");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar role: ${error.message}`);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, newRole }: { roleId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
      toast.success("Role atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar role: ${error.message}`);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
      toast.success("Role removida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover role: ${error.message}`);
    },
  });

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const logoUrl = await uploadLogo(file);
      await updateSettings.mutateAsync({ logo_url: logoUrl });
      toast.success("Logo atualizada com sucesso!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao fazer upload da logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleInstaCenaLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    setIsUploadingInstaCenaLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/instacena-logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data } = await supabase.storage.from("site-assets").createSignedUrl(path, 315360000);
      if (!data?.signedUrl) throw new Error("Erro ao gerar URL");

      await upsertCustomization.mutateAsync({
        page_key: "instacena",
        element_key: "page-logo",
        element_type: "image",
        image_url: data.signedUrl,
      });
      toast.success("Logo do InstaCena atualizada!");
    } catch (error: any) {
      console.error("Error uploading InstaCena logo:", error);
      toast.error(`Erro ao fazer upload da logo: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsUploadingInstaCenaLogo(false);
    }
  };

  const handleRestoreDefaultLogo = async () => {
    try {
      await updateSettings.mutateAsync({ logo_url: null });
      toast.success("Logo restaurada para o padrão.");
    } catch (error) {
      toast.error("Erro ao restaurar logo.");
    }
  };

  const handleRestoreInstaCenaLogo = async () => {
    try {
      await upsertCustomization.mutateAsync({
        page_key: "instacena",
        element_key: "page-logo",
        element_type: "image",
        image_url: null,
      });
      toast.success("Logo do InstaCena restaurada para o padrão.");
    } catch (error) {
      toast.error("Erro ao restaurar logo do InstaCena.");
    }
  };

  // Handle resend campaign announcement
  const handleResendCampaign = async () => {
    const monthData = getCurrentMonthCampaigns();
    if (!monthData) {
      toast.error("Nenhuma campanha encontrada para o mês atual.");
      return;
    }

    setIsResendingCampaign(true);
    try {
      // Toda a lógica (limpeza, criação e envio WhatsApp) foi movida para o backend para maior confiabilidade
      const { data, error } = await supabase.functions.invoke("generate-campaign-banner", {
        body: { 
          monthData, 
          userId: user?.id, 
          environment: currentEnv 
        },
      });

      if (error || (data && data.error)) {
        console.error("Resend Error:", error || data?.error);
        throw new Error(data?.error || error?.message || "Erro na execução da função");
      }

      queryClient.invalidateQueries({ queryKey: ["announcements", currentEnv] });
      queryClient.invalidateQueries({ queryKey: ["unread-announcements", user?.id, currentEnv] });
      toast.success(`Campanha de ${monthData.monthName} reenviada com sucesso para o sistema e WhatsApp!`);
    } catch (err: any) {
      console.error("Resend campaign error:", err);
      toast.error(`Erro ao reenviar campanha: ${err.message || "Erro desconhecido"}`);
    } finally {
      setIsResendingCampaign(false);
    }
  };

  // Loading state
  if (authLoading || adminLoading || settingsLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  // Redirect non-admins
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const usersWithoutRole = users.filter((u) => !u.role);

  return (
    <Layout>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            {isModerator ? (
              <ModeratorBadge size="lg" />
            ) : (
              <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            )}
            <h1 className="text-xl sm:text-3xl font-bold">
              {isModerator ? "Moderação" : "Administração"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie as configurações do sistema e permissões dos usuários.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/whatsapp")} className="gap-2">
            <img loading="lazy" decoding="async" src="/whatsapp-api-icon.png" className="w-4 h-4 object-contain" alt="WhatsApp API" /> WhatsApp API (W-API)
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/backup")} className="gap-2">
            ☁️ Backup e Restauração
          </Button>
        </div>

        <Tabs defaultValue="settings" className="space-y-4 sm:space-y-6">
          <TabsList className="flex w-full overflow-x-auto max-w-full">
            <TabsTrigger value="settings" className="text-xs sm:text-sm flex-shrink-0">Config.</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm flex-shrink-0">Usuários</TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-1 text-xs sm:text-sm flex-shrink-0">
              <UserCog className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Funcionários</span>
              <span className="sm:hidden">Func.</span>
            </TabsTrigger>
            <TabsTrigger value="visibility" className="flex items-center gap-1 text-xs sm:text-sm flex-shrink-0">
              <LayoutList className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Visibilidade</span>
              <span className="sm:hidden">Visib.</span>
            </TabsTrigger>
            <TabsTrigger value="environments" className="flex items-center gap-1 text-xs sm:text-sm flex-shrink-0">
              <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ambientes</span>
              <span className="sm:hidden">Amb.</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-1 text-xs sm:text-sm flex-shrink-0">
              <Megaphone className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Comunicados</span>
              <span className="sm:hidden">Comun.</span>
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Logo Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Logo do Site
                </CardTitle>
                <CardDescription>
                  Altere a logo exibida na barra lateral do sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted flex-shrink-0">
                    {settings.logo_url ? (
                      <img loading="lazy" decoding="async" 
                        src={settings.logo_url} 
                        alt="Logo atual" 
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <Image className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-3 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        {isUploadingLogo ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Enviar Nova Logo
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleRestoreDefaultLogo}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Padrão
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* InstaCena Logo Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Logo do InstaCena
                </CardTitle>
                <CardDescription>
                  Altere a logo exibida no topo da página do InstaCena.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted flex-shrink-0">
                    <img loading="lazy" decoding="async" 
                      src={getCustomValue("page-logo", "image") || instaCenaLogo} 
                      alt="Logo InstaCena" 
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  <div className="space-y-3 w-full">
                    <input
                      ref={instaCenaLogoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleInstaCenaLogoUpload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => instaCenaLogoInputRef.current?.click()}
                        disabled={isUploadingInstaCenaLogo}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        {isUploadingInstaCenaLogo ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Enviar Nova Logo
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleRestoreInstaCenaLogo}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Padrão
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Login Background Settings */}
            <LoginBackgroundSettings />
            
            {/* Global Background Settings */}
            <GlobalBackgroundSettings />

            {/* Card Opacity Settings */}
            <CardOpacitySettings />

            {/* Weather Media Settings (Dashboard) */}
            <WeatherMediaSettings />


            {/* Quick Access - Driver Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Painel do Motorista
                </CardTitle>
                <CardDescription>
                  Acesse o painel do motorista ou gerencie os equipamentos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => navigate("/painel-motorista")}
                    variant="outline"
                    className="gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    Acessar Painel
                  </Button>
                  <ClearEquipmentDialog />
                </div>
              </CardContent>
            </Card>

            {/* Campaign Announcement Resend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ribbon className="w-5 h-5" />
                  Campanha do Mês
                </CardTitle>
                <CardDescription>
                  Reenvie o comunicado da campanha de conscientização para todos os usuários.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleResendCampaign}
                    disabled={isResendingCampaign}
                    variant="outline"
                    className="gap-2"
                  >
                    {isResendingCampaign ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        Gerando banner...
                      </>
                    ) : (
                      <>
                        <Ribbon className="w-4 h-4" />
                        Reenviar Campanha do Mês
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {getCurrentMonthCampaigns()
                      ? `Campanhas: ${getCurrentMonthCampaigns()!.campaigns.map(c => c.name).join(", ")}`
                      : "Nenhuma campanha neste mês"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Signup Button Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Botão de Cadastro na Tela de Login
                </CardTitle>
                <CardDescription>
                  Exibe ou oculta o botão de cadastro de novos usuários na tela de login.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Switch
                    id="show-signup"
                    checked={settings.show_signup_button}
                    onCheckedChange={(checked) => {
                      updateSettings.mutate(
                        { show_signup_button: checked },
                        {
                          onSuccess: () => toast.success(checked ? "Botão de cadastro habilitado" : "Botão de cadastro ocultado"),
                          onError: () => toast.error("Erro ao atualizar configuração"),
                        }
                      );
                    }}
                    disabled={updateSettings.isPending}
                  />
                  <Label htmlFor="show-signup" className="cursor-pointer">
                    {settings.show_signup_button ? "Visível" : "Oculto"}
                  </Label>
                </div>
              </CardContent>
            </Card>


            {/* Theme Settings */}
            <ThemePicker userId={user?.id} />


            {/* Screensaver Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MonitorOff className="w-5 h-5" />
                  Protetor de Tela (Relógio)
                </CardTitle>
                <CardDescription>
                  Configure se e quando o relógio animado deve aparecer após inatividade.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="screensaver-toggle" className="text-base cursor-pointer">Ativar Protetor de Tela</Label>
                    <p className="text-sm text-muted-foreground italic">
                      {settings.screensaver_enabled ? "O protetor aparecerá após o tempo selecionado" : "Protetor de tela desativado"}
                    </p>
                  </div>
                  <Switch
                    id="screensaver-toggle"
                    checked={settings.screensaver_enabled}
                    onCheckedChange={(checked) => {
                      updateSettings.mutate(
                        { screensaver_enabled: checked },
                        {
                          onSuccess: () => toast.success(checked ? "Protetor de tela ativado" : "Protetor de tela desativado"),
                          onError: () => toast.error("Erro ao atualizar configuração"),
                        }
                      );
                    }}
                    disabled={updateSettings.isPending}
                  />
                </div>

                <div className={cn("space-y-3 transition-opacity duration-300", !settings.screensaver_enabled && "opacity-50 pointer-events-none")}>
                  <Label>Tempo para ativação (inatividade)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Imediatamente", value: 0 },
                      { label: "5 minutos", value: 5 },
                      { label: "10 minutos", value: 10 },
                      { label: "20 minutos", value: 20 },
                    ].map((opt) => (
                      <Button
                        key={opt.value}
                        variant={settings.screensaver_timeout === opt.value ? "default" : "outline"}
                        className="w-full text-xs"
                        onClick={() => {
                          updateSettings.mutate(
                            { screensaver_timeout: opt.value },
                            {
                              onSuccess: () => toast.success(`Tempo ajustado para ${opt.label}`),
                              onError: () => toast.error("Erro ao atualizar tempo"),
                            }
                          );
                        }}
                        disabled={updateSettings.isPending || !settings.screensaver_enabled}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    * O protetor só é ativado quando o usuário está logado e não há interação.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="users" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.filter((u) => u.role === "admin").length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Moderadores</CardTitle>
                  <ModeratorBadge size="sm" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.filter((u) => u.role === "moderator").length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sem Role</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usersWithoutRole.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Add Role Section - Only for strict admins */}
            {canManageRoles && usersWithoutRole.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Atribuir Role
                  </CardTitle>
                  <CardDescription>
                    Selecione um usuário e atribua uma role de acesso.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="w-full sm:w-[300px]">
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersWithoutRole.map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name || "Usuário sem nome"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Selecione uma role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Membro Normal</SelectItem>
                        <SelectItem value="moderator">Moderador</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="visualizador">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => {
                        if (selectedUser) {
                          addRoleMutation.mutate({ userId: selectedUser, role: selectedRole });
                        }
                      }}
                      disabled={!selectedUser || addRoleMutation.isPending}
                    >
                      {addRoleMutation.isPending ? "Adicionando..." : "Adicionar Role"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Usuários e Permissões</CardTitle>
                <CardDescription>
                  Lista de todos os usuários registrados e suas respectivas roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">
                            {u.full_name || "Usuário sem nome"}
                            {u.user_id === user?.id && (
                              <Badge variant="outline" className="ml-2">
                                Você
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground break-all">
                            {u.email || "—"}
                          </TableCell>
                          <TableCell>
                            {canManageRoles ? (
                              <Select
                                value={u.role || "none"}
                                onValueChange={(newRole) => {
                                  if (newRole === "none") return;
                                  if (u.role_id) {
                                    updateRoleMutation.mutate({
                                      roleId: u.role_id,
                                      newRole: newRole as AppRole,
                                    });
                                  } else {
                                    addRoleMutation.mutate({
                                      userId: u.user_id,
                                      role: newRole as AppRole,
                                    });
                                  }
                                }}
                                disabled={u.user_id === user?.id}
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {!u.role && (
                                    <SelectItem value="none">
                                      <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-muted-foreground" />
                                        Sem role
                                      </div>
                                    </SelectItem>
                                  )}
                                  <SelectItem value="user">
                                    <div className="flex items-center gap-2">
                                      <Shield className="w-4 h-4" />
                                      Membro Normal
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="moderator">
                                    <div className="flex items-center gap-2">
                                      <ModeratorBadge size="sm" />
                                      Moderador
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <ShieldCheck className="w-4 h-4" />
                                      Administrador
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="visualizador">
                                    <div className="flex items-center gap-2">
                                      <Eye className="w-4 h-4" />
                                      Visualizador
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              u.role ? (
                                <Badge variant={u.role === "admin" ? "default" : u.role === "moderator" ? "secondary" : u.role === "visualizador" ? "outline" : "outline"}>
                                  {u.role === "admin" ? "Admin" : u.role === "moderator" ? "Moderador" : u.role === "visualizador" ? "Visualizador" : "Membro Normal"}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Sem role</Badge>
                              )
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {u.user_id !== user?.id && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedUserForAction(u);
                                      setPasswordDialogOpen(true);
                                    }}
                                    title="Alterar senha"
                                  >
                                    <Key className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedUserForAction(u);
                                      setEditDialogOpen(true);
                                    }}
                                    title="Editar usuário"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <EnvironmentAccessDialog
                                    userId={u.user_id}
                                    userName={u.full_name || u.email}
                                    trigger={
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Acesso por ambiente"
                                        className="text-emerald-600 hover:text-emerald-700"
                                      >
                                        <Globe className="w-4 h-4" />
                                      </Button>
                                    }
                                  />
                                  {canDeleteUsers && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => {
                                        setSelectedUserForAction(u);
                                        setDeleteDialogOpen(true);
                                      }}
                                      title="Excluir usuário"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Employees Tab */}
          <TabsContent value="employees">
            <BulkEmployeeEditor />
          </TabsContent>

          {/* Visibility Tab */}
          <TabsContent value="visibility">
            <NavVisibilityManager />
          </TabsContent>

          {/* Environments Tab */}
          <TabsContent value="environments">
            <EnvironmentAccessManager />
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <AnnouncementManager />
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={selectedUserForAction}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
          }}
        />

        {/* Delete User Dialog */}
        <DeleteUserDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          user={selectedUserForAction}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
          }}
        />

        {/* Reset Password Dialog */}
        <ResetPasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
          user={selectedUserForAction}
        />
      </div>
    </Layout>
  );
};

export default Admin;
