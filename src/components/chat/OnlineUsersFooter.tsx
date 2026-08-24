import { useEffect, useState } from "react";
import { NewsTicker } from "@/components/footer/NewsTicker";
import { ChevronDown, Play, RefreshCw, LogOut, Pencil, PencilOff, Check, X, Save } from "lucide-react";
import admIcon from "@/assets/adm-icon.png.asset.json";
import chatIcon from "@/assets/chat-icon.png.asset.json";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProfile } from "@/hooks/useProfile";
import { useEditMode } from "@/contexts/EditModeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logoPrincipal from "@/assets/logo-principal.png";
import { Link } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { getBrazilNorthMonth } from "@/lib/timezone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllUsers } from "@/hooks/useAllUsers";
import { hardRefreshToLatest } from "@/lib/appRefresh";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

interface OnlineUsersFooterProps {
  onUserClick: (user: any) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onSignOut?: () => void;
}

export const OnlineUsersFooter = ({ onUserClick, onToggleSidebar, isSidebarOpen, onSignOut }: OnlineUsersFooterProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [colorsDraft, setColorsDraft] = useState<ColorSlug[]>([]);
  const { state } = useSidebar();
  const { allUsers } = useAllUsers();
  const { signOut } = useAuth();
  const { settings, updateSettings } = useSiteSettings();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const { canEdit, isEditMode, toggleEditMode } = useEditMode();

  const cargo = (profile?.cargo ?? "").toLowerCase();
  const canEditColors = isAdmin || cargo === "preposto";

  const colorsByMonth: ColorSlug[] = (() => {
    const raw = (settings as any)?.forbidden_colors_by_month;
    if (Array.isArray(raw) && raw.length === 12) return raw as ColorSlug[];
    return DEFAULT_BY_MONTH;
  })();
  const dialogTitle: string = ((settings as any)?.forbidden_color_title as string) || "Cores proibidas do ano";

  const onlineCount = allUsers.filter(u => u.isOnline && !u.isCurrentUser && !u.cargo?.startsWith("motorista_")).length;

  const currentMonth = getBrazilNorthMonth();
  const isCollapsedSidebar = state === "collapsed";
  const forbiddenColor = COLOR_PRESETS[colorsByMonth[currentMonth] ?? "red"];

  useEffect(() => { setTitleDraft(dialogTitle); }, [dialogTitle, colorDialogOpen]);

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
    <div className={cn(
      "fixed bottom-0 right-0 left-0 z-40 overflow-visible transition-[left] duration-200 ease-linear",
      isMinimized ? "bg-transparent" : "bg-sidebar text-sidebar-foreground border-t-0",
      "flex items-center",
      !isMinimized && "before:content-[''] before:absolute before:left-0 before:right-0 before:-top-10 before:h-10 before:pointer-events-none",
      !isMinimized && "before:bg-[linear-gradient(to_top,hsl(var(--sidebar-background))_0%,hsl(var(--sidebar-background)/0.65)_45%,hsl(var(--sidebar-background)/0.25)_80%,transparent_100%)]"
    )}>

      {!isMinimized && (
        <Link
          to="/"
          aria-label="Início"
          className="hidden md:flex absolute left-1/2 -translate-x-1/2 bottom-0 z-50 items-center justify-center pointer-events-auto"
        >
          <img loading="lazy" decoding="async"
            src={settings?.logo_url || logoPrincipal}
            alt="Logo"
            className="h-11 max-w-[170px] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)] mb-3"
          />
        </Link>
      )}


      {/* Mobile minimize toggle */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className={cn(
          "md:hidden absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all",
          isMinimized
            ? "bottom-2 w-11 h-11 rounded-full bg-card border border-border shadow-lg"
            : "-top-5 w-10 h-5 rounded-t-lg bg-card border border-b-0 border-border"
        )}
        aria-label={isMinimized ? "Expandir barra" : "Minimizar barra"}
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", isMinimized && "rotate-180")} />
      </button>

      {!isMinimized && (
        <div className="flex w-full min-w-0 items-center gap-1 md:gap-3 px-2 md:px-4 py-1 sm:py-2 overflow-hidden">
          <div className="hidden md:flex shrink-0 items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSignOut) {
                        onSignOut();
                      } else {
                        signOut();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-transparent hover:bg-red-500/90 hover:text-white text-secondary-foreground transition-all active:scale-95 shadow-none border-none"
                    aria-label="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-[11px] font-bold tracking-tight uppercase">Sair</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-card border text-[11px]">
                  Sair da conta
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {isAdmin && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/admin"
                      className="h-9 w-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative"
                      aria-label="Painel Admin"
                    >
                      <img loading="lazy" decoding="async" src={admIcon.url} alt="Admin" className="h-20 w-20 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] absolute" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-card border text-[11px]">
                    Painel Admin
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {canEdit && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={toggleEditMode}
                      className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-95 border-none shadow-none bg-transparent hover:bg-secondary/20",
                        isEditMode
                          ? "text-primary"
                          : "text-secondary-foreground"
                      )}
                      aria-label={isEditMode ? "Sair do modo edição" : "Ativar modo edição"}
                    >
                      {isEditMode ? <PencilOff className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-card border text-[11px]">
                    {isEditMode ? "Sair do modo edição" : "Ativar modo edição"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

          </div>
          <div className="flex-1 min-w-0 overflow-hidden flex items-center justify-end gap-4">
            <div className="hidden md:flex flex-shrink-0 items-center justify-center">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={async () => {
                        await hardRefreshToLatest({ clearVisualState: true });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-all active:scale-95 shadow-sm"
                      aria-label="Recarregar sistema"
                    >
                      <RefreshCw className="h-4 w-4 animate-[spin_10s_linear_infinite] hover:animate-[spin_2s_linear_infinite]" />
                      <span className="text-[11px] font-bold tracking-tight uppercase">Recarregar</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-card border text-[11px]">
                    Recarregar sistema e limpar cache visual
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSidebar();
              }}
              className="relative p-1 hover:bg-muted/50 rounded-full transition-all group"
              title={isSidebarOpen ? "Fechar conversas" : "Abrir conversas"}
            >
              <img loading="lazy" decoding="async" 
                src={chatIcon.url} 
                className={cn(
                  "w-6 h-6 object-contain cursor-pointer group-hover:scale-110 transition-transform",
                  isSidebarOpen && "scale-110"
                )} 
                alt="Chat"
              />
              <span className={cn(
                "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm",
                onlineCount > 0 ? "bg-green-500" : "bg-gray-400"
              )}>
                {onlineCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setColorDialogOpen(true)}
              className="flex shrink-0 items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors cursor-pointer shadow-sm"
              title={`Cor proibida do mês: ${forbiddenColor.name} — clique para ver todas`}
            >
              <span
                className={cn("w-3.5 h-3.5 rounded-full animate-pulse", forbiddenColor.bgClass)}
                style={{
                  boxShadow: `0 0 6px ${forbiddenColor.glow}, 0 0 12px ${forbiddenColor.glow}, 0 0 20px ${forbiddenColor.glow}`,
                }}
              />
              <span
                className={cn(
                  "text-[10px] md:text-[11px] font-medium whitespace-nowrap text-muted-foreground hidden sm:inline",
                  isCollapsedSidebar && "md:hidden"
                )}
              >
                Cor proibida: {forbiddenColor.name}
              </span>
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
};
