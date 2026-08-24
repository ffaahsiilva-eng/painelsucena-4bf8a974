import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useEnvironment } from "@/hooks/useEnvironment";
import mapaImg from "@/assets/mapa-drs.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MousePointer2, MapPin, Droplets, Hash, ArrowRight, Type as TypeIcon, Minus,
  Hexagon, CircleDot, Ruler, Route as RouteIcon, Layers as LayersIcon,
  Undo2, Redo2, Save, Trash2, ZoomIn, ZoomOut, Search, Download, Upload,
  X, Eye, EyeOff, Lock, Unlock, Copy, ChevronLeft, ChevronRight, FileDown, FileSpreadsheet,
} from "lucide-react";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { EditorState, MapObject, ToolId, Pt, LayerId } from "./types";
import { reducer, initialState, makeHistory, uid, Action } from "./reducer";
import { ICON_LIBRARY, ICON_CATEGORIES, getIcon } from "./iconLibrary";
import { exportJson, parseJson, exportGeoJson, downloadFile, distance, polygonArea } from "./io";

const IMG_W = 1600;
const IMG_H = 2200;

interface Props { onClose?: () => void }

export default function MapEditor({ onClose }: Props) {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { environment } = useEnvironment();

  const [state, dispatch] = useReducer(reducer, initialState);
  const history = useRef(makeHistory<EditorState>());
  const [, forceRender] = useState(0);
  const commit = (a: Action) => {
    history.current.push(state);
    dispatch(a);
    setDirty(true);
    forceRender((n) => n + 1);
  };
  const undo = () => {
    const prev = history.current.undo(state);
    if (prev) { dispatch({ type: "REPLACE", state: prev }); setDirty(true); }
    forceRender((n) => n + 1);
  };
  const redo = () => {
    const next = history.current.redo(state);
    if (next) { dispatch({ type: "REPLACE", state: next }); setDirty(true); }
    forceRender((n) => n + 1);
  };

  const [tool, setTool] = useState<ToolId>("select");
  const [viewMode, setViewMode] = useState(true);
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [iconKind, setIconKind] = useState("aspersor_360");
  const [iconCategory, setIconCategory] = useState<typeof ICON_CATEGORIES[number]["id"]>("irrigacao");
  const [iconSize, setIconSize] = useState<number>(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("mapEditor.iconSize") : null;
    const n = saved ? parseInt(saved, 10) : NaN;
    return Number.isFinite(n) && n >= 6 && n <= 400 ? n : 16;
  });
  useEffect(() => {
    try { window.localStorage.setItem("mapEditor.iconSize", String(iconSize)); } catch {}
  }, [iconSize]);
  const [numberValue, setNumberValue] = useState("1");
  const [textSize, setTextSize] = useState(28);
  const [showLayers, setShowLayers] = useState(true);
  const [showProps, setShowProps] = useState(true);
  const [showIcons, setShowIcons] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Zoom & pan
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setZoom((z) => Math.min(40, Math.max(0.3, +(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)).toFixed(3))));
    };
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel as any, { capture: true } as any);
  }, [containerSize.w]);

  const baseScale = useMemo(() => {
    if (!containerSize.w || !containerSize.h) return 1;
    return Math.min(containerSize.w / IMG_W, containerSize.h / IMG_H);
  }, [containerSize]);

  // Keep the visual zoom stable when the container resizes (e.g. sub-toolbar
  // shows/hides on tool change). We compensate the logical zoom so that
  // baseScale * zoom stays constant.
  const prevBaseScaleRef = useRef<number>(0);
  useEffect(() => {
    const prev = prevBaseScaleRef.current;
    if (prev > 0 && baseScale > 0 && Math.abs(prev - baseScale) > 1e-6) {
      setZoom((z) => Math.min(40, Math.max(0.3, +(z * (prev / baseScale)).toFixed(4))));
    }
    prevBaseScaleRef.current = baseScale;
  }, [baseScale]);

  const disp = { w: IMG_W * baseScale * zoom, h: IMG_H * baseScale * zoom };

  // Rotation (degrees) — controlled by middle mouse drag
  const [rotation, setRotation] = useState(0);
  // Escala do mapa: metros por pixel (para Rota / Medição em metros e m²)
  const [metersPerPixel, setMetersPerPixel] = useState(1);
  const fmtM = (px: number) => {
    const m = px * metersPerPixel;
    return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(1)} m`;
  };
  const fmtM2 = (px2: number) => {
    const m2 = px2 * metersPerPixel * metersPerPixel;
    return m2 >= 10000 ? `${(m2 / 10000).toFixed(2)} ha` : `${m2.toFixed(1)} m²`;
  };

  const getPos = (e: React.PointerEvent | React.MouseEvent): Pt => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };


  // Load/save from same table as classic editor, page=2 keeps it isolated.
  const loadKey = "advanced";
  // Guardas anti-perda de dados: só permite salvar depois do carregamento inicial
  const loadedRef = useRef(false);
  // Quantidade de objetos existentes no banco (para nunca sobrescrever com vazio)
  const remoteCountRef = useRef(0);
  const pendingViewRef = useRef<{ zoom?: number; rotation?: number; scrollLeft?: number; scrollTop?: number } | null>(null);

  useEffect(() => {
    if (!environment) return;
    loadedRef.current = false;
    (async () => {
      const { data, error } = await supabase
        .from("aspersores_annotations")
        .select("data")
        .eq("environment", environment)
        .eq("page", 2)
        .maybeSingle();
      if (error) {
        // Falha de leitura: NUNCA liberar o auto-save (evita sobrescrever com vazio)
        toast.error("Não foi possível carregar o mapa. Edições não serão salvas até recarregar.");
        return;
      }
      const d: any = (data as any)?.data;
      if (d && Array.isArray(d.objects)) {
        remoteCountRef.current = d.objects.length;
        dispatch({ type: "REPLACE", state: { objects: d.objects, layers: d.layers ?? initialState.layers, selection: [] } });
        history.current.reset();
        // Force loaded state immediately if we have data to prevent empty-state overwrite
        loadedRef.current = true;
        setDirty(false);
      }
      if (d && d.view) {
        if (typeof d.view.zoom === "number") setZoom(d.view.zoom);
        if (typeof d.view.rotation === "number") setRotation(d.view.rotation);
        if (typeof d.view.metersPerPixel === "number") setMetersPerPixel(d.view.metersPerPixel);
        pendingViewRef.current = { scrollLeft: d.view.scrollLeft, scrollTop: d.view.scrollTop };
      }
      setDirty(false);
      // libera gravação apenas depois do estado estar hidratado
      requestAnimationFrame(() => { loadedRef.current = true; setDirty(false); });
    })();
  }, [environment]);

  // Restore scroll after container has laid out with the new zoom
  useEffect(() => {
    const pv = pendingViewRef.current;
    if (!pv) return;
    const el = containerRef.current;
    if (!el || !containerSize.w) return;
    // wait one frame so disp.w/h reflect current zoom
    requestAnimationFrame(() => {
      if (typeof pv.scrollLeft === "number") el.scrollLeft = pv.scrollLeft;
      if (typeof pv.scrollTop === "number") el.scrollTop = pv.scrollTop;
      pendingViewRef.current = null;
    });
  }, [containerSize, zoom]);

  const save = async (opts?: { silent?: boolean; allowEmpty?: boolean }) => {
    if (!environment) {
      if (!opts?.silent) toast.error("Selecione o ambiente.");
      return;
    }
    // Guarda 1: nada é gravado antes do carregamento inicial concluir
    if (!loadedRef.current) {
      if (!opts?.silent) toast.error("Aguarde o carregamento do mapa antes de salvar.");
      return;
    }
    // Guarda 2: nunca sobrescrever um mapa existente com um mapa vazio
    if (state.objects.length === 0 && remoteCountRef.current > 0 && !opts?.allowEmpty) {
      console.warn("Save blocked: attempting to overwrite non-empty remote map with empty local state.");
      if (!opts?.silent) toast.error("Mapa vazio não substitui o mapa salvo. Use Limpar e salve novamente.");
      return;
    }
    setSaving(true);
    const el = containerRef.current;
    const view = {
      zoom,
      rotation,
      metersPerPixel,
      scrollLeft: el?.scrollLeft ?? 0,
      scrollTop: el?.scrollTop ?? 0,
    };
    const { error } = await supabase
      .from("aspersores_annotations")
      .upsert(
        { environment, page: 2, data: { objects: state.objects, layers: state.layers, view } as any, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: "environment,page" }
      );
    setSaving(false);
    if (error) { if (!opts?.silent) toast.error("Erro ao salvar"); return; }
    remoteCountRef.current = state.objects.length;
    setDirty(false);
    if (!opts?.silent) toast.success("Mapa salvo");
  };


  // -------- Rasteriza o mapa (bbox das edições) --------
  const renderMapCanvas = async (): Promise<HTMLCanvasElement> => {
    // --- Compute bounding box of all visible objects (in IMG coords) ---
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    const expand = (x: number, y: number, pad = 0) => {
      bx0 = Math.min(bx0, x - pad); by0 = Math.min(by0, y - pad);
      bx1 = Math.max(bx1, x + pad); by1 = Math.max(by1, y + pad);
    };
    state.objects.forEach((o: any) => {
      if (o.hidden) return;
      if (o.type === "icon" || o.type === "number" || o.type === "text") {
        const s = (o.size ?? 20);
        expand(o.x, o.y, s);
      } else if (o.type === "circle") {
        expand(o.cx, o.cy, o.r);
      } else if (Array.isArray(o.points)) {
        o.points.forEach((p: any) => expand(p.x, p.y, (o.width ?? 2)));
      }
    });
    const hasObjects = isFinite(bx0) && isFinite(by0) && isFinite(bx1) && isFinite(by1) && (bx1 > bx0) && (by1 > by0);
    let bx: number, by: number, bw: number, bh: number;
    if (hasObjects) {
      const padPx = Math.max(60, Math.max(bx1 - bx0, by1 - by0) * 0.04);
      bx = Math.max(0, bx0 - padPx);
      by = Math.max(0, by0 - padPx);
      bw = Math.min(IMG_W - bx, (bx1 - bx0) + padPx * 2);
      bh = Math.min(IMG_H - by, (by1 - by0) + padPx * 2);
    } else {
      bx = 0; by = 0; bw = IMG_W; bh = IMG_H;
    }

    // Preload map image as data URL to bypass CORS/taint issues
    const mapDataUrl: string = await (async () => {
      try {
        const res = await fetch(imgUrl, { mode: "cors", cache: "force-cache" });
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = () => reject(fr.error);
          fr.readAsDataURL(blob);
        });
      } catch {
        return imgUrl;
      }
    })();

    const svgSrc = svgRef.current;
    const RENDER_W = 2000;
    const renderH = Math.round(RENDER_W * (bh / bw));

    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      bgImg.onload = () => resolve();
      bgImg.onerror = () => resolve();
      bgImg.src = mapDataUrl;
    });

    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = RENDER_W * 2;
    baseCanvas.height = renderH * 2;
    const ctx = baseCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
    if (bgImg.naturalWidth > 0) {
      const sx = (bx / IMG_W) * bgImg.naturalWidth;
      const sy = (by / IMG_H) * bgImg.naturalHeight;
      const sw = (bw / IMG_W) * bgImg.naturalWidth;
      const sh = (bh / IMG_H) * bgImg.naturalHeight;
      ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, baseCanvas.width, baseCanvas.height);
    }

    if (svgSrc) {
      const svgClone = svgSrc.cloneNode(true) as SVGSVGElement;
      svgClone.setAttribute("viewBox", `${bx} ${by} ${bw} ${bh}`);
      svgClone.setAttribute("width", `${baseCanvas.width}`);
      svgClone.setAttribute("height", `${baseCanvas.height}`);
      svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const svgStr = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const overlay = new Image();
      await new Promise<void>((resolve) => {
        overlay.onload = () => resolve();
        overlay.onerror = () => resolve();
        overlay.src = svgUrl;
      });
      if (overlay.naturalWidth > 0) {
        ctx.drawImage(overlay, 0, 0, baseCanvas.width, baseCanvas.height);
      }
      URL.revokeObjectURL(svgUrl);
    }
    return baseCanvas;
  };

  // -------- Export PDF (mapa + legenda + logo) --------
  const [exportingPdf, setExportingPdf] = useState(false);
  const exportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    const t = toast.loading("Gerando PDF do mapa...");
    try {
      const [{ jsPDF }, logo] = await Promise.all([
        import("jspdf"),
        getLogoBase64().catch(() => ""),
      ]);
      const el = containerRef.current;
      if (!el) throw new Error("Mapa indisponível");

      const canvas = await renderMapCanvas();
      const mapImg = canvas.toDataURL("image/jpeg", 0.92);


      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // Cabeçalho: logo + título
      if (logo) { try { pdf.addImage(logo, "PNG", margin, margin, 34, 14, undefined, "FAST"); } catch {} }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("Mapa de Aspersores", pageW / 2, margin + 6, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const subtitle = `${environment ?? ""} · ${new Date().toLocaleString("pt-BR")} · Escala: ${metersPerPixel} m/px · Zoom ${Math.round(zoom * 100)}%`;
      pdf.text(subtitle, pageW / 2, margin + 12, { align: "center" });
      pdf.setDrawColor(200); pdf.line(margin, margin + 16, pageW - margin, margin + 16);

      // Imagem do mapa
      const mapTop = margin + 20;
      const mapBottom = pageH - margin - 60; // deixa espaço para legenda
      const availW = pageW - margin * 2;
      const availH = mapBottom - mapTop;
      const ratio = canvas.width / canvas.height;
      let mw = availW, mh = availW / ratio;
      if (mh > availH) { mh = availH; mw = availH * ratio; }
      const mx = margin + (availW - mw) / 2;
      pdf.addImage(mapImg, "JPEG", mx, mapTop, mw, mh, undefined, "FAST");

      // Legenda
      const legendTop = mapBottom + 4;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Legenda", margin, legendTop);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);

      // Resumo por camada
      const damagedCount = state.objects.filter(
        (o) => !o.hidden && (o as any).type === "icon" && (o as any).kind === "aspersor_danificado"
      ).length;
      const layerCounts = state.layers.map((l) => {
        const raw = state.objects.filter((o) => o.layer === l.id && !o.hidden).length;
        return { label: l.label, color: l.color, count: l.id === "aspersores" ? raw - damagedCount : raw };
      }).filter((r) => r.count > 0);

      let ly = legendTop + 5;
      const colW = (pageW - margin * 2) / 3;
      layerCounts.forEach((r, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = margin + col * colW;
        const y = ly + row * 5;
        pdf.setFillColor(r.color);
        pdf.circle(x + 2, y - 1.2, 1.6, "F");
        pdf.setTextColor(30);
        pdf.text(`${r.label} (${r.count})`, x + 6, y);
        // Aspersores danificados inline
        if (r.label.toLowerCase().startsWith("aspersor")) {
          const damaged = state.objects.filter(
            (o) => !o.hidden && (o as any).type === "icon" && (o as any).kind === "aspersor_danificado"
          ).length;
          if (damaged > 0) {
            const tw = pdf.getTextWidth(`${r.label} (${r.count})`);
            pdf.setFillColor(220, 38, 38);
            pdf.circle(x + 6 + tw + 4, y - 1.2, 1.6, "F");
            pdf.setTextColor(220, 38, 38);
            pdf.text(`Danificados (${damaged})`, x + 6 + tw + 8, y);
          }
        }
      });


      // Totais métricos
      let totalLen = 0, totalArea = 0;
      state.objects.forEach((o) => {
        if ("points" in o && o.points.length >= 2) {
          totalLen += distance(o.points);
          if ((o.type === "polygon" || (o.type === "route" && (o as any).closed))) {
            totalArea += polygonArea(o.points);
          }
        }
      });
      const fmtLen = totalLen * metersPerPixel;
      const fmtArea = totalArea * metersPerPixel * metersPerPixel;
      const totalsY = pageH - margin - 6;
      pdf.setDrawColor(200); pdf.line(margin, totalsY - 4, pageW - margin, totalsY - 4);
      pdf.setFontSize(9);
      pdf.setTextColor(60);
      pdf.text(
        `Totais: ${state.objects.length} objetos · Comprimento ${fmtLen >= 1000 ? (fmtLen / 1000).toFixed(2) + " km" : fmtLen.toFixed(1) + " m"} · Área ${fmtArea >= 10000 ? (fmtArea / 10000).toFixed(2) + " ha" : fmtArea.toFixed(1) + " m²"}`,
        margin, totalsY,
      );
      pdf.text("Sucena", pageW - margin, totalsY, { align: "right" });

      const fname = `mapa-aspersores-${environment ?? "map"}-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fname);
      toast.success("PDF gerado", { id: t });
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao gerar PDF", { id: t });
    } finally {
      setExportingPdf(false);
    }
  };

  // -------- Export Excel (mapa + legenda + estoque irrigação) --------
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const exportExcel = async () => {
    if (exportingXlsx) return;
    setExportingXlsx(true);
    const t = toast.loading("Gerando Excel do mapa...");
    try {
      const [ExcelJSmod, logo, canvas, estoqueRes] = await Promise.all([
        import("exceljs"),
        getLogoBase64().catch(() => ""),
        renderMapCanvas(),
        environment
          ? supabase.from("irrigacao_itens").select("*").eq("environment", environment).order("nome")
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      const ExcelJS: any = (ExcelJSmod as any).default ?? ExcelJSmod;
      const wb = new ExcelJS.Workbook();
      wb.creator = "Sucena";
      wb.created = new Date();

      const stripped = (s: string) => s.replace(/^data:image\/\w+;base64,/, "");
      const titleFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F7A54" } } as any;
      const headFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F3EE" } } as any;
      const thin = { style: "thin", color: { argb: "FFBFC9C4" } } as any;
      const border = { top: thin, left: thin, bottom: thin, right: thin } as any;

      // ---------- Aba 1: Mapa ----------
      const ws = wb.addWorksheet("Mapa de Aspersores", { views: [{ showGridLines: false }] });
      ws.columns = [{ width: 4 }, { width: 34 }, { width: 18 }, { width: 4 }, { width: 42 }, { width: 14 }, { width: 12 }, { width: 34 }];

      if (logo) {
        const logoId = wb.addImage({ base64: stripped(logo), extension: "png" });
        ws.addImage(logoId, { tl: { col: 1, row: 0 }, ext: { width: 150, height: 62 } });
      }
      ws.mergeCells("C1:H2");
      const title = ws.getCell("C1");
      title.value = "Relatório de Aspersores — Mapa e Estoque";
      title.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
      title.alignment = { vertical: "middle", horizontal: "center" };
      title.fill = titleFill;
      ws.getRow(1).height = 24;
      ws.getRow(2).height = 24;

      ws.mergeCells("C3:H3");
      const sub = ws.getCell("C3");
      sub.value = `Ambiente: ${environment ?? "-"}   |   Gerado em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" })}   |   Escala: ${metersPerPixel} m/px`;
      sub.font = { name: "Arial", size: 10, color: { argb: "FF444444" } };
      sub.alignment = { horizontal: "center" };
      ws.getRow(4).height = 6;

      // Mapa
      const mapId = wb.addImage({ base64: stripped(canvas.toDataURL("image/png")), extension: "png" });
      const maxW = 900;
      const imgW = maxW;
      const imgH = Math.round(maxW * (canvas.height / canvas.width));
      ws.addImage(mapId, { tl: { col: 1, row: 4 }, ext: { width: imgW, height: imgH } });
      const mapRows = Math.ceil(imgH / 20) + 2;
      let row = 5 + mapRows;

      // Legenda
      const damaged = state.objects.filter(
        (o: any) => !o.hidden && o.type === "icon" && o.kind === "aspersor_danificado"
      ).length;
      const sprinklersTotal = state.objects.filter(
        (o: any) => !o.hidden && o.type === "icon" && String(o.kind ?? "").startsWith("aspersor")
      ).length;
      const sprinklersOk = sprinklersTotal - damaged;

      const summaryRow = row;

      ws.mergeCells(`B${row}:C${row}`);
      const legTitle = ws.getCell(`B${row}`);
      legTitle.value = "Levantamento de Aspersores";
      legTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
      legTitle.fill = titleFill;
      legTitle.alignment = { vertical: "middle" };
      ws.getRow(row).height = 20;
      row += 1;

      const legHead = ws.getRow(row);
      legHead.getCell(2).value = "Item";
      legHead.getCell(3).value = "Quantidade";
      [2, 3].forEach((c) => {
        const cell = legHead.getCell(c);
        cell.font = { name: "Arial", bold: true };
        cell.fill = headFill;
        cell.border = border;
        cell.alignment = { horizontal: c === 3 ? "center" : "left" };
      });
      row += 1;

      const legendRows: Array<[string, number, string?]> = [
        ["Aspersores em operação", sprinklersOk],
        ["Aspersores danificados", damaged, "FFC62828"],
        ["Total de aspersores", sprinklersTotal],
      ];
      state.layers.forEach((l) => {
        const raw = state.objects.filter((o) => o.layer === l.id && !o.hidden).length;
        if (raw > 0 && l.id !== "aspersores") legendRows.push([l.label, raw]);
      });

      legendRows.forEach(([label, count, argb]) => {
        const r = ws.getRow(row);
        r.getCell(2).value = label;
        r.getCell(3).value = count;
        r.getCell(2).font = { name: "Arial", color: { argb: argb ?? "FF000000" }, bold: !!argb };
        r.getCell(3).font = { name: "Arial", color: { argb: argb ?? "FF000000" }, bold: true };
        r.getCell(3).alignment = { horizontal: "center" };
        r.getCell(2).border = border;
        r.getCell(3).border = border;
        row += 1;
      });

      // ---------- Estoque Irrigação (ao lado, mesma página) ----------
      const itens: any[] = (estoqueRes as any)?.data ?? [];
      let er = summaryRow;
      ws.mergeCells(`E${er}:H${er}`);
      const estTitle = ws.getCell(`E${er}`);
      estTitle.value = "Estoque de Irrigação";
      estTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
      estTitle.fill = titleFill;
      estTitle.alignment = { vertical: "middle" };
      er += 1;

      const estHead = ws.getRow(er);
      ["Item", "Quantidade", "Unidade", "Observação"].forEach((h, i) => {
        const cell = estHead.getCell(5 + i);
        cell.value = h;
        cell.font = { name: "Arial", bold: true };
        cell.fill = headFill;
        cell.border = border;
        cell.alignment = { horizontal: i === 0 || i === 3 ? "left" : "center" };
      });
      er += 1;

      itens.forEach((it) => {
        const r = ws.getRow(er);
        r.getCell(5).value = it.nome;
        r.getCell(6).value = Number(it.quantidade ?? 0);
        r.getCell(7).value = it.unidade ?? "";
        r.getCell(8).value = it.observacao ?? "";
        [5, 6, 7, 8].forEach((c) => {
          r.getCell(c).border = border;
          r.getCell(c).font = { name: "Arial" };
          if (c === 6 || c === 7) r.getCell(c).alignment = { horizontal: "center" };
        });
        er += 1;
      });
      const totalRow = ws.getRow(er);
      totalRow.getCell(5).value = "TOTAL";
      totalRow.getCell(6).value = itens.reduce((s, i) => s + Number(i.quantidade ?? 0), 0);
      [5, 6, 7, 8].forEach((c) => {
        totalRow.getCell(c).font = { name: "Arial", bold: true };
        totalRow.getCell(c).fill = headFill;
        totalRow.getCell(c).border = border;
      });
      totalRow.getCell(6).alignment = { horizontal: "center" };


      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-aspersores-${environment ?? "map"}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel gerado", { id: t });
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao gerar Excel", { id: t });
    } finally {
      setExportingXlsx(false);
    }
  };



  // Mark dirty when the user changes zoom/rotation so Salvar persists the view
  // (apenas depois do carregamento inicial — antes disso a mudança vem do próprio load)
  useEffect(() => {
    if (!loadedRef.current) return;
    setDirty(true);
  }, [zoom, rotation]);

  // Auto-save (pré-salvo): grava automaticamente após 800ms de inatividade
  // sempre que houver ícones adicionados, rotas fechadas ou qualquer alteração.
  const autoSaveRef = useRef<number | null>(null);
  useEffect(() => {
    if (!loadedRef.current) return;
    if (!dirty || !isAdmin || !environment) return;
    if (autoSaveRef.current) window.clearTimeout(autoSaveRef.current);
    autoSaveRef.current = window.setTimeout(() => { save({ silent: true }); }, 800);
    return () => { if (autoSaveRef.current) window.clearTimeout(autoSaveRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, state.objects, state.layers, zoom, rotation, metersPerPixel, environment, isAdmin]);


  // Salva ao sair da página (fechar aba, navegar)
  useEffect(() => {
    const onBeforeUnload = () => {
      if (dirty && isAdmin && environment) { save({ silent: true }); }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, isAdmin, environment]);

  // ------------- Drawing state -------------
  const [draft, setDraft] = useState<MapObject | null>(null);
  const [draftCursor, setDraftCursor] = useState<Pt | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; sl: number; st: number; moved: boolean } | null>(null);
  const rotateRef = useRef<{ cx: number; cy: number; startAngle: number; startRot: number } | null>(null);

  const pendingPlaceRef = useRef<{ tool: ToolId; p: Pt } | null>(null);

  const layerVisible = (l: LayerId) => state.layers.find((x) => x.id === l)?.visible ?? true;
  const layerLocked = (l: LayerId) => state.layers.find((x) => x.id === l)?.locked ?? false;

  const now = () => Date.now();
  const base = (layer: LayerId) => ({
    id: uid(), layer, color, opacity: 1,
    createdAt: now(), updatedAt: now(), createdBy: user?.id ?? null,
  });

  // ---------- Pointer events on stage ----------
  const onStageDown = (e: React.PointerEvent) => {
    if (!isAdmin) return;
    const p = getPos(e);

    // Middle mouse button: rotate the map around its center
    if (e.button === 1) {
      e.preventDefault();
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
        rotateRef.current = { cx, cy, startAngle, startRot: rotation };
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      }
      return;
    }

    // View mode: allow only pan by drag
    if (viewMode) {
      const el = containerRef.current;
      if (el) {
        panRef.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop, moved: false };
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      }
      return;
    }

    // Any tool that only places on click: start pan tracking; place on up if no drag.
    const placeTools: ToolId[] = ["marker", "sprinkler", "icon", "number", "arrow", "text"];
    if (tool === "select" || tool === "pan" || placeTools.includes(tool)) {
      const el = containerRef.current;
      if (el) {
        panRef.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop, moved: false };
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      }
      if (tool === "select") dispatch({ type: "SELECT", ids: [] });
      if (placeTools.includes(tool)) pendingPlaceRef.current = { tool, p };
      return;
    }

    if (tool === "circle") {
      setDraft({
        ...base("anotacoes"), type: "circle", cx: p.x, cy: p.y, r: 0, width: strokeWidth,
        fill: color, fillOpacity: 0.2, x: p.x, y: p.y, layerId: "anotacoes"
      } as MapObject);
      return;
    }
    if (tool === "line") {
      // Linha simples: finaliza no segundo clique.
      if (!draft || draft.type !== "line") {
        setDraft({ ...base("anotacoes"), type: "line", points: [p], width: strokeWidth, x: p.x, y: p.y, layerId: "anotacoes" } as MapObject);
        setDraftCursor(p);
      } else {
        const finished = { ...draft, points: [...draft.points, p] } as MapObject;
        commit({ type: "ADD", objects: [finished] });
        setDraft(null); setDraftCursor(null);
        setTool("select");
      }
      return;
    }
    if (tool === "polygon") {
      if (!draft || draft.type !== "polygon") {
        setDraft({
          ...base("anotacoes"), type: "polygon", points: [p], width: strokeWidth,
          fill: color, fillOpacity: 0.25, x: p.x, y: p.y, layerId: "anotacoes"
        } as MapObject);
      } else {
        setDraft({ ...draft, points: [...draft.points, p] } as MapObject);
      }
      setDraftCursor(p);
      return;
    }
    if (tool === "route") {
      if (!draft || draft.type !== "route") {
        setDraft({ ...base("rotas"), type: "route", points: [p], width: strokeWidth, showDirection: true, closed: false, x: p.x, y: p.y, layerId: "rotas" } as MapObject);
      } else {
        // Snap ao primeiro ponto para fechar a rota (área em m²)
        const first = draft.points[0];
        const snapPx = Math.max(12, strokeWidth * 4) / (zoom || 1);
        if (draft.points.length >= 2 && first && Math.hypot(p.x - first.x, p.y - first.y) <= snapPx) {
          const closed = { ...draft, closed: true } as MapObject;
          commit({ type: "ADD", objects: [closed] });
          setDraft(null); setDraftCursor(null);
          setTool("select");
          return;
        }
        setDraft({ ...draft, points: [...draft.points, p] } as MapObject);
      }
      setDraftCursor(p);
      return;
    }
    if (tool === "measure") {
      if (!draft || draft.type !== "measure") {
        setDraft({ ...base("anotacoes"), type: "measure", points: [p], mode: "distance", x: p.x, y: p.y, layerId: "anotacoes" } as MapObject);
      } else {
        setDraft({ ...draft, points: [...draft.points, p] } as MapObject);
      }
      setDraftCursor(p);
      return;
    }
  };

  const onStageMove = (e: React.PointerEvent) => {
    if (dragRef.current) return;
    // rotate (middle mouse)
    if (rotateRef.current) {
      const { cx, cy, startAngle, startRot } = rotateRef.current;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
      setRotation(startRot + (angle - startAngle));
      return;
    }
    // pan
    if (panRef.current) {
      const el = containerRef.current;
      if (el) {
        const dx = e.clientX - panRef.current.x;
        const dy = e.clientY - panRef.current.y;
        if (!panRef.current.moved && Math.hypot(dx, dy) > 4) panRef.current.moved = true;
        el.scrollLeft = panRef.current.sl - dx;
        el.scrollTop = panRef.current.st - dy;
      }
      return;
    }
    if (!draft) return;
    const p = getPos(e);
    if (draft.type === "circle") {
      setDraft({ ...draft, r: Math.hypot(p.x - draft.cx, p.y - draft.cy) });
      return;
    }
    setDraftCursor(p);
  };

  const finishDraft = () => {
    if (!draft) return;
    const wasDrawing = draft.type;
    if (draft.type === "circle" && draft.r > 2) {
      commit({ type: "ADD", objects: [draft] });
    } else if (draft.type === "route" && draft.points.length >= 3) {
      // Rota fecha automaticamente no último ponto e vira área em m²
      commit({ type: "ADD", objects: [{ ...draft, closed: true } as MapObject] });
    } else if ((draft.type === "line" || draft.type === "polygon" || draft.type === "route" || draft.type === "measure") && draft.points.length >= 2) {
      commit({ type: "ADD", objects: [draft] });
    }
    setDraft(null);
    setDraftCursor(null);
    // Só reinicia outra medição/rota se o usuário clicar novamente no ícone da ferramenta
    if (wasDrawing === "route" || wasDrawing === "measure" || wasDrawing === "line" || wasDrawing === "polygon" || wasDrawing === "circle") {
      setTool("select");
    }
  };

  const onStageUp = () => {
    if (rotateRef.current) { rotateRef.current = null; return; }
    const pending = pendingPlaceRef.current;
    const wasPan = panRef.current;
    pendingPlaceRef.current = null;
    panRef.current = null;

    // If a place-tool clicked without drag, place the object now
    if (pending && wasPan && !wasPan.moved) {
      const { tool: t, p } = pending;
      if (t === "marker" || t === "sprinkler" || t === "icon") {
        const kind = t === "marker" ? "local" : t === "sprinkler" ? "aspersor_360" : iconKind;
        const def = getIcon(kind);
        commit({ type: "ADD", objects: [{
          ...base(def?.defaultLayer ?? "anotacoes"),
          type: "icon", kind, x: p.x, y: p.y, size: iconSize, rotation: 0, layerId: def?.defaultLayer ?? "anotacoes"
        }] });
      } else if (t === "number") {
        commit({ type: "ADD", objects: [{
          ...base("anotacoes"),
          type: "number", x: p.x, y: p.y, value: numberValue, size: iconSize, rotation: 0, layerId: "anotacoes"
        }] });
        const n = parseInt(numberValue, 10);
        if (!isNaN(n)) setNumberValue(String(n + 1));
      } else if (t === "arrow") {
        commit({ type: "ADD", objects: [{
          ...base("anotacoes"), type: "icon", kind: "seta", x: p.x, y: p.y, size: iconSize, rotation: 0, layerId: "anotacoes"
        }] });
      } else if (t === "text") {
        commit({ type: "ADD", objects: [{
          ...base("anotacoes"), type: "text", x: p.x, y: p.y, text: "Texto", size: textSize,
          font: "Montserrat, system-ui, sans-serif", rotation: 0, layerId: "anotacoes",
        }] });
      }
    }
    if (draft && draft.type === "circle") finishDraft();
  };

  const onStageDoubleClick = () => {
    if (viewMode) return;
    if (draft) finishDraft();
  };

  // ESC/Enter finalize
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setDraft(null); setDraftCursor(null); }
      if (e.key === "Enter") finishDraft();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); }
      if (e.key === "Delete" && !viewMode && state.selection.length) commit({ type: "DELETE", ids: state.selection });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [state.selection, draft]);

  // ---------- Selection & drag existing ----------
  const resizeRef = useRef<{ id: string; startSize: number; startDist: number } | null>(null);

  const pushHistory = () => { history.current.push(state); forceRender((n) => n + 1); };

  const startDrag = (e: React.PointerEvent, obj: MapObject) => {
    if (tool !== "select" || viewMode || obj.locked || layerLocked(obj.layer)) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const p = getPos(e);
    const ox = (obj as any).x ?? (obj as any).cx ?? obj[obj.type === "circle" ? "cx" : "points" as any]?.[0]?.x ?? 0;
    const oy = (obj as any).y ?? (obj as any).cy ?? 0;
    pushHistory();
    dragRef.current = { id: obj.id, dx: p.x - ox, dy: p.y - oy };
    dispatch({ type: "SELECT", ids: e.shiftKey ? [...state.selection, obj.id] : [obj.id] });
  };

  const startResize = (e: React.PointerEvent, obj: MapObject) => {
    if (tool !== "select" || viewMode || obj.locked || layerLocked(obj.layer)) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const p = getPos(e);
    const cx = (obj as any).x ?? 0;
    const cy = (obj as any).y ?? 0;
    pushHistory();
    resizeRef.current = {
      id: obj.id,
      startSize: (obj as any).size ?? 28,
      startDist: Math.max(1, Math.hypot(p.x - cx, p.y - cy)),
    };
  };


  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      // Resize handle drag
      const r = resizeRef.current;
      if (r && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const p = {
          x: ((e.clientX - rect.left) / rect.width) * IMG_W,
          y: ((e.clientY - rect.top) / rect.height) * IMG_H,
        };
        const obj = state.objects.find((o) => o.id === r.id) as any;
        if (!obj) return;
        const dist = Math.max(1, Math.hypot(p.x - obj.x, p.y - obj.y));
        const newSize = Math.max(6, Math.min(400, r.startSize * (dist / r.startDist)));
        dispatch({ type: "UPDATE", id: r.id, patch: { size: newSize } as any });
        setDirty(true);
        return;
      }
      const d = dragRef.current;
      if (!d || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const p = {
        x: ((e.clientX - rect.left) / rect.width) * IMG_W,
        y: ((e.clientY - rect.top) / rect.height) * IMG_H,
      };
      const obj = state.objects.find((o) => o.id === d.id);
      if (!obj) return;
      if (obj.points) {
        const first = obj.points[0];
        const dx = p.x - d.dx - first.x;
        const dy = p.y - d.dy - first.y;
        dispatch({ type: "UPDATE", id: d.id, patch: { points: obj.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) } as any });
      } else {
        dispatch({ type: "UPDATE", id: d.id, patch: { x: p.x - d.dx, y: p.y - d.dy } as any });
      }
      setDirty(true);
    };
    const onUp = () => {
      if (dragRef.current) { dragRef.current = null; setDirty(true); }
      if (resizeRef.current) { resizeRef.current = null; setDirty(true); }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [state.objects]);


  // ---------- Filtered objects for rendering ----------
  const visible = useMemo(
    () => state.objects.filter((o) => !o.hidden && layerVisible(o.layerId)),
    // eslint-disable-next-line
    [state.objects, state.layers]
  );

  const searchMatches = useMemo(() => {
    if (!searchQ.trim()) return [] as string[];
    const q = searchQ.toLowerCase();
    return state.objects
      .filter((o) => {
        const parts = [o.label, o.description, o.text, o.value, o.kind, o.type].join(" ").toLowerCase();
        return parts.includes(q);
      })
      .map((o) => o.id);
  }, [searchQ, state.objects]);

  // ---------- Import ----------
  const fileRef = useRef<HTMLInputElement>(null);
  const onImport = async (file: File) => {
    const raw = await file.text();
    const s = parseJson(raw);
    if (!s) return toast.error("Arquivo inválido");
    commit({ type: "REPLACE", state: s });
    toast.success("Importado");
  };

  const selectedObj = state.objects.find((o) => o.id === state.selection[0]);

  // Sequential counter per icon kind (by creation order) — shows a small number under each icon
  const iconCounters = useMemo(() => {
    const map = new Map<string, number>();
    const counts: Record<string, number> = {};
    for (const o of state.objects) {
      if (o.type === "icon") {
        counts[o.kind] = (counts[o.kind] ?? 0) + 1;
        map.set(o.id, counts[o.kind]);
      }
    }
    return map;
  }, [state.objects]);

  // ---------- Render helpers ----------
  const renderObj = (o: MapObject, opts: { isDraft?: boolean; isSelected?: boolean; blink?: boolean } = {}) => {
    const dim = opts.isDraft ? 0.7 : 1;
    const selStroke = opts.isSelected ? { stroke: "#3b82f6", strokeDasharray: "4 3" } : {};
    const blinkAnim = opts.blink ? <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="4" /> : null;
    const common = { opacity: (o.opacity ?? 1) * dim };
    switch (o.type) {
      case "icon": {
        const def = getIcon(o.kind);
        const counter = iconCounters.get(o.id);
        const badgeSize = Math.max(3, o.size * 0.25);
        return (
          <g key={o.id} transform={`translate(${o.x}, ${o.y}) rotate(${o.rotation ?? 0})`} style={{ cursor: tool === "select" ? "grab" : "inherit" }} onPointerDown={(e) => startDrag(e, o)} {...common}>
            <text textAnchor="middle" dominantBaseline="central" style={{ fontSize: o.size, userSelect: "none" }}>{def?.emoji ?? "📍"}</text>
            {counter !== undefined && (
              <text
                textAnchor="middle"
                dominantBaseline="central"
                x={0}
                y={o.size * 0.65}
                fill="#fff"
                stroke="#000"
                strokeWidth={Math.max(0.3, badgeSize * 0.12)}
                paintOrder="stroke"
                fontWeight={700}
                style={{ fontSize: badgeSize, fontFamily: "Montserrat, system-ui, sans-serif", userSelect: "none" }}
              >
                {counter}
              </text>
            )}
            {opts.isSelected && <rect x={-o.size / 1.4} y={-o.size / 1.4} width={o.size * 1.4} height={o.size * 1.4} fill="none" {...selStroke} />}
            {blinkAnim}
          </g>
        );
      }
      case "number": {
        const r = o.size * 0.7;
        return (
          <g key={o.id} transform={`translate(${o.x}, ${o.y}) rotate(${o.rotation ?? 0})`} onPointerDown={(e) => startDrag(e, o)} {...common}>
            <circle r={r} fill={o.color} opacity={0.9} />
            <text textAnchor="middle" dominantBaseline="central" fill="#fff" fontWeight="bold" style={{ fontSize: o.size * 0.9 }}>{o.value}</text>
            {blinkAnim}
          </g>
        );
      }
      case "text":
        return (
          <g key={o.id} transform={`translate(${o.x}, ${o.y}) rotate(${o.rotation ?? 0})`} onPointerDown={(e) => startDrag(e, o)} {...common}>
            <text fill={o.color} style={{ fontSize: o.size, fontFamily: o.font, fontWeight: o.bold ? 700 : 400, fontStyle: o.italic ? "italic" : "normal" }}>{o.text}</text>
            {blinkAnim}
          </g>
        );
      case "line":
        return (
          <g key={o.id} onPointerDown={(e) => startDrag(e, o)} {...common}>
            <polyline
              points={o.points?.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none" stroke={o.color ?? o.strokeColor} strokeWidth={o.strokeWidth ?? o.width}
              strokeDasharray={o.dashed ? "10 6" : undefined}
              strokeLinecap="round" strokeLinejoin="round"
              {...(opts.isSelected ? selStroke : {})}
            />
            {blinkAnim}
          </g>
        );
      case "polygon":
        return (
          <g key={o.id} onPointerDown={(e) => startDrag(e, o)} {...common}>
            <polygon
              points={o.points?.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={o.fillColor ?? o.fill} fillOpacity={o.fillOpacity ?? 0.25} stroke={o.color ?? o.strokeColor} strokeWidth={o.strokeWidth ?? o.width}
              {...(opts.isSelected ? selStroke : {})}
            />
            {blinkAnim}
          </g>
        );
      case "circle":
        return (
          <g key={o.id} onPointerDown={(e) => startDrag(e, o)} {...common}>
            <circle cx={o.cx ?? o.x} cy={o.cy ?? o.y} r={o.r ?? o.radius} fill={o.fillColor ?? o.fill ?? "none"} fillOpacity={o.fillOpacity ?? 0.2} stroke={o.color ?? o.strokeColor} strokeWidth={o.strokeWidth ?? o.width} {...(opts.isSelected ? selStroke : {})} />
            {blinkAnim}
          </g>
        );
      case "route": {
        const isClosed = (o as any).closed || (o.points && o.points.length >= 3);
        const pts = o.points?.map((p) => `${p.x},${p.y}`).join(" ") || "";
        const perimPx = o.points ? (distance(o.points) + (isClosed && o.points.length >= 2
          ? Math.hypot(o.points[0].x - o.points[o.points.length - 1].x, o.points[0].y - o.points[o.points.length - 1].y)
          : 0)) : 0;
        const areaPx2 = (isClosed && o.points) ? polygonArea(o.points) : 0;
        const cx = o.points ? o.points.reduce((s, p) => s + p.x, 0) / o.points.length : 0;
        const cy = o.points ? o.points.reduce((s, p) => s + p.y, 0) / o.points.length : 0;
        const selectRoute = (e: React.PointerEvent) => {
          if (tool !== "select") {
            e.stopPropagation();
            setTool("select");
            dispatch({ type: "SELECT", ids: [o.id] });
            setShowProps(true);
          } else {
            setShowProps(true);
            startDrag(e, o);
          }
        };
        return (
          <g key={o.id} style={{ cursor: "pointer" }} onPointerDown={selectRoute} {...common}>
            {/* Área de clique expandida para rotas abertas */}
            {!isClosed && (
              <polyline points={pts} fill="none" stroke="transparent" strokeWidth={Math.max(o.width * 5, 14 / zoom)} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "stroke" }} />
            )}
            {isClosed ? (
              <polygon points={pts} fill={(o as any).fill ?? o.fillColor ?? o.color} fillOpacity={(o as any).fillOpacity ?? 0.25} stroke={o.color ?? o.strokeColor} strokeWidth={o.strokeWidth ?? o.width} strokeLinejoin="round" {...(opts.isSelected ? selStroke : {})} />
            ) : (
              <polyline points={pts} fill="none" stroke={o.color ?? o.strokeColor} strokeWidth={o.strokeWidth ?? o.width} strokeLinecap="round" strokeLinejoin="round" {...(opts.isSelected ? selStroke : {})} />
            )}
            {o.points?.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={(o.strokeWidth ?? o.width ?? 3) * 1.5} fill="#fff" stroke={o.color ?? o.strokeColor} strokeWidth={(o.strokeWidth ?? o.width ?? 3) * 0.5} />
            ))}

            {isClosed ? (
              <text x={cx} y={cy} fill={o.color ?? o.strokeColor} textAnchor="middle" style={{ fontFamily: "Montserrat, system-ui, sans-serif", fontWeight: 400, fontSize: Math.max(6, 11 / zoom), paintOrder: "stroke", stroke: "#fff", strokeWidth: Math.max(1, 2 / zoom) } as any}>
                {fmtM2(areaPx2)} · {fmtM(perimPx)}
              </text>
            ) : (
              o.points && o.points.length > 0 && (
                <text x={o.points[o.points.length - 1].x + 6 / zoom} y={o.points[o.points.length - 1].y - 6 / zoom} fill={o.color ?? o.strokeColor} style={{ fontFamily: "Montserrat, system-ui, sans-serif", fontWeight: 400, fontSize: Math.max(6, 11 / zoom), paintOrder: "stroke", stroke: "#fff", strokeWidth: Math.max(1, 2 / zoom) } as any}>
                  {fmtM(perimPx)} · {o.points.length} pts
                </text>
              )
            )}
            {blinkAnim}
          </g>
        );
      }
      case "measure": {
        const d = o.points ? distance(o.points) : 0;
        const last = o.points ? o.points[o.points.length - 1] : null;
        return (
          <g key={o.id} {...common}>
            <polyline points={o.points?.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#f59e0b" strokeWidth={3} strokeDasharray="8 4" />
            {last && <text x={last.x + 6 / zoom} y={last.y - 6 / zoom} fill="#f59e0b" style={{ fontFamily: "Montserrat, system-ui, sans-serif", fontWeight: 400, fontSize: Math.max(6, 11 / zoom), paintOrder: "stroke", stroke: "#fff", strokeWidth: Math.max(1, 2 / zoom) } as any}>{fmtM(d)}</text>}
          </g>
        );
      }
    }
  };

  const setLayer = (id: string, patch: Partial<MapObject>) => commit({ type: "UPDATE", id, patch });

  const tools: { id: ToolId; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Selecionar" },
    { id: "marker", icon: MapPin, label: "Marcador" },
    { id: "sprinkler", icon: Droplets, label: "Aspersor" },
    { id: "number", icon: Hash, label: "Número" },
    { id: "arrow", icon: ArrowRight, label: "Seta" },
    { id: "text", icon: TypeIcon, label: "Texto" },
    { id: "line", icon: Minus, label: "Linha" },
    { id: "polygon", icon: Hexagon, label: "Polígono" },
    { id: "circle", icon: CircleDot, label: "Círculo" },
    { id: "measure", icon: Ruler, label: "Medição" },
    { id: "route", icon: RouteIcon, label: "Rota" },
  ];

  const imgUrl = (mapaImg as any).url as string;

  return (
    <div className="relative w-full h-[calc(100vh-90px)] min-h-[600px] bg-background flex flex-col rounded-xl border border-border/60 overflow-hidden text-xs">
      {/* Top bar */}
      <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1 flex-wrap">
        {onClose && (
          <>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onClose}><X className="h-3.5 w-3.5 mr-1" />Fechar</Button>
            <div className="h-5 w-px bg-border" />
          </>
        )}
        {isAdmin && (
          <>
            <Button
              size="sm"
              variant={viewMode ? "outline" : "default"}
              className="h-7 px-2 text-xs gap-1"
              onClick={() => { setViewMode((v) => !v); setTool("select"); setDraft(null); }}
              title={viewMode ? "Ativar modo edição" : "Voltar ao modo visualização"}
            >
              {viewMode ? <><Eye className="h-3.5 w-3.5" /> Visualização</> : <><Unlock className="h-3.5 w-3.5" /> Edição</>}
            </Button>
            <div className="h-5 w-px bg-border" />
          </>
        )}
        {!viewMode && tools.map((t) => (
          <Button key={t.id} size="icon" variant={tool === t.id ? "default" : "outline"} className="h-7 w-7" onClick={() => { setTool(t.id); setDraft(null); }} title={t.label}>
            <t.icon className="h-3.5 w-3.5" />
          </Button>
        ))}
        {!viewMode && <div className="h-5 w-px bg-border" />}
        {!viewMode && <>
        <label className="text-[11px]">Cor</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-8 rounded border border-border" />
        {(tool === "line" || tool === "polygon" || tool === "circle" || tool === "route" || tool === "measure") && (
          <div className="flex items-center gap-1">
            <label className="text-[11px]">Esp.</label>
            <input type="range" min={1} max={20} value={strokeWidth} onChange={(e) => setStrokeWidth(+e.target.value)} className="w-20" />
          </div>
        )}
        {(tool === "route" || tool === "measure" || (state.selection.length === 1)) && (
          <div className="flex items-center gap-1" title="Escala do mapa: metros por pixel">
            <label className="text-[11px]">m/px</label>
            <Input
              type="number"
              step="0.01"
              min={0.001}
              value={metersPerPixel}
              onChange={(e) => { const v = +e.target.value; if (v > 0) { setMetersPerPixel(v); setDirty(true); } }}
              className="h-7 w-16 text-xs"
            />
          </div>
        )}
        {(tool === "marker" || tool === "sprinkler" || tool === "icon" || tool === "arrow" || tool === "number") && (
          <div className="flex items-center gap-1">
            <label className="text-[11px]">Tam.</label>
            <input type="range" min={1} max={200} value={iconSize} onChange={(e) => setIconSize(+e.target.value)} className="w-20" />
            <Input type="number" min={1} max={400} value={iconSize} onChange={(e) => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) setIconSize(Math.max(1, Math.min(400, v))); }} className="h-7 w-12 text-xs" />
            <span className="inline-flex items-center justify-center rounded border border-border bg-muted/40" style={{ width: 26, height: 26 }} title="Prévia do tamanho">
              <span style={{ fontSize: Math.min(20, iconSize * 0.6), lineHeight: 1 }}>
                {tool === "marker" ? "📍" : tool === "arrow" ? "➡️" : tool === "number" ? numberValue : (getIcon(iconKind)?.emoji ?? "💦")}
              </span>
            </span>
          </div>
        )}
        {tool === "number" && (
          <Input value={numberValue} onChange={(e) => setNumberValue(e.target.value)} className="h-7 w-12 text-xs" />
        )}
        <div className="h-5 w-px bg-border" />
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={undo} disabled={!history.current.canUndo()}><Undo2 className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={redo} disabled={!history.current.canRedo()}><Redo2 className="h-3.5 w-3.5" /></Button>
        </>}
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.2).toFixed(2)))}><ZoomOut className="h-3.5 w-3.5" /></Button>
        <span className="text-[11px] w-10 text-center">{Math.round(zoom * 100)}%</span>
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(40, +(z + 0.2).toFixed(2)))}><ZoomIn className="h-3.5 w-3.5" /></Button>
        {!viewMode && <>
        <div className="h-5 w-px bg-border" />
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => downloadFile("mapa.json", exportJson(state))}><Download className="h-3.5 w-3.5 mr-1" />JSON</Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => downloadFile("mapa.geojson", exportGeoJson(state), "application/geo+json")}><Download className="h-3.5 w-3.5 mr-1" />GeoJSON</Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5 mr-1" />Importar</Button>
        <input ref={fileRef} type="file" accept=".json,.geojson,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onImport(f); }} />
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setConfirmClear(true)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </>}
        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Buscar..." className="h-7 pl-7 w-32 text-xs" />
          </div>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={exportPdf} disabled={exportingPdf} title="Exportar mapa como PDF"><FileDown className="h-3.5 w-3.5 mr-1" />{exportingPdf ? "..." : "PDF"}</Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={exportExcel} disabled={exportingXlsx} title="Exportar relatório em Excel (mapa, legenda e estoque)"><FileSpreadsheet className="h-3.5 w-3.5 mr-1" />{exportingXlsx ? "..." : "Excel"}</Button>

          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => save()} disabled={saving || !dirty}><Save className="h-3.5 w-3.5 mr-1" />{saving ? "..." : dirty ? "Salvar" : "Salvo"}</Button>
        </div>
      </div>

      {/* Sub-toolbar: icon library */}
      {showIcons && (tool === "icon" || tool === "marker" || tool === "sprinkler") && (
        <div className="border-b border-border/60 px-2 py-1 flex flex-wrap items-center gap-1">
          {ICON_CATEGORIES.map((c) => (
            <Button key={c.id} size="sm" variant={iconCategory === c.id ? "default" : "outline"} className="h-6 px-2 text-[11px]" onClick={() => setIconCategory(c.id)}>{c.label}</Button>
          ))}
          <div className="h-5 w-px bg-border" />
          <div className="flex flex-wrap gap-1">
            {ICON_LIBRARY.filter((i) => i.category === iconCategory).map((i) => (
              <button
                key={i.kind}
                onClick={() => { setIconKind(i.kind); setTool("icon"); }}
                className={`px-1.5 py-0.5 rounded text-[11px] border ${iconKind === i.kind ? "border-primary bg-primary/10" : "border-border"}`}
                title={i.label}
              >
                <span className="mr-1">{i.emoji}</span>
                <span className="hidden md:inline">{i.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}



      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Layers panel */}
        {showLayers && (
          <div className="w-56 border-r border-border/60 overflow-y-auto p-2 hidden md:block">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold flex items-center gap-1"><LayersIcon className="h-3.5 w-3.5" />Camadas</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowLayers(false)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
            </div>
            {state.layers.map((l) => {
              const damaged = l.id === "aspersores"
                ? state.objects.filter((o) => o.type === "icon" && (o as any).kind === "aspersor_danificado").length
                : 0;
              const count = state.objects.filter((o) => o.layer === l.id).length - damaged;
              return (
                <div key={l.id} className="flex items-center gap-1 py-1">
                  <button onClick={() => dispatch({ type: "TOGGLE_LAYER", id: l.id, field: "visible" })} title="Visibilidade">
                    {l.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => dispatch({ type: "TOGGLE_LAYER", id: l.id, field: "locked" })} title="Bloquear">
                    {l.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <span className="text-xs flex-1 truncate">{l.label}</span>
                  {l.id === "aspersores" && damaged > 0 && (
                    <span className="text-[10px] text-red-500 font-semibold" title="Aspersores Danificados">🔴 {damaged}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                </div>
              );
            })}
            <div className="border-t border-border/60 my-2" />
            <div className="text-xs font-semibold mb-1">Estatísticas</div>
            <div className="text-[11px] text-muted-foreground">Objetos: {state.objects.length}</div>
            <div className="text-[11px] text-muted-foreground">Selecionados: {state.selection.length}</div>
          </div>
        )}
        {!showLayers && (
          <Button size="icon" variant="ghost" onClick={() => setShowLayers(true)} className="self-start mt-2 hidden md:flex"><ChevronRight className="h-4 w-4" /></Button>
        )}

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-muted/30 select-none" style={{ touchAction: "none", overscrollBehavior: "contain", WebkitUserSelect: "none", userSelect: "none" }} onPointerDown={onStageDown as any} onPointerMove={onStageMove as any} onPointerUp={onStageUp} onDoubleClick={onStageDoubleClick} onWheel={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
          <div style={{ width: disp.w, height: disp.h, position: "relative", transform: `rotate(${rotation}deg)`, transformOrigin: "center center" }} onDragStart={(e) => e.preventDefault()}>
            <img src={imgUrl} alt="Mapa" className="absolute inset-0 w-full h-full select-none pointer-events-none" draggable={false} onDragStart={(e) => e.preventDefault()} style={{ WebkitUserDrag: "none" } as any} />
            <svg
              ref={svgRef}
              viewBox={`0 0 ${IMG_W} ${IMG_H}`}
              className="absolute inset-0 w-full h-full"
              style={{ touchAction: "none" }}
            >
              {visible.map((o) => renderObj(o, {
                isSelected: state.selection.includes(o.id),
                blink: searchMatches.includes(o.id),
              }))}
              {draft && renderObj(draft, { isDraft: true })}
              {/* preview edge from last draft point to cursor */}
              {draft && draftCursor && "points" in draft && draft.points.length > 0 && (
                <line
                  x1={draft.points[draft.points.length - 1].x}
                  y1={draft.points[draft.points.length - 1].y}
                  x2={draftCursor.x} y2={draftCursor.y}
                  stroke={draft.color} strokeWidth={(draft as any).width ?? 2} strokeDasharray="6 4" opacity={0.6}
                />
              )}
            </svg>
          </div>
          {draft && "points" in draft && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 text-white text-xs px-3 py-1">
              {draft.type === "polygon" ? "Clique para adicionar vértices · Duplo clique / Enter finaliza · Esc cancela" :
              draft.type === "route" ? `Rota: ${draft.points.length} pts · ${fmtM(distance(draft.points))}${draft.points.length >= 3 ? ` · ${fmtM2(polygonArea(draft.points))}` : ""} · Clique no 1º ponto ou duplo clique para fechar` :
              draft.type === "measure" ? `Medição: ${fmtM(distance(draft.points))} · Duplo clique finaliza` :
               "Clique para adicionar pontos · Duplo clique / Enter finaliza"}
            </div>
          )}
        </div>

        {/* Property panel */}
        {showProps && selectedObj && (
          <div className="w-64 border-l border-border/60 overflow-y-auto p-3 hidden md:block">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">Propriedades</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowProps(false)}><X className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="text-[11px] text-muted-foreground mb-2">{selectedObj.type} · {selectedObj.id.slice(0, 6)}</div>
            <label className="text-xs">Nome</label>
            <Input value={selectedObj.label ?? ""} onChange={(e) => setLayer(selectedObj.id, { label: e.target.value })} className="h-8 mb-2" />
            <label className="text-xs">Descrição</label>
            <Input value={selectedObj.description ?? ""} onChange={(e) => setLayer(selectedObj.id, { description: e.target.value })} className="h-8 mb-2" />
            <label className="text-xs">Cor</label>
            <input type="color" value={selectedObj.color} onChange={(e) => setLayer(selectedObj.id, { color: e.target.value })} className="h-8 w-full rounded border border-border mb-2" />
            <label className="text-xs">Opacidade</label>
            <input type="range" min={0.1} max={1} step={0.05} value={selectedObj.opacity} onChange={(e) => setLayer(selectedObj.id, { opacity: +e.target.value })} className="w-full mb-2" />
            <label className="text-xs">Camada</label>
            <select value={selectedObj.layerId} onChange={(e) => setLayer(selectedObj.id, { layerId: e.target.value as LayerId })} className="h-8 w-full rounded border border-border bg-background text-xs mb-2">
              {state.layers.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            {"size" in selectedObj && (
              <>
                <label className="text-xs">Tamanho</label>
                <input type="range" min={1} max={200} value={(selectedObj as any).size} onChange={(e) => {
                  const v = +e.target.value;
                  setLayer(selectedObj.id, { size: v } as any);
                  if (selectedObj.type === "icon" || selectedObj.type === "number") setIconSize(v);
                }} className="w-full mb-2" />
              </>
            )}
            {"rotation" in selectedObj && (
              <>
                <label className="text-xs">Rotação</label>
                <input type="range" min={-180} max={180} value={(selectedObj as any).rotation ?? 0} onChange={(e) => setLayer(selectedObj.id, { rotation: +e.target.value } as any)} className="w-full mb-2" />
              </>
            )}
            {"text" in selectedObj && (
              <>
                <label className="text-xs">Texto</label>
                <Input value={selectedObj.text} onChange={(e) => setLayer(selectedObj.id, { text: e.target.value } as any)} className="h-8 mb-2" />
              </>
            )}
            {"value" in selectedObj && (
              <>
                <label className="text-xs">Número</label>
                <Input value={selectedObj.value} onChange={(e) => setLayer(selectedObj.id, { value: e.target.value } as any)} className="h-8 mb-2" />
              </>
            )}
            <div className="flex gap-1 mt-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                const copy = { ...selectedObj, id: uid(), createdAt: Date.now(), updatedAt: Date.now() } as MapObject;
                if ("x" in copy) { (copy as any).x += 30; (copy as any).y += 30; }
                if ("cx" in copy) { (copy as any).cx += 30; (copy as any).cy += 30; }
                if ("points" in copy) (copy as any).points = (copy as any).points.map((p: Pt) => ({ x: p.x + 30, y: p.y + 30 }));
                commit({ type: "ADD", objects: [copy] });
              }}><Copy className="h-3.5 w-3.5 mr-1" />Duplicar</Button>
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => commit({ type: "DELETE", ids: [selectedObj.id] })}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
              </Button>
            </div>
            {"points" in selectedObj && (
              <div className="mt-3 text-[11px] text-muted-foreground">
                Pontos: {selectedObj.points.length} · Comprimento: {fmtM(distance(selectedObj.points))}
                {selectedObj.type === "polygon" && <> · Área: {fmtM2(polygonArea(selectedObj.points))}</>}
                {selectedObj.type === "route" && (selectedObj as any).closed && <> · Área: {fmtM2(polygonArea(selectedObj.points))}</>}
              </div>
            )}
          </div>
        )}
      </div>
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os objetos?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação removerá todas as anotações do mapa atual. Você poderá desfazer com Ctrl+Z.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { commit({ type: "CLEAR" }); remoteCountRef.current = 0; }}>Limpar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
