// @ts-nocheck
import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, RotateCcw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { useResiduosEfluentes, TIPOS_RESIDUO, TIPO_EFLUENTE } from "@/hooks/useResiduosEfluentes";
import sucenaLogo from "@/assets/Sucena.png.asset.json";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const ALL_TIPOS = [...TIPOS_RESIDUO, TIPO_EFLUENTE];

export default function ResiduosEfluentes() {
  const currentDate = new Date();
  const [ano, setAno] = useState(currentDate.getFullYear());
  const { data: records, isLoading, upsert, remove, removeAll } = useResiduosEfluentes(ano);
  const [editingCell, setEditingCell] = useState<{ mes: number; tipo: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const lookup = useMemo(() => {
    const map = new Map<string, number>();
    records?.forEach((r) => map.set(`${r.mes}-${r.tipo}`, Number(r.kg)));
    return map;
  }, [records]);

  // Totals per month (residuos only, excluding efluente)
  const monthTotals = useMemo(() => {
    const totals = new Map<number, number>();
    for (let m = 1; m <= 12; m++) {
      let total = 0;
      TIPOS_RESIDUO.forEach((t) => {
        const val = lookup.get(`${m}-${t.key}`);
        if (val !== undefined) total += val;
      });
      totals.set(m, parseFloat(total.toFixed(2)));
    }
    return totals;
  }, [lookup]);

  const totalAnual = useMemo(() => {
    let t = 0;
    monthTotals.forEach((v) => (t += v));
    return parseFloat(t.toFixed(2));
  }, [monthTotals]);

  const handleSave = useCallback((mes: number, tipo: string, value: string) => {
    if (value.trim() === "") {
      remove.mutate({ mes, tipo }, {
        onSuccess: () => {
          toast.success("Valor apagado");
          setEditingCell(null);
          setEditValue("");
        },
        onError: () => toast.error("Erro ao apagar"),
      });
      return;
    }
    const val = parseFloat(value);
    if (isNaN(val) || val < 0) {
      toast.error("Valor inválido");
      return;
    }
    if (val === 0) {
      setEditingCell(null);
      setEditValue("");
      return;
    }
    upsert.mutate({ mes, tipo, kg: val }, {
      onSuccess: () => {
        toast.success(`${MESES[mes - 1]}: ${val}`);
        setEditingCell(null);
        setEditValue("");
      },
      onError: () => toast.error("Erro ao salvar"),
    });
  }, [upsert, remove]);

  // Chart data for residuos
  const chartData = useMemo(() => {
    return MESES.map((mesName, idx) => {
      const mesNum = idx + 1;
      const row: Record<string, string | number> = { mes: mesName.substring(0, 3) };
      TIPOS_RESIDUO.forEach((t) => {
        row[t.label] = lookup.get(`${mesNum}-${t.key}`) || 0;
      });
      return row;
    });
  }, [lookup]);

  // Chart data for efluentes
  const efluenteChartData = useMemo(() => {
    return MESES.map((mesName, idx) => {
      const mesNum = idx + 1;
      return {
        mes: mesName.substring(0, 3),
        "Efluentes (m³)": lookup.get(`${mesNum}-${TIPO_EFLUENTE.key}`) || 0,
      };
    });
  }, [lookup]);

  const handleExportPDF = useCallback(async () => {
    toast.info("Gerando PDF...");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("l", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const blue = "#1a5276";
      const lightBlue = "#d6eaf8";
      const rowH = 7;
      const headerH = 9;

      // ===== Helper: draw header with logo =====
      const drawHeader = async (title: string, subtitle?: string) => {
        pdf.setFontSize(16);
        pdf.setTextColor(blue);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, margin, margin + 10);
        if (subtitle) {
          pdf.setFontSize(11);
          pdf.setTextColor("#444444");
          pdf.setFont("helvetica", "normal");
          pdf.text(subtitle, margin, margin + 17);
        }
        pdf.setFontSize(12);
        pdf.setTextColor("#000000");
        pdf.setFont("helvetica", "bold");
        pdf.text(`ANO ${ano}`, pageW / 2, margin + 10, { align: "center" });
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = "anonymous";
          await new Promise<void>((resolve) => {
            logoImg.onload = () => resolve();
            logoImg.onerror = () => resolve();
            logoImg.src = sucenaLogo.url;
          });
          if (logoImg.complete && logoImg.naturalWidth > 0) {
            const logoH = 14;
            const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
            pdf.addImage(logoImg, "PNG", pageW - margin - logoW, margin, logoW, logoH);
          }
        } catch {}
        // Divider line
        pdf.setDrawColor(blue);
        pdf.setLineWidth(0.5);
        pdf.line(margin, margin + 20, pageW - margin, margin + 20);
      };

      // ===== PAGE 1: RESÍDUOS TABLE =====
      await drawHeader("RESÍDUOS", "Controle mensal de resíduos sólidos (KG)");

      const tableTop = margin + 25;
      const mesColW = 28;
      const tipoColW = 30;
      const totalColW = 32;
      const tableW = mesColW + TIPOS_RESIDUO.length * tipoColW + totalColW;

      // Header row
      pdf.setFillColor(blue);
      pdf.rect(margin, tableTop, tableW, headerH, "F");
      pdf.setTextColor("#ffffff");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("Mês", margin + mesColW / 2, tableTop + 6, { align: "center" });
      TIPOS_RESIDUO.forEach((t, i) => {
        const x = margin + mesColW + i * tipoColW;
        pdf.text(t.label, x + tipoColW / 2, tableTop + 6, { align: "center" });
      });
      pdf.text("Total (KG)", margin + mesColW + TIPOS_RESIDUO.length * tipoColW + totalColW / 2, tableTop + 6, { align: "center" });

      // Data rows
      const dataTop = tableTop + headerH;
      MESES.forEach((mesName, idx) => {
        const mesNum = idx + 1;
        const y = dataTop + idx * rowH;
        const bgColor = idx % 2 === 0 ? lightBlue : "#ffffff";
        pdf.setFillColor(bgColor);
        pdf.rect(margin, y, tableW, rowH, "F");
        pdf.setDrawColor("#b0bec5");
        pdf.setLineWidth(0.15);
        pdf.rect(margin, y, tableW, rowH);

        pdf.setTextColor("#333333");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.text(mesName, margin + mesColW / 2, y + 5, { align: "center" });

        TIPOS_RESIDUO.forEach((t, i) => {
          const val = lookup.get(`${mesNum}-${t.key}`);
          const cellX = margin + mesColW + i * tipoColW;
          pdf.setDrawColor("#b0bec5");
          pdf.rect(cellX, y, tipoColW, rowH);
          if (val !== undefined && val > 0) {
            pdf.setTextColor(blue);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7.5);
            pdf.text(String(val), cellX + tipoColW / 2, y + 5, { align: "center" });
          }
        });

        const totalX = margin + mesColW + TIPOS_RESIDUO.length * tipoColW;
        pdf.setDrawColor("#b0bec5");
        pdf.rect(totalX, y, totalColW, rowH);
        const mt = monthTotals.get(mesNum) || 0;
        if (mt > 0) {
          pdf.setTextColor("#000000");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          pdf.text(String(mt), totalX + totalColW / 2, y + 5, { align: "center" });
        }
      });

      // Total Anual box
      const totalY = dataTop + 12 * rowH + 4;
      pdf.setFillColor(blue);
      const totalBoxW = 100;
      const totalBoxX = margin;
      pdf.roundedRect(totalBoxX, totalY, totalBoxW, 12, 2, 2, "F");
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor("#ffffff");
      pdf.text(`TOTAL ACUMULADO ANO: ${totalAnual} KG`, totalBoxX + totalBoxW / 2, totalY + 8, { align: "center" });

      // Footer
      pdf.setFontSize(7);
      pdf.setTextColor("#999999");
      pdf.setFont("helvetica", "normal");
      pdf.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, pageH - 8, { align: "right" });

      // ===== PAGE 2: EFLUENTES TABLE =====
      pdf.addPage("a4", "l");
      await drawHeader("EFLUENTES SANITÁRIOS", "Controle mensal de efluentes (m³)");

      const efTableTop = margin + 25;
      const efMesColW = 40;
      const efColW = 50;
      const efTableW = efMesColW + efColW;

      pdf.setFillColor(blue);
      pdf.rect(margin, efTableTop, efTableW, headerH, "F");
      pdf.setTextColor("#ffffff");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("Mês", margin + efMesColW / 2, efTableTop + 6, { align: "center" });
      pdf.text("Efluentes (m³)", margin + efMesColW + efColW / 2, efTableTop + 6, { align: "center" });

      const efDataTop = efTableTop + headerH;
      let efTotal = 0;
      MESES.forEach((mesName, idx) => {
        const mesNum = idx + 1;
        const y = efDataTop + idx * rowH;
        const bgColor = idx % 2 === 0 ? lightBlue : "#ffffff";
        pdf.setFillColor(bgColor);
        pdf.rect(margin, y, efTableW, rowH, "F");
        pdf.setDrawColor("#b0bec5");
        pdf.setLineWidth(0.15);
        pdf.rect(margin, y, efTableW, rowH);

        pdf.setTextColor("#333333");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(mesName, margin + efMesColW / 2, y + 5, { align: "center" });

        const val = lookup.get(`${mesNum}-${TIPO_EFLUENTE.key}`);
        const cellX = margin + efMesColW;
        pdf.setDrawColor("#b0bec5");
        pdf.rect(cellX, y, efColW, rowH);
        if (val !== undefined && val > 0) {
          efTotal += val;
          pdf.setTextColor(blue);
          pdf.setFont("helvetica", "normal");
          pdf.text(String(val), cellX + efColW / 2, y + 5, { align: "center" });
        }
      });

      // Efluentes total
      const efTotalY = efDataTop + 12 * rowH + 4;
      pdf.setFillColor(blue);
      pdf.roundedRect(margin, efTotalY, 80, 12, 2, 2, "F");
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor("#ffffff");
      pdf.text(`TOTAL ANO: ${efTotal.toFixed(2)} m³`, margin + 40, efTotalY + 8, { align: "center" });

      pdf.setFontSize(7);
      pdf.setTextColor("#999999");
      pdf.setFont("helvetica", "normal");
      pdf.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, pageH - 8, { align: "right" });

      // ===== PAGE 3: CHARTS =====
      pdf.addPage("a4", "l");
      await drawHeader("GRÁFICO - RESÍDUOS POR MÊS");

      // Accumulated total text
      pdf.setFontSize(10);
      pdf.setTextColor("#333333");
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Acumulado até ${new Date().toLocaleDateString("pt-BR")}: ${totalAnual} KG`,
        margin,
        margin + 25
      );

      const cm = 35;
      const chartLeft = cm + 15;
      const chartBottom = pageH - 35;
      const chartTop2 = cm + 10;
      const chartRight = pageW - cm;
      const chartH = chartBottom - chartTop2;
      const chartW = chartRight - chartLeft;

      // Find max individual bar value (not stacked)
      let maxVal = 0;
      for (let m = 1; m <= 12; m++) {
        TIPOS_RESIDUO.forEach((t) => {
          const v = lookup.get(`${m}-${t.key}`) || 0;
          if (v > maxVal) maxVal = v;
        });
      }
      // Round up to nearest 10
      maxVal = Math.max(10, Math.ceil(maxVal / 10) * 10);

      // Grid lines with round numbers (0, 10, 20, 30, 40...)
      pdf.setDrawColor("#e0e0e0");
      pdf.setLineWidth(0.2);
      const yStep = 10; // step of 10
      const ySteps = maxVal / yStep;
      for (let i = 0; i <= ySteps; i++) {
        const y = chartBottom - (chartH * i) / ySteps;
        pdf.line(chartLeft, y, chartRight, y);
        pdf.setFontSize(7);
        pdf.setTextColor("#888888");
        pdf.setFont("helvetica", "normal");
        pdf.text(String(i * yStep), chartLeft - 4, y + 1.5, { align: "right" });
      }

      const barColors = ["#2196F3", "#4CAF50", "#9E9E9E", "#FF9800", "#8BC34A"];
      const groupW = chartW / 12;
      const barW = groupW / 7;
      const mesLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

      for (let m = 0; m < 12; m++) {
        const gx = chartLeft + m * groupW + groupW * 0.1;
        TIPOS_RESIDUO.forEach((t, s) => {
          const val = lookup.get(`${m + 1}-${t.key}`) || 0;
          const barH = (val / maxVal) * chartH;
          const bx = gx + s * (barW + 0.5);
          pdf.setFillColor(barColors[s]);
          if (barH > 0) pdf.rect(bx, chartBottom - barH, barW, barH, "F");
        });
        pdf.setFontSize(7);
        pdf.setTextColor("#666666");
        pdf.text(mesLabels[m], chartLeft + m * groupW + groupW / 2, chartBottom + 5, { align: "center" });
      }

      // Legend
      const legendY = chartBottom + 12;
      let lx = chartLeft;
      TIPOS_RESIDUO.forEach((t, i) => {
        pdf.setFillColor(barColors[i]);
        pdf.roundedRect(lx, legendY - 1, 5, 4, 1, 1, "F");
        pdf.setFontSize(7);
        pdf.setTextColor("#333333");
        pdf.setFont("helvetica", "normal");
        pdf.text(t.label, lx + 7, legendY + 2);
        lx += 35;
      });

      pdf.setFontSize(7);
      pdf.setTextColor("#999999");
      pdf.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, pageH - 8, { align: "right" });

      // ===== PAGE 4: EFLUENTES CHART =====
      pdf.addPage("a4", "l");
      await drawHeader("GRÁFICO - EFLUENTES SANITÁRIOS POR MÊS");

      // Accumulated total text
      pdf.setFontSize(10);
      pdf.setTextColor("#333333");
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Acumulado até ${new Date().toLocaleDateString("pt-BR")}: ${efTotal.toFixed(2)} m³`,
        margin,
        margin + 25
      );

      const efChartLeft = cm + 15;
      const efChartBottom = pageH - 35;
      const efChartTop = cm + 10;
      const efChartRight = pageW - cm;
      const efChartH = efChartBottom - efChartTop;
      const efChartW = efChartRight - efChartLeft;

      // Find max efluente value
      let maxEfVal = 0;
      for (let m = 1; m <= 12; m++) {
        const v = lookup.get(`${m}-${TIPO_EFLUENTE.key}`) || 0;
        if (v > maxEfVal) maxEfVal = v;
      }
      maxEfVal = Math.max(2, Math.ceil(maxEfVal));
      // Round up to nearest even number for nice axis
      if (maxEfVal % 2 !== 0) maxEfVal += 1;

      // Grid lines
      pdf.setDrawColor("#e0e0e0");
      pdf.setLineWidth(0.2);
      const efYSteps = maxEfVal;
      for (let i = 0; i <= efYSteps; i++) {
        const y = efChartBottom - (efChartH * i) / efYSteps;
        pdf.line(efChartLeft, y, efChartRight, y);
        pdf.setFontSize(7);
        pdf.setTextColor("#888888");
        pdf.setFont("helvetica", "normal");
        pdf.text(String(i), efChartLeft - 4, y + 1.5, { align: "right" });
      }

      const efGroupW = efChartW / 12;
      const efBarW = efGroupW * 0.5;
      const efBarColor = "#00BCD4";

      for (let m = 0; m < 12; m++) {
        const val = lookup.get(`${m + 1}-${TIPO_EFLUENTE.key}`) || 0;
        const barH = (val / maxEfVal) * efChartH;
        const bx = efChartLeft + m * efGroupW + (efGroupW - efBarW) / 2;
        pdf.setFillColor(efBarColor);
        if (barH > 0) pdf.rect(bx, efChartBottom - barH, efBarW, barH, "F");
        pdf.setFontSize(7);
        pdf.setTextColor("#666666");
        pdf.text(mesLabels[m], efChartLeft + m * efGroupW + efGroupW / 2, efChartBottom + 5, { align: "center" });
      }

      // Legend
      const efLegendY = efChartBottom + 12;
      pdf.setFillColor(efBarColor);
      pdf.roundedRect(efChartLeft, efLegendY - 1, 5, 4, 1, 1, "F");
      pdf.setFontSize(7);
      pdf.setTextColor("#333333");
      pdf.setFont("helvetica", "normal");
      pdf.text("Efluentes (m³)", efChartLeft + 7, efLegendY + 2);

      pdf.setFontSize(7);
      pdf.setTextColor("#999999");
      pdf.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, pageH - 8, { align: "right" });

      const { triggerBlobDownload } = await import("@/lib/pdfDownload");
      const blob = pdf.output("blob");
      triggerBlobDownload(blob, `residuos-efluentes-${ano}.pdf`);
      toast.success("PDF exportado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    }
  }, [ano, lookup, monthTotals, totalAnual]);

  if (isLoading) {
    return <div className="flex justify-center p-8 text-muted-foreground">Carregando...</div>;
  }

  const renderEditableCell = (mesNum: number, tipo: string) => {
    const key = `${mesNum}-${tipo}`;
    const val = lookup.get(key);
    const isEditing = editingCell?.mes === mesNum && editingCell?.tipo === tipo;

    return (
      <td
        key={tipo}
        className="border border-[#1a5276]/30 px-0 py-0 text-center cursor-pointer"
        onClick={() => {
          if (!isEditing) {
            setEditingCell({ mes: mesNum, tipo });
            setEditValue("0");
          }
        }}
      >
        {isEditing ? (
          <Input
            type="number"
            min={0}
            step={0.01}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full h-8 text-sm text-center p-0 border-0 rounded-none bg-yellow-100 dark:bg-yellow-900"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave(mesNum, tipo, editValue);
              if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
              if (e.key === "Tab") { e.preventDefault(); handleSave(mesNum, tipo, editValue); }
            }}
            onBlur={() => handleSave(mesNum, tipo, editValue)}
            autoFocus
          />
        ) : (
          <span className="text-sm">
            {val !== undefined ? String(val) : ""}
          </span>
        )}
      </td>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
          <FileDown className="w-4 h-4" /> Exportar PDF
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <RotateCcw className="w-4 h-4" /> Redefinir Tudo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Redefinir todos os valores?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso irá apagar todos os valores de Resíduos e Efluentes do ano {ano}. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                removeAll.mutate(undefined, {
                  onSuccess: () => toast.success(`Todos os valores de ${ano} foram redefinidos`),
                  onError: () => toast.error("Erro ao redefinir"),
                });
              }}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* RESÍDUOS TABLE */}
      <div className="border-2 border-[#1a5276] rounded overflow-x-auto">
        <div className="bg-card p-3 border-b-2 border-[#1a5276]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1a5276] tracking-wide">RESÍDUOS</h2>
            <span className="text-lg font-bold">ANO {ano}</span>
            <img loading="lazy" decoding="async" src={sucenaLogo.url} alt="Sucena" className="h-14 object-contain" />
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#1a5276] text-white">
              <th className="border border-[#1a5276] px-3 py-2 text-left min-w-[100px] font-bold">Mês</th>
              {TIPOS_RESIDUO.map((t) => (
                <th key={t.key} className="border border-[#1a5276] px-3 py-2 text-center min-w-[100px] font-bold">
                  {t.label}
                </th>
              ))}
              <th className="border border-[#1a5276] px-3 py-2 text-center min-w-[100px] font-bold">Total de Resíduos</th>
            </tr>
          </thead>
          <tbody>
            {MESES.map((mesName, idx) => {
              const mesNum = idx + 1;
              return (
                <tr key={mesNum} className="hover:bg-muted/30 even:bg-muted/10">
                  <td className="border border-[#1a5276]/30 px-3 py-1.5 font-bold text-sm">{mesName}</td>
                  {TIPOS_RESIDUO.map((t) => renderEditableCell(mesNum, t.key))}
                  <td className="border border-[#1a5276]/30 px-3 py-1.5 text-center font-bold text-sm bg-card">
                    {monthTotals.get(mesNum) || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-t-2 border-[#1a5276] p-4 bg-card flex items-center justify-end gap-4">
          <span className="font-bold text-sm">TOTAL ACUMULADO ANO (KG)</span>
          <span className="text-2xl font-bold text-[#1a5276]">{totalAnual}</span>
        </div>
      </div>

      {/* EFLUENTES TABLE */}
      <div className="border-2 border-[#1a5276] rounded overflow-x-auto">
        <div className="bg-card p-3 border-b-2 border-[#1a5276]">
          <h2 className="text-lg font-bold text-[#1a5276] tracking-wide">EFLUENTES SANITÁRIOS</h2>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#1a5276] text-white">
              <th className="border border-[#1a5276] px-3 py-2 text-left min-w-[100px] font-bold">Mês</th>
              <th className="border border-[#1a5276] px-3 py-2 text-center min-w-[150px] font-bold">
                Efluentes Sanitários (m³)
              </th>
            </tr>
          </thead>
          <tbody>
            {MESES.map((mesName, idx) => {
              const mesNum = idx + 1;
              return (
                <tr key={mesNum} className="hover:bg-muted/30 even:bg-muted/10">
                  <td className="border border-[#1a5276]/30 px-3 py-1.5 font-bold text-sm">{mesName}</td>
                  {renderEditableCell(mesNum, TIPO_EFLUENTE.key)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CHARTS */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <h3 className="text-lg font-bold mb-4">Resíduos por Mês (KG)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
              <Legend />
              <Bar dataKey="PAPEL(KG)" fill="hsl(210, 79%, 46%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="PLÁSTICO(KG)" fill="hsl(122, 39%, 49%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="NÃO RECICLÁVEL(KG)" fill="hsl(0, 0%, 62%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="METAL(KG)" fill="hsl(36, 100%, 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ORGÂNICO(KG)" fill="hsl(88, 50%, 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <h3 className="text-lg font-bold mb-4">Efluentes Sanitários por Mês (m³)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={efluenteChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
              <Legend />
              <Bar dataKey="Efluentes (m³)" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
