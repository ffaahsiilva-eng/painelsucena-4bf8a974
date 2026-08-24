import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  RotateCw,
  Sprout,
  Leaf,
  Droplets,
  Wind,
  Trash2,
  Wheat,
  Check,
  X,
  Bell,
  FileDown,
  ImageDown,
  Loader2,
  History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { triggerBlobDownload } from "@/lib/pdfDownload";
import iconLimpezaMirante from "@/assets/cron-limpeza_mirante.png";
import iconRoco from "@/assets/cron-roco.png";
import iconReparoMudas from "@/assets/cron-reparo_mudas.png";
import iconAdubacao from "@/assets/cron-adubacao.png";
import iconLavagemPipa from "@/assets/cron-lavagem_pipa.png";
import iconLimpezaSoprador from "@/assets/cron-limpeza_soprador.png";


const iconImg = (src: string, alt: string) => (
  <img loading="lazy" decoding="async" src={src} alt={alt} className="object-contain mx-auto" style={{ width: 90, height: 90 }} />
);


interface AtividadeDef {
  key: string;
  icon: React.ReactNode;
  nome: string;
  descricao: string;
}

interface DataItem {
  date: string; // dd/MM
  done: boolean;
}

const DEFAULT_DATAS: DataItem[] = [
  { date: "15/05", done: false },
  { date: "30/05", done: false },
  { date: "14/06", done: false },
  { date: "29/06", done: false },
  { date: "14/07", done: false },
  { date: "29/07", done: false },
];

const ATIVIDADES: AtividadeDef[] = [
  { key: "limpeza_mirante", icon: iconImg(iconLimpezaMirante, "Limpeza no Mirante"), nome: "Limpeza no Mirante", descricao: "Limpeza geral do mirante, incluindo piso, corrimãos, bancos, lixeiras e áreas de circulação." },
  { key: "roco", icon: iconImg(iconRoco, "Roço"), nome: "Roço", descricao: "Roçagem da vegetação ao redor do mirante, trilhas e áreas adjacentes." },
  { key: "reparo_mudas", icon: iconImg(iconReparoMudas, "Reparo de Mudas"), nome: "Reparo de Mudas", descricao: "Verificação e reparo de mudas, troca de tutores, reposição de amarras e cuidados necessários." },
  { key: "adubacao", icon: iconImg(iconAdubacao, "Adubação"), nome: "Adubação", descricao: "Adubação das mudas e áreas verdes conforme necessidade." },
  { key: "lavagem_pipa", icon: iconImg(iconLavagemPipa, "Lavagem com Pipa"), nome: "Lavagem com Pipa", descricao: "Lavagem de pisos, corrimãos, bancos e áreas externas com caminhão pipa." },
  { key: "limpeza_soprador", icon: iconImg(iconLimpezaSoprador, "Limpeza com Soprador"), nome: "Limpeza com Soprador", descricao: "Limpeza de folhas, resíduos e detritos com soprador em toda a área do mirante e acessos." },
];

