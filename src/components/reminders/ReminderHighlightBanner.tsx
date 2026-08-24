import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, AlertCircle, Calendar, Users, User, Globe, Check, X, AlertTriangle, UserCircle, Clock } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useActiveReminders, useAcknowledgeReminder, useDeleteReminder, useSnoozeReminder, Reminder } from "@/hooks/useReminders";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { getDaysUntilEventBrazilNorth, parseDateForBrazilNorth } from "@/lib/timezone";
import { toast } from "sonner";
import { ReminderDetailDialog } from "./ReminderDetailDialog";
import { playSoundFile } from "@/lib/sounds";

// Play alert sound for today's reminders
const playAlertSound = () => {
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (error) {
    console.error("Error playing alert sound:", error);
  }
};

export const ReminderHighlightBanner = () => {
  const { user } = useAuth();
  const { data: activeReminders, isLoading } = useActiveReminders();
  const acknowledgeReminder = useAcknowledgeReminder();
  const deleteReminder = useDeleteReminder();
  const snoozeReminder = useSnoozeReminder();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [hasPlayedSound, setHasPlayedSound] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [snoozeOpenId, setSnoozeOpenId] = useState<string | null>(null);

  const visibleReminders = useMemo(() => {
    return activeReminders?.filter((r) => !dismissedIds.has(r.id)) || [];
  }, [activeReminders, dismissedIds]);

  // Use Brazil North timezone for date calculations
  const getDaysUntilEvent = (dateStr: string) => {
    return getDaysUntilEventBrazilNorth(dateStr);
  };

  // Check if a reminder is active "today" (either regular reminder for today OR recurring on current day)
  const isReminderForToday = (reminder: Reminder): boolean => {
    // Recurring reminders that passed the filter are always "today"
    if (!!reminder.is_recurring && (reminder.recurring_days?.length ?? 0) > 0) {
      return true;
    }
    // Regular reminders check event_date
    return getDaysUntilEvent(reminder.event_date) === 0;
  };

  // Separate today's reminders from upcoming ones
  const todayReminders = useMemo(() => {
    return visibleReminders.filter((r) => isReminderForToday(r));
  }, [visibleReminders]);

  const upcomingReminders = useMemo(() => {
    return visibleReminders.filter((r) => !isReminderForToday(r) && getDaysUntilEvent(r.event_date) > 0);
  }, [visibleReminders]);

  // Play sound once when there are today's reminders
  useEffect(() => {
    if (todayReminders.length > 0 && !hasPlayedSound) {
      playAlertSound();
      setHasPlayedSound(true);
    }
  }, [todayReminders.length, hasPlayedSound]);

  const handleAcknowledge = async (reminder: Reminder) => {
    try {
      await acknowledgeReminder.mutateAsync(reminder);
      setDismissedIds((prev) => new Set([...prev, reminder.id]));
      setDetailDialogOpen(false);
      setSelectedReminder(null);
      toast.success("Lembrete marcado como visto!");
    } catch (error: any) {
      console.error("Erro ao marcar lembrete como visto:", error?.message || error);
      toast.error("Erro ao marcar lembrete como visto");
    }
  };

  const handleCancel = async (reminder: Reminder) => {
    if (user?.id !== reminder.created_by) {
      toast.error("Apenas o criador pode cancelar este lembrete");
      return;
    }
    try {
      await deleteReminder.mutateAsync(reminder);
      setDetailDialogOpen(false);
      setSelectedReminder(null);
      toast.success("Lembrete cancelado!");
    } catch (error) {
      toast.error("Erro ao cancelar lembrete");
    }
  };

  const handleOpenDetail = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setDetailDialogOpen(true);
    playSoundFile("/sounds/pop.mp3");
  };

  const handleSnooze = async (reminderId: string, date: Date) => {
    try {
      const snoozedUntil = format(date, "yyyy-MM-dd");
      await snoozeReminder.mutateAsync({ reminderId, snoozedUntil });
      setDismissedIds((prev) => new Set([...prev, reminderId]));
      setSnoozeOpenId(null);
      toast.success(`Lembrete adiado até ${format(date, "dd/MM/yyyy")}`);
    } catch (error) {
      toast.error("Erro ao adiar lembrete");
    }
  };

  if (isLoading || visibleReminders.length === 0) {
    return null;
  }

  const getMentionIcon = (type: string) => {
    switch (type) {
      case "all":
        return Globe;
      case "specific":
        return Users;
      default:
        return User;
    }
  };

  const renderReminderCard = (reminder: Reminder, showDate: boolean) => {
    const MentionIcon = getMentionIcon(reminder.mention_type);
    const isCreator = user?.id === reminder.created_by;
    const daysUntil = getDaysUntilEvent(reminder.event_date);
    return (
      <div
        key={reminder.id}
        className="reminder-neon-card relative overflow-visible flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 sm:p-4 rounded-2xl cursor-pointer w-full box-border"
        onClick={() => handleOpenDetail(reminder)}
      >
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full">
          <div className="reminder-neon-icon flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-red-500" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="reminder-red-pulse font-bold text-base sm:text-lg text-red-500 uppercase tracking-wide break-words whitespace-normal overflow-wrap-anywhere">
              {reminder.title}
            </p>
            {reminder.description && (
              <p className="text-sm text-white/85 mt-1 whitespace-normal break-words overflow-wrap-anywhere leading-relaxed">
                {reminder.description}
              </p>
            )}
            <div className="flex items-center gap-x-3 gap-y-1.5 mt-2.5 flex-wrap text-xs text-white/80">
              {showDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-red-400" />
                  <span className="whitespace-nowrap">
                    {format(parseDateForBrazilNorth(reminder.event_date), "dd 'de' MMM", { locale: ptBR })}
                    {reminder.event_time && <span className="ml-1">às {reminder.event_time.slice(0, 5)}</span>}
                    {daysUntil > 0 && <span className="ml-1 text-red-300">• {daysUntil === 1 ? "Amanhã" : `${daysUntil}d`}</span>}
                  </span>
                </div>
              )}
              {!showDate && reminder.event_time && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-red-400" />
                  <span className="whitespace-nowrap">às <span className="font-semibold">{reminder.event_time.slice(0, 5)}</span></span>
                </div>
              )}
              {(reminder.mention_type === "all" || reminder.mention_type === "specific") && reminder.creator_name && (
                <div className="flex items-center gap-1.5">
                  <UserCircle className="h-3.5 w-3.5 text-white/80" />
                  <span className="truncate max-w-[150px]">Por: <span className="font-semibold">{reminder.creator_name}</span></span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <MentionIcon className="h-3.5 w-3.5 text-white/80" />
                <span>
                  {reminder.mention_type === "all"
                    ? "Todos"
                    : reminder.mention_type === "me"
                    ? "Pessoal"
                    : "Mencionado"}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t border-white/5 md:border-t-0">
          <div className="flex-1 md:flex-initial">
            <Popover open={snoozeOpenId === reminder.id} onOpenChange={(open) => setSnoozeOpenId(open ? reminder.id : null)}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="reminder-neon-btn-ghost h-10 md:h-9 w-full md:px-4 gap-1.5 rounded-xl md:rounded-full font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Clock className="h-4 w-4" />
                  Adiar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
                <CalendarComponent
                  mode="single"
                  selected={undefined}
                  onSelect={(date) => { if (date) handleSnooze(reminder.id, date); }}
                  disabled={(date) => date <= new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex-1 md:flex-initial">
            <Button
              size="sm"
              variant="ghost"
              className="reminder-neon-btn-primary h-10 md:h-9 w-full md:px-4 gap-1.5 rounded-xl md:rounded-full font-bold"
              onClick={(e) => { e.stopPropagation(); handleAcknowledge(reminder); }}
              disabled={acknowledgeReminder.isPending}
            >
              <Check className="h-4 w-4" />
              Visto
            </Button>
          </div>
          
          {isCreator && (
            <Button
              size="sm"
              variant="ghost"
              className="h-10 w-10 md:h-9 md:w-9 p-0 flex-shrink-0 rounded-xl md:rounded-full text-white/60 hover:text-red-400 hover:bg-red-500/10"
              onClick={(e) => { e.stopPropagation(); handleCancel(reminder); }}
              disabled={deleteReminder.isPending}
              title="Cancelar lembrete"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (title: string, items: Reminder[], showDate: boolean) => {
    const isToday = title === "Lembretes de Hoje!";
    return (
      <div className="reminder-section-entrance relative overflow-visible animate-in fade-in slide-in-from-top-4 duration-500 w-full">
        <div className="reminder-neon-shell relative overflow-visible rounded-2xl sm:rounded-3xl p-3 sm:p-5 space-y-4 w-full box-border glass-card-dashboard">
          <div className="flex items-center justify-between gap-3 px-1 py-1 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Bell className={cn("h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]", isToday && "animate-pulse")} />
              <h3 className={cn("font-bold text-base sm:text-xl text-white tracking-tight truncate", isToday ? "reminder-title-pulse" : "drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]")}>
                {title}
              </h3>
            </div>
            <span className="reminder-neon-pill px-3 sm:px-4 py-1 rounded-full text-[10px] sm:text-xs font-bold text-white whitespace-nowrap bg-red-500/20 border border-red-500/30">
              {items.length} {items.length === 1 ? "lembrete" : "lembretes"}
            </span>
          </div>
          <div className="space-y-4 w-full">
            {items.map((r) => renderReminderCard(r, showDate))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 mb-6">
      {todayReminders.length > 0 && renderSection("Lembretes de Hoje!", todayReminders, false)}
      {upcomingReminders.length > 0 && renderSection("Próximos Lembretes", upcomingReminders, true)}


      {/* Reminder Detail Dialog */}
      <ReminderDetailDialog
        reminder={selectedReminder}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onAcknowledge={handleAcknowledge}
        onCancel={handleCancel}
        isAcknowledging={acknowledgeReminder.isPending}
        isCanceling={deleteReminder.isPending}
        isCreator={selectedReminder ? user?.id === selectedReminder.created_by : false}
      />
    </div>
  );
};
