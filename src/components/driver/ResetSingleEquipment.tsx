import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

export function ResetSingleEquipment() {
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!plate.trim()) {
      toast.error("Digite a placa do equipamento.");
      return;
    }
    const cleanPlate = plate.trim().toUpperCase();
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("equipment")
        .update({ driver: "", helper: "" })
        .eq("plate", cleanPlate)
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        toast.success(`Equipamento placa ${cleanPlate} reiniciado e motorista removido com sucesso.`);
        setPlate("");
      } else {
        toast.error(`Equipamento com placa ${cleanPlate} não encontrado.`);
      }
    } catch (err: any) {
      toast.error(`Erro ao reiniciar equipamento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Placa do equip. (ex: RQR7I03)"
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
        className="w-56"
        onKeyDown={(e) => e.key === "Enter" && handleReset()}
      />
      <Button variant="destructive" onClick={handleReset} disabled={loading || !plate.trim()}>
        <RotateCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
        Reiniciar Equipamento
      </Button>
    </div>
  );
}
