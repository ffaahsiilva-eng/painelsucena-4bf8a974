import { useState, ReactNode } from "react";
import { ClipboardCheck, AlertTriangle, Send, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

interface VehicleChecklistDialogProps {
  equipmentId: string | null;
  equipmentName?: string;
  plate?: string;
  trigger: ReactNode;
}

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Belem",
    });
  } catch {
    return iso;
  }
};

export const VehicleChecklistDialog = ({
  equipmentId,
  equipmentName,
  plate,
  trigger,
}: VehicleChecklistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState("");
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["driver-checklists", equipmentId],
    queryFn: async () => {
      if (!equipmentId) return [];
      const { data, error } = await supabase
        .from("driver_vehicle_checklists")
        .select("*")
        .eq("equipment_id", equipmentId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!equipmentId && open,
  });

  const handleSubmit = async () => {
    if (!problem.trim()) {
      toast.error("Descreva o problema antes de registrar.");
      return;
    }
    if (!equipmentId) {
      toast.error("Nenhum equipamento selecionado.");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fullDescription = observation.trim()
        ? `${problem.trim()}\n\n*Observação:* ${observation.trim()}`
        : problem.trim();
      const { error } = await supabase.from("driver_vehicle_checklists").insert({
        equipment_id: equipmentId,
        equipment_name: equipmentName || "—",
        plate: plate || "—",
        driver_name: profile?.full_name || null,
        problem_description: fullDescription,
        created_by: user?.id || null,
      });
      if (error) throw error;
      toast.success("Problema registrado e enviado ao grupo");
      setProblem("");
      setObservation("");
      queryClient.invalidateQueries({ queryKey: ["driver-checklists", equipmentId] });
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao registrar: " + (e?.message || "tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-orange-600" />
            Check List do Veículo
          </DialogTitle>
          <DialogDescription>
            Registre problemas observados no veículo. A mensagem será enviada automaticamente ao grupo do WhatsApp.
          </DialogDescription>
        </DialogHeader>

        {equipmentName && (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-2 text-sm">
            <div className="font-semibold text-orange-900">{equipmentName}</div>
            {plate && <div className="text-orange-700 text-xs">Placa: {plate}</div>}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="vc-problem" className="text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
              Problema <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="vc-problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Ex: Pneu dianteiro direito com pressão baixa..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vc-observation" className="text-sm font-medium">
              Observação
            </Label>
            <Textarea
              id="vc-observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Detalhes adicionais (opcional)"
              rows={2}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            {saving ? "Registrando..." : "Registrar e Enviar ao Grupo"}
          </Button>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Histórico
          </h3>
          {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
          {!isLoading && checklists.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum problema registrado ainda.</p>
          )}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {checklists.map((c: any) => (
              <Card key={c.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(c.created_at)}
                    {c.driver_name && (
                      <span className="ml-auto font-medium text-foreground">
                        {c.driver_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs whitespace-pre-wrap">{c.problem_description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
