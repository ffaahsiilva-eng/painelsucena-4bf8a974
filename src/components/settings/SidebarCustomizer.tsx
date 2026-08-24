import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PanelLeft, Check, RotateCcw, Sparkles, Type, Palette, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarCustomizerProps {
  userId: string;
  currentSidebarColor?: string | null;
  currentSidebarAnimation?: string | null;
  currentSidebarFont?: string | null;
  currentSidebarFontColor?: string | null;
  currentSidebarActiveColor?: string | null;
  currentSidebarActiveFontColor?: string | null;
}

const SIDEBAR_COLORS = [
  { id: "default", label: "Padrão", color: null },
  // Dark colors
  { id: "dark-blue", label: "Azul Escuro", color: "hsl(220, 40%, 13%)" },
  { id: "navy", label: "Marinho", color: "hsl(225, 50%, 10%)" },
  { id: "dark-green", label: "Verde Escuro", color: "hsl(150, 40%, 10%)" },
  { id: "dark-purple", label: "Roxo Escuro", color: "hsl(270, 40%, 12%)" },
  { id: "dark-red", label: "Vinho", color: "hsl(350, 40%, 12%)" },
  { id: "charcoal", label: "Carvão", color: "hsl(0, 0%, 12%)" },
  { id: "midnight", label: "Meia-noite", color: "hsl(230, 50%, 8%)" },
  { id: "forest", label: "Floresta", color: "hsl(140, 50%, 8%)" },
  { id: "ocean", label: "Oceano", color: "hsl(200, 60%, 10%)" },
  { id: "coffee", label: "Café", color: "hsl(30, 40%, 12%)" },
  { id: "slate", label: "Ardósia", color: "hsl(210, 20%, 18%)" },
  // Light colors
  { id: "light-blue", label: "Azul Claro", color: "hsl(210, 40%, 75%)" },
  { id: "light-green", label: "Verde Claro", color: "hsl(150, 35%, 70%)" },
  { id: "light-purple", label: "Roxo Claro", color: "hsl(270, 35%, 75%)" },
  { id: "light-pink", label: "Rosa Claro", color: "hsl(340, 40%, 80%)" },
  { id: "cream", label: "Creme", color: "hsl(40, 50%, 85%)" },
  { id: "light-gray", label: "Cinza Claro", color: "hsl(220, 15%, 80%)" },
  { id: "lavender", label: "Lavanda", color: "hsl(250, 40%, 82%)" },
  { id: "peach", label: "Pêssego", color: "hsl(20, 50%, 82%)" },
  { id: "mint", label: "Menta", color: "hsl(160, 40%, 78%)" },
  { id: "sky", label: "Céu", color: "hsl(195, 50%, 80%)" },
  { id: "sand", label: "Areia", color: "hsl(35, 35%, 78%)" },
  { id: "ice", label: "Gelo", color: "hsl(200, 30%, 88%)" },
];

const SIDEBAR_ANIMATIONS = [
  { id: "none", label: "Nenhuma", emoji: "⬛" },
  { id: "particles", label: "Partículas", emoji: "✨" },
  { id: "stars", label: "Estrelas", emoji: "⭐" },
  { id: "rain", label: "Chuva", emoji: "🌧️" },
  { id: "fireflies", label: "Vagalumes", emoji: "🔥" },
  { id: "snow", label: "Neve", emoji: "❄️" },
  { id: "matrix", label: "Matrix", emoji: "💚" },
];

const SIDEBAR_FONTS = [
  { id: "default", label: "Padrão", family: null, preview: "Aa" },
  { id: "inter", label: "Inter", family: "'Inter', sans-serif", preview: "Aa" },
  { id: "poppins", label: "Poppins", family: "'Poppins', sans-serif", preview: "Aa" },
  { id: "raleway", label: "Raleway", family: "'Raleway', sans-serif", preview: "Aa" },
  { id: "playfair", label: "Playfair", family: "'Playfair Display', serif", preview: "Aa" },
  { id: "montserrat", label: "Montserrat", family: "'Montserrat', sans-serif", preview: "Aa" },
  { id: "dm-sans", label: "DM Sans", family: "'DM Sans', sans-serif", preview: "Aa" },
  { id: "space-grotesk", label: "Space Grotesk", family: "'Space Grotesk', sans-serif", preview: "Aa" },
  { id: "outfit", label: "Outfit", family: "'Outfit', sans-serif", preview: "Aa" },
  { id: "sora", label: "Sora", family: "'Sora', sans-serif", preview: "Aa" },
  { id: "clash", label: "Clash Display", family: "'Clash Display', sans-serif", preview: "Aa" },
  { id: "cabinet", label: "Cabinet Grotesk", family: "'Cabinet Grotesk', sans-serif", preview: "Aa" },
  { id: "satoshi", label: "Satoshi", family: "'Satoshi', sans-serif", preview: "Aa" },
  { id: "great-vibes", label: "Great Vibes", family: "'Great Vibes', cursive", preview: "Aa" },
  { id: "cormorant", label: "Cormorant Garamond", family: "'Cormorant Garamond', serif", preview: "Aa" },
  { id: "josefin", label: "Josefin Sans", family: "'Josefin Sans', sans-serif", preview: "Aa" },
];

