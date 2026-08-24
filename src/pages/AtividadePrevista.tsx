// @ts-nocheck
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Calendar as CalendarIcon, History } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useRDOReports, useRDOReport, useSaveRDOReport } from "@/hooks/useRDOReports";
import { getBrazilNorthDate } from "@/lib/timezone";
import { PlannedActivitiesTab } from "@/components/rdo/PlannedActivitiesTab";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { cn } from "@/lib/utils";
import { parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCustomActivities } from "@/hooks/useCustomActivities";
import { useEnvironment } from "@/hooks/useEnvironment";


export default function AtividadePrevista() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const { environment } = useEnvironment();
  const isBarcarena = (environment || "barcarena") === "barcarena";
  const { definitions } = useCustomActivities();
  const today = getBrazilNorthDate();
  
  // Check edit permission
  const canEdit = isAdmin || profile?.cargo === "encarregado_geral" || profile?.cargo === "encarregado" || profile?.cargo === "encarregado_i" || profile?.cargo === "encarregado_ii";

  
  // Date selection state
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  
  const { data: existingReport } = useRDOReport(selectedDateStr);
  const { data: allReports } = useRDOReports();
  const saveReport = useSaveRDOReport();

  const baseGabiaoActivities = useMemo(() => [
    "Escavação manual",
    "Nivelamento de solo",
    "Montagem de Colchão",
    "Reposição de manta asfáltica",
    "Reposição de silte",
    "Limpeza e organização",
    "Retirada de tela",
    "Retirada de cascalho",
    "Lavagem de vertedouro",
    "Lavagem de bacias do vertedouro",
    "Reposição de Geotêxtil",
    "Retirada de Geotêxtil",
    "Retirada de Geomembrana",
    "Reposição de Geomembrana",
    "Recomposição de tela",
    "Recomposição de cascalho",
    "Recomposição de silte",
    "Transporte de Materiais",
    "Limpeza de Canaleta",
    "Recomposição de Gabião",
    "Manutenção de Drenagem",
    "Limpeza de Bueiro",
    "Reparo de Cerca",
  ], []);

  const baseJardinagemActivities = useMemo(() => [
    "Roçagem",
    "Podagem",
    "Cova",
    "Coroamento",
    "Adubagem",
    "Plantio",
    "Limpeza Manual",
    "Limpeza com Soprador",
    "Controle de Invasoras",
    "Retirada de Mudas (Árvores)",
    "Plantio de Grama",
    "Manutenção de Canteiro",
    "Irrigação com Pipas",
    "Irrigação com Carretel",
  ], []);

  const handleSavePlanned = async (planned: { gabiao: string[]; jardinagem: string[] }, locks?: { gabiao?: boolean; jardinagem?: boolean }, area?: "gabiao" | "jardinagem") => {
    if (!user) return;
    try {
      await saveReport.mutateAsync({
        report_date: selectedDateStr,
        weather_morning: existingReport?.weather_morning || "sol",
        weather_afternoon: existingReport?.weather_afternoon || "sol",
        report_text: existingReport?.report_text || "",
        planned_activities: planned,
        planned_gabiao_locked: locks?.gabiao ?? existingReport?.planned_gabiao_locked,
        planned_jardinagem_locked: locks?.jardinagem ?? existingReport?.planned_jardinagem_locked,
      });

      // Notify via WhatsApp
      try {
        const { data, error: invokeError } = await supabase.functions.invoke("wapi-planned-activities-notify", {
          body: { planned, date: selectedDateStr, area },
        });
        
        if (invokeError) throw invokeError;
        
        if (data?.skipped) {
        } else {
          toast.success("Notificação enviada para o WhatsApp!");
        }
      } catch (notifyErr) {
        console.error("Erro ao enviar notificação WhatsApp:", notifyErr);
        toast.error("Atividades salvas, mas houve um erro no envio do WhatsApp.");
      }

      toast.success("Atividades previstas salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar atividades previstas: " + err.message);
    }
  };

  const datesWithReports = useMemo(() => {
    return allReports?.filter(r => r.planned_activities).map((r) => r.report_date) || [];
  }, [allReports]);

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {!canEdit && <ReadOnlyBanner message="Você está visualizando esta página em modo somente leitura. Apenas Administradores e Encarregado Geral podem editar." />}
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            <div className="min-w-0">
              <EditablePageTitle pageKey="planned-activities" defaultValue="Atividades Previstas" className="text-lg sm:text-2xl font-bold" />
              <p className="text-sm text-muted-foreground">{format(selectedDate, "dd/MM/yyyy (EEEE)", { locale: ptBR })}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  modifiers={{
                    hasReport: datesWithReports.map((d) => parseISO(d)),
                  }}
                  modifiersStyles={{
                    hasReport: {
                      backgroundColor: "hsl(var(--primary) / 0.2)",
                      fontWeight: "bold",
                    },
                  }}
                />
              </PopoverContent>
            </Popover>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <History className="h-4 w-4" />
                  Histórico
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Histórico de Planejamentos</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                  {allReports?.filter(r => r.planned_activities).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum planejamento salvo ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {allReports?.filter(r => r.planned_activities).map((report) => (
                        <button
                          key={report.id}
                          onClick={() => setSelectedDate(parseISO(report.report_date))}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            report.report_date === selectedDateStr
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-secondary"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {format(parseISO(report.report_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <Badge variant="secondary">Ver</Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <PlannedActivitiesTab
          selectedDate={selectedDate}
          gabiaoActivities={baseGabiaoActivities}
          jardinagemActivities={baseJardinagemActivities}
          customDefinitions={definitions}
          showGabiao={isBarcarena}
          showJardinagem={isBarcarena}
          initialPlanned={existingReport?.planned_activities}
          initialLocks={{
            gabiao: existingReport?.planned_gabiao_locked || false,
            jardinagem: existingReport?.planned_jardinagem_locked || false
          }}
          onSave={handleSavePlanned}
          isSaving={saveReport.isPending}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />

      </div>
    </Layout>
  );
}
