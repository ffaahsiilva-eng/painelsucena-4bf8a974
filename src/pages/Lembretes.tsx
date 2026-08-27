import { useState, useEffect } from "react";
import { DeleteConfirmation } from "@/components/ui/DeleteConfirmation";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "next-themes";
import { Bell, Plus, Trash2, Users, User, Globe, Calendar, Clock, AlertCircle, Repeat, Filter, Pencil, LayoutGrid, List } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useReminders, useCreateReminder, useDeleteReminder, useReminderHistory, Reminder } from "@/hooks/useReminders";
import { useAllProfiles } from "@/hooks/useDDSSchedule";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getDaysUntilEventBrazilNorth, parseDateForBrazilNorth } from "@/lib/timezone";
import { Check, X as XIcon, History } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EditReminderDialog } from "@/components/reminders/EditReminderDialog";

const WEEKDAYS = [
  { value: 0, label: "Dom", fullLabel: "Domingo" },
  { value: 1, label: "Seg", fullLabel: "Segunda" },
  { value: 2, label: "Ter", fullLabel: "Terça" },
  { value: 3, label: "Qua", fullLabel: "Quarta" },
  { value: 4, label: "Qui", fullLabel: "Quinta" },
  { value: 5, label: "Sex", fullLabel: "Sexta" },
  { value: 6, label: "Sáb", fullLabel: "Sábado" },
];

