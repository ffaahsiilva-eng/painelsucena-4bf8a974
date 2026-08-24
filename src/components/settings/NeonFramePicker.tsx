import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const SOLID_COLORS = [
  "#000000", "#ffffff", "#ef4444", "#dc2626", "#f97316", "#f59e0b",
  "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#64748b", "#d4af37", "#b45309", "#7c3aed",
];

const GRADIENT_COLORS = [
  { label: "Arco-íris", value: "conic-gradient(from 0deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0000)" },
  { label: "RGB", value: "conic-gradient(from 0deg, #ff0000, #00ff00, #0000ff, #ff0000)" },
  { label: "Sunset", value: "linear-gradient(135deg, #ff512f, #f09819)" },
  { label: "Oceano", value: "linear-gradient(135deg, #2193b0, #6dd5ed)" },
  { label: "Aurora", value: "linear-gradient(135deg, #00c6ff, #0072ff)" },
  { label: "Rosa Neon", value: "linear-gradient(135deg, #fc466b, #3f5efb)" },
  { label: "Floresta", value: "linear-gradient(135deg, #11998e, #38ef7d)" },
  { label: "Fogo", value: "linear-gradient(135deg, #f12711, #f5af19)" },
  { label: "Roxo Mágico", value: "linear-gradient(135deg, #7b2ff7, #c471ed, #f64f59)" },
  { label: "Ouro", value: "linear-gradient(135deg, #d4af37, #f5d442, #d4af37)" },
  { label: "Prata", value: "linear-gradient(135deg, #c0c0c0, #e8e8e8, #a0a0a0)" },
  { label: "Cyber", value: "linear-gradient(135deg, #00ffff, #ff00ff)" },
  { label: "Lava", value: "linear-gradient(135deg, #ff0000, #ff6600, #ffcc00)" },
  { label: "Gelo", value: "linear-gradient(135deg, #e0f7fa, #80deea, #4dd0e1)" },
  { label: "Matrix", value: "linear-gradient(135deg, #003300, #00ff00, #003300)" },
  { label: "Galaxy", value: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" },
];

const FRAME_ANIMATIONS = [
  { id: "none", label: "Sem animação", emoji: "⏹️" },
  { id: "spin", label: "Brilho girando", emoji: "🔄" },
  { id: "spin-slow", label: "Brilho girando lento", emoji: "🌀" },
  { id: "pulse", label: "Pulsar", emoji: "💫" },
  { id: "breathe", label: "Respirar", emoji: "🫧" },
  { id: "flash", label: "Piscar", emoji: "⚡" },
  { id: "rainbow", label: "Arco-íris rotativo", emoji: "🌈" },
];

interface NeonFramePickerProps {
  userId: string;
  avatarUrl: string | null;
  fullName: string;
  currentFrameColor: string | null;
  currentNeonColor: string | null;
  currentFrameAnimation: string | null;
}

export function NeonFramePicker({
  userId,
  avatarUrl,
  fullName,
  currentFrameColor,
  currentNeonColor,
  currentFrameAnimation,
}: NeonFramePickerProps) {
  const [frameColor, setFrameColor] = useState<string | null>(currentFrameColor);
  const [neonColor, setNeonColor] = useState<string | null>(currentNeonColor);
  const [frameAnimation, setFrameAnimation] = useState<string | null>(currentFrameAnimation);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFrameColor(currentFrameColor);
    setNeonColor(currentNeonColor);
    setFrameAnimation(currentFrameAnimation);
  }, [currentFrameColor, currentNeonColor, currentFrameAnimation]);
  const queryClient = useQueryClient();

  const hasChanges =
    frameColor !== currentFrameColor ||
    neonColor !== currentNeonColor ||
    frameAnimation !== currentFrameAnimation;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          frame_color: frameColor,
          neon_color: neonColor,
          frame_animation: frameAnimation,
        })
        .eq("user_id", userId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("Moldura atualizada com sucesso!");
    } catch {
      toast.error("Erro ao salvar moldura");
    } finally {
      setIsSaving(false);
    }
  };

  const renderColorButton = (
    color: string,
    isSelected: boolean,
    onClick: () => void,
    label?: string,
  ) => (
    <button
      key={color}
      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
        isSelected
          ? "border-foreground scale-110 ring-2 ring-foreground/30"
          : "border-border"
      }`}
      style={{ background: color }}
      onClick={onClick}
      title={label || color}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Moldura Neon
        </CardTitle>
        <CardDescription>
          Personalize a moldura e o brilho neon ao redor da sua foto de perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Preview */}
        <div className="flex justify-center py-6 bg-muted/30 rounded-xl">
          <NeonAvatar
            src={avatarUrl}
            name={fullName || "U"}
            frameColor={frameColor}
            neonColor={neonColor}
            frameAnimation={frameAnimation}
            size="lg"
          />
        </div>

        {/* Frame Color */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Cor da Moldura</Label>
            {frameColor && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={() => setFrameColor(null)}>
                <X className="w-3 h-3 mr-1" /> Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Cores sólidas</p>
          <div className="flex flex-wrap gap-2">
            {SOLID_COLORS.map((color) =>
              renderColorButton(color, frameColor === color, () => setFrameColor(color))
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1 mt-3">Gradientes e degradê</p>
          <div className="flex flex-wrap gap-2">
            {GRADIENT_COLORS.map((g) =>
              renderColorButton(g.value, frameColor === g.value, () => setFrameColor(g.value), g.label)
            )}
          </div>
        </div>

        {/* Frame Animation */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Animação da Moldura</Label>
          <div className="grid grid-cols-2 gap-2">
            {FRAME_ANIMATIONS.map((anim) => (
              <button
                key={anim.id}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm transition-all ${
                  (frameAnimation || "none") === anim.id
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setFrameAnimation(anim.id === "none" ? null : anim.id)}
              >
                <span>{anim.emoji}</span>
                <span>{anim.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Neon Glow Color */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Cor do Brilho Neon</Label>
            {neonColor && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={() => setNeonColor(null)}>
                <X className="w-3 h-3 mr-1" /> Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Cores sólidas</p>
          <div className="flex flex-wrap gap-2">
            {SOLID_COLORS.map((color) =>
              renderColorButton(color, neonColor === color, () => setNeonColor(color))
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1 mt-3">Gradientes e degradê</p>
          <div className="flex flex-wrap gap-2">
            {GRADIENT_COLORS.map((g) =>
              renderColorButton(g.value, neonColor === g.value, () => setNeonColor(g.value), g.label)
            )}
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="w-full">
          {isSaving ? "Salvando..." : "Salvar Moldura"}
        </Button>
      </CardContent>
    </Card>
  );
}
