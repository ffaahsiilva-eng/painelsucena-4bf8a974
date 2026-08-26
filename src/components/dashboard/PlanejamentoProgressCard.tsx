import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Target, CheckCircle2, AlertCircle, ArrowRight, FileDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { usePlanejamentoMetas, type PlanejamentoMeta } from "@/hooks/usePlanejamentoMetas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLogoBase64, PDF_HEADER_STYLES, generatePdfHeader } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";
import { cn } from "@/lib/utils";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

type FilterKind = "total" | "concluidas" | "faltam";

const FILTER_LABELS: Record<FilterKind, string> = {
  total: "Todas as metas",
  concluidas: "Metas concluídas",
  faltam: "Metas que faltam bater",
};

import { GlassCard } from "./GlassCard";
import { ProgressRing } from "./ProgressRing";

export function PlanejamentoProgressCard() {
  const { data: metas, isLoading } = usePlanejamentoMetas();
  const [openFilter, setOpenFilter] = useState<FilterKind | null>(null);

  const items = useMemo(
    () =>
      (metas ?? []).filter(
        (m) => !m.is_section_header && Number(m.meta) > 0,
      ),
    [metas],
  );

  const stats = useMemo(() => {
    let concluidas = 0;
    let faltam = 0;
    let somaMeta = 0;
    let somaReal = 0;
    for (const m of items) {
      const meta = Number(m.meta) || 0;
      const real = Number(m.realizado) || 0;
      somaMeta += meta;
      // Cap contribution at 100% of the target to align with Planejamento page
      somaReal += Math.min(real, meta);
      if (meta > 0 && real >= meta) concluidas++;
      else faltam++;
    }
    const avancoGeral =
      somaMeta > 0 ? Math.min(100, Math.round((somaReal / somaMeta) * 100)) : 0;
    return { total: items.length, concluidas, faltam, avancoGeral };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!openFilter) return [];
    if (openFilter === "total") return items;
    if (openFilter === "concluidas")
      return items.filter((m) => Number(m.realizado) >= Number(m.meta));
    return items.filter((m) => Number(m.realizado) < Number(m.meta));
  }, [items, openFilter]);

  const animatedAvanco = useAnimatedNumber(stats.avancoGeral, 10000);
  const animatedConcluidas = useAnimatedNumber(stats.concluidas, 10000);
  const animatedTotal = useAnimatedNumber(stats.total, 10000);
  const animatedFaltam = useAnimatedNumber(stats.faltam, 10000);

  return (
    <div className="h-full">
      <GlassCard className="flex flex-col h-full py-6 items-center text-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-[#6D7175] uppercase tracking-widest mb-1">
            Avanço Mensal
          </h3>
        </div>
        
        <Link
          to="/planejamento"
          className="absolute top-6 right-6 text-xs font-semibold text-[#B38A45] hover:text-[#D8B16B] transition-colors"
        >
          Ver Tudo
        </Link>

        <div className="flex-1 flex items-center justify-center my-4">
          <ProgressRing 
            progress={stats.avancoGeral} 
            size={180} 
            strokeWidth={14} 
            label={`${animatedAvanco}%`} 
          />
        </div>

        <div className="grid grid-cols-3 gap-8 mt-2 w-full px-4">
          <Stat
            icon={<Target className="h-4 w-4" />}
            label="Total"
            value={animatedTotal}
            tone="muted"
            onClick={() => setOpenFilter("total")}
          />
          <Stat
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Concluídas"
            value={animatedConcluidas}
            tone="success"
            onClick={() => setOpenFilter("concluidas")}
          />
          <Stat
            icon={<AlertCircle className="h-4 w-4" />}
            label="Faltam"
            value={animatedFaltam}
            tone="warning"
            onClick={() => setOpenFilter("faltam")}
          />
        </div>
      </GlassCard>

      <Dialog open={!!openFilter} onOpenChange={(o) => !o && setOpenFilter(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle>
                  {openFilter ? FILTER_LABELS[openFilter] : ""}
                </DialogTitle>
                <DialogDescription>
                  {filteredItems.length}{" "}
                  {filteredItems.length === 1 ? "meta" : "metas"}
                </DialogDescription>
              </div>
              {openFilter && filteredItems.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    exportFilteredToPdf(openFilter, filteredItems, stats.avancoGeral)
                  }
                  className="shrink-0"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="overflow-y-auto pr-2 space-y-2">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma meta nesta categoria.
              </p>
            ) : (
              filteredItems.map((m) => <MetaItem key={m.id} meta={m} />)
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function exportFilteredToPdf(
  filter: FilterKind,
  items: PlanejamentoMeta[],
  avancoGeral: number,
) {
  try {
    const logo = await getLogoBase64();
    const title = FILTER_LABELS[filter];
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    const rows = items
      .map((m) => {
        const meta = Number(m.meta) || 0;
        const real = Number(m.realizado) || 0;
        const p = meta > 0 ? Math.min(100, (real / meta) * 100) : 0;
        const completed = meta > 0 && real >= meta;
        const statusLabel = completed ? "Concluída" : "Em andamento";
        const statusColor = completed ? "#059669" : "#d97706";
        return `
          <tr>
            <td style="text-align:center;font-family:monospace;">${m.linha ?? "-"}</td>
            <td>${escapeHtml(m.atividade)}</td>
            <td style="text-align:right;">${real.toLocaleString("pt-BR")}</td>
            <td style="text-align:right;">${meta.toLocaleString("pt-BR")}</td>
            <td style="text-align:center;">${escapeHtml(m.unidade ?? "-")}</td>
            <td style="text-align:right;font-weight:bold;">${p.toFixed(1)}%</td>
            <td style="text-align:center;color:${statusColor};font-weight:600;">${statusLabel}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            ${PDF_HEADER_STYLES}
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            .summary {
              display: flex; gap: 12px; margin-bottom: 16px;
            }
            .summary .box {
              flex: 1; padding: 10px 14px;
              border: 1px solid #e5e7eb; border-radius: 8px;
              background: #f9fafb;
            }
            .summary .label {
              font-size: 10px; text-transform: uppercase;
              letter-spacing: 0.08em; color: #6b7280;
            }
            .summary .value {
              font-size: 18px; font-weight: bold; color: #111827;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; }
            th { background: #f3f4f6; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
            tr:nth-child(even) td { background: #fafafa; }
            .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>
          ${generatePdfHeader("Avanço Mensal — Planejamento", `${title} • ${today}`, logo)}
          <div class="summary">
            <div class="box">
              <div class="label">Total exibido</div>
              <div class="value">${items.length}</div>
            </div>
            <div class="box">
              <div class="label">Avanço geral</div>
              <div class="value">${avancoGeral}%</div>
            </div>
            <div class="box">
              <div class="label">Categoria</div>
              <div class="value" style="font-size:14px;">${title}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:50px;">Linha</th>
                <th>Atividade</th>
                <th style="width:80px;text-align:right;">Realizado</th>
                <th style="width:80px;text-align:right;">Meta</th>
                <th style="width:70px;text-align:center;">Unidade</th>
                <th style="width:60px;text-align:right;">%</th>
                <th style="width:90px;text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">Sucena • Gerado em ${today}</div>
        </body>
      </html>
    `;

    await downloadPdfFromHtml(html, `planejamento-${filter}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF gerado com sucesso");
  } catch (e) {
    console.error(e);
    toast.error("Erro ao gerar PDF");
  }
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function MetaItem({ meta }: { meta: PlanejamentoMeta }) {
  const m = Number(meta.meta) || 0;
  const r = Number(meta.realizado) || 0;
  const p = m > 0 ? Math.min(100, (r / m) * 100) : 0;
  const completed = m > 0 && r >= m;
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {meta.linha !== null && (
            <Badge variant="outline" className="font-mono text-xs shrink-0">
              {meta.linha}
            </Badge>
          )}
          {completed ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 shrink-0">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Concluída
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs shrink-0">
              <AlertCircle className="w-3 h-3 mr-1" /> Em andamento
            </Badge>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm font-medium leading-snug">{meta.atividade}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">
            {r.toLocaleString("pt-BR")}
          </span>
          {" / "}
          <span>{m.toLocaleString("pt-BR")}</span>
          {meta.unidade ? ` ${meta.unidade}` : ""}
        </span>
        <span
          className={cn(
            "font-bold tabular-nums",
            completed ? "text-emerald-600" : "text-amber-600",
          )}
        >
          {p.toFixed(1)}%
        </span>
      </div>
      <Progress value={p} className="h-1.5 mt-1.5" />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "muted" | "success" | "warning";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : "text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-2 text-center min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
    >
      <div className={`flex items-center justify-center gap-1.5 ${toneClass}`}>
        {icon}
        <span
          className="text-2xl leading-none tracking-wider"
          style={{ fontFamily: "Brazil2026, sans-serif" }}
        >
          {value}
        </span>
      </div>
      <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mt-1 leading-tight whitespace-nowrap">
        {label}
      </p>
    </button>
  );
}

export default PlanejamentoProgressCard;
