import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, Check, PanelLeft, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface ThemePickerProps {
  userId?: string;
  currentTheme?: string | null;
}

const UI_THEMES = [
  {
    id: "classic",
    label: "Clássico",
    description: "Sidebar lateral tradicional com navegação à esquerda",
    icon: PanelLeft,
    preview: "sidebar",
  },
  {
    id: "macos-dock",
    label: "macOS Dock",
    description: "Dock flutuante na parte inferior no estilo macOS com efeito de magnificação",
    icon: Monitor,
    preview: "dock",
  },
];

export const ThemePicker = ({ userId, currentTheme }: ThemePickerProps = {}) => {
  const queryClient = useQueryClient();
  const { settings, updateSettings } = useSiteSettings();
  const globalTheme = (settings as any)?.ui_theme || "classic";
  const [selected, setSelected] = useState(globalTheme);
  const [isSaving, setIsSaving] = useState(false);

  // Keep selection in sync with loaded global settings
  useEffect(() => {
    setSelected(globalTheme);
  }, [globalTheme]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to site_settings (global for all users)
      await updateSettings.mutateAsync({ ui_theme: selected } as any);

      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Tema global atualizado para todos os usuários!");
    } catch (error: any) {
      toast.error("Erro ao salvar tema: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Tema da Interface (Global)
        </CardTitle>
        <CardDescription>
          Escolha o estilo de navegação do sistema. Será aplicado para todos os usuários.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {UI_THEMES.map((theme) => {
            const isSelected = selected === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setSelected(theme.id)}
                className={cn(
                  "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02]",
                  isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50 bg-card"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                )}

                {/* Preview */}
                <div className="w-full h-24 rounded-lg bg-muted/50 overflow-hidden relative">
                  {theme.preview === "sidebar" ? (
                    <div className="flex h-full">
                      <div className="w-10 bg-foreground/10 border-r border-border/50 flex flex-col gap-1 p-1.5">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className={cn("w-full h-1.5 rounded-full", i === 0 ? "bg-primary/60" : "bg-foreground/20")} />
                        ))}
                      </div>
                      <div className="flex-1 p-2">
                        <div className="w-3/4 h-2 bg-foreground/15 rounded mb-2" />
                        <div className="w-1/2 h-2 bg-foreground/10 rounded" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 p-2">
                        <div className="w-3/4 h-2 bg-foreground/15 rounded mb-2" />
                        <div className="w-1/2 h-2 bg-foreground/10 rounded" />
                      </div>
                      <div className="flex justify-center pb-1.5">
                        <div className="flex gap-1 bg-foreground/10 rounded-lg px-2 py-1">
                          {[...Array(7)].map((_, i) => (
                            <div key={i} className={cn("w-2.5 h-2.5 rounded-sm", i === 0 ? "bg-primary/60" : "bg-foreground/25")} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="font-semibold text-sm">{theme.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <Button onClick={handleSave} disabled={isSaving || selected === globalTheme} className="w-full">
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Aplicar Tema Global
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
