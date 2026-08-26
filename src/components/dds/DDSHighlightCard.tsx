import { useState, useRef, useMemo } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sun, Calendar, Camera, Upload, Loader2, ArrowRight, UserPlus, X, ClipboardList, Filter, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SunBorderAvatar } from "./SunBorderAvatar";
import { useTodayDDS, useTomorrowDDS, useUpdateDDSPhoto, useUpdateDDSEventPhoto, useUpdateDDSSchedule } from "@/hooks/useDDSSchedule";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getBrazilNorthDate } from "@/lib/timezone";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { useDDSMidnightRefresh } from "@/hooks/useMidnightRefresh";
import { DDSParticipationDialog } from "./DDSParticipationDialog";
import sextouVideo from "@/assets/sextou-dds.mp4.asset.json";
import { useEnvironment, ENVIRONMENTS } from "@/hooks/useEnvironment";
import { compressImage } from "@/utils/imageCompression";


export const DDSHighlightCard = () => {
  const { data: todayDDS, isLoading: loadingToday } = useTodayDDS();
  const { data: tomorrowDDS, isLoading: loadingTomorrow } = useTomorrowDDS();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const updatePhoto = useUpdateDDSPhoto();
  const updateEventPhoto = useUpdateDDSEventPhoto();
  const updateSchedule = useUpdateDDSSchedule();
  const { info: envInfo } = useEnvironment();
  // Hook to refresh DDS data at midnight (00:00 Pará time)
  const dateKey = useDDSMidnightRefresh();

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingEvent, setIsUploadingEvent] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [eventPhotoModalOpen, setEventPhotoModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventFileInputRef = useRef<HTMLInputElement>(null);
  const [participationOpen, setParticipationOpen] = useState(false);
  const [historicalDate, setHistoricalDate] = useState("");
  const [historicalOpen, setHistoricalOpen] = useState(false);
  const [themeEditOpen, setThemeEditOpen] = useState(false);
  const [themeDraft, setThemeDraft] = useState("");

  // Use Brazil North timezone - recalculate when dateKey changes
  const today = useMemo(() => getBrazilNorthDate(), [dateKey]);
  const tomorrow = useMemo(() => addDays(getBrazilNorthDate(), 1), [dateKey]);
  const isFriday = useMemo(() => today.getDay() === 5, [today]);

  // Check if user can upload photo (tecnico_seguranca, tecnico_meio_ambiente or admin)
  const canUploadPhoto = isAdmin || 
    profile?.cargo === "tecnico_seguranca_i" || 
    profile?.cargo === "tecnico_seguranca_ii" || 
    profile?.cargo === "tecnico_meio_ambiente";

  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Upload THEME photo (shows in Destaques only, NO InstaCena)
  const handleThemePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !todayDDS) return;
    if (!file.type.startsWith("image/")) { toast.error("Por favor, selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 5MB"); return; }
    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `dds-theme-${todayDDS.scheduled_date}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("site-assets").upload(fileName, await compressImage(file), { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(fileName);
      await updatePhoto.mutateAsync({ id: todayDDS.id, photo_url: urlData.publicUrl });
      toast.success("Foto do tema adicionada!");
    } catch (error) {
      console.error("Error uploading theme photo:", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Upload EVENT photo (what happened during DDS → posts to InstaCena)
  const handleEventPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !todayDDS) return;
    if (!file.type.startsWith("image/")) { toast.error("Por favor, selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 5MB"); return; }
    setIsUploadingEvent(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `dds-event-${todayDDS.scheduled_date}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("site-assets").upload(fileName, await compressImage(file), { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(fileName);
      await updateEventPhoto.mutateAsync({ id: todayDDS.id, event_photo_url: urlData.publicUrl });
      toast.success("Foto do registro adicionada!");

      // Post to InstaCena
      if (profile) {
        const presenterName = todayDDS.presenter?.full_name || todayDDS.external_presenter_name || "Palestrante";
        // Resolve municipality: prioritize the DDS record's environment, fallback to the active session environment
        const ddsEnvId = (todayDDS.environment as "barcarena" | "paragominas" | undefined) || envInfo?.id;
        const envLabel = ddsEnvId && ENVIRONMENTS[ddsEnvId] ? ENVIRONMENTS[ddsEnvId].label : "";
        if (!envLabel) {
          toast.error("Não foi possível identificar o município (Barcarena/Paragominas) deste DDS. A foto foi salva, mas o post no InstaCena foi cancelado.");
        } else {
          await supabase.from("instacena_posts").insert({
            user_id: profile.user_id,
            user_name: profile.full_name,
            user_avatar_url: profile.avatar_url,
            content: `📸 Registro do DDS de hoje!\n\n📍 Local: ${envLabel}\n📋 Tema: ${todayDDS.theme}\n🎤 Palestrante: ${presenterName}`,
            image_urls: [urlData.publicUrl],
            is_system_post: false,
          });
        }
      }
    } catch (error) {
      console.error("Error uploading event photo:", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setIsUploadingEvent(false);
      if (eventFileInputRef.current) eventFileInputRef.current.value = "";
    }
  };

  if (loadingToday && loadingTomorrow) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!todayDDS && !tomorrowDDS) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Today's DDS */}
      <Card className="overflow-hidden backdrop-blur-xl bg-gradient-to-br from-slate-100/40 to-blue-100/30 dark:from-slate-900/15 dark:to-blue-900/10 border border-slate-200/40 dark:border-slate-700/30 shadow-[0_4px_30px_-6px_hsl(220_40%_40%/0.15)] dark:shadow-[0_4px_30px_-6px_hsl(220_40%_40%/0.1)] glass-card-dashboard">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sun className="h-5 w-5 text-slate-500" />
            DDS de Hoje
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayDDS ? (
            <div className="space-y-4">
              {/* Presenter Info */}
              <div className="flex items-center gap-4">
                {todayDDS.presenter ? (
                  <>
                    <NeonAvatar
                      src={todayDDS.presenter.avatar_url}
                      name={todayDDS.presenter.full_name || "Palestrante"}
                      frameColor={todayDDS.presenter.frame_color}
                      neonColor={todayDDS.presenter.neon_color}
                      frameAnimation={todayDDS.presenter.frame_animation}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">
                        {todayDDS.presenter.full_name || "Palestrante"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCargoLabel(todayDDS.presenter.cargo)}
                      </p>
                    </div>
                  </>
                ) : todayDDS.external_presenter_name ? (
                  <>
                    <Avatar className="h-16 w-16 border-4 border-slate-200 dark:border-slate-700">
                      <AvatarFallback className="bg-gradient-to-br from-slate-400 to-blue-500 text-white text-lg font-bold">
                        {getInitials(todayDDS.external_presenter_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">
                        {todayDDS.external_presenter_name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <UserPlus className="h-3 w-3" />
                        Palestrante externo
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate text-muted-foreground">
                      Palestrante não definido
                    </h3>
                  </div>
                )}
              </div>

              {/* Theme */}
              <div className="p-3 bg-white/40 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-slate-200/30 dark:border-slate-700/20">
                <p className="text-sm text-muted-foreground mb-1">Tema do dia</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  📋 {todayDDS.theme}
                </p>
              </div>


              {/* Event Photo Section (goes to InstaCena) */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">📸 Registro do DDS</p>
                {(todayDDS as any).event_photo_url ? (
                  <div className="relative rounded-lg overflow-hidden group">
                    <div className="cursor-pointer" onClick={() => setEventPhotoModalOpen(true)}>
                      <img loading="lazy" decoding="async" src={(todayDDS as any).event_photo_url} alt="Registro do DDS" className="w-full h-72 md:h-80 object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full">Clique para ampliar</span>
                      </div>
                    </div>
                    {canUploadPhoto && (
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={async (e) => { e.stopPropagation(); if (confirm("Remover registro?")) { await updateEventPhoto.mutateAsync({ id: todayDDS.id, event_photo_url: null }); toast.success("Registro removido!"); } }}
                        title="Remover registro"><X className="h-4 w-4" /></Button>
                    )}
                  </div>
                ) : canUploadPhoto ? (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3">
                    <input ref={eventFileInputRef} type="file" accept="image/*" onChange={handleEventPhotoUpload} className="hidden" id="dds-event-upload" />
                    <label htmlFor="dds-event-upload" className="flex flex-col items-center gap-1 cursor-pointer">
                      {isUploadingEvent ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground">{isUploadingEvent ? "Enviando..." : "Registro (vai para InstaCena)"}</span>
                    </label>
                  </div>
                ) : null}
              </div>

              {/* Participation List Button */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setParticipationOpen(true)}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Ver Lista de Presença
                </Button>
                <div className="relative">
                  <input
                    type="date"
                    value={historicalDate}
                    onChange={(e) => {
                      setHistoricalDate(e.target.value);
                      if (e.target.value) setHistoricalOpen(true);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="dds-date-filter"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="pointer-events-none"
                    title="Filtrar por data"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <DDSParticipationDialog
                open={participationOpen}
                onOpenChange={setParticipationOpen}
                date={todayDDS.scheduled_date}
              />

              {historicalDate && (
                <DDSParticipationDialog
                  open={historicalOpen}
                  onOpenChange={(open) => {
                    setHistoricalOpen(open);
                    if (!open) setHistoricalDate("");
                  }}
                  date={historicalDate}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum DDS agendado para hoje</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tomorrow's DDS */}
      <Card className="overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-100/40 to-indigo-100/30 dark:from-blue-900/15 dark:to-indigo-900/10 border border-blue-200/40 dark:border-blue-700/30 shadow-[0_4px_30px_-6px_hsl(220_80%_50%/0.15)] dark:shadow-[0_4px_30px_-6px_hsl(220_80%_50%/0.1)] glass-card-dashboard">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRight className="h-5 w-5 text-blue-500" />
            DDS de Amanhã
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {format(tomorrow, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
            {tomorrowDDS ? (
            <div className="space-y-4">
              {/* Presenter Info */}
              <div className="flex items-center gap-4">
                {tomorrowDDS.presenter ? (
                  <>
                    <NeonAvatar
                      src={tomorrowDDS.presenter.avatar_url}
                      name={tomorrowDDS.presenter.full_name || "Palestrante"}
                      frameColor={tomorrowDDS.presenter.frame_color}
                      neonColor={tomorrowDDS.presenter.neon_color}
                      frameAnimation={tomorrowDDS.presenter.frame_animation}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">
                        {tomorrowDDS.presenter.full_name || "Palestrante"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCargoLabel(tomorrowDDS.presenter.cargo)}
                      </p>
                    </div>
                  </>
                ) : tomorrowDDS.external_presenter_name ? (
                  <>
                    <Avatar className="h-16 w-16 border-4 border-blue-200 dark:border-blue-700">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-lg font-bold">
                        {getInitials(tomorrowDDS.external_presenter_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">
                        {tomorrowDDS.external_presenter_name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <UserPlus className="h-3 w-3" />
                        Palestrante externo
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate text-muted-foreground">
                      Palestrante não definido
                    </h3>
                  </div>
                )}
              </div>

              {/* Theme */}
              <div className="p-3 bg-white/40 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-blue-200/30 dark:border-blue-700/20 relative">
                <p className="text-sm text-muted-foreground mb-1">Tema agendado</p>
                <p className="font-semibold text-blue-800 dark:text-blue-200 pr-8">
                  📋 {tomorrowDDS.theme}
                </p>
                {tomorrowDDS.presenter_user_id === profile?.user_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 text-blue-600 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/40"
                    onClick={() => { setThemeDraft(tomorrowDDS.theme); setThemeEditOpen(true); }}
                    title="Editar tema"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Preview notice */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  Próximo
                </span>
                <span>Prepare-se para o DDS de amanhã!</span>
              </div>
            </div>
          ) : isFriday ? (
            <div className="-mx-6 -mb-6">
              <video
                src={sextouVideo.url}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="Sextou! Descanso merecido — segurança em primeiro lugar"
                className="w-full h-auto object-cover rounded-b-xl"
              />
            </div>

          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum DDS agendado para amanhã</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none">
          <DialogTitle className="sr-only">Foto do DDS de Hoje</DialogTitle>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setPhotoModalOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            {todayDDS?.photo_url && (
              <img loading="lazy" decoding="async"
                src={todayDDS.photo_url}
                alt="Foto do DDS de hoje"
                className="w-full max-h-[80vh] object-contain"
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-white text-center">
                <span className="font-semibold">{format(today, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                {todayDDS?.theme && (
                  <span className="block text-sm text-white/80 mt-1">📋 {todayDDS.theme}</span>
                )}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Photo Modal */}
      <Dialog open={eventPhotoModalOpen} onOpenChange={setEventPhotoModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none">
          <DialogTitle className="sr-only">Registro do DDS de Hoje</DialogTitle>
          <div className="relative">
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10 text-white hover:bg-white/20" onClick={() => setEventPhotoModalOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
            {(todayDDS as any)?.event_photo_url && (
              <img loading="lazy" decoding="async" src={(todayDDS as any).event_photo_url} alt="Registro do DDS" className="w-full max-h-[80vh] object-contain" />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-white text-center">
                <span className="font-semibold">📸 Registro do DDS - {format(today, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Theme Dialog (only for mentioned presenter of tomorrow's DDS) */}
      <Dialog open={themeEditOpen} onOpenChange={setThemeEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar tema do DDS de amanhã</DialogTitle>
          </DialogHeader>
          <Textarea
            value={themeDraft}
            onChange={(e) => setThemeDraft(e.target.value)}
            rows={4}
            placeholder="Digite o tema do DDS"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setThemeEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!tomorrowDDS || !themeDraft.trim()) return;
                try {
                  await updateSchedule.mutateAsync({
                    id: tomorrowDDS.id,
                    presenter_user_id: tomorrowDDS.presenter_user_id,
                    external_presenter_name: tomorrowDDS.external_presenter_name,
                    theme: themeDraft.trim(),
                  });
                  toast.success("Tema atualizado!");
                  setThemeEditOpen(false);
                } catch (err) {
                  console.error(err);
                  toast.error("Erro ao atualizar tema");
                }
              }}
              disabled={updateSchedule.isPending || !themeDraft.trim()}
            >
              {updateSchedule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