// Pará UTC-3 today (no time)
function paraToday(): Date {
  const now = new Date();
  const utcMs = now.getTime() - 3 * 60 * 60 * 1000;
  const d = new Date(utcMs);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseDate(ddmm: string): Date | null {
  const m = ddmm.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const today = paraToday();
  let y = m[3] ? parseInt(m[3], 10) : today.getUTCFullYear();
  if (y < 100) y += 2000;
  return new Date(Date.UTC(y, mo, d));
}

function diffDays(target: Date, base: Date): number {
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}

function fmtDDMM(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Gera o próximo ciclo de 6 datas a cada 15 dias, continuando após a última data concluída
function nextCycle(items: DataItem[]): DataItem[] {
  const parsed = items.map((i) => parseDate(i.date)).filter((d): d is Date => !!d);
  const last = parsed.length ? new Date(Math.max(...parsed.map((d) => d.getTime()))) : paraToday();
  const out: DataItem[] = [];
  for (let i = 1; i <= 6; i++) {
    const d = new Date(last.getTime() + i * 15 * 86400000);
    out.push({ date: fmtDDMM(d), done: false });
  }
  return out;
}

function cycleLabel(items: DataItem[]): string {
  const first = items[0]?.date || "";
  const lastD = items[items.length - 1]?.date || "";
  return first && lastD ? `${first} a ${lastD}` : "Ciclo";
}

interface HistoryRow {
  id: string;
  atividade_key: string;
  datas: DataItem[];
  ciclo_label: string | null;
  archived_at: string;
}



const EXPORT_EXTRA_BOTTOM = 92;
const EXPORT_WIDTH = 980;

function getCronogramaExportSize(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const width = Math.ceil(Math.max(EXPORT_WIDTH, rect.width, el.scrollWidth));
  return {
    width,
    height: Math.ceil(Math.max(rect.height, el.scrollHeight) + EXPORT_EXTRA_BOTTOM),
  };
}

function prepareCronogramaClone(doc: Document, width: number, height: number) {
  const card = doc.querySelector<HTMLElement>(".cronograma-card");
  if (card) {
    card.style.width = `${width}px`;
    card.style.maxWidth = "none";
    card.style.minHeight = `${height}px`;
    card.style.margin = "0";
    card.style.boxSizing = "border-box";
    card.style.overflow = "visible";
    card.style.paddingBottom = "96px";
  }

  card?.querySelectorAll<HTMLElement>(".overflow-x-auto").forEach((wrap) => {
    wrap.style.overflow = "visible";
    wrap.style.width = "100%";
  });

  card?.querySelectorAll<HTMLElement>(".cronograma-table").forEach((table) => {
    table.style.width = "100%";
    table.style.minWidth = "0";
  });

  doc.querySelectorAll<HTMLInputElement>("input.data-input").forEach((inp) => {
    const span = doc.createElement("div");
    span.textContent = inp.value || "";
    span.style.cssText = "width:100%;min-height:20px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;font-weight:700;color:#102b18;font-family:Arial,sans-serif;line-height:1;padding:0;box-sizing:border-box;overflow:visible;";
    inp.replaceWith(span);
  });

  doc.querySelectorAll<HTMLImageElement>(".linha-assinatura img").forEach((img) => {
    img.style.bottom = "-2px";
    img.style.height = "84px";
    img.style.maxHeight = "84px";
  });

  doc.querySelectorAll<HTMLElement>(".assinatura-area").forEach((area) => {
    area.style.alignItems = "flex-end";
    area.style.overflow = "visible";
    area.style.paddingBottom = "10px";
  });

  doc.querySelectorAll<HTMLElement>(".assinatura-area .border-b-2").forEach((d) => {
    d.style.height = "34px";
    d.style.alignItems = "center";
    d.style.lineHeight = "1";
    d.style.paddingBottom = "0";
    d.style.overflow = "visible";
  });
}

export default function CronogramaLimpezaMiranteTab() {
  const [data, setData] = useState<Record<string, DataItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [logo, setLogo] = useState<string>("");
  const [exportDate, setExportDate] = useState<{ d: string; m: string; y: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [histFrom, setHistFrom] = useState("");
  const [histTo, setHistTo] = useState("");

  const rollingRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => paraToday(), []);
  const isAllDoneRef = useRef<(m: Record<string, DataItem[]>) => boolean>(() => false);
  const rollCycleRef = useRef<(m: Record<string, DataItem[]>) => Promise<void>>(async () => {});


  useEffect(() => {
    getLogoBase64().then(setLogo);
  }, []);

  // Load
  useEffect(() => {
    (async () => {
      const { data: rows, error } = await supabase
        .from("cronograma_mirante" as any)
        .select("atividade_key, datas");
      const map: Record<string, DataItem[]> = {};
      ATIVIDADES.forEach((a) => (map[a.key] = DEFAULT_DATAS.map((d) => ({ ...d }))));
      if (!error && rows) {
        (rows as any[]).forEach((r: any) => {
          if (Array.isArray(r.datas) && r.datas.length) {
            map[r.atividade_key] = r.datas.map((d: any) =>
              typeof d === "string" ? { date: d, done: false } : { date: d.date, done: !!d.done }
            );
          }
        });
      }
      setData(map);
      setLoading(false);
      // Se o ciclo já estava totalmente concluído, arquiva e gera o próximo automaticamente
      if (isAllDoneRef.current(map)) {
        await rollCycleRef.current(map);
      }
    })();
  }, []);


  const persist = async (key: string, datas: DataItem[]) => {
    const { error } = await supabase
      .from("cronograma_mirante" as any)
      .upsert(
        { atividade_key: key, datas: datas as any },
        { onConflict: "environment,atividade_key" }
      );
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data: rows, error } = await supabase
      .from("cronograma_mirante_historico" as any)
      .select("id, atividade_key, datas, ciclo_label, archived_at")
      .order("archived_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Erro ao carregar histórico", description: error.message, variant: "destructive" });
    } else {
      setHistory((rows as any[]) as HistoryRow[]);
    }
    setHistoryLoading(false);
  };

  const openHistory = () => {
    setHistoryOpen(true);
    loadHistory();
  };

  // Arquiva o ciclo concluído e gera automaticamente o próximo
  const rollCycle = async (finished: Record<string, DataItem[]>) => {
    if (rollingRef.current) return;
    rollingRef.current = true;
    try {
      const inserts = ATIVIDADES.map((a) => ({
        atividade_key: a.key,
        datas: (finished[a.key] || []) as any,
        ciclo_label: cycleLabel(finished[a.key] || []),
      }));
      const { error: histError } = await supabase
        .from("cronograma_mirante_historico" as any)
        .insert(inserts as any);
      if (histError) throw histError;

      const next: Record<string, DataItem[]> = {};
      for (const a of ATIVIDADES) {
        next[a.key] = nextCycle(finished[a.key] || DEFAULT_DATAS);
      }
      setData(next);
      await Promise.all(ATIVIDADES.map((a) => persist(a.key, next[a.key])));
      toast({
        title: "Novo cronograma gerado",
        description: "O ciclo concluído foi salvo no histórico e as próximas datas foram criadas.",
      });
    } catch (e: any) {
      toast({ title: "Erro ao gerar novo cronograma", description: e?.message || "Falha", variant: "destructive" });
    } finally {
      rollingRef.current = false;
    }
  };

  const updateDate = (key: string, idx: number, value: string) => {
    setData((prev) => {
      const next = { ...prev, [key]: prev[key].map((d, i) => (i === idx ? { ...d, date: value } : d)) };
      return next;
    });
  };

  const commitDate = (key: string) => persist(key, data[key]);

  const isAllDone = (map: Record<string, DataItem[]>) =>
    ATIVIDADES.every((a) => {
      const items = map[a.key] || [];
      return items.length > 0 && items.every((d) => d.done);
    });

  isAllDoneRef.current = isAllDone;
  rollCycleRef.current = rollCycle;

  const filteredHistory = useMemo(() => {
    return history.filter((row) => {
      const day = (row.archived_at || "").slice(0, 10);
      if (histFrom && day < histFrom) return false;
      if (histTo && day > histTo) return false;
      return true;
    });
  }, [history, histFrom, histTo]);



  const toggleDone = async (key: string, idx: number) => {
    const next = { ...data, [key]: data[key].map((d, i) => (i === idx ? { ...d, done: !d.done } : d)) };
    setData(next);
    await persist(key, next[key]);
    if (isAllDone(next)) await rollCycle(next);
  };


  const cellClass = (item: DataItem): string => {
    if (item.done) return "data-cell data-done";
    const d = parseDate(item.date);
    if (!d) return "data-cell";
    const diff = diffDays(d, today);
    if (diff < 0) return "data-cell data-overdue";
    if (diff <= 2) return "data-cell data-reminder";
    return "data-cell";
  };

  const reminderLabel = (item: DataItem): string | null => {
    if (item.done) return null;
    const d = parseDate(item.date);
    if (!d) return null;
    const diff = diffDays(d, today);
    if (diff < 0) return `Atrasado ${Math.abs(diff)}d`;
    if (diff === 0) return "Hoje!";
    if (diff <= 2) return `Em ${diff}d`;
    return null;
  };

  const exportToPdf = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    const now = paraToday();
    setExportDate({
      d: String(now.getUTCDate()).padStart(2, "0"),
      m: String(now.getUTCMonth() + 1).padStart(2, "0"),
      y: String(now.getUTCFullYear()),
    });
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const el = cardRef.current;
      const { width: fullW, height: fullH } = getCronogramaExportSize(el);
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: fullW,
        height: fullH,
        windowWidth: fullW,
        windowHeight: fullH,
        scrollX: 0,
        scrollY: 0,
        onclone: (doc) => prepareCronogramaClone(doc, fullW, fullH),
      });
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 6;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;
      const ratio = canvas.width / canvas.height;
      let imgWidth = maxW;
      let imgHeight = imgWidth / ratio;
      if (imgHeight > maxH) {
        imgHeight = maxH;
        imgWidth = imgHeight * ratio;
      }
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);
      const blob = pdf.output("blob");
      const stamp = new Date().toISOString().slice(0, 10);
      triggerBlobDownload(blob, `cronograma-mirante-${stamp}.pdf`);
      toast({ title: "PDF gerado", description: "Cronograma exportado com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro ao exportar", description: e?.message || "Falha", variant: "destructive" });
    } finally {
      setExporting(false);
      setExportDate(null);
    }
  };

  const exportToPng = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    const now = paraToday();
    setExportDate({
      d: String(now.getUTCDate()).padStart(2, "0"),
      m: String(now.getUTCMonth() + 1).padStart(2, "0"),
      y: String(now.getUTCFullYear()),
    });
    try {
      const { default: html2canvas } = await import("html2canvas");
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const el = cardRef.current;
      const { width: fullW, height: fullH } = getCronogramaExportSize(el);
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: fullW,
        height: fullH,
        windowWidth: fullW,
        windowHeight: fullH,
        scrollX: 0,
        scrollY: 0,
        onclone: (doc) => prepareCronogramaClone(doc, fullW, fullH),
      });
      const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
      if (!blob) throw new Error("Falha ao gerar imagem");
      const stamp = new Date().toISOString().slice(0, 10);
      triggerBlobDownload(blob, `cronograma-mirante-${stamp}.png`);
      toast({ title: "PNG gerado", description: "Cronograma exportado como imagem." });
    } catch (e: any) {
      toast({ title: "Erro ao exportar", description: e?.message || "Falha", variant: "destructive" });
    } finally {
      setExporting(false);
      setExportDate(null);
    }
  };

  if (loading) {
    return <div className="cronograma-page"><div className="cronograma-card">Carregando...</div></div>;
  }

  return (
    <div className="cronograma-page">
      <div className="flex flex-wrap justify-end gap-2 mb-3 max-w-[980px] mx-auto">
        <Button onClick={openHistory} variant="outline" size="icon" title="Histórico de manutenção do Mirante" aria-label="Histórico de manutenção do Mirante">
          <History className="h-4 w-4" />
        </Button>
        <Button onClick={exportToPng} disabled={exporting} variant="outline" className="gap-2">

          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
          Exportar PNG
        </Button>
        <Button onClick={exportToPdf} disabled={exporting} variant="outline" className="gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Exportar PDF
        </Button>
      </div>
      <div className="cronograma-card" ref={cardRef}>
        <div className="cronograma-header">
          <div className="logo-mirante">
            {logo ? (
              <img loading="lazy" decoding="async" src={logo} alt="Sucena" crossOrigin="anonymous" className="w-full h-full object-contain" />
            ) : (
              <Sprout className="w-12 h-12 text-[#1e572c]" strokeWidth={1.5} />
            )}
          </div>
          <div className="titulo-area">
            <h1>Cronograma de Manutenção</h1>
            <h2>Mirante</h2>
          </div>
        </div>

        <div className="info-box">
          <div className="info-icon">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <div><span className="font-bold">FREQUÊNCIA:</span> A CADA 15 DIAS</div>
            <div><span className="font-bold">PERÍODO:</span> MANUTENÇÃO CONTÍNUA</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="cronograma-table">
            <thead>
              <tr>
                <th className="col-atividade">Atividade</th>
                <th className="col-descricao">Descrição</th>
                <th className="col-frequencia">Frequência</th>
                <th colSpan={6}>Datas – Próximas Execuções</th>
              </tr>
            </thead>
            <tbody>
              {ATIVIDADES.map((a) => {
                const items = data[a.key] || DEFAULT_DATAS;
                return (
                  <tr key={a.key}>
                    <td className="col-atividade">
                      <div className="atividade-icon">{a.icon}</div>
                      <div className="atividade-nome">{a.nome}</div>
                    </td>
                    <td className="col-descricao">{a.descricao}</td>
                    <td className="col-frequencia">
                      <RotateCw className="frequencia-icon mx-auto" />
                      A CADA<br />15 DIAS
                    </td>
                    {items.map((item, i) => {
                      const rem = reminderLabel(item);
                      return (
                        <td key={i} className={cellClass(item)}>
                          <input
                            className="data-input"
                            value={item.date}
                            placeholder="dd/mm"
                            onChange={(e) => updateDate(a.key, i, e.target.value)}
                            onBlur={() => commitDate(a.key)}
                          />
                          <div className="data-actions">
                            <button
                              type="button"
                              className="data-toggle"
                              title={item.done ? "Marcar como não feito" : "Marcar como feito"}
                              onClick={() => toggleDone(a.key, i)}
                            >
                              {item.done ? <Check className="w-7 h-7" strokeWidth={3} /> : <span className="w-7 h-7 block" />}
                            </button>
                          </div>
                          {rem && (
                            <div className="reminder-badge flex items-center justify-center gap-1">
                              <Bell className="w-3 h-3" /> {rem}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="observacoes">
          <strong>Observações:</strong>
          <span>Cronograma sujeito a ajustes conforme condições climáticas e necessidades do local. Datas em amarelo são lembretes (faltam 2 dias ou menos), em verde foram concluídas e em vermelho estão atrasadas.</span>
        </div>

        <div className="assinatura-area">
          <div className="flex-1 flex items-end gap-3">
            <span>RESPONSÁVEL:</span>
            <div className="linha-assinatura relative" />

          </div>
          <div className="flex items-end gap-3">
            <span>DATA:</span>
            <div className="w-12 border-b-2 border-black h-7 flex items-end justify-center font-bold">
              {exportDate?.d || ""}
            </div>
            <span>/</span>
            <div className="w-12 border-b-2 border-black h-7 flex items-end justify-center font-bold">
              {exportDate?.m || ""}
            </div>
            <span>/</span>
            <div className="w-16 border-b-2 border-black h-7 flex items-end justify-center font-bold">
              {exportDate?.y || ""}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Manutenção do Mirante</DialogTitle>
            <DialogDescription>Ciclos finalizados e arquivados automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-end gap-2 border-b border-border pb-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">De</label>
              <input
                type="date"
                value={histFrom}
                onChange={(e) => setHistFrom(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Até</label>
              <input
                type="date"
                value={histTo}
                onChange={(e) => setHistTo(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
            {(histFrom || histTo) && (
              <Button variant="outline" size="sm" onClick={() => { setHistFrom(""); setHistTo(""); }}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </div>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : filteredHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              {history.length === 0 ? "Nenhum ciclo finalizado ainda." : "Nenhum ciclo encontrado no período."}
            </p>
          ) : (

            <div className="space-y-3">
              {filteredHistory.map((row) => {
                const nome = ATIVIDADES.find((a) => a.key === row.atividade_key)?.nome || row.atividade_key;
                const datas = Array.isArray(row.datas) ? row.datas : [];
                return (
                  <div key={row.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.ciclo_label} · arquivado em {new Date(row.archived_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {datas.map((d, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                        >
                          <Check className="h-3 w-3 text-primary" /> {d.date}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
}
