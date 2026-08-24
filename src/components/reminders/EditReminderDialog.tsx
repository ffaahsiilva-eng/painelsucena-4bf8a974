import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Repeat, User, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { Reminder, useUpdateReminder } from "@/hooks/useReminders";
import { useAllProfiles } from "@/hooks/useDDSSchedule";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { value: 0, label: "Dom", fullLabel: "Domingo" },
  { value: 1, label: "Seg", fullLabel: "Segunda" },
  { value: 2, label: "Ter", fullLabel: "Terça" },
  { value: 3, label: "Qua", fullLabel: "Quarta" },
  { value: 4, label: "Qui", fullLabel: "Quinta" },
  { value: 5, label: "Sex", fullLabel: "Sexta" },
  { value: 6, label: "Sáb", fullLabel: "Sábado" },
];

interface EditReminderDialogProps {
  reminder: Reminder;
  trigger?: React.ReactNode;
}

export const EditReminderDialog = ({ reminder, trigger }: EditReminderDialogProps) => {
  const { toast } = useToast();
  const { data: allProfiles } = useAllProfiles();
  const { user } = useAuth();
  const updateReminder = useUpdateReminder();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(reminder.title);
  const [description, setDescription] = useState(reminder.description || "");
  const [eventDate, setEventDate] = useState(reminder.event_date);
  const [eventTime, setEventTime] = useState(reminder.event_time || "");
  const [alertDaysBefore, setAlertDaysBefore] = useState(reminder.alert_days_before);
  const [showOnEventDay, setShowOnEventDay] = useState(reminder.show_on_event_day);
  const [mentionType, setMentionType] = useState<"all" | "specific" | "me">(reminder.mention_type);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(reminder.mentioned_users || []);
  const [isRecurring, setIsRecurring] = useState(!!reminder.is_recurring);
  const [recurringDays, setRecurringDays] = useState<number[]>(reminder.recurring_days || []);

  // Reset form when reminder changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle(reminder.title);
      setDescription(reminder.description || "");
      setEventDate(reminder.event_date);
      setEventTime(reminder.event_time || "");
      setAlertDaysBefore(reminder.alert_days_before);
      setShowOnEventDay(reminder.show_on_event_day);
      setMentionType(reminder.mention_type);
      setSelectedUsers(reminder.mentioned_users || []);
      setIsRecurring(!!reminder.is_recurring);
      setRecurringDays(reminder.recurring_days || []);
    }
  }, [isOpen, reminder]);

  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleUpdate = async () => {
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
      await updateReminder.mutateAsync({
        id: reminder.id,
        title,
        description: description || null,
        event_date: isRecurring ? new Date().toISOString().split('T')[0] : eventDate,
        event_time: eventTime || null,
        alert_days_before: isRecurring ? 0 : alertDaysBefore,
        show_on_event_day: isRecurring ? true : showOnEventDay,
        mention_type: mentionType,
        mentioned_users: mentionType === "specific" ? selectedUsers : [],
        is_recurring: isRecurring,
        recurring_days: isRecurring ? recurringDays : [],
      });

      setIsOpen(false);

      const displayInfo = isRecurring 
        ? `Toda ${recurringDays.map(d => WEEKDAYS.find(w => w.value === d)?.fullLabel).join(", ")}`
        : format(new Date(eventDate), "dd/MM/yyyy", { locale: ptBR });

      toast({
        title: "Lembrete atualizado!",
        description: `"${title}" - ${displayInfo}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar lembrete",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lembrete</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião de equipe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
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
                <Label htmlFor="edit-recurring" className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Lembrete Recorrente
                </Label>
                <p className="text-xs text-muted-foreground">
                  Repetir em dias específicos da semana
                </p>
              </div>
              <Switch
                id="edit-recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => {
                  setIsRecurring(checked);
                  if (checked) {
                    setEventDate(new Date().toISOString().split('T')[0]);
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
                  <Label htmlFor="edit-eventDate">Data do Evento *</Label>
                  <Input
                    id="edit-eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-eventTime">Hora do Evento (opcional)</Label>
                  <Input
                    id="edit-eventTime"
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
                    <Label htmlFor="edit-alertDays">Mostrar alerta (dias antes)</Label>
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
                      <Label htmlFor="edit-showOnDay">Alerta no dia do evento</Label>
                      <p className="text-xs text-muted-foreground">
                        Mostrar alerta especial no dia
                      </p>
                    </div>
                    <Switch
                      id="edit-showOnDay"
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
                <ScrollArea className="h-40 rounded-md border p-2">
                  <div className="space-y-2">
                    {allProfiles
                      ?.filter(p => p.user_id !== user?.id)
                      .map((profile) => (
                      <div
                        key={profile.user_id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          selectedUsers.includes(profile.user_id)
                            ? "bg-primary/10"
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
                        <span className="text-sm">{profile.full_name}</span>
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

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleUpdate}
              disabled={updateReminder.isPending}
            >
              {updateReminder.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