export const SidebarCustomizer = ({
  userId,
  currentSidebarColor,
  currentSidebarAnimation,
  currentSidebarFont,
  currentSidebarFontColor,
  currentSidebarActiveColor,
  currentSidebarActiveFontColor,
}: SidebarCustomizerProps) => {
  const queryClient = useQueryClient();
  const [selectedColor, setSelectedColor] = useState<string | null>(currentSidebarColor || null);
  const [selectedAnimation, setSelectedAnimation] = useState<string | null>(currentSidebarAnimation || "particles");
  const [selectedFont, setSelectedFont] = useState<string | null>(currentSidebarFont || null);
  const [selectedFontColor, setSelectedFontColor] = useState<string | null>(currentSidebarFontColor || null);
  const [selectedActiveColor, setSelectedActiveColor] = useState<string | null>(currentSidebarActiveColor || null);
  const [selectedActiveFontColor, setSelectedActiveFontColor] = useState<string | null>(currentSidebarActiveFontColor || null);
  const [isSaving, setIsSaving] = useState(false);

  // Keep selections in sync with loaded profile data
  useEffect(() => {
    setSelectedColor(currentSidebarColor || null);
    setSelectedAnimation(currentSidebarAnimation || "particles");
    setSelectedFont(currentSidebarFont || null);
    setSelectedFontColor(currentSidebarFontColor || null);
    setSelectedActiveColor(currentSidebarActiveColor || null);
    setSelectedActiveFontColor(currentSidebarActiveFontColor || null);
  }, [currentSidebarColor, currentSidebarAnimation, currentSidebarFont, currentSidebarFontColor, currentSidebarActiveColor, currentSidebarActiveFontColor]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          sidebar_color: selectedColor,
          sidebar_animation: selectedAnimation,
          sidebar_font: selectedFont,
          sidebar_font_color: selectedFontColor,
          sidebar_active_color: selectedActiveColor,
          sidebar_active_font_color: selectedActiveFontColor,
        })
        .eq("user_id", userId);

      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.refetchQueries({ queryKey: ["profile", userId] });
      toast.success("Personalização da sidebar salva!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setSelectedColor(null);
    setSelectedAnimation("particles");
    setSelectedFont(null);
    setSelectedFontColor(null);
    setSelectedActiveColor(null);
    setSelectedActiveFontColor(null);
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          sidebar_color: null,
          sidebar_animation: "particles",
          sidebar_font: null,
          sidebar_font_color: null,
          sidebar_active_color: null,
          sidebar_active_font_color: null,
        })
        .eq("user_id", userId);

      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.refetchQueries({ queryKey: ["profile", userId] });
      toast.success("Sidebar restaurada ao padrão!");
    } catch (error: any) {
      toast.error("Erro ao restaurar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Determine if color is light for text contrast
  const isLightColor = (color: string | null) => {
    if (!color) return false;
    const match = color.match(/hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*(\d+)%?\s*\)/);
    return match ? parseInt(match[1]) > 50 : false;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PanelLeft className="w-5 h-5" />
          Personalizar Sidebar
        </CardTitle>
        <CardDescription>
          Escolha a cor e animação de fundo da barra lateral.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Cor de Fundo</Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {SIDEBAR_COLORS.map((preset) => {
              const isSelected = preset.color === selectedColor;
              const isLight = isLightColor(preset.color);
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedColor(preset.color)}
                  className={cn(
                    "relative w-full aspect-square rounded-lg border-2 transition-all duration-200 hover:scale-105",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30 scale-105"
                      : "border-border hover:border-primary/50"
                  )}
                  style={{
                    background: preset.color || "radial-gradient(ellipse at 50% 50%, hsl(220, 10%, 25%), hsl(0, 0%, 0%))",
                  }}
                  title={preset.label}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className={cn("w-4 h-4 drop-shadow-md", isLight ? "text-gray-800" : "text-white")} />
                    </div>
                  )}
                  <span className={cn(
                    "absolute bottom-0.5 left-0 right-0 text-[9px] text-center truncate px-0.5",
                    isLight ? "text-gray-700" : "text-white/80"
                  )}>
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Animation Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Animação de Fundo
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SIDEBAR_ANIMATIONS.map((anim) => {
              const isSelected = selectedAnimation === anim.id;
              return (
                <button
                  key={anim.id}
                  onClick={() => setSelectedAnimation(anim.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all text-sm",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-base">{anim.emoji}</span>
                  <span className="font-medium">{anim.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Type className="w-4 h-4" />
            Fonte
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SIDEBAR_FONTS.map((font) => {
              const isSelected = (font.family === null && selectedFont === null) || selectedFont === font.family;
              return (
                <button
                  key={font.id}
                  onClick={() => setSelectedFont(font.family)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all text-sm",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-lg font-bold" style={{ fontFamily: font.family || "inherit" }}>
                    {font.preview}
                  </span>
                  <span className="font-medium truncate" style={{ fontFamily: font.family || "inherit" }}>
                    {font.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Color Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Palette className="w-4 h-4" />
            Cor da Fonte
          </Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {[
              { id: "default", label: "Padrão", color: null },
              { id: "white", label: "Branco", color: "hsl(0, 0%, 100%)" },
              { id: "light-gray", label: "Cinza Claro", color: "hsl(0, 0%, 85%)" },
              { id: "dark", label: "Escuro", color: "hsl(0, 0%, 15%)" },
              { id: "gold", label: "Dourado", color: "hsl(43, 96%, 56%)" },
              { id: "amber", label: "Âmbar", color: "hsl(38, 92%, 50%)" },
              { id: "cyan", label: "Ciano", color: "hsl(190, 90%, 60%)" },
              { id: "green", label: "Verde", color: "hsl(142, 70%, 60%)" },
              { id: "rose", label: "Rosa", color: "hsl(340, 80%, 70%)" },
              { id: "purple", label: "Roxo", color: "hsl(270, 70%, 70%)" },
              { id: "orange", label: "Laranja", color: "hsl(25, 95%, 55%)" },
              { id: "sky", label: "Céu", color: "hsl(200, 80%, 65%)" },
            ].map((preset) => {
              const isSelected = preset.color === selectedFontColor;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedFontColor(preset.color)}
                  className={cn(
                    "relative w-full aspect-square rounded-lg border-2 transition-all duration-200 hover:scale-105 flex items-center justify-center",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30 scale-105"
                      : "border-border hover:border-primary/50"
                  )}
                  style={{
                    background: preset.color || "linear-gradient(135deg, hsl(0,0%,90%), hsl(0,0%,30%))",
                  }}
                  title={preset.label}
                >
                  {isSelected && (
                    <Check className={cn("w-4 h-4 drop-shadow-md", 
                      preset.color && isLightColor(preset.color) ? "text-gray-800" : "text-white"
                    )} />
                  )}
                  <span className={cn(
                    "absolute bottom-0.5 left-0 right-0 text-[9px] text-center truncate px-0.5",
                    preset.color && isLightColor(preset.color) ? "text-gray-700" : "text-white/80"
                  )}>
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Item Color Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <MousePointerClick className="w-4 h-4" />
            Cor do Item Selecionado
          </Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {[
              { id: "default", label: "Padrão", color: null },
              { id: "gold", label: "Dourado", color: "hsl(43, 96%, 56%)" },
              { id: "amber", label: "Âmbar", color: "hsl(38, 92%, 50%)" },
              { id: "cyan", label: "Ciano", color: "hsl(190, 90%, 50%)" },
              { id: "green", label: "Verde", color: "hsl(142, 70%, 45%)" },
              { id: "blue", label: "Azul", color: "hsl(220, 80%, 55%)" },
              { id: "purple", label: "Roxo", color: "hsl(270, 70%, 55%)" },
              { id: "rose", label: "Rosa", color: "hsl(340, 80%, 55%)" },
              { id: "orange", label: "Laranja", color: "hsl(25, 95%, 50%)" },
              { id: "teal", label: "Teal", color: "hsl(175, 70%, 40%)" },
              { id: "red", label: "Vermelho", color: "hsl(0, 80%, 50%)" },
              { id: "white", label: "Branco", color: "hsl(0, 0%, 95%)" },
            ].map((preset) => {
              const isSelected = preset.color === selectedActiveColor;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedActiveColor(preset.color)}
                  className={cn(
                    "relative w-full aspect-square rounded-lg border-2 transition-all duration-200 hover:scale-105 flex items-center justify-center",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30 scale-105"
                      : "border-border hover:border-primary/50"
                  )}
                  style={{
                    background: preset.color || "linear-gradient(135deg, hsl(43,96%,56%), hsl(38,92%,50%))",
                  }}
                  title={preset.label}
                >
                  {isSelected && (
                    <Check className={cn("w-4 h-4 drop-shadow-md", 
                      preset.color && isLightColor(preset.color) ? "text-gray-800" : "text-white"
                    )} />
                  )}
                  <span className={cn(
                    "absolute bottom-0.5 left-0 right-0 text-[9px] text-center truncate px-0.5",
                    preset.color && isLightColor(preset.color) ? "text-gray-700" : "text-white/80"
                  )}>
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Font Color Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Type className="w-4 h-4" />
            Cor da Fonte Selecionada
          </Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {[
              { id: "default", label: "Padrão", color: null },
              { id: "white", label: "Branco", color: "hsl(0, 0%, 100%)" },
              { id: "dark", label: "Escuro", color: "hsl(0, 0%, 15%)" },
              { id: "gold", label: "Dourado", color: "hsl(43, 96%, 56%)" },
              { id: "amber", label: "Âmbar", color: "hsl(38, 92%, 50%)" },
              { id: "cyan", label: "Ciano", color: "hsl(190, 90%, 60%)" },
              { id: "green", label: "Verde", color: "hsl(142, 70%, 60%)" },
              { id: "rose", label: "Rosa", color: "hsl(340, 80%, 70%)" },
              { id: "purple", label: "Roxo", color: "hsl(270, 70%, 70%)" },
              { id: "orange", label: "Laranja", color: "hsl(25, 95%, 55%)" },
              { id: "sky", label: "Céu", color: "hsl(200, 80%, 65%)" },
              { id: "teal", label: "Teal", color: "hsl(175, 70%, 50%)" },
            ].map((preset) => {
              const isSelected = preset.color === selectedActiveFontColor;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedActiveFontColor(preset.color)}
                  className={cn(
                    "relative w-full aspect-square rounded-lg border-2 transition-all duration-200 hover:scale-105 flex items-center justify-center",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30 scale-105"
                      : "border-border hover:border-primary/50"
                  )}
                  style={{
                    background: preset.color || "linear-gradient(135deg, hsl(0,0%,90%), hsl(0,0%,30%))",
                  }}
                  title={preset.label}
                >
                  {isSelected && (
                    <Check className={cn("w-4 h-4 drop-shadow-md", 
                      preset.color && isLightColor(preset.color) ? "text-gray-800" : "text-white"
                    )} />
                  )}
                  <span className={cn(
                    "absolute bottom-0.5 left-0 right-0 text-[9px] text-center truncate px-0.5",
                    preset.color && isLightColor(preset.color) ? "text-gray-700" : "text-white/80"
                  )}>
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Preview</Label>
          <div
            className="relative w-full h-28 rounded-lg overflow-hidden border border-border"
            style={{
              background: selectedColor || "radial-gradient(ellipse 80% 60% at 50% 50%, hsl(220, 10%, 25%) 0%, hsl(220, 12%, 18%) 25%, hsl(220, 15%, 12%) 50%, hsl(220, 18%, 6%) 75%, hsl(0, 0%, 0%) 100%)",
              fontFamily: selectedFont || "inherit",
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
              <span
                className="text-sm font-semibold"
                style={{
                  color: selectedFontColor || (isLightColor(selectedColor) ? "hsl(0,0%,20%)" : "hsl(0,0%,95%)"),
                  fontFamily: selectedFont || "inherit",
                }}
              >
                Sucena Operações
              </span>
              <span
                className="text-xs px-3 py-0.5 rounded-md"
                style={{
                  backgroundColor: selectedActiveColor ? `${selectedActiveColor}` : undefined,
                  color: selectedActiveFontColor || selectedFontColor || (isLightColor(selectedColor) ? "hsl(0,0%,20%)" : "hsl(0,0%,95%)"),
                  opacity: selectedActiveColor ? 1 : 0.6,
                }}
              >
                ● Item Ativo
              </span>
              <span className="text-[10px]" style={{
                color: selectedFontColor || (isLightColor(selectedColor) ? "hsl(0,0%,40%)" : "hsl(0,0%,70%)"),
              }}>
                {SIDEBAR_ANIMATIONS.find(a => a.id === selectedAnimation)?.emoji}{" "}
                {SIDEBAR_ANIMATIONS.find(a => a.id === selectedAnimation)?.label}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
