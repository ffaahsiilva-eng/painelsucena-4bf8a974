import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Save } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { getBrazilNorthMonth } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ColorSlug = "red" | "blue" | "yellow" | "green";
const COLOR_PRESETS: Record<ColorSlug, { name: string; bgClass: string; glow: string }> = {
  red: { name: "Vermelha", bgClass: "bg-red-500", glow: "#ef4444" },
  blue: { name: "Azul", bgClass: "bg-blue-500", glow: "#3b82f6" },
  yellow: { name: "Amarela", bgClass: "bg-yellow-400", glow: "#facc15" },
  green: { name: "Verde", bgClass: "bg-green-500", glow: "#22c55e" },
};
const COLOR_OPTIONS: ColorSlug[] = ["red", "blue", "yellow", "green"];
const DEFAULT_BY_MONTH: ColorSlug[] = ["red","blue","yellow","green","red","blue","yellow","green","red","blue","yellow","green"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const ForbiddenColorButton = () => {
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [colorsDraft, setColorsDraft] = useState<ColorSlug[]>([]);
  
  const { settings, updateSettings } = useSiteSettings();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();

  const cargo = (profile?.cargo ?? "").toLowerCase();
  const canEditColors = isAdmin || cargo === "preposto";

  const colorsByMonth: ColorSlug[] = (() => {
    const raw = (settings as any)?.forbidden_colors_by_month;
    if (Array.isArray(raw) && raw.length === 12) return raw as ColorSlug[];
    return DEFAULT_BY_MONTH;
  })();
  const dialogTitle: string = ((settings as any)?.forbidden_color_title as string) || "Cores proibidas do ano";

  const currentMonth = getBrazilNorthMonth();
  const forbiddenColor = COLOR_PRESETS[colorsByMonth[currentMonth] ?? "red"];

  useEffect(() => { setTitleDraft(dialogTitle); }, [dialogTitle, colorDialogOpen]);
  useEffect(() => { setColorsDraft(colorsByMonth); }, [colorDialogOpen, (settings as any)?.forbidden_colors_by_month]);

  const isColorsDirty = JSON.stringify(colorsDraft) !== JSON.stringify(colorsByMonth);

  const setMonthColor = (monthIdx: number, slug: ColorSlug) => {
    setColorsDraft((prev) => {
      const base = prev.length === 12 ? prev : colorsByMonth;
      const next = [...base];
      next[monthIdx] = slug;
      return next;
    });
  };

  const saveColors = () => {
    updateSettings.mutate(
      { forbidden_colors_by_month: colorsDraft as any },
      {
        onSuccess: () => { toast.success("Cores salvas"); setColorDialogOpen(false); },
        onError: (e: any) => toast.error(`Falha ao salvar: ${e?.message ?? "erro"}`),
      }
    );
  };

  const saveTitle = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) { toast.error("Título obrigatório"); return; }
    updateSettings.mutate(
      { forbidden_color_title: trimmed as any },
      {
        onSuccess: () => { toast.success("Título atualizado"); setEditingTitle(false); },
        onError: (e: any) => toast.error(`Falha ao salvar: ${e?.message ?? "erro"}`),
      }
    );
  };

  return (
    <>
      <div className="mt-2 flex justify-center w-full relative z-10">
        <button
          type="button"
          onClick={() => setColorDialogOpen(true)}
          className="flex justify-center items-center p-2 rounded-full bg-[#2a2d30]/50 border border-white/5 shadow-sm hover:bg-black/40 transition-colors cursor-pointer"
          title={`Cor proibida do mês: ${forbiddenColor.name} — clique para ver todas`}
        >
          <span
            className={cn("w-4 h-4 lg:w-5 lg:h-5 rounded-full animate-pulse", forbiddenColor.bgClass)}
            style={{
              boxShadow: `0 0 6px ${forbiddenColor.glow}, 0 0 12px ${forbiddenColor.glow}, 0 0 18px ${forbiddenColor.glow}`,
            }}
          />
        </button>
      </div>

      <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {canEditColors && editingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Título"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveTitle} disabled={updateSettings.isPending}>
                    <Check className="h-4 w-4 text-green-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingTitle(false); setTitleDraft(dialogTitle); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{dialogTitle}</span>
                  {canEditColors && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingTitle(true)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 max-h-[60vh] overflow-y-auto pr-2">
            {MONTH_NAMES.map((month, idx) => {
              const slug = (colorsDraft[idx] ?? colorsByMonth[idx]) ?? "red";
              const c = COLOR_PRESETS[slug];
              const isCurrent = idx === currentMonth;
              return (
                <div
                  key={month}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2.5 transition-colors",
                    isCurrent ? "border-primary bg-primary/10" : "border-border bg-muted/30"
                  )}
                >
                  <span className={cn("w-4 h-4 rounded-full shadow-sm shrink-0", c.bgClass)} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={cn("text-xs font-semibold", isCurrent && "text-primary")}>{month}</span>
                    <span className="text-[11px] text-muted-foreground">{c.name}</span>
                  </div>
                  {canEditColors && (
                    <div className="flex items-center gap-1 shrink-0">
                      {COLOR_OPTIONS.map((opt) => {
                        const p = COLOR_PRESETS[opt];
                        const active = slug === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            title={p.name}
                            onClick={() => setMonthColor(idx, opt)}
                            disabled={updateSettings.isPending}
                            className={cn(
                              "w-5 h-5 rounded-full transition-all",
                              p.bgClass,
                              active ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110" : "opacity-60 hover:opacity-100"
                            )}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {canEditColors && (
            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t">
              <p className="text-[11px] text-muted-foreground">
                {isColorsDirty ? "Alterações não salvas" : "Clique em uma cor e depois em Salvar"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setColorsDraft(colorsByMonth)}
                  disabled={!isColorsDirty || updateSettings.isPending}
                >
                  Desfazer
                </Button>
                <Button
                  size="sm"
                  onClick={saveColors}
                  disabled={!isColorsDirty || updateSettings.isPending}
                  className="gap-1"
                >
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
