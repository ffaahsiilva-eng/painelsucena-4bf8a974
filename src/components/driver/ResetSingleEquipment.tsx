import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEquipment } from "@/hooks/useEquipment";

export function ResetSingleEquipment() {
  const [eqId, setEqId] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: equipments = [] } = useEquipment();

  const sortedEquipments = useMemo(() => {
    return [...equipments].sort((a, b) => a.name.localeCompare(b.name));
  }, [equipments]);

  const handleReset = async () => {
    if (!eqId) {
      toast.error("Selecione um equipamento.");
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("equipment")
        .update({ driver: "", helper: "" })
        .eq("id", eqId)
        .select();

      if (error) throw error;
      
      const targetEq = equipments.find(e => e.id === eqId);
      
      if (data && data.length > 0) {
        toast.success(`Equipamento ${targetEq?.name || ''} reiniciado e motorista removido com sucesso.`);
        setEqId("");
      } else {
        toast.error(`Equipamento não encontrado ou sem permissão.`);
      }
    } catch (err: any) {
      toast.error(`Erro ao reiniciar equipamento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={eqId} onValueChange={setEqId}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Selecione o equipamento" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {sortedEquipments.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name} {e.plate ? `(${e.plate})` : ""} {e.driver ? ` [👤 ${e.driver}]` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="destructive" onClick={handleReset} disabled={loading || !eqId}>
        <RotateCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
        Reiniciar Equipamento
      </Button>
    </div>
  );
}
