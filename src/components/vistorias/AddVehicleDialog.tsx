import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCreateVehicleInspection, DATE_FIELDS } from "@/hooks/useVehicleInspections";
import { MOBILIZATION_STATUS_LABELS, type MobilizationStatus } from "@/hooks/useEquipment";
import { useAuth } from "@/hooks/useAuth";

const MOBILIZATION_STATUSES: MobilizationStatus[] = ["mobilizando", "mobilizado", "desmobilizando", "desmobilizado"];

interface AddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DateFieldState = {
  laudo_opacidade: Date | undefined;
  laudo_mecanico: Date | undefined;
  plano_manutencao: Date | undefined;
  cronografo: Date | undefined;
};

export function AddVehicleDialog({ open, onOpenChange }: AddVehicleDialogProps) {
  const { user } = useAuth();
  const createVehicle = useCreateVehicleInspection();
  const queryClient = useQueryClient();
  const [openPickers, setOpenPickers] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState({
    placa: "",
    modelo_veiculo: "",
    numero_cracha: "",
    mobilization_status: "mobilizado" as MobilizationStatus,
  });

  const [dates, setDates] = useState<DateFieldState>({
    laudo_opacidade: undefined,
    laudo_mecanico: undefined,
    plano_manutencao: undefined,
    cronografo: undefined,
  });

  const resetForm = () => {
    setFormData({
      placa: "",
      modelo_veiculo: "",
      numero_cracha: "",
      mobilization_status: "mobilizado",
    });
    setDates({
      laudo_opacidade: undefined,
      laudo_mecanico: undefined,
      plano_manutencao: undefined,
      cronografo: undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    try {
      const placa = formData.placa.toUpperCase();
      const modelo = formData.modelo_veiculo.toUpperCase();

      await createVehicle.mutateAsync({
        placa,
        modelo_veiculo: modelo,
        numero_cracha: formData.numero_cracha,
        vistoria: null,
        laudo_opacidade: dates.laudo_opacidade ? format(dates.laudo_opacidade, "yyyy-MM-dd") : null,
        laudo_mecanico: dates.laudo_mecanico ? format(dates.laudo_mecanico, "yyyy-MM-dd") : null,
        plano_manutencao: dates.plano_manutencao ? format(dates.plano_manutencao, "yyyy-MM-dd") : null,
        cronografo: dates.cronografo ? format(dates.cronografo, "yyyy-MM-dd") : null,
        created_by: user.id,
      });

      // Auto-cria/garante registro em equipment para o painel motorista, WhatsApp,
      // status e Parte Diária funcionarem igual aos demais veículos.
      try {
        let equipment_type: "pipa" | "munk" | "camionete" | "onibus" = "camionete";
        if (/PIPA/.test(modelo)) equipment_type = "pipa";
        else if (/MUN[CK]/.test(modelo)) equipment_type = "munk";
        else if (/ONIBUS|ÔNIBUS|BUS/.test(modelo)) equipment_type = "onibus";

        const { data: existing } = await supabase
          .from("equipment")
          .select("id")
          .eq("plate", placa)
          .maybeSingle();

        if (!existing) {
          await supabase.from("equipment").insert({
            name: modelo,
            plate: placa,
            driver: "",
            helper: "",
            equipment_type,
            mobilization_status: formData.mobilization_status,
          });
          queryClient.invalidateQueries({ queryKey: ["equipment"] });
        } else {
          await supabase
            .from("equipment")
            .update({ mobilization_status: formData.mobilization_status })
            .eq("id", existing.id);
          queryClient.invalidateQueries({ queryKey: ["equipment"] });
        }

        // Notificação WhatsApp de mobilização é disparada automaticamente
        // pelo trigger trg_notify_equipment_mobilization (security definer).
      } catch (eqErr) {
        console.warn("Falha ao sincronizar equipment", eqErr);
      }

      toast.success("Veículo adicionado!");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao adicionar veículo", err);
      toast.error("Erro ao adicionar veículo");
    }
  };

  const togglePicker = (key: string, value: boolean) => {
    setOpenPickers((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Novo Veículo</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="placa" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Placa
              </Label>
              <Input
                id="placa"
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                placeholder="ABC-1234"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelo" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Modelo do Veículo
              </Label>
              <Input
                id="modelo"
                value={formData.modelo_veiculo}
                onChange={(e) => setFormData({ ...formData, modelo_veiculo: e.target.value.toUpperCase() })}
                placeholder="MARCOPOLO"
                className="h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cracha" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nº Crachá
            </Label>
            <Input
              id="cracha"
              value={formData.numero_cracha}
              onChange={(e) => setFormData({ ...formData, numero_cracha: e.target.value })}
              placeholder="140000070738"
              className="h-11 font-mono"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Status de Mobilização
            </Label>
            <Select
              value={formData.mobilization_status}
              onValueChange={(v) => setFormData({ ...formData, mobilization_status: v as MobilizationStatus })}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOBILIZATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {MOBILIZATION_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Desmobilizado oculta o veículo dos painéis operacionais e RDO.
            </p>
          </div>

          {/* Date Fields */}
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Datas de Vencimento</h4>
            <div className="grid grid-cols-2 gap-4">
              {DATE_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {field.label}
                  </Label>
                  <Popover 
                    open={openPickers[field.key]} 
                    onOpenChange={(val) => togglePicker(field.key, val)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-11 w-full justify-start text-left font-normal",
                          !dates[field.key] && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dates[field.key]
                          ? format(dates[field.key]!, "dd/MM/yyyy")
                          : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dates[field.key]}
                        onSelect={(date) => {
                          setDates((prev) => ({ ...prev, [field.key]: date }));
                          togglePicker(field.key, false);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full h-11" disabled={createVehicle.isPending}>
            {createVehicle.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Adicionar Veículo"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
