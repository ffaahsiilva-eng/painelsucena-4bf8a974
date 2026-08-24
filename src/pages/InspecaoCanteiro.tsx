import { useState, useRef, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Lock, Unlock, Trash2, CheckCircle2, Circle, ClipboardCheck, Camera, X, CalendarIcon, Filter, History, FileDown, MessageSquare, Eye, ChevronLeft, ChevronRight, Share2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import pptxgen from "pptxgenjs";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  useSiteInspections,
  useSiteInspectionTasks,
  useCreateSiteInspection,
  useToggleLockInspection,
  useToggleTaskCompletion,
  useDeleteSiteInspection,
  useUpdateTaskPhoto,
  useUpdateTaskObservation,
  uploadInspectionPhoto,
  type SiteInspectionTask,
} from "@/hooks/useSiteInspections";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { useInspectionSchedule } from "@/hooks/useInspectionSchedule";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin as useIsAdminTop } from "@/hooks/useUserRole";
import { differenceInCalendarDays, parseISO } from "date-fns";

function PhotoThumbnail({
  url,
  type,
  onUpload,
  disabled,
}: {
  url: string | null;
  type: "before" | "after";
  onUpload: (file: File) => void;
  disabled?: boolean;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emoji = type === "before" ? "❌" : "✅";
  const label = type === "before" ? "Antes" : "Depois";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máx. 10MB)");
        return;
      }
      onUpload(file);
    }
    e.target.value = "";
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {url ? (
        <button
          onClick={() => setViewOpen(true)}
          className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/50 group flex-shrink-0"
        >
          <img loading="lazy" decoding="async" src={url} alt={label} className="w-full h-full object-cover" />
          <span className="absolute top-0.5 right-0.5 text-base leading-none drop-shadow-md">{emoji}</span>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </button>
      ) : (
        <button
          onClick={() => !disabled && inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 flex-shrink-0 transition-colors",
            disabled
              ? "border-muted opacity-40 cursor-not-allowed"
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
          )}
        >
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{label}</span>
          <span className="text-xs leading-none">{emoji}</span>
        </button>
      )}

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          <div className="relative flex items-center justify-center">
            {url && (
              <img loading="lazy" decoding="async" src={url} alt={label} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            )}
            <span className="absolute top-2 left-2 text-3xl drop-shadow-lg">{emoji}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TaskRow({
  task,
  isLocked,
  onToggle,
}: {
  task: SiteInspectionTask;
  isLocked: boolean;
  onToggle: () => void;
}) {
  const updatePhoto = useUpdateTaskPhoto();
  const updateObservation = useUpdateTaskObservation();
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);
  const [showObsInput, setShowObsInput] = useState(false);
  const [obsValue, setObsValue] = useState(task.observation || "");

  const handleUpload = async (file: File, type: "before" | "after") => {
    setUploading(type);
    try {
      const url = await uploadInspectionPhoto(file, task.id, type);
      const field = type === "before" ? "before_photo_url" : "after_photo_url";
      await updatePhoto.mutateAsync({ id: task.id, field, url });
      toast.success(`Foto "${type === "before" ? "Antes" : "Depois"}" enviada!`);
    } catch {
      toast.error("Erro ao enviar foto.");
    } finally {
      setUploading(null);
    }
  };

  const handleSaveObservation = () => {
    const trimmed = obsValue.trim();
    updateObservation.mutate(
      { id: task.id, observation: trimmed || null },
      {
        onSuccess: () => {
          setShowObsInput(false);
          toast.success("Observação salva!");
        },
      }
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded-xl transition-colors border border-transparent",
        task.is_completed ? "bg-primary/5 border-primary/10" : "hover:bg-muted/30"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox area */}
        <button
          onClick={onToggle}
          disabled={!isLocked}
          className={cn(
            "mt-0.5 flex-shrink-0",
            !isLocked && "opacity-40 cursor-not-allowed"
          )}
        >
          {task.is_completed ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {/* Description + photos */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm block flex-1", task.is_completed && "line-through text-muted-foreground")}>
              {task.description}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setShowObsInput(!showObsInput)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Observation display (highlighted) */}
          {task.observation && !showObsInput && (
            <button
              onClick={() => setShowObsInput(true)}
              className="text-left w-full"
            >
              <span
                className="text-sm px-1 py-0.5 rounded"
                style={{
                  background: "linear-gradient(to bottom, transparent 40%, rgba(250, 204, 21, 0.45) 40%)",
                }}
              >
                {task.observation}
              </span>
            </button>
          )}

          {/* Observation input */}
          {showObsInput && (
            <div className="space-y-1.5">
              <Textarea
                placeholder="Observação..."
                value={obsValue}
                onChange={(e) => setObsValue(e.target.value)}
                className="min-h-[60px] text-sm"
                rows={2}
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={handleSaveObservation} disabled={updateObservation.isPending}>
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowObsInput(false); setObsValue(task.observation || ""); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Photo row */}
          <div className="flex items-center gap-2">
            <PhotoThumbnail
              url={task.before_photo_url}
              type="before"
              onUpload={(f) => handleUpload(f, "before")}
              disabled={!!uploading}
            />
            <PhotoThumbnail
              url={task.after_photo_url}
              type="after"
              onUpload={(f) => handleUpload(f, "after")}
              disabled={!!uploading}
            />
            {uploading && (
              <span className="text-xs text-muted-foreground animate-pulse">Enviando...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

async function fetchLogoBase64(path = "/logo-sucena-empreendimentos.png"): Promise<string> {
  try {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function addSlideBranding(slide: any, logoBase64: string, lightLogoBase64: string, slideNum: number, totalSlides: number, isDark: boolean) {
  if (lightLogoBase64) {
    slide.addImage({
      data: lightLogoBase64,
      x: 0.3, y: 0.15, w: 1.4, h: 0.45,
      sizing: { type: "contain", w: 1.4, h: 0.45 },
    });
  }
  // Company name top-right
  slide.addText("Sucena Empreendimentos", {
    x: 8.5, y: 0.15, w: 4.5, h: 0.25,
    fontSize: 10, bold: true, color: isDark ? "94A3B8" : "64748B", align: "right",
  });
  slide.addText("Qualidade, Segurança e Meio Ambiente", {
    x: 8.5, y: 0.38, w: 4.5, h: 0.2,
    fontSize: 7, color: isDark ? "64748B" : "94A3B8", align: "right",
  });
  // Footer
  slide.addText(`${slideNum}/${totalSlides}`, {
    x: 12, y: 7, w: 1, h: 0.3,
    fontSize: 8, color: isDark ? "475569" : "94A3B8", align: "right",
  });
  slide.addText("Sucena Empreendimentos © " + new Date().getFullYear(), {
    x: 0.3, y: 7, w: 5, h: 0.3,
    fontSize: 7, color: isDark ? "475569" : "94A3B8",
  });
}

async function generateInspectionPptx(inspectionDate: string, tasks: SiteInspectionTask[]) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Sucena Empreendimentos";
  pptx.company = "Sucena Empreendimentos";
  pptx.title = `Inspeção de Canteiro - ${inspectionDate}`;

  const logoBase64 = await fetchLogoBase64();
  const coverLogoBase64 = await fetchLogoBase64("/logo-sucena-cover.png");
  const lightLogoBase64 = await fetchLogoBase64("/logo-sucena-light.png");

  // Calculate total slides
  const detailCount = tasks.filter(t => t.before_photo_url || t.after_photo_url).length;
  const totalSlides = 3 + detailCount; // title + summary + details + closing

  let slideNum = 0;

  // Title slide
  slideNum++;
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "0F172A" };
  addSlideBranding(titleSlide, logoBase64, lightLogoBase64, slideNum, totalSlides, true);
  titleSlide.addText("Inspeção de Canteiro", {
    x: 0.5, y: 1.8, w: "90%", h: 1.2,
    fontSize: 36, bold: true, color: "FFFFFF", align: "center",
  });
  titleSlide.addText(inspectionDate, {
    x: 0.5, y: 3.1, w: "90%", h: 0.6,
    fontSize: 20, color: "94A3B8", align: "center",
  });
  titleSlide.addText(`${tasks.length} pontos de melhoria • 100% concluído`, {
    x: 0.5, y: 3.9, w: "90%", h: 0.5,
    fontSize: 14, color: "22C55E", align: "center",
  });
  if (coverLogoBase64) {
    titleSlide.addImage({
      data: coverLogoBase64,
      x: 4.15, y: 0.5, w: 5, h: 1.2,
      sizing: { type: "contain", w: 5, h: 1.2 },
    });
  }

  // Summary slide
  slideNum++;
  const summarySlide = pptx.addSlide();
  summarySlide.background = { color: "FFFFFF" };
  addSlideBranding(summarySlide, logoBase64, lightLogoBase64, slideNum, totalSlides, false);
  summarySlide.addText("Resumo da Inspeção", {
    x: 0.5, y: 0.7, w: "90%", h: 0.7,
    fontSize: 24, bold: true, color: "0F172A",
  });

  const tableRows: pptxgen.TableRow[] = [
    [
      { text: "#", options: { bold: true, color: "FFFFFF", fill: { color: "0F172A" }, fontSize: 10, align: "center" } },
      { text: "Ponto de Melhoria", options: { bold: true, color: "FFFFFF", fill: { color: "0F172A" }, fontSize: 10 } },
      { text: "Observação", options: { bold: true, color: "FFFFFF", fill: { color: "0F172A" }, fontSize: 10 } },
      { text: "Status", options: { bold: true, color: "FFFFFF", fill: { color: "0F172A" }, fontSize: 10, align: "center" } },
    ],
  ];

  tasks.forEach((task, idx) => {
    tableRows.push([
      { text: String(idx + 1), options: { fontSize: 9, align: "center" } },
      { text: task.description, options: { fontSize: 9 } },
      { text: task.observation || "-", options: { fontSize: 9, color: task.observation ? "92400E" : "94A3B8" } },
      { text: task.is_completed ? "✅ Concluído" : "⏳ Pendente", options: { fontSize: 9, align: "center", color: task.is_completed ? "166534" : "92400E" } },
    ]);
  });

  summarySlide.addTable(tableRows, {
    x: 0.4, y: 1.5, w: 12.4,
    border: { type: "solid", pt: 0.5, color: "E2E8F0" },
    rowH: 0.4,
    colW: [0.5, 4.5, 5, 2.4],
  });

  // Detail slides
  for (const [idx, task] of tasks.entries()) {
    if (task.before_photo_url || task.after_photo_url) {
      slideNum++;
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };
      addSlideBranding(slide, logoBase64, lightLogoBase64, slideNum, totalSlides, false);

      slide.addText(`${idx + 1}. ${task.description}`, {
        x: 0.5, y: 0.7, w: "90%", h: 0.6,
        fontSize: 18, bold: true, color: "0F172A",
      });

      if (task.observation) {
        slide.addText(task.observation, {
          x: 0.5, y: 1.3, w: "90%", h: 0.4,
          fontSize: 12, color: "0F172A", bold: true,
        });
      }

      const photoY = task.observation ? 1.9 : 1.5;

      if (task.before_photo_url) {
        slide.addText("❌ Antes", {
          x: 0.5, y: photoY, w: 5.5, h: 0.4,
          fontSize: 14, bold: true, color: "DC2626", align: "center",
        });
        try {
          slide.addImage({
            path: task.before_photo_url,
            x: 0.5, y: photoY + 0.5, w: 5.5, h: 3.8,
            sizing: { type: "contain", w: 5.5, h: 3.8 },
          });
        } catch {
          slide.addText("(foto indisponível)", {
            x: 0.5, y: photoY + 2, w: 5.5, h: 0.5,
            fontSize: 10, color: "94A3B8", align: "center",
          });
        }
      }

      if (task.after_photo_url) {
        slide.addText("✅ Depois", {
          x: 7, y: photoY, w: 5.5, h: 0.4,
          fontSize: 14, bold: true, color: "16A34A", align: "center",
        });
        try {
          slide.addImage({
            path: task.after_photo_url,
            x: 7, y: photoY + 0.5, w: 5.5, h: 3.8,
            sizing: { type: "contain", w: 5.5, h: 3.8 },
          });
        } catch {
          slide.addText("(foto indisponível)", {
            x: 7, y: photoY + 2, w: 5.5, h: 0.5,
            fontSize: 10, color: "94A3B8", align: "center",
          });
        }
      }
    }
  }

  // Closing slide
  slideNum++;
  const closingSlide = pptx.addSlide();
  closingSlide.background = { color: "0F172A" };
  addSlideBranding(closingSlide, logoBase64, lightLogoBase64, slideNum, totalSlides, true);
  closingSlide.addText("Inspeção Concluída ✅", {
    x: 0.5, y: 2, w: "90%", h: 1,
    fontSize: 32, bold: true, color: "22C55E", align: "center",
  });
  closingSlide.addText(`Todos os ${tasks.length} pontos foram resolvidos.`, {
    x: 0.5, y: 3.2, w: "90%", h: 0.6,
    fontSize: 16, color: "94A3B8", align: "center",
  });
  if (coverLogoBase64) {
    closingSlide.addImage({
      data: coverLogoBase64,
      x: 4.15, y: 0.5, w: 5, h: 1.2,
      sizing: { type: "contain", w: 5, h: 1.2 },
    });
  }

  await pptx.writeFile({ fileName: `Inspecao_Canteiro_${inspectionDate.replace(/\//g, "-")}.pptx` });
}

interface SlideData {
  type: "title" | "summary" | "detail" | "closing";
  title?: string;
  subtitle?: string;
  caption?: string;
  tasks?: SiteInspectionTask[];
  task?: SiteInspectionTask;
  taskIndex?: number;
  totalTasks?: number;
}

function buildSlides(inspectionDate: string, tasks: SiteInspectionTask[]): SlideData[] {
  const slides: SlideData[] = [];
  slides.push({
    type: "title",
    title: "Inspeção de Canteiro",
    subtitle: inspectionDate,
    caption: `${tasks.length} pontos de melhoria • 100% concluído`,
  });
  slides.push({ type: "summary", tasks });
  tasks.forEach((task, idx) => {
    if (task.before_photo_url || task.after_photo_url) {
      slides.push({ type: "detail", task, taskIndex: idx });
    }
  });
  slides.push({ type: "closing", totalTasks: tasks.length });
  return slides;
}

function InspectionSlidePreview({ slides, currentSlide }: { slides: SlideData[]; currentSlide: number }) {
  const slide = slides[currentSlide];
  if (!slide) return null;

  if (slide.type === "title") {
    return (
      <div className="aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center p-8 text-white">
        <img loading="lazy" decoding="async" src="/logo-sucena-cover.png" alt="Logo" className="h-20 object-contain mb-6" />
        <h2 className="text-2xl md:text-3xl font-bold">{slide.title}</h2>
        <p className="text-lg text-slate-400 mt-3">{slide.subtitle}</p>
        <p className="text-sm text-green-400 mt-2">{slide.caption}</p>
      </div>
    );
  }

  if (slide.type === "summary") {
    return (
      <div className="aspect-video bg-white dark:bg-slate-50 rounded-xl p-4 md:p-6 overflow-auto text-slate-900 relative">
        <img loading="lazy" decoding="async" src="/logo-sucena-light.png" alt="Logo" className="absolute top-3 left-4 h-6 object-contain" />
        <h3 className="text-lg font-bold mb-3 mt-6">Resumo da Inspeção</h3>
        <table className="w-full text-xs md:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-2 text-center w-8">#</th>
              <th className="p-2 text-left">Ponto de Melhoria</th>
              <th className="p-2 text-left">Observação</th>
              <th className="p-2 text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {slide.tasks?.map((task, idx) => (
              <tr key={task.id} className="border-b border-slate-200">
                <td className="p-2 text-center">{idx + 1}</td>
                <td className="p-2">{task.description}</td>
                <td className="p-2">
                  {task.observation ? (
                    <span className="font-bold">
                      {task.observation}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="p-2 text-center">{task.is_completed ? "✅" : "⏳"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (slide.type === "detail" && slide.task) {
    const task = slide.task;
    return (
      <div className="aspect-video bg-white dark:bg-slate-50 rounded-xl p-4 md:p-6 overflow-auto text-slate-900 relative">
        <img loading="lazy" decoding="async" src="/logo-sucena-light.png" alt="Logo" className="absolute top-3 left-4 h-6 object-contain" />
        <h3 className="text-base md:text-lg font-bold mt-6">{(slide.taskIndex ?? 0) + 1}. {task.description}</h3>
        {task.observation && (
          <p className="text-sm font-bold mt-1">
            {task.observation}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-red-600 text-center">❌ Antes</p>
            {task.before_photo_url ? (
              <img loading="lazy" decoding="async" src={task.before_photo_url} alt="Antes" className="w-full h-40 md:h-56 object-contain rounded-lg border border-slate-200" />
            ) : (
              <div className="w-full h-40 md:h-56 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">Sem foto</div>
            )}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-green-600 text-center">✅ Depois</p>
            {task.after_photo_url ? (
              <img loading="lazy" decoding="async" src={task.after_photo_url} alt="Depois" className="w-full h-40 md:h-56 object-contain rounded-lg border border-slate-200" />
            ) : (
              <div className="w-full h-40 md:h-56 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">Sem foto</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // closing
  return (
    <div className="aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center p-8 text-white">
      <img loading="lazy" decoding="async" src="/logo-sucena-cover.png" alt="Logo" className="h-20 object-contain mb-6" />
      <h2 className="text-2xl md:text-3xl font-bold text-green-400">Inspeção Concluída ✅</h2>
      <p className="text-base text-slate-400 mt-3">Todos os {slide.totalTasks} pontos foram resolvidos.</p>
    </div>
  );
}

function InspectionPresentationDialog({
  open,
  onOpenChange,
  inspectionDate,
  tasks,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  inspectionDate: string;
  tasks: SiteInspectionTask[];
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [exporting, setExporting] = useState(false);
  const slides = useMemo(() => buildSlides(inspectionDate, tasks), [inspectionDate, tasks]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await generateInspectionPptx(inspectionDate, tasks);
      toast.success("PowerPoint gerado!");
    } catch {
      toast.error("Erro ao gerar.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-4 md:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Apresentação da Inspeção</h3>
            <Button size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
              <FileDown className="h-4 w-4" />
              {exporting ? "Gerando..." : "Baixar PowerPoint"}
            </Button>
          </div>

          <InspectionSlidePreview slides={slides} currentSlide={currentSlide} />

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={currentSlide === 0}
              onClick={() => setCurrentSlide((c) => c - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentSlide + 1} / {slides.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentSlide === slides.length - 1}
              onClick={() => setCurrentSlide((c) => c + 1)}
              className="gap-1"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InspectionDetail({ inspection }: { inspection: { id: string; inspection_date: string; is_locked: boolean } }) {
  const { data: tasks = [] } = useSiteInspectionTasks(inspection.id);
  const toggleLock = useToggleLockInspection();
  const toggleTask = useToggleTaskCompletion();
  const deleteInspection = useDeleteSiteInspection();
  const { isAdmin } = useIsAdmin();
  const [showPresentation, setShowPresentation] = useState(false);

  const completedCount = tasks.filter((t) => t.is_completed).length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const handleToggleTask = (taskId: string, currentState: boolean) => {
    if (!inspection.is_locked) {
      toast.error("Bloqueie a inspeção antes de marcar os itens concluídos.");
      return;
    }
    toggleTask.mutate({ id: taskId, is_completed: !currentState });
  };

  const dateStr = format(new Date(inspection.inspection_date + "T12:00:00"), "dd/MM/yyyy");

  const handleShareWhatsApp = () => {
    const lines: string[] = [];
    lines.push(`📋 *Inspeção de Canteiro - ${dateStr}*`);
    lines.push(`✅ Progresso: ${percentage}% (${completedCount}/${totalCount})`);
    lines.push("");
    tasks.forEach((task, idx) => {
      const status = task.is_completed ? "✅" : "⏳";
      lines.push(`${status} ${idx + 1}. ${task.description}`);
      if (task.observation) lines.push(`   📝 *${task.observation}*`);
    });
    lines.push("");
    lines.push("_Sucena Empreendimentos_");
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <>
      <Card className="border border-border/40 backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {format(new Date(inspection.inspection_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <Badge variant={inspection.is_locked ? "default" : "secondary"}>
                {inspection.is_locked ? "Bloqueado" : "Aberto"}
              </Badge>
              {allCompleted && (
                <Badge className="bg-green-600 text-white gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 100%
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {allCompleted && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPresentation(true)}
                  className="h-8 px-2 gap-1 text-green-600 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-950/20"
                >
                  <Eye className="h-4 w-4" />
                  <span className="text-xs">Apresentação</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleShareWhatsApp}
                className="h-8 px-2"
                title="Enviar por WhatsApp"
              >
                <Share2 className="h-4 w-4" style={{ color: "#25D366" }} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleLock.mutate({ id: inspection.id, is_locked: !inspection.is_locked })}
                className="h-8 px-2"
              >
                {inspection.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span className="ml-1 text-xs">{inspection.is_locked ? "Desbloquear" : "Bloquear"}</span>
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm("Deseja excluir esta inspeção?")) {
                      deleteInspection.mutate(inspection.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={percentage} className="h-3" />
            </div>
            <span className="text-sm font-bold text-primary whitespace-nowrap">{percentage}%</span>
          </div>

          {totalCount === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">Nenhum ponto registrado.</p>
          )}

          <div className="space-y-1">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isLocked={inspection.is_locked}
                onToggle={() => handleToggleTask(task.id, task.is_completed)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {allCompleted && (
        <InspectionPresentationDialog
          open={showPresentation}
          onOpenChange={setShowPresentation}
          inspectionDate={dateStr}
          tasks={tasks}
        />
      )}
    </>
  );
}

export default function InspecaoCanteiro() {
  const { user } = useAuth();
  const { data: inspections = [], isLoading } = useSiteInspections();
  const createInspection = useCreateSiteInspection();
  const { isAdmin: isAdminUser } = useIsAdminTop();
  const { data: profile } = useProfile();
  const { schedule, upsertSchedule, deleteSchedule } = useInspectionSchedule();

  const canSchedule = isAdminUser || (profile?.cargo && ["tecnico_seguranca_i", "tecnico_seguranca_ii", "preposto"].includes(profile.cargo));

  const [date, setDate] = useState<Date>(new Date());
  const [taskInputs, setTaskInputs] = useState<string[]>([""]);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("08:00");

  // Latest inspection (most recent by date)
  const latestInspection = inspections.length > 0 ? inspections[0] : null;

  // Filtered history (excludes latest, applies date filter)
  const filteredHistory = useMemo(() => {
    const history = inspections.slice(1);
    if (!filterDate) return history;
    const filterStr = format(filterDate, "yyyy-MM-dd");
    return history.filter((i) => i.inspection_date === filterStr);
  }, [inspections, filterDate]);

  const addTaskInput = () => setTaskInputs((prev) => [...prev, ""]);

  const updateTaskInput = (index: number, value: string) => {
    setTaskInputs((prev) => prev.map((t, i) => (i === index ? value : t)));
  };

  const removeTaskInput = (index: number) => {
    if (taskInputs.length <= 1) return;
    setTaskInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!user) return;
    const validTasks = taskInputs.map((t) => t.trim()).filter(Boolean);
    if (validTasks.length === 0) {
      toast.error("Adicione pelo menos um ponto de melhoria.");
      return;
    }

    createInspection.mutate(
      {
        inspection_date: format(date, "yyyy-MM-dd"),
        created_by: user.id,
        tasks: validTasks,
      },
      {
        onSuccess: () => {
          toast.success("Inspeção criada com sucesso!");
          setTaskInputs([""]);
          setDate(new Date());
        },
        onError: () => toast.error("Erro ao criar inspeção."),
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-6 py-3 sm:py-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <EditablePageTitle pageKey="inspecao-canteiro" defaultValue="Inspeção de Canteiro" className="text-xl md:text-2xl font-bold text-foreground" />
            <p className="text-sm text-muted-foreground">Registre e acompanhe os pontos de melhoria</p>
          </div>
        </div>

        {/* Schedule next inspection alert */}
        {schedule && (() => {
          const inspDateParsed = parseISO(schedule.next_inspection_date);
          const todayDate = new Date(); todayDate.setHours(0,0,0,0);
          const daysUntil = differenceInCalendarDays(inspDateParsed, todayDate);
          const timeStr = schedule.next_inspection_time?.slice(0, 5) || "08:00";
          const dateStr = format(inspDateParsed, "dd/MM/yyyy (EEEE)", { locale: ptBR });
          const isOverdue = daysUntil < 0;
          const isToday = daysUntil === 0;
          const isSoon = daysUntil <= 3;

          if (!isSoon && !isOverdue) return null;

          return (
            <Card className={cn(
              "border animate-fade-in",
              isOverdue ? "border-destructive/50 bg-destructive/10" : isToday ? "border-orange-500/50 bg-orange-500/10" : "border-yellow-500/50 bg-yellow-500/10"
            )}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn("p-2 rounded-lg", isOverdue ? "bg-destructive/20" : isToday ? "bg-orange-500/20" : "bg-yellow-500/20")}>
                  <CalendarIcon className={cn("h-5 w-5", isOverdue ? "text-destructive" : isToday ? "text-orange-500 animate-pulse" : "text-yellow-500")} />
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm font-semibold", isOverdue ? "text-destructive" : isToday ? "text-orange-500" : "text-yellow-500")}>
                    {isOverdue ? "⚠️ Inspeção Atrasada!" : isToday ? "📋 Inspeção Hoje!" : `📋 Inspeção em ${daysUntil} dia${daysUntil > 1 ? "s" : ""}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{dateStr} às {timeStr}</p>
                </div>
                {canSchedule && (
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground" onClick={() => deleteSchedule.mutate(undefined, { onSuccess: () => toast.success("Agendamento removido") })}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Schedule next inspection (admin only) */}
        {canSchedule && (
          <Card className="border border-border/40 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Próxima Inspeção:</span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {scheduleDate ? format(scheduleDate, "dd/MM/yyyy") : "Escolher data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduleDate}
                    onSelect={setScheduleDate}
                    disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-28 h-8 text-sm"
              />
              <Button
                size="sm"
                className="h-8"
                disabled={!scheduleDate || upsertSchedule.isPending}
                onClick={() => {
                  if (!scheduleDate || !user) return;
                  upsertSchedule.mutate(
                    { date: format(scheduleDate, "yyyy-MM-dd"), time: scheduleTime, userId: user.id },
                    {
                      onSuccess: () => {
                        toast.success("Próxima inspeção agendada!");
                        setScheduleDate(undefined);
                      },
                      onError: () => toast.error("Erro ao agendar"),
                    }
                  );
                }}
              >
                Agendar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create new inspection */}
        <Card className="border border-primary/20 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nova Inspeção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Data:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Separator />

            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Pontos de Melhoria:</span>
              {taskInputs.map((value, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Ponto ${idx + 1}...`}
                    value={value}
                    onChange={(e) => updateTaskInput(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTaskInput();
                      }
                    }}
                  />
                  {taskInputs.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeTaskInput(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addTaskInput} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar Ponto
              </Button>
            </div>

            <Button onClick={handleCreate} disabled={createInspection.isPending} className="w-full">
              Salvar Inspeção
            </Button>
          </CardContent>
        </Card>

        {/* Latest inspection */}
        {isLoading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : latestInspection ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                <History className="h-3 w-3" />
                Última Inspeção
              </Badge>
            </div>
            <InspectionDetail inspection={latestInspection} />
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Nenhuma inspeção registrada.</p>
        )}

        {/* History with filter */}
        {inspections.length > 1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="gap-1.5"
              >
                <History className="h-4 w-4" />
                {showHistory ? "Ocultar Histórico" : "Ver Histórico"}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {inspections.length - 1}
                </Badge>
              </Button>

              {showHistory && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {filterDate ? format(filterDate, "dd/MM/yyyy") : "Filtrar por data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={filterDate}
                        onSelect={setFilterDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {filterDate && (
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setFilterDate(undefined)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {showHistory && (
              <div className="space-y-4">
                {filteredHistory.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    {filterDate ? "Nenhuma inspeção encontrada nesta data." : "Nenhum histórico disponível."}
                  </p>
                ) : (
                  filteredHistory.map((insp) => (
                    <InspectionDetail key={insp.id} inspection={insp} />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
