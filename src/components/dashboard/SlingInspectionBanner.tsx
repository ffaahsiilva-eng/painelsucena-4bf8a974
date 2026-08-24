import { Link2, AlertTriangle, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  useSlingWithInspections,
  colorLabels,
  colorClasses,
  useCreateSlingInspection,
  useUpdateSlingInspection,
} from "@/hooks/useSlingEquipment";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ExportSlingPendingPdfButton } from "./ExportSlingPendingPdfButton";

export function SlingInspectionBanner() {
  const { user } = useAuth();
  const { pendingInspections, currentMonthColor, isLoading } = useSlingWithInspections();
  const createInspection = useCreateSlingInspection();
  const updateInspection = useUpdateSlingInspection();

  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const inspectionDate = `${currentMonthYear}-01`;

  const handleQuickInspect = async (slingId: string, currentInspectionId: string | undefined, status: "inspected" | "cancelled") => {
    if (!user) return;

    try {
      if (currentInspectionId) {
        await updateInspection.mutateAsync({
          id: currentInspectionId,
          status,
          inspected_by: user.id,
        });
      } else {
        await createInspection.mutateAsync({
          sling_id: slingId,
          inspection_date: inspectionDate,
          status,
          inspected_by: user.id,
        });
      }
      toast.success(`Cinta marcada como ${status === "inspected" ? "inspecionada" : "cancelada"}`);
    } catch {
      toast.error("Erro ao atualizar inspeção");
    }
  };

  if (isLoading || pendingInspections.length === 0) {
    return null;
  }

  return (
    <Card className="border border-emerald-300/30 dark:border-emerald-600/20 backdrop-blur-xl bg-gradient-to-r from-emerald-100/30 to-emerald-50/10 dark:from-emerald-900/10 dark:to-transparent shadow-[0_4px_30px_-6px_hsl(152_60%_40%/0.12)] animate-fade-in glass-card-dashboard">
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-400/15 dark:bg-emerald-500/10 backdrop-blur-sm border border-emerald-300/20 dark:border-emerald-600/15">
            <Link2 className="h-5 w-5 text-emerald-500" />
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-emerald-500" />
              <h3 className="font-semibold text-foreground">Vistorias de Cintas Pendentes</h3>
              <Badge variant="destructive" className="animate-pulse">
                {pendingInspections.length}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              As cintas da cor <strong className="text-foreground">{colorLabels[currentMonthColor]}</strong> precisam ser inspecionadas este mês.
            </p>

            <div className="space-y-2">
              {pendingInspections.slice(0, 4).map((sling) => (
                <div
                  key={sling.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/30 dark:bg-white/5 backdrop-blur-sm border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${colorClasses[sling.color]}`} />
                    <span className="font-mono text-sm font-medium">{sling.tag}</span>
                    <span className="text-xs text-muted-foreground">{sling.description}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-green-600 hover:bg-green-100"
                      onClick={() => handleQuickInspect(sling.id, sling.currentInspection?.id, "inspected")}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => handleQuickInspect(sling.id, sling.currentInspection?.id, "cancelled")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {pendingInspections.length > 4 && (
                <p className="text-xs text-muted-foreground text-center">
                  + {pendingInspections.length - 4} cinta(s) pendente(s)
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/vistoria-cintas"
                className="inline-flex text-sm text-primary hover:underline"
              >
                Ver todas as cintas →
              </Link>
              <ExportSlingPendingPdfButton />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
