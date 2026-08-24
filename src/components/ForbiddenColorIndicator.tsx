import { useState, useEffect, useRef, useCallback } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Save } from "lucide-react";
import { toast } from "sonner";
import { getBrazilNorthMonth, getBrazilNorthDayOfMonth, getBrazilNorthYear } from "@/lib/timezone";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";

type ColorSlug = "red" | "blue" | "yellow" | "green";
type ColorInfo = {
  color: ColorSlug;
  name: string;
  bgClass: string;
  textClass: string;
  glow: string;
};

const COLOR_PRESETS: Record<ColorSlug, Omit<ColorInfo, "color" | "name">> = {
  red: { bgClass: "bg-red-500", textClass: "text-red-500", glow: "#ef4444" },
  blue: { bgClass: "bg-blue-500", textClass: "text-blue-500", glow: "#3b82f6" },
  yellow: { bgClass: "bg-yellow-400", textClass: "text-yellow-500", glow: "#facc15" },
  green: { bgClass: "bg-green-500", textClass: "text-green-500", glow: "#22c55e" },
};

const COLOR_NAMES: Record<ColorSlug, string> = {
  red: "Vermelha",
  blue: "Azul",
  yellow: "Amarela",
  green: "Verde",
};

const buildColorInfo = (slug: ColorSlug): ColorInfo => ({
  color: slug,
  name: COLOR_NAMES[slug],
  ...COLOR_PRESETS[slug],
});

const getMonthName = (month: number): string => {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return months[month];
};

const STORAGE_KEY = "forbiddenColorPosition";
const COLOR_OPTIONS: ColorSlug[] = ["red", "blue", "yellow", "green"];

