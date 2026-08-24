import { useInspectionSchedule } from "@/hooks/useInspectionSchedule";
import { useCreateSiteInspection, useToggleLockInspection } from "@/hooks/useSiteInspections";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HardHat, AlertTriangle, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDaysUntilEventBrazilNorth, parseDateForBrazilNorth } from "@/lib/timezone";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function InspectionScheduleBanner() {
  const { schedule, deleteSchedule } = useInspectionSchedule();
  const createInspection = useCreateSiteInspection();
  const toggleLock = useToggleLockInspection();
  const { user } = useAuth();

  if (!schedule) return null;

  const inspDate = parseDateForBrazilNorth(schedule.next_inspection_date);
  const daysUntil = getDaysUntilEventBrazilNorth(schedule.next_inspection_date);

  // Only show when within 3 days (including past/today)
  if (daysUntil > 3) return null;

  const isOverdue = daysUntil < 0;
  const isToday = daysUntil === 0;
  const timeStr = schedule.next_inspection_time?.slice(0, 5) || "08:00";
  const dateStr = format(inspDate, "dd/MM/yyyy (EEEE)", { locale: ptBR });

  const urgencyClass = isOverdue
    ? "border-destructive/50 bg-destructive/10"
    : isToday
    ? "border-orange-500/50 bg-orange-500/10"
    : "border-yellow-500/50 bg-yellow-500/10";

  const iconColor = isOverdue ? "text-destructive" : isToday ? "text-orange-500" : "text-yellow-500";

  const message = isOverdue
    ? `Inspeção atrasada! Era prevista para ${dateStr} às ${timeStr}`
    : isToday
    ? `Inspeção de canteiro HOJE às ${timeStr}`
    : `Inspeção de canteiro em ${daysUntil} dia${daysUntil > 1 ? "s" : ""} — ${dateStr} às ${timeStr}`;

  const handleDone = async () => {
    if (!user) return;
    try {
      const inspection = await createInspection.mutateAsync({
        inspection_date: schedule.next_inspection_date,
        created_by: user.id,
        tasks: [],
      });
      await toggleLock.mutateAsync({ id: inspection.id, is_locked: true });
      await deleteSchedule.mutateAsync();

      // Notifica no grupo do WhatsApp (não bloqueia UI se falhar)
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        await supabase.functions.invoke("wapi-site-inspection-done-notify", {
          body: {
            inspection_date: schedule.next_inspection_date,
            user_name: profile?.full_name || null,
          },
        });
      } catch (e) {
        console.warn("wapi-site-inspection-done-notify falhou:", e);
      }

      toast.success("Inspeção salva no histórico!");
    } catch {
      toast.error("Erro ao salvar inspeção.");
    }
  };

  const handleCancel = async () => {
    try {
      await deleteSchedule.mutateAsync();
      toast.success("Inspeção cancelada.");
    } catch {
      toast.error("Erro ao cancelar.");
    }
  };

  const busy = createInspection.isPending || deleteSchedule.isPending;

  return (
    <Card className={`border ${urgencyClass} animate-fade-in glass-card-dashboard`}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`p-2 rounded-lg ${isOverdue ? "bg-destructive/20" : isToday ? "bg-orange-500/20" : "bg-yellow-500/20"}`}>
          {isOverdue || isToday ? (
            <AlertTriangle className={`h-5 w-5 ${iconColor} ${isToday ? "animate-pulse" : ""}`} />
          ) : (
            <HardHat className={`h-5 w-5 ${iconColor}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${iconColor}`}>
            {isOverdue ? "⚠️ Inspeção Atrasada" : "📋 Próxima Inspeção de Canteiro"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-green-600 hover:bg-green-500/15 hover:text-green-600"
            onClick={handleDone}
            disabled={busy}
            title="Marcar como feito (salvar no histórico)"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/15 hover:text-destructive"
            onClick={handleCancel}
            disabled={busy}
            title="Cancelar (apagar)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
