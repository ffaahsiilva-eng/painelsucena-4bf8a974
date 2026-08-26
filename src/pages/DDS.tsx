import { useState, useMemo, useRef } from "react";
import { DeleteConfirmation } from "@/components/ui/DeleteConfirmation";
import { format, parse, isWeekend, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Shuffle, Calendar, Save, Trash2, Edit2, Sun, Shield, ChevronLeft, ChevronRight, Loader2, AtSign, Plus, User, UserPlus, BookOpen, Camera, Image, X, ZoomIn, Eye, FileText } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  useDDSSchedule,
  useCreateDDSSchedule,
  useUpdateDDSSchedule,
  useDeleteDDSSchedule,
  useUpdateDDSPhoto,
  useUpdateDDSEventPhoto,
  useClearMonthDDS,
  useAllProfiles,
  getWeekdaysInMonth,
  DDSScheduleItem,
  useTomorrowDDS,
} from "@/hooks/useDDSSchedule";
import { useCreateNotification } from "@/hooks/useNotifications";

import { getBrazilNorthTodayString } from "@/lib/timezone";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { EditableIcon } from "@/components/cms/EditableIcon";
import { AnimatedDownloadButton } from "@/components/ui/AnimatedDownloadButton";
import { DDSThemesCard } from "@/components/dds/DDSThemesCard";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { useDDSMidnightRefresh } from "@/hooks/useMidnightRefresh";
import { useDDSParticipationMonth, useDDSParticipation, AbsenceReason } from "@/hooks/useDDSParticipation";
import { ENVIRONMENTS, type EnvironmentId } from "@/hooks/useEnvironment";
import { DDSParticipationDialog } from "@/components/dds/DDSParticipationDialog";
import { getLogoBase64, generatePdfHeader, PDF_HEADER_STYLES } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";
import { compressImage } from "@/utils/imageCompression";


const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const ABSENCE_LABELS_PDF: Record<string, string> = {
  falta: "Falta",
  atestado: "Atestado",
  afastado: "Afastado",
  treinamento: "Treinamento",
  exame: "Exame",
  folga: "Folga",
};

const generateParticipationPdf = async (date: string) => {
  const { data, error } = await supabase.from("dds_participation").select("*").eq("dds_date", date);
  if (error || !data || data.length === 0) {
    toast.error("Nenhum registro de presença encontrado para esta data");
    return;
  }
  const logoBase64 = await getLogoBase64();
  const formattedDate = date.split("-").reverse().join("/");
  const sorted = [...data].sort((a, b) => a.employee_name.localeCompare(b.employee_name));
  const presentList = sorted.filter((r) => r.present);
  const absentList = sorted.filter((r) => !r.present);

  const html = `
    <html><head><style>
      body { font-family: Arial, sans-serif; padding: 30px; color: #1f2937; }
      ${PDF_HEADER_STYLES}
      .summary { display: flex; gap: 20px; margin-bottom: 20px; }
      .summary-item { padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
      .summary-present { background: #dcfce7; color: #166534; }
      .summary-absent { background: #fee2e2; color: #991b1b; }
      .summary-total { background: #f3f4f6; color: #374151; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
      th { background: #1f2937; color: white; padding: 8px 12px; text-align: left; }
      td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
      tr:nth-child(even) { background: #f9fafb; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
      .badge-present { background: #dcfce7; color: #166534; }
      .badge-falta { background: #fee2e2; color: #991b1b; }
      .badge-atestado { background: #fef3c7; color: #92400e; }
      .badge-treinamento { background: #dbeafe; color: #1e40af; }
      .badge-exame { background: #ede9fe; color: #5b21b6; }
      .badge-folga { background: #ffedd5; color: #9a3412; }
      .badge-afastado { background: #e5e7eb; color: #374151; }
      .section-title { font-size: 14px; font-weight: 700; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e5e7eb; }
      .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
    </style></head><body>
      ${generatePdfHeader("Lista de Presença - DDS", formattedDate, logoBase64)}
      <div class="summary">
        <div class="summary-item summary-present">✅ Presentes: ${presentList.length}</div>
        <div class="summary-item summary-absent">❌ Ausentes: ${absentList.length}</div>
        <div class="summary-item summary-total">Total: ${sorted.length}</div>
      </div>
      <div class="section-title">Presentes</div>
      <table><thead><tr><th>#</th><th>Colaborador</th><th>Status</th></tr></thead><tbody>
        ${presentList.map((r, i) => `<tr><td>${i + 1}</td><td>${r.employee_name}</td><td><span class="badge badge-present">Presente</span></td></tr>`).join("")}
        ${presentList.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Nenhum</td></tr>' : ""}
      </tbody></table>
      <div class="section-title">Ausentes</div>
      <table><thead><tr><th>#</th><th>Colaborador</th><th>Motivo</th></tr></thead><tbody>
        ${absentList.map((r, i) => {
          const reason = (r as any).absence_reason || "falta";
          return `<tr><td>${i + 1}</td><td>${r.employee_name}</td><td><span class="badge badge-${reason}">${ABSENCE_LABELS_PDF[reason] || reason}</span></td></tr>`;
        }).join("")}
        ${absentList.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Nenhum</td></tr>' : ""}
      </tbody></table>
      <div class="footer">Sucena Engenharia • Lista de Presença DDS • ${formattedDate}</div>
    </body></html>
  `;
  await downloadPdfFromHtml(html, `DDS_Presenca_${date}.pdf`);
  toast.success("PDF gerado com sucesso!");
};

