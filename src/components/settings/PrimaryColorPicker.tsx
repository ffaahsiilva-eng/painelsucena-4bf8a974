import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

const PRIMARY_COLORS = [
  { id: "default", label: "Padrão (Roxo)", hsl: null, preview: "hsl(280, 45%, 65%)" },
  { id: "blue", label: "Azul", hsl: "220 70% 55%", preview: "hsl(220, 70%, 55%)" },
  { id: "green", label: "Verde", hsl: "142 60% 45%", preview: "hsl(142, 60%, 45%)" },
  { id: "red", label: "Vermelho", hsl: "0 72% 51%", preview: "hsl(0, 72%, 51%)" },
  { id: "orange", label: "Laranja", hsl: "25 95% 53%", preview: "hsl(25, 95%, 53%)" },
  { id: "amber", label: "Âmbar", hsl: "38 92% 50%", preview: "hsl(38, 92%, 50%)" },
  { id: "cyan", label: "Ciano", hsl: "190 90% 45%", preview: "hsl(190, 90%, 45%)" },
  { id: "teal", label: "Teal", hsl: "175 70% 40%", preview: "hsl(175, 70%, 40%)" },
  { id: "indigo", label: "Índigo", hsl: "240 60% 55%", preview: "hsl(240, 60%, 55%)" },
  { id: "pink", label: "Rosa", hsl: "340 75% 55%", preview: "hsl(340, 75%, 55%)" },
  { id: "rose", label: "Rosé", hsl: "350 70% 60%", preview: "hsl(350, 70%, 60%)" },
  { id: "violet", label: "Violeta", hsl: "270 70% 55%", preview: "hsl(270, 70%, 55%)" },
  { id: "emerald", label: "Esmeralda", hsl: "160 84% 39%", preview: "hsl(160, 84%, 39%)" },
  { id: "sky", label: "Céu", hsl: "200 80% 55%", preview: "hsl(200, 80%, 55%)" },
  { id: "gold", label: "Dourado", hsl: "43 96% 46%", preview: "hsl(43, 96%, 46%)" },
  { id: "lime", label: "Lima", hsl: "84 70% 45%", preview: "hsl(84, 70%, 45%)" },
  { id: "fuchsia", label: "Fúcsia", hsl: "300 70% 55%", preview: "hsl(300, 70%, 55%)" },
  { id: "slate", label: "Ardósia", hsl: "215 20% 45%", preview: "hsl(215, 20%, 45%)" },
];

export function PrimaryColorPicker() {
  const { settings, updateSettings } = useSiteSettings();
  const currentColor = (settings as any)?.primary_color || null;
  const [selected, setSelected] = useState<string | null>(currentColor);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelected(currentColor);
  }, [currentColor]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings.mutateAsync({ primary_color: selected } as any);
      toast.success("Cor primária atualizada para todos os usuários!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Cor Primária (Global)
        </CardTitle>
        <CardDescription>
          Escolha a cor dos botões e elementos de destaque. Será aplicado para todos os usuários.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label className="text-sm font-medium">Selecione a cor</Label>
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
          {PRIMARY_COLORS.map((color) => {
            const isSelected = color.hsl === selected;
            return (
              <button
                key={color.id}
                onClick={() => setSelected(color.hsl)}
                className={cn(
                  "relative w-full aspect-square rounded-full border-2 transition-all duration-200 hover:scale-110",
                  isSelected
                    ? "border-foreground ring-2 ring-foreground/30 scale-110"
                    : "border-transparent hover:border-foreground/30"
                )}
                style={{ background: color.preview }}
                title={color.label}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Button onClick={handleSave} disabled={isSaving || selected === currentColor} className="w-full">
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Aplicar Cor Global
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