const Lembretes = () => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const { toast } = useToast();
  const { user } = useAuth();
  const { environment } = useEnvironment();
  const { data: reminders, isLoading } = useReminders();
  const { data: reminderHistory, isLoading: isLoadingHistory } = useReminderHistory();
  const { data: allProfiles } = useAllProfiles();
  const createReminder = useCreateReminder();
  const deleteReminder = useDeleteReminder();


  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [alertDaysBefore, setAlertDaysBefore] = useState(0);
  const [showOnEventDay, setShowOnEventDay] = useState(true);
  const [mentionType, setMentionType] = useState<"all" | "specific" | "me">("me");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreatedToast, setShowCreatedToast] = useState<Reminder | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showHistoryFilter, setShowHistoryFilter] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [filterCategory, setFilterCategory] = useState<"all" | "me" | "specific" | "everyone" | "recurring">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem("lembretes_view_mode") as "grid" | "list") || "grid";
  });

  useEffect(() => {
    try { localStorage.setItem("lembretes_view_mode", viewMode); } catch {}
  }, [viewMode]);

  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  const handleCreate = async () => {
    if (!title) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título do lembrete.",
        variant: "destructive",
      });
      return;
    }

    if (!isRecurring && !eventDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a data do evento ou selecione dias da semana.",
        variant: "destructive",
      });
      return;
    }

    if (isRecurring && recurringDays.length === 0) {
      toast({
        title: "Selecione os dias",
        description: "Escolha pelo menos um dia da semana para o lembrete recorrente.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newReminder = await createReminder.mutateAsync({
        title,
        description: description || undefined,
        event_date: isRecurring ? new Date().toISOString().split('T')[0] : eventDate,
        event_time: eventTime || null,
        alert_days_before: isRecurring ? 0 : alertDaysBefore,
        show_on_event_day: isRecurring ? true : showOnEventDay,
        mention_type: mentionType,
        mentioned_users: mentionType === "specific" ? selectedUsers : [],
        is_recurring: isRecurring,
        recurring_days: isRecurring ? recurringDays : [],
      });

      // Show toast for 3 seconds with reminder info
      setShowCreatedToast(newReminder);
      setTimeout(() => setShowCreatedToast(null), 3000);

      // Reset form
      setTitle("");
      setDescription("");
      setEventDate("");
      setEventTime("");
      setAlertDaysBefore(0);
      setShowOnEventDay(true);
      setMentionType("me");
      setSelectedUsers([]);
      setIsRecurring(false);
      setRecurringDays([]);
      setIsOpen(false);

      const displayInfo = isRecurring 
        ? `Toda ${recurringDays.map(d => WEEKDAYS.find(w => w.value === d)?.fullLabel).join(", ")}`
        : format(parseDateForBrazilNorth(eventDate), "dd/MM/yyyy", { locale: ptBR });

      toast({
        title: "Lembrete criado!",
        description: `"${title}" - ${displayInfo}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao criar lembrete",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (reminder: Reminder) => {
    try {
      await deleteReminder.mutateAsync(reminder);
      toast({
        title: "Lembrete removido",
      });
    } catch (error) {
      toast({
        title: "Erro ao remover",
        variant: "destructive",
      });
    }
  };

  const getMentionLabel = (type: string) => {
    switch (type) {
      case "all":
        return { label: "Todos", icon: Globe, color: "bg-blue-500/20 text-blue-400" };
      case "specific":
        return { label: "Específicos", icon: Users, color: "bg-purple-500/20 text-purple-400" };
      case "me":
        return { label: "Somente eu", icon: User, color: "bg-green-500/20 text-green-400" };
      default:
        return { label: type, icon: User, color: "bg-muted" };
    }
  };

  // Use Brazil North timezone for date calculations
  const getDaysUntilEvent = (dateStr: string) => {
    return getDaysUntilEventBrazilNorth(dateStr);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Filter reminders by selected category
  const filteredReminders = reminders?.filter((r) => {
    if (filterCategory === "all") return true;
    if (filterCategory === "recurring") return !!r.is_recurring;
    if (filterCategory === "me") return r.mention_type === "me";
    if (filterCategory === "specific") return r.mention_type === "specific";
    if (filterCategory === "everyone") return r.mention_type === "all";
    return true;
  }) || [];

  // Group reminders by upcoming/recurring and past (recurring reminders are always "upcoming")
  const upcomingReminders = filteredReminders
    .filter((r) => !!r.is_recurring || getDaysUntilEvent(r.event_date) >= 0)
    .sort((a, b) => {
      // Recurring first, then by closest event date
      if (!!a.is_recurring && !b.is_recurring) return -1;
      if (!a.is_recurring && !!b.is_recurring) return 1;
      if (a.is_recurring && b.is_recurring) {
        return (a.title || "").localeCompare(b.title || "");
      }
      return a.event_date.localeCompare(b.event_date);
    });
  const pastReminders = filteredReminders
    .filter((r) => !r.is_recurring && getDaysUntilEvent(r.event_date) < 0)
    .sort((a, b) => b.event_date.localeCompare(a.event_date));

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Created Toast Banner */}
        {showCreatedToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 w-[90vw] max-w-md">
            <Card className="bg-primary/90 text-primary-foreground shadow-2xl border-0">
              <CardContent className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                <div className="p-2 rounded-full bg-white/20 shrink-0">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm sm:text-base">Lembrete criado!</p>
                  <p className="text-xs sm:text-sm opacity-90 truncate">
                    "{showCreatedToast.title}" - {!!showCreatedToast.is_recurring 
                      ? `Toda ${(showCreatedToast.recurring_days || []).map(d => WEEKDAYS.find(w => w.value === d)?.fullLabel).join(", ")}`
                      : format(parseDateForBrazilNorth(showCreatedToast.event_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div>
            <EditablePageTitle pageKey="lembretes" defaultValue="Lembretes" className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-foreground" style={{ color: isLight ? "#000000" : "#ffffff" }} />
            <p className="text-sm text-muted-foreground" style={{ color: isLight ? "#000000" : "#ffffff" }}>
              Crie lembretes e mencione usuários
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Novo Lembrete
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Lembrete</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Reunião de equipe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalhes do lembrete..."
                    rows={3}
                  />
                </div>

                <Separator />

                {/* Recurring vs Single Event Toggle */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="recurring" className="flex items-center gap-2">
                        <Repeat className="h-4 w-4" />
                        Lembrete Recorrente
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Repetir em dias específicos da semana
                      </p>
                    </div>
                    <Switch
                      id="recurring"
                      checked={isRecurring}
                      onCheckedChange={(checked) => {
                        setIsRecurring(checked);
                        if (checked) {
                          setEventDate("");
                          setAlertDaysBefore(0);
                        } else {
                          setRecurringDays([]);
                        }
                      }}
                    />
                  </div>

                  {isRecurring ? (
                    <div className="space-y-3">
                      <Label>Dias da Semana</Label>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              setRecurringDays(prev => 
                                prev.includes(day.value)
                                  ? prev.filter(d => d !== day.value)
                                  : [...prev, day.value].sort()
                              );
                            }}
                            className={cn(
                              "w-11 h-11 rounded-full text-sm font-medium transition-all",
                              "border-2",
                              recurringDays.includes(day.value)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:border-primary/50"
                            )}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                      {recurringDays.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Lembrete ativo: {recurringDays.map(d => WEEKDAYS.find(w => w.value === d)?.fullLabel).join(", ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="eventDate">Data do Evento *</Label>
                        <Input
                          id="eventDate"
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="eventTime">Hora do Evento (opcional)</Label>
                        <Input
                          id="eventTime"
                          type="time"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          placeholder="HH:mm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Deixe em branco se não houver horário específico
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <Label className="text-base font-semibold">Configuração de Alerta</Label>
                        
                        <div className="space-y-2">
                          <Label htmlFor="alertDays">Mostrar alerta (dias antes)</Label>
                          <Select
                            value={alertDaysBefore.toString()}
                            onValueChange={(v) => setAlertDaysBefore(parseInt(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Não mostrar antes</SelectItem>
                              <SelectItem value="1">1 dia antes</SelectItem>
                              <SelectItem value="2">2 dias antes</SelectItem>
                              <SelectItem value="3">3 dias antes</SelectItem>
                              <SelectItem value="5">5 dias antes</SelectItem>
                              <SelectItem value="7">7 dias antes</SelectItem>
                              <SelectItem value="14">14 dias antes</SelectItem>
                              <SelectItem value="30">30 dias antes</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            O lembrete será fixado no topo da tela de Destaques
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showOnDay">Alerta no dia do evento</Label>
                            <p className="text-xs text-muted-foreground">
                              Mostrar alerta especial no dia
                            </p>
                          </div>
                          <Switch
                            id="showOnDay"
                            checked={showOnEventDay}
                            onCheckedChange={setShowOnEventDay}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Quem será notificado?</Label>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={mentionType === "me" ? "default" : "outline"}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                      onClick={() => setMentionType("me")}
                    >
                      <User className="h-5 w-5" />
                      <span className="text-xs">Só eu</span>
                    </Button>
                    <Button
                      type="button"
                      variant={mentionType === "all" ? "default" : "outline"}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                      onClick={() => setMentionType("all")}
                    >
                      <Globe className="h-5 w-5" />
                      <span className="text-xs">Todos</span>
                    </Button>
                    <Button
                      type="button"
                      variant={mentionType === "specific" ? "default" : "outline"}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                      onClick={() => setMentionType("specific")}
                    >
                      <Users className="h-5 w-5" />
                      <span className="text-xs">Específicos</span>
                    </Button>
                  </div>

                  {mentionType === "specific" && (
                    <div className="space-y-2">
                      <Label>Selecione os usuários</Label>
                      <ScrollArea className="h-48 rounded-md border p-2">
                        <div className="space-y-2">
                          {allProfiles
                            ?.filter(p => p.user_id !== user?.id)
                            .map((profile) => (
                            <div
                              key={profile.user_id}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                selectedUsers.includes(profile.user_id)
                                  ? "bg-primary/20"
                                  : "hover:bg-muted"
                              )}
                              onClick={() => toggleUserSelection(profile.user_id)}
                            >
                              <Checkbox
                                checked={selectedUsers.includes(profile.user_id)}
                                onCheckedChange={() => toggleUserSelection(profile.user_id)}
                              />
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={profile.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(profile.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {profile.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {profile.cargo}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      {selectedUsers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedUsers.length} usuário(s) selecionado(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={createReminder.isPending}
                >
                  {createReminder.isPending ? "Criando..." : "Criar Lembrete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filtrar por:</span>
            </div>
            <div className="flex items-center gap-1 border border-border/60 rounded-md p-0.5 bg-muted/30">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-7 px-2 gap-1.5"
                title="Visualizar em grade"
                aria-label="Visualizar em grade"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Grade</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-7 px-2 gap-1.5"
                title="Visualizar em lista"
                aria-label="Visualizar em lista"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Lista</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory("all")}
              className="gap-1.5"
            >
              <Bell className="h-4 w-4" />
              Todos
              {reminders && (
                <Badge variant="secondary" className="ml-1 text-xs">{reminders.length}</Badge>
              )}
            </Button>
            <Button
              variant={filterCategory === "me" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory("me")}
              className="gap-1.5"
            >
              <User className="h-4 w-4" />
              Só eu
            </Button>
            <Button
              variant={filterCategory === "everyone" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory("everyone")}
              className="gap-1.5"
            >
              <Globe className="h-4 w-4" />
              Todos os usuários
            </Button>
            <Button
              variant={filterCategory === "specific" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory("specific")}
              className="gap-1.5"
            >
              <Users className="h-4 w-4" />
              Específicos
            </Button>
            <Button
              variant={filterCategory === "recurring" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory("recurring")}
              className="gap-1.5"
            >
              <Repeat className="h-4 w-4" />
              Recorrentes
            </Button>
          </div>
        </div>

        {/* Reminders List */}
        <div className="space-y-8">
          {/* Upcoming */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Próximos Lembretes
              {upcomingReminders.length > 0 && (
                <Badge variant="secondary" className="ml-2">{upcomingReminders.length}</Badge>
              )}
            </h2>
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : upcomingReminders.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {filterCategory === "all" 
                      ? "Nenhum lembrete agendado" 
                      : "Nenhum lembrete encontrado para este filtro"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className={cn(
                viewMode === "grid"
                  ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-3"
              )}>
                {upcomingReminders.map((reminder) => {
                  const daysUntil = getDaysUntilEvent(reminder.event_date);
                  const mentionInfo = getMentionLabel(reminder.mention_type);
                  const MentionIcon = mentionInfo.icon;
                  const isToday = daysUntil === 0;
                  const isUrgent = daysUntil <= 3;

                  return (
                    <Card
                      key={reminder.id}
                      className={cn(
                        "relative overflow-hidden transition-all",
                        isToday && "ring-2 ring-primary",
                        isUrgent && !isToday && "ring-1 ring-orange-500/50"
                      )}
                    >
                      {isToday && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">
                              {reminder.title}
                            </CardTitle>
                            {reminder.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {reminder.description}
                              </p>
                            )}
                          </div>
                          {reminder.created_by === user?.id && (
                            <div className="flex items-center gap-1">
                              <EditReminderDialog reminder={reminder} />
                               <DeleteConfirmation
                                 onConfirm={() => handleDelete(reminder)}
                               />
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {!!reminder.is_recurring && (reminder.recurring_days?.length ?? 0) > 0 ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Repeat className="h-4 w-4 text-primary" />
                            <span>
                              {(reminder.recurring_days || []).map(d => WEEKDAYS.find(w => w.value === d)?.fullLabel).join(", ")}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {format(parseDateForBrazilNorth(reminder.event_date), "dd 'de' MMMM 'de' yyyy", {
                                locale: ptBR,
                              })}
                              {reminder.event_time && ` às ${reminder.event_time.slice(0, 5)}`}
                            </span>
                          </div>
                        )}

                        {/* Show creator for "all" or "specific" reminders */}
                        {(reminder.mention_type === "all" || reminder.mention_type === "specific") && reminder.creator_name && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>Criado por: <span className="font-medium text-foreground/80">{reminder.creator_name}</span></span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          {!!reminder.is_recurring ? (
                            <Badge variant="default" className="gap-1 bg-primary/20 text-primary">
                              <Repeat className="h-3 w-3" />
                              Recorrente
                            </Badge>
                          ) : isToday ? (
                            <Badge variant="default" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Hoje!
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className={cn(isUrgent && "bg-orange-500/20 text-orange-400")}
                            >
                              {daysUntil === 1 ? "Amanhã" : `Em ${daysUntil} dias`}
                            </Badge>
                          )}
                          <Badge className={cn("gap-1", mentionInfo.color)}>
                            <MentionIcon className="h-3 w-3" />
                            {mentionInfo.label}
                          </Badge>
                        </div>

                        {!reminder.is_recurring && reminder.alert_days_before > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Alerta {reminder.alert_days_before} dia(s) antes
                          </div>
                        )}

                        {reminder.created_at && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/40 pt-2">
                            <Pencil className="h-3 w-3" />
                            <span>
                              Marcado em {format(new Date(reminder.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past */}
          {pastReminders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                Lembretes Passados
              </h2>
              <div className={cn(
                "opacity-60",
                viewMode === "grid"
                  ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-3"
              )}>
                {pastReminders.slice(0, 6).map((reminder) => {
                  const mentionInfo = getMentionLabel(reminder.mention_type);
                  const MentionIcon = mentionInfo.icon;

                  return (
                    <Card key={reminder.id} className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base truncate line-through decoration-muted-foreground/50">
                            {reminder.title}
                          </CardTitle>
                          {reminder.created_by === user?.id && (
                            <div className="flex items-center gap-1">
                              <EditReminderDialog reminder={reminder} />
                               <DeleteConfirmation
                                 onConfirm={() => handleDelete(reminder)}
                               />
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(parseDateForBrazilNorth(reminder.event_date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <Badge className={cn("gap-1", mentionInfo.color)} variant="outline">
                          <MentionIcon className="h-3 w-3" />
                          {mentionInfo.label}
                        </Badge>
                        {reminder.created_at && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/40 pt-2">
                            <Pencil className="h-3 w-3" />
                            <span>
                              Marcado em {format(new Date(reminder.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* HISTORY SECTION */}
          {reminderHistory && reminderHistory.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-muted-foreground">Histórico de Ações</h3>
                <Badge variant="secondary">{reminderHistory.length}</Badge>
              </div>

              {/* Date filter */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant={showHistoryFilter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowHistoryFilter(!showHistoryFilter)}
                  className="gap-1.5"
                >
                  <Filter className="h-4 w-4" />
                  Filtrar
                </Button>
                {showHistoryFilter && (
                  <>
                    <Input
                      type="date"
                      value={historyDateFilter}
                      onChange={(e) => setHistoryDateFilter(e.target.value)}
                      className="w-auto"
                    />
                    {historyDateFilter !== format(new Date(), "yyyy-MM-dd") && historyDateFilter && (
                      <Button variant="ghost" size="sm" onClick={() => setHistoryDateFilter(format(new Date(), "yyyy-MM-dd"))}>
                        <XIcon className="h-4 w-4" />
                        Hoje
                      </Button>
                    )}
                  </>
                )}
              </div>

              {(() => {
                // Filter by date if set
                const filtered = historyDateFilter
                  ? reminderHistory.filter((item) => {
                      const itemDate = format(new Date(item.created_at), "yyyy-MM-dd");
                      return itemDate === historyDateFilter;
                    })
                  : reminderHistory;

                // Group by date
                const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, item) => {
                  const dateKey = format(new Date(item.created_at), "yyyy-MM-dd");
                  if (!acc[dateKey]) acc[dateKey] = [];
                  acc[dateKey].push(item);
                  return acc;
                }, {});

                const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

                if (sortedDates.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum registro encontrado para esta data.
                    </p>
                  );
                }

                return sortedDates.map((dateKey) => (
                  <div key={dateKey} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Separator className="flex-1" />
                      <span className="text-xs font-semibold text-muted-foreground px-2 whitespace-nowrap">
                        {format(new Date(dateKey + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                      </span>
                      <Separator className="flex-1" />
                    </div>
                    <div className="space-y-2">
                      {grouped[dateKey].map((item) => {
                        const profile = allProfiles?.find(p => p.user_id === item.action_by);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-1.5 rounded-full",
                                item.action === "acknowledged" 
                                  ? "bg-green-500/20 text-green-500" 
                                  : "bg-destructive/20 text-destructive"
                              )}>
                                {item.action === "acknowledged" ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <XIcon className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{item.reminder_title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>
                                    {item.action === "acknowledged" ? "Visto por" : "Cancelado por"}{" "}
                                    {profile?.full_name || "Usuário"}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {format(new Date(item.created_at), "HH:mm")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                item.action === "acknowledged" 
                                  ? "border-green-500/50 text-green-500" 
                                  : "border-destructive/50 text-destructive"
                              )}
                            >
                              {item.action === "acknowledged" ? "Visto" : "Cancelado"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Lembretes;