export default function DDS() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: allProfiles } = useAllProfiles();

  // Current month state
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthYear = format(currentDate, "yyyy-MM");
  
  // Tab state for main navigation
  const [activeTab, setActiveTab] = useState<"escala" | "temas">("escala");

  // Data hooks
  const { data: scheduleData, isLoading } = useDDSSchedule(monthYear);
  const { data: tomorrowDDS } = useTomorrowDDS();
  const createSchedule = useCreateDDSSchedule();
  const updateSchedule = useUpdateDDSSchedule();
  const deleteSchedule = useDeleteDDSSchedule();
  const clearMonth = useClearMonthDDS();
  const createNotification = useCreateNotification();
  const updateDDSPhoto = useUpdateDDSPhoto();
  const updateDDSEventPhoto = useUpdateDDSEventPhoto();
  // Hook to refresh DDS data at midnight (00:00 Pará time)
  useDDSMidnightRefresh();
  const { data: participationDates } = useDDSParticipationMonth(monthYear);
  const [participationDialogDate, setParticipationDialogDate] = useState<string | null>(null);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<DDSScheduleItem | null>(null);
  const [editPresenter, setEditPresenter] = useState("");
  const [editExternalName, setEditExternalName] = useState("");
  const [editIsExternal, setEditIsExternal] = useState(false);
  const [editTheme, setEditTheme] = useState("");
  
  // Add new DDS modal state
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [newPresenter, setNewPresenter] = useState("");
  const [newExternalName, setNewExternalName] = useState("");
  const [newIsExternal, setNewIsExternal] = useState(false);
  const [newTheme, setNewTheme] = useState("");
  
  // Photo states
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [uploadingEventPhotoId, setUploadingEventPhotoId] = useState<string | null>(null);
  const eventPhotoInputRef = useRef<HTMLInputElement>(null);
  const [eventPhotoTargetId, setEventPhotoTargetId] = useState<string | null>(null);


  const handleEventPhotoUpload = async (file: File, scheduleId: string, schedule: DDSScheduleItem) => {
    if (!file || !user) return;
    setUploadingEventPhotoId(scheduleId);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `dds-event_${scheduleId}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("site-assets").upload(path, await compressImage(file), { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      await updateDDSEventPhoto.mutateAsync({ id: scheduleId, event_photo_url: urlData.publicUrl });
      toast.success("Registro do DDS adicionado!");
      // Post to InstaCena
      if (profile) {
        const presenterName = schedule.presenter?.full_name || schedule.external_presenter_name || "Palestrante";
        const envId = schedule.environment as EnvironmentId | undefined;
        const envLabel = envId && ENVIRONMENTS[envId] ? ENVIRONMENTS[envId].label : "";
        const localLine = envLabel ? `📍 Local: ${envLabel}\n` : "";
        await supabase.from("instacena_posts").insert({
          user_id: user.id,
          user_name: profile.full_name,
          user_avatar_url: profile.avatar_url,
          content: `📸 Registro do DDS!\n\n${localLine}📋 Tema: ${schedule.theme}\n🎤 Palestrante: ${presenterName}`,
          image_urls: [urlData.publicUrl],
          is_system_post: false,
        });
      }
    } catch (err) {
      console.error("Error uploading event photo:", err);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingEventPhotoId(null);
    }
  };


  // Helper to create DDS mention notification
  const notifyPresenter = async (userId: string, date: string, theme: string) => {
    const formattedDate = format(new Date(date), "dd 'de' MMMM", { locale: ptBR });
    try {
      await createNotification.mutateAsync({
        user_id: userId,
        type: "dds_mention",
        title: "📢 Você foi mencionado como palestrante!",
        message: `Você foi designado para apresentar o DDS do dia ${formattedDate}. Tema: "${theme}"`,
        reference_type: "dds_schedule",
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  // Check if user can edit (tecnico_seguranca and weekday, OR admin)
  const today = new Date();
  const isWeekday = !isWeekend(today);
  const isTecnicoSeguranca = profile?.cargo === "tecnico_seguranca_i" || profile?.cargo === "tecnico_seguranca_ii";
  const isEncarregado = profile?.cargo === "encarregado_i" || profile?.cargo === "encarregado_ii";
  const canEdit = isAdmin || (isTecnicoSeguranca && isWeekday) || isEncarregado;

  // Schedule map for quick lookup
  const scheduleMap = useMemo(() => {
    const map = new Map<string, DDSScheduleItem>();
    scheduleData?.forEach(item => {
      map.set(item.scheduled_date, item);
    });
    return map;
  }, [scheduleData]);

  // Get weekdays for current month
  const weekdays = useMemo(() => getWeekdaysInMonth(currentDate), [currentDate]);

  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleRandomAssign = async () => {
    if (!allProfiles || allProfiles.length === 0) {
      toast.error("Não há usuários cadastrados para atribuir");
      return;
    }

    // Excluir motoristas do sorteio aleatório conforme nova regra de negócio
    const eligibleProfiles = allProfiles.filter(p => {
      const cargo = (p.cargo || "").toLowerCase();
      // Não deve incluir "motorista" em nenhuma variação
      return !cargo.includes("motorista");
    });

    if (eligibleProfiles.length === 0) {
      toast.error("Não há colaboradores elegíveis (não motoristas) para o sorteio");
      return;
    }

    // Clear existing schedule first
    try {
      await clearMonth.mutateAsync(monthYear);
    } catch (error) {
      console.error("Error clearing month:", error);
    }

    // Create random assignments
    const shuffledProfiles = [...eligibleProfiles].sort(() => Math.random() - 0.5);
    const defaultThemes = [
      "Segurança no Trabalho",
      "Uso de EPIs",
      "Prevenção de Acidentes",
      "Ergonomia",
      "Saúde Mental",
      "Meio Ambiente",
      "5S no Ambiente de Trabalho",
      "Comunicação Efetiva",
      "Trabalho em Equipe",
      "Qualidade de Vida",
      "Primeiros Socorros",
      "Prevenção de Incêndios",
    ];

    const assignments = weekdays.map((day, index) => ({
      month_year: monthYear,
      scheduled_date: format(day, "yyyy-MM-dd"),
      presenter_user_id: shuffledProfiles[index % shuffledProfiles.length].user_id,
      theme: defaultThemes[index % defaultThemes.length],
    }));

    try {
      await createSchedule.mutateAsync(assignments);
      
      // Send notifications to all assigned presenters
      for (const assignment of assignments) {
        if (assignment.presenter_user_id) {
          await notifyPresenter(
            assignment.presenter_user_id,
            assignment.scheduled_date,
            assignment.theme
          );
        }
      }
      
      toast.success("Escala gerada (excluindo motoristas) e palestrantes notificados!");
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast.error("Erro ao gerar escala aleatória");
    }
  };

  const handleEdit = (item: DDSScheduleItem) => {
    setEditingItem(item);
    const isExternal = !item.presenter_user_id && !!item.external_presenter_name;
    setEditIsExternal(isExternal);
    setEditPresenter(item.presenter_user_id || "");
    setEditExternalName(item.external_presenter_name || "");
    setEditTheme(item.theme);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const hasValidPresenter = editIsExternal 
      ? editExternalName.trim() !== ""
      : editPresenter !== "";

    if (!hasValidPresenter || !editTheme) return;

    const presenterChanged = editIsExternal
      ? editExternalName !== editingItem.external_presenter_name
      : editPresenter !== editingItem.presenter_user_id;

    try {
      await updateSchedule.mutateAsync({
        id: editingItem.id,
        presenter_user_id: editIsExternal ? null : editPresenter,
        external_presenter_name: editIsExternal ? editExternalName.trim() : null,
        theme: editTheme,
      });

      // Notify new presenter if changed and is a system user
      if (presenterChanged && !editIsExternal && editPresenter) {
        await notifyPresenter(editPresenter, editingItem.scheduled_date, editTheme);
        toast.success("Palestrante atualizado e notificado!");
      } else {
        toast.success("Agendamento atualizado!");
      }
      
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Erro ao atualizar agendamento");
    }
  };

  const handleAddDDS = (dateStr: string) => {
    setAddingDate(dateStr);
    setNewPresenter("");
    setNewExternalName("");
    setNewIsExternal(false);
    setNewTheme("");
  };

  const handleSaveNewDDS = async () => {
    if (!addingDate || !newTheme) return;

    const hasValidPresenter = newIsExternal 
      ? newExternalName.trim() !== ""
      : newPresenter !== "";

    if (!hasValidPresenter) return;

    try {
      await createSchedule.mutateAsync([{
        month_year: monthYear,
        scheduled_date: addingDate,
        presenter_user_id: newIsExternal ? undefined : newPresenter,
        external_presenter_name: newIsExternal ? newExternalName.trim() : undefined,
        theme: newTheme,
      }]);

      // Notify the presenter only if it's a system user
      if (!newIsExternal && newPresenter) {
        await notifyPresenter(newPresenter, addingDate, newTheme);
        toast.success("DDS adicionado e palestrante notificado!");
      } else {
        toast.success("DDS adicionado com sucesso!");
      }
      
      setAddingDate(null);
    } catch (error) {
      console.error("Error creating DDS:", error);
      toast.error("Erro ao adicionar DDS");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule.mutateAsync({ id, monthYear });
      toast.success("Agendamento removido!");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Erro ao remover agendamento");
    }
  };


  if (profileLoading || adminLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <EditableIcon pageKey="dds" elementKey="dds-icon" defaultIcon={<Sun className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 shrink-0" />} iconSize={32} />
              <EditablePageTitle pageKey="dds" defaultValue="DDS - Diálogo de Segurança" className="leading-tight inline" as="h1" />
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie escalas e consulte os temas programados
            </p>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "escala" | "temas")} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="escala" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Escala do Mês
              </TabsTrigger>
              <TabsTrigger value="temas" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Temas 2026
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Themes Tab Content */}
        {activeTab === "temas" && (
          <DDSThemesCard />
        )}

        {/* Schedule Tab Content */}
        {activeTab === "escala" && (
          <>
            {/* Month Navigation */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 sm:flex-none px-3 py-2 bg-muted rounded-lg font-medium min-w-[140px] sm:min-w-[160px] text-center text-sm sm:text-base">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </div>
              <Button variant="outline" size="icon" onClick={handleNextMonth} className="shrink-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

        {/* Permission Notice */}
        {!canEdit && (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Shield className="h-5 w-5" />
                <span>
                  {!isTecnicoSeguranca
                    ? "Apenas Técnicos de Segurança podem editar a escala."
                    : "Edições só são permitidas de segunda a sexta-feira."}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {canEdit && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              <CardDescription>Gerencie a escala do mês</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                    <Shuffle className="h-4 w-4 mr-2" />
                    Definir Aleatoriamente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Gerar escala aleatória?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá substituir toda a escala atual do mês de{" "}
                      {format(currentDate, "MMMM", { locale: ptBR })} por uma nova escala aleatória.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRandomAssign}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Mês
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar toda a escala?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá remover todos os agendamentos do mês de{" "}
                      {format(currentDate, "MMMM", { locale: ptBR })}. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearMonth.mutateAsync(monthYear).then(() => toast.success("Escala limpa!"))}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Limpar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

            </CardContent>
          </Card>
        )}

        {/* Schedule Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Escala do Mês
            </CardTitle>
            <CardDescription>
              {weekdays.length} dias úteis • {scheduleData?.length || 0} agendamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Carregando escala...</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px] sm:w-[120px]">Data</TableHead>
                      <TableHead className="w-[50px] sm:w-[80px]">Dia</TableHead>
                      <TableHead>Palestrante</TableHead>
                      <TableHead className="hidden sm:table-cell">Tema</TableHead>
                      {canEdit && <TableHead className="w-[80px] sm:w-[100px] text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weekdays.map(day => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const schedule = scheduleMap.get(dateStr);
                      const isToday = dateStr === getBrazilNorthTodayString();

                      return (
                        <TableRow
                          key={dateStr}
                          className={isToday ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {isToday && (
                                <Badge variant="default" className="bg-amber-500 text-xs">
                                  Hoje
                                </Badge>
                              )}
                              {format(day, "dd/MM")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {dayNames[getDay(day)]}
                            </span>
                          </TableCell>
                          <TableCell>
                            {schedule?.presenter ? (
                              <div className="flex items-center gap-3">
                                <NeonAvatar
                                  src={schedule.presenter.avatar_url}
                                  name={schedule.presenter.full_name}
                                  frameColor={schedule.presenter.frame_color}
                                  neonColor={schedule.presenter.neon_color}
                                  frameAnimation={schedule.presenter.frame_animation}
                                  size="sm"
                                />
                                <div>
                                  <p className="font-medium text-sm">{schedule.presenter.full_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatCargoLabel(schedule.presenter.cargo)}
                                  </p>
                                  {schedule.theme && (
                                    <p className="text-xs text-muted-foreground sm:hidden mt-0.5 italic">
                                      {schedule.theme}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : schedule?.external_presenter_name ? (
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                                    {getInitials(schedule.external_presenter_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{schedule.external_presenter_name}</p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <UserPlus className="h-3 w-3" />
                                    Palestrante externo
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">
                                Não definido
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {schedule?.theme ? (
                                <span className="text-sm hidden sm:inline">{schedule.theme}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm italic hidden sm:inline">—</span>
                              )}
                              {schedule?.event_photo_url && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setFullscreenPhoto(schedule.event_photo_url)} title="Ver registro do DDS">
                                  <Image className="h-4 w-4 text-amber-500" />
                                </Button>
                              )}
                              {participationDates?.has(dateStr) && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setParticipationDialogDate(dateStr)} title="Ver lista de presença">
                                    <Eye className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <AnimatedDownloadButton 
                                    onDownload={() => generateParticipationPdf(dateStr)}
                                    className="h-7 w-7"
                                    label=""
                                  />
                                </>
                              )}
                            </div>
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              {schedule ? (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEventPhotoTargetId(schedule.id);
                                      eventPhotoInputRef.current?.click();
                                    }}
                                    disabled={uploadingEventPhotoId === schedule.id}
                                    title="Registro do DDS (InstaCena)"
                                  >
                                    {uploadingEventPhotoId === schedule.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Image className="h-4 w-4 text-amber-500" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEdit(schedule)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <DeleteConfirmation
                                    onConfirm={() => handleDelete(schedule.id)}
                                  />
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-primary hover:text-primary"
                                  onClick={() => handleAddDDS(dateStr)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Adicionar
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Agendamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input
                  value={
                    editingItem
                      ? format(parse(editingItem.scheduled_date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
                      : ""
                  }
                  disabled
                />
              </div>
              
              {/* Toggle for external/internal presenter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de Palestrante</Label>
                <Tabs 
                  value={editIsExternal ? "external" : "internal"} 
                  onValueChange={(v) => setEditIsExternal(v === "external")}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="internal" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Usuário do sistema
                    </TabsTrigger>
                    <TabsTrigger value="external" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Externo
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Palestrante</Label>
                {editIsExternal ? (
                  <Input
                    value={editExternalName}
                    onChange={e => setEditExternalName(e.target.value)}
                    placeholder="Digite o nome do palestrante externo"
                  />
                ) : (
                  <Select value={editPresenter} onValueChange={setEditPresenter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um palestrante" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProfiles?.map(p => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          <div className="flex items-center gap-2">
                            <NeonAvatar
                              src={p.avatar_url}
                              name={p.full_name}
                              frameColor={p.frame_color}
                              neonColor={p.neon_color}
                              frameAnimation={p.frame_animation}
                              size="sm"
                            />
                            {p.full_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tema</Label>
                <Input
                  value={editTheme}
                  onChange={e => setEditTheme(e.target.value)}
                  placeholder="Digite o tema do DDS"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveEdit} 
                disabled={
                  !editTheme || 
                  (editIsExternal ? !editExternalName.trim() : !editPresenter)
                }
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add New DDS Dialog */}
        <Dialog open={!!addingDate} onOpenChange={() => setAddingDate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Adicionar DDS
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data</Label>
                <Input
                  value={
                    addingDate
                      ? format(parse(addingDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy (EEEE)", { locale: ptBR })
                      : ""
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
              
              {/* Toggle for external/internal presenter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de Palestrante</Label>
                <Tabs 
                  value={newIsExternal ? "external" : "internal"} 
                  onValueChange={(v) => setNewIsExternal(v === "external")}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="internal" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Usuário do sistema
                    </TabsTrigger>
                    <TabsTrigger value="external" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Externo
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Palestrante</Label>
                {newIsExternal ? (
                  <Input
                    value={newExternalName}
                    onChange={e => setNewExternalName(e.target.value)}
                    placeholder="Digite o nome do palestrante externo"
                  />
                ) : (
                  <Select value={newPresenter} onValueChange={setNewPresenter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um palestrante" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProfiles?.map(p => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          <div className="flex items-center gap-2">
                            <NeonAvatar
                              src={p.avatar_url}
                              name={p.full_name}
                              frameColor={p.frame_color}
                              neonColor={p.neon_color}
                              frameAnimation={p.frame_animation}
                              size="sm"
                            />
                            {p.full_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tema</Label>
                <Input
                  value={newTheme}
                  onChange={e => setNewTheme(e.target.value)}
                  placeholder="Digite o tema do DDS"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddingDate(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveNewDDS} 
                disabled={
                  !newTheme || 
                  (newIsExternal ? !newExternalName.trim() : !newPresenter) ||
                  createSchedule.isPending
                }
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {createSchedule.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Hidden file input for event photo upload */}
        <input
          ref={eventPhotoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && eventPhotoTargetId) {
              const schedule = scheduleData?.find(s => s.id === eventPhotoTargetId);
              if (schedule) {
                handleEventPhotoUpload(file, eventPhotoTargetId, schedule);
              }
            }
            e.target.value = "";
          }}
        />

        {/* Fullscreen Photo Dialog */}
        <Dialog open={!!fullscreenPhoto} onOpenChange={() => setFullscreenPhoto(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 sm:p-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Foto do DDS
              </DialogTitle>
            </DialogHeader>
            {fullscreenPhoto && (
              <div className="flex items-center justify-center overflow-auto max-h-[80vh]">
                <img loading="lazy" decoding="async"
                  src={fullscreenPhoto}
                  alt="Foto do DDS"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {participationDialogDate && (
        <DDSParticipationDialog
          open={!!participationDialogDate}
          onOpenChange={(open) => { if (!open) setParticipationDialogDate(null); }}
          date={participationDialogDate}
        />
      )}
    </Layout>
  );
}