const ForbiddenColorIndicator = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasDraggedRef = useRef(false);

  const { settings, updateSettings } = useSiteSettings();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const canEdit = isAdmin || profile?.cargo === "preposto";

  const colorsByMonth = (settings?.forbidden_colors_by_month as ColorSlug[] | undefined) ??
    ["red","blue","yellow","green","red","blue","yellow","green","red","blue","yellow","green"];
  const title = settings?.forbidden_color_title ?? "Cores Proibidas por Mês";

  const currentMonth = getBrazilNorthMonth();
  const currentDay = getBrazilNorthDayOfMonth();
  const currentYear = getBrazilNorthYear();
  const colorInfo = buildColorInfo(colorsByMonth[currentMonth] ?? "red");

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  useEffect(() => { setTitleDraft(title); }, [title]);

  // Draft de cores por mês (só salva ao clicar em Salvar)
  const [colorsDraft, setColorsDraft] = useState<ColorSlug[]>(colorsByMonth);
  useEffect(() => { setColorsDraft(colorsByMonth); }, [settings?.forbidden_colors_by_month]);
  // Reset ao fechar
  useEffect(() => {
    if (!showAllColors) setColorsDraft(colorsByMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllColors]);

  const isDirty = JSON.stringify(colorsDraft) !== JSON.stringify(colorsByMonth);

  const saveTitle = () => {
    updateSettings.mutate(
      { forbidden_color_title: titleDraft.trim() || "Cores Proibidas por Mês" },
      {
        onSuccess: () => { toast.success("Título atualizado"); setEditingTitle(false); },
        onError: () => toast.error("Erro ao salvar"),
      }
    );
  };

  const setMonthColor = (monthIdx: number, slug: ColorSlug) => {
    setColorsDraft((prev) => {
      const next = [...prev];
      next[monthIdx] = slug;
      return next;
    });
  };

  const saveColors = () => {
    updateSettings.mutate(
      { forbidden_colors_by_month: colorsDraft },
      {
        onSuccess: () => { toast.success("Cores salvas"); setShowAllColors(false); },
        onError: () => toast.error("Erro ao salvar cores"),
      }
    );
  };

  const applyTitlePreset = (preset: string) => {
    updateSettings.mutate(
      { forbidden_color_title: preset },
      {
        onSuccess: () => toast.success("Título atualizado"),
        onError: () => toast.error("Erro ao salvar"),
      }
    );
  };

  // Load saved position
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setPosition(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!isDragging) localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  }, [position, isDragging]);

  useEffect(() => {
    const alertDismissed = localStorage.getItem(`forbiddenColorAlert-${currentMonth}-${currentYear}`);
    if (currentDay === 1 && !alertDismissed) setShowAlert(true);
  }, [currentMonth, currentDay, currentYear]);

  const handleAlertDismiss = () => {
    setShowAlert(false);
    localStorage.setItem(`forbiddenColorAlert-${currentMonth}-${currentYear}`, "true");
  };

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = { x: clientX, y: clientY, posX: position.x, posY: position.y };
  }, [position]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = dragStartRef.current.x - clientX;
    const deltaY = dragStartRef.current.y - clientY;
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) hasDraggedRef.current = true;
    const newX = Math.max(10, Math.min(window.innerWidth - 80, dragStartRef.current.posX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 100, dragStartRef.current.posY + deltaY));
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => { setIsDragging(false); }, []);

  const onMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientX, e.clientY);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onMouseUp = () => handleDragEnd();
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const onTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; handleDragStart(t.clientX, t.clientY); };
  const onTouchMove = (e: React.TouchEvent) => { const t = e.touches[0]; handleDragMove(t.clientX, t.clientY); };
  const onTouchEnd = () => handleDragEnd();

  const handleClick = () => { if (!hasDraggedRef.current) setShowAllColors(true); };

  return (
    <>
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">🎨 Mudança de Cor Proibida!</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                A cor deste mês de <strong>{getMonthName(currentMonth)}</strong> é:
              </p>
              <div className="flex items-center justify-center gap-3 py-4">
                <div className={`w-12 h-12 rounded-full ${colorInfo.bgClass} shadow-lg animate-pulse`} />
                <span className={`text-2xl font-bold ${colorInfo.textClass}`}>{colorInfo.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Lembre-se de seguir as orientações sobre o uso desta cor durante todo o mês.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleAlertDismiss}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showAllColors} onOpenChange={setShowAllColors}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") { setTitleDraft(title); setEditingTitle(false); }
                  }}
                  className="h-8"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveTitle}><Check className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setTitleDraft(title); setEditingTitle(false); }}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <DialogTitle>{title}</DialogTitle>
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingTitle(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
            {canEdit && !editingTitle && (
              <div className="flex flex-wrap gap-1 pt-2">
                <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyTitlePreset("Cores Proibidas do Ano")}>Proibidas do Ano</Button>
                <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyTitlePreset("Cores Autorizadas por Ano")}>Autorizadas por Ano</Button>
                <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyTitlePreset("Cores Proibidas por Mês")}>Proibidas por Mês</Button>
              </div>
            )}
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {Array.from({ length: 12 }, (_, i) => {
              const slug = (colorsDraft[i] as ColorSlug) ?? "red";
              const monthColor = buildColorInfo(slug);
              const isCurrentMonth = i === currentMonth;
              return (
                <div
                  key={i}
                  className={`flex flex-col gap-2 p-3 rounded-lg border transition-all ${
                    isCurrentMonth ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${monthColor.bgClass} shadow-md shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{getMonthName(i)}</p>
                      <p className={`text-[10px] ${monthColor.textClass}`}>{monthColor.name}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      {COLOR_OPTIONS.map((opt) => {
                        const preset = COLOR_PRESETS[opt];
                        const selected = opt === slug;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setMonthColor(i, opt)}
                            title={COLOR_NAMES[opt]}
                            className={`w-5 h-5 rounded-full ${preset.bgClass} transition-all ${selected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-60 hover:opacity-100"}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {canEdit && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <p className="text-[11px] text-muted-foreground">
                {isDirty ? "Alterações não salvas" : "Clique em uma cor e depois em Salvar"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setColorsDraft(colorsByMonth)}
                  disabled={!isDirty || updateSettings.isPending}
                >
                  Desfazer
                </Button>
                <Button
                  size="sm"
                  onClick={saveColors}
                  disabled={!isDirty || updateSettings.isPending}
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


      <div
        ref={dragRef}
        className="fixed z-50 flex flex-col items-center gap-1 select-none"
        style={{
          right: position.x,
          bottom: position.y,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <span className="text-[10px] font-medium text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
          Cor do mês
        </span>
        <button
          onClick={handleClick}
          className={`w-8 h-8 rounded-full ${colorInfo.bgClass} flex items-center justify-center transition-transform hover:scale-110 forbidden-color-neon`}
          style={{
            ['--neon-color' as any]: colorInfo.glow,
            boxShadow: `0 0 8px ${colorInfo.glow}, 0 0 16px ${colorInfo.glow}, 0 0 28px ${colorInfo.glow}`,
          }}
          title={`${colorInfo.name} - Arraste para mover, clique para ver todas`}
        />
        <span className="text-[9px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full pointer-events-none">
          {getMonthName(currentMonth)}
        </span>
      </div>
    </>
  );
};

export default ForbiddenColorIndicator;
