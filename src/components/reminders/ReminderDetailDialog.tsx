import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Calendar, Clock, Users, User, Globe, UserCircle, Check, X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reminder } from "@/hooks/useReminders";
import { cn } from "@/lib/utils";
import { getDaysUntilEventBrazilNorth, parseDateForBrazilNorth } from "@/lib/timezone";

interface ReminderDetailDialogProps {
  reminder: Reminder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: (reminder: Reminder) => void;
  onCancel: (reminder: Reminder) => void;
  isAcknowledging: boolean;
  isCanceling: boolean;
  isCreator: boolean;
}

export function ReminderDetailDialog({
  reminder,
  open,
  onOpenChange,
  onAcknowledge,
  onCancel,
  isAcknowledging,
  isCanceling,
  isCreator,
}: ReminderDetailDialogProps) {
  if (!reminder) return null;

  const daysUntil = getDaysUntilEventBrazilNorth(reminder.event_date);
  const isToday = daysUntil === 0;
  const isUrgent = daysUntil <= 1;
  const isWarning = daysUntil <= 3 && daysUntil > 1;

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

  const MentionIcon = getMentionIcon(reminder.mention_type);

  // Determine colors based on urgency
  const accentColor = isUrgent 
    ? "text-red-400" 
    : isWarning 
      ? "text-orange-400" 
      : "text-green-400";
  const bgAccent = isUrgent 
    ? "bg-red-500/20" 
    : isWarning 
      ? "bg-orange-500/20" 
      : "bg-green-500/20";
  const borderColor = isUrgent 
    ? "border-red-500/60" 
    : isWarning 
      ? "border-orange-500/50" 
      : "border-green-500/40";

  const getDaysLabel = () => {
    if (isToday) return "Hoje";
    if (daysUntil === 1) return "Amanhã";
    return `Em ${daysUntil} dias`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "max-w-[95vw] sm:max-w-md p-0 border-0 bg-transparent shadow-none"
        )}
        hideCloseButton
      >
        {/* Container with sidebar-style background */}
        <div className="relative rounded-xl overflow-hidden reminder-detail-container">
          {/* Glow border */}
          <div className={cn("absolute inset-0 rounded-xl reminder-glow-border", borderColor)} />
          
          {/* Inner content */}
          <div className="relative m-[3px] rounded-lg overflow-hidden">
            {/* Gradient background matching sidebar */}
            <div 
              className="absolute inset-0"
              style={{
                background: `radial-gradient(
                  ellipse 80% 60% at 50% 50%,
                  hsl(220, 10%, 25%) 0%,
                  hsl(220, 12%, 18%) 25%,
                  hsl(220, 15%, 12%) 50%,
                  hsl(220, 18%, 6%) 75%,
                  hsl(0, 0%, 0%) 100%
                )`
              }}
            />
            
            {/* Inner glow */}
            <div 
              className="absolute inset-0"
              style={{
                background: `radial-gradient(
                  circle at 50% 45%,
                  rgba(100, 110, 130, 0.15) 0%,
                  transparent 45%
                )`
              }}
            />
            
            {/* Close button */}
            <button 
              className="absolute top-3 right-3 z-20 text-white/60 hover:text-white transition-colors"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Content */}
            <div className="relative z-10 p-6">
              <DialogHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={cn("p-3 rounded-full", bgAccent, isToday && "animate-pulse")}>
                    <Bell className={cn("h-6 w-6", accentColor)} />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                      {reminder.title}
                    </DialogTitle>
                    <Badge 
                      className={cn(
                        "mt-1 border-0",
                        isToday
                          ? "bg-green-500 text-black font-bold animate-pulse"
                          : isUrgent
                            ? "bg-red-500 text-white font-bold"
                            : isWarning
                              ? "bg-orange-500 text-black font-bold"
                              : "bg-green-500/20 text-green-400"
                      )}
                    >
                      {getDaysLabel()}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Date and Time */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className={cn("h-5 w-5", accentColor)} />
                    <span className="text-white">
                      {format(parseDateForBrazilNorth(reminder.event_date), "EEEE, dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  {reminder.event_time && (
                    <div className="flex items-center gap-2">
                      <Clock className={cn("h-5 w-5", accentColor)} />
                      <span className="text-white font-medium">
                        {reminder.event_time.slice(0, 5)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {reminder.description && (
                  <div className="p-4 rounded-lg bg-black/40 border border-white/10">
                    <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
                      {reminder.description}
                    </p>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MentionIcon className={cn("h-4 w-4", accentColor)} />
                    <span className="text-white/70">
                      Direcionado para:{" "}
                      <span className="text-white font-medium">
                        {reminder.mention_type === "all"
                          ? "Todos"
                          : reminder.mention_type === "me"
                          ? "Pessoal"
                          : "Usuários específicos"}
                      </span>
                    </span>
                  </div>
                  
                  {(reminder.mention_type === "all" || reminder.mention_type === "specific") && reminder.creator_name && (
                    <div className="flex items-center gap-2">
                      <UserCircle className={cn("h-4 w-4", accentColor)} />
                      <span className="text-white/70">
                        Criado por:{" "}
                        <span className="text-white font-medium">{reminder.creator_name}</span>
                      </span>
                    </div>
                  )}

                  {reminder.is_recurring && reminder.recurring_days && reminder.recurring_days.length > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className={cn("h-4 w-4", accentColor)} />
                      <span className="text-white/70">
                        Lembrete recorrente
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-row gap-2 mt-2">
                <Button 
                  variant="outline"
                  onClick={() => onAcknowledge(reminder)}
                  disabled={isAcknowledging}
                  className={cn(
                    "flex-1 gap-2 border-green-500/50 text-green-400 bg-green-500/10 hover:bg-green-500/20 hover:text-green-300"
                  )}
                >
                  <Check className="h-4 w-4" />
                  {isAcknowledging ? "Marcando..." : "Marcar como Visto"}
                </Button>
                
                {isCreator && (
                  <Button 
                    variant="outline"
                    onClick={() => onCancel(reminder)}
                    disabled={isCanceling}
                    className="gap-2 border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                    {isCanceling ? "Cancelando..." : "Cancelar"}
                  </Button>
                )}
              </DialogFooter>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
