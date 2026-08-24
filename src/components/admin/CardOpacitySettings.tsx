import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Layers } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

export const CardOpacitySettings = () => {
  const { settings, updateSettings, isLoading } = useSiteSettings();
  const [local, setLocal] = useState<number | null>(null);

  const current = local !== null ? local : (settings.card_opacity ?? 0.45);

  const handleCommit = async (value: number[]) => {
    try {
      await updateSettings.mutateAsync({ card_opacity: value[0] });
      setLocal(null);
      toast.success("Opacidade dos cards atualizada.");
    } catch (error) {
      console.error("Error updating card opacity:", error);
      toast.error("Erro ao salvar opacidade dos cards.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Opacidade dos Cards
        </CardTitle>
        <CardDescription>
          Controle a transparência (efeito glossy/blur) de todos os cards do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Nível de Opacidade</Label>
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
            {Math.round(current * 100)}%
          </span>
        </div>
        <Slider
          value={[current]}
          min={0.05}
          max={1}
          step={0.01}
          onValueChange={(v) => setLocal(v[0])}
          onValueCommit={handleCommit}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          0% = totalmente transparente, 100% = totalmente opaco. Recomendado entre 35% e 60%.
        </p>
        <div
          className="rounded-lg border glass-card p-4 text-sm"
          style={{ ["--card-opacity" as any]: String(current) }}
        >
          Pré-visualização do card com a opacidade selecionada.
        </div>
      </CardContent>
    </Card>
  );
};
