// @ts-nocheck
import { useState, useMemo, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { useAbastecimentoCaixaDagua } from "@/hooks/useAbastecimentoCaixaDagua";
import sucenaLogo from "@/assets/Sucena.png.asset.json";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SEMANAS = ["Sem 01", "Sem 02", "Sem 03", "Sem 04"];

export default function AbastecimentoCaixaDagua() {
  const currentDate = new Date();
  const [ano, setAno] = useState(currentDate.getFullYear());
  const { data: records, isLoading, upsert, remove } = useAbastecimentoCaixaDagua(ano);
  const [editingCell, setEditingCell] = useState<{ mes: number; semana: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [editValue, setEditValue] = useState("");

  const lookup = useMemo(() => {
    const map = new Map<string, number>();
    records?.forEach((r) => map.set(`${r.mes}-${r.semana}`, Number(r.kg)));
    return map;
  }, [records]);

  const monthTotals = useMemo(() => {
    const totals = new Map<number, number>();
    for (let m = 1; m <= 12; m++) {
      let total = 0;
      for (let s = 1; s <= 4; s++) {
        const val = lookup.get(`${m}-${s}`);
        if (val !== undefined) total += val;
      }
      totals.set(m, total);
    }
    return totals;
  }, [lookup]);

  const totalAnual = useMemo(() => {
    let t = 0;
    monthTotals.forEach((v) => (t += v));
    return t;
  }, [monthTotals]);

  const handleSave = useCallback((mes: number, semana: number, value: string) => {
    if (value.trim() === "") {
      remove.mutate({ mes, semana }, {
        onSuccess: () => {
          toast.success(`${MESES[mes - 1]} ${SEMANAS[semana - 1]}: apagado`);
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
    upsert.mutate({ mes, semana, kg: val }, {
      onSuccess: () => {
        toast.success(`${MESES[mes - 1]} ${SEMANAS[semana - 1]}: ${val} Litros`);
        setEditingCell(null);
        setEditValue("");
      },
      onError: () => toast.error("Erro ao salvar"),
    });
  }, [upsert, remove]);

  const handleExportPDF = useCallback(async () => {
    toast.info("Gerando PDF...");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("l", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const blue = "#1a5276";

      // Header
      pdf.setFontSize(16);
      pdf.setTextColor(blue);
      pdf.setFont("helvetica", "bold");
      pdf.text("GRÁFICO - ABASTECIMENTO CAIXA D'ÁGUA", margin, margin + 10);

      pdf.setFontSize(12);
      pdf.setTextColor("#000000");
      pdf.text(`ANO ${ano}`, pageW / 2, margin + 10, { align: "center" });

      // Logo
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

      // Table
      const tableTop = margin + 20;
      const mesColW = 30;
      const semColW = 35;
      const totalColW = 30;
      const tableW = mesColW + 4 * semColW + totalColW;
      const rowH = 8;
      const headerH = 10;

      // Header row
      pdf.setFillColor(blue);
      pdf.rect(margin, tableTop, tableW, headerH, "F");
      pdf.setTextColor("#ffffff");
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("Mês", margin + mesColW / 2, tableTop + 6.5, { align: "center" });
      SEMANAS.forEach((sem, i) => {
        const x = margin + mesColW + i * semColW;
        pdf.text(sem, x + semColW / 2, tableTop + 6.5, { align: "center" });
      });
      pdf.text("Total", margin + mesColW + 4 * semColW + totalColW / 2, tableTop + 6.5, { align: "center" });

      // Data rows
      const dataTop = tableTop + headerH;
      MESES.forEach((mesName, idx) => {
        const mesNum = idx + 1;
        const y = dataTop + idx * rowH;
        const bgColor = idx % 2 === 0 ? "#f0f4f8" : "#ffffff";

        pdf.setFillColor(bgColor);
        pdf.rect(margin, y, tableW, rowH, "F");
        pdf.setDrawColor("#c0c0c0");
        pdf.setLineWidth(0.2);
        pdf.rect(margin, y, tableW, rowH);

        // Month name
        pdf.setTextColor("#000000");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(mesName, margin + mesColW / 2, y + 5.5, { align: "center" });

        // Week cells
        for (let s = 1; s <= 4; s++) {
          const key = `${mesNum}-${s}`;
          const val = lookup.get(key);
          const cellX = margin + mesColW + (s - 1) * semColW;
          pdf.setDrawColor("#c0c0c0");
          pdf.rect(cellX, y, semColW, rowH);

          if (val !== undefined && val > 0) {
            pdf.setTextColor("#1a5276");
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            pdf.text(String(val), cellX + semColW / 2, y + 5.5, { align: "center" });
          }
        }

        // Monthly total
        const totalX = margin + mesColW + 4 * semColW;
        pdf.setDrawColor("#c0c0c0");
        pdf.rect(totalX, y, totalColW, rowH);
        pdf.setTextColor("#000000");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(String(monthTotals.get(mesNum) || 0), totalX + totalColW / 2, y + 5.5, { align: "center" });
      });

      // Total Anual
      const totalY = dataTop + 12 * rowH + 5;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(blue);
      pdf.text("TOTAL ACUMULADO ANO (LITROS):", margin + mesColW + 2 * semColW, totalY, { align: "center" });
      pdf.setFontSize(14);
      pdf.text(String(totalAnual), margin + mesColW + 4 * semColW, totalY, { align: "center" });

      // Page 2: Draw chart manually
      pdf.addPage("a4", "l");
      const p2W = pdf.internal.pageSize.getWidth();
      const p2H = pdf.internal.pageSize.getHeight();
      const cm = 30; // larger margin to shrink chart

      pdf.setFontSize(12);
      pdf.setTextColor(blue);
      pdf.setFont("helvetica", "bold");
      pdf.text("Abastecimento por Semana (LITROS)", p2W / 2, cm, { align: "center" });

      const chartLeft = cm + 15;
      const chartBottom = p2H - cm - 25;
      const chartTop = cm + 10;
      const chartRight = p2W - cm;
      const chartH = chartBottom - chartTop;
      const chartW = chartRight - chartLeft;

      // Find max value for Y axis
      let maxVal = 4;
      for (let m = 1; m <= 12; m++) {
        for (let s = 1; s <= 4; s++) {
          const v = lookup.get(`${m}-${s}`) || 0;
          if (v > maxVal) maxVal = v;
        }
      }
      maxVal = Math.ceil(maxVal * 1.2) || 4;

      // Y axis
      pdf.setDrawColor("#cccccc");
      pdf.setLineWidth(0.3);
      const ySteps = 5;
      for (let i = 0; i <= ySteps; i++) {
        const y = chartBottom - (chartH * i) / ySteps;
        pdf.line(chartLeft, y, chartRight, y);
        pdf.setFontSize(7);
        pdf.setTextColor("#666666");
        pdf.setFont("helvetica", "normal");
        const label = Math.round((maxVal * i) / ySteps);
        pdf.text(String(label), chartLeft - 3, y + 1.5, { align: "right" });
      }

      // Bars
      const barColors = ["#1a6fb5", "#2fb8a0", "#d4a017", "#e04040"];
      const groupW = chartW / 12;
      const barW = groupW / 6;
      const mesLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

      for (let m = 0; m < 12; m++) {
        const gx = chartLeft + m * groupW + groupW * 0.1;
        for (let s = 0; s < 4; s++) {
          const val = lookup.get(`${m + 1}-${s + 1}`) || 0;
          const barH = (val / maxVal) * chartH;
          const bx = gx + s * barW + s * 1;
          pdf.setFillColor(barColors[s]);
          if (barH > 0) {
            pdf.rect(bx, chartBottom - barH, barW, barH, "F");
          }
        }
        // X label
        pdf.setFontSize(7);
        pdf.setTextColor("#666666");
        pdf.text(mesLabels[m], chartLeft + m * groupW + groupW / 2, chartBottom + 5, { align: "center" });
      }

      // Legend
      const legendY = chartBottom + 12;
      const semNames = ["Sem 01", "Sem 02", "Sem 03", "Sem 04"];
      let lx = chartLeft;
      semNames.forEach((name, i) => {
        pdf.setFillColor(barColors[i]);
        pdf.rect(lx, legendY, 4, 3, "F");
        pdf.setFontSize(7);
        pdf.setTextColor("#333333");
        pdf.text(name, lx + 6, legendY + 2.5);
        lx += 25;
      });

      const { triggerBlobDownload } = await import("@/lib/pdfDownload");
      const blob = pdf.output("blob");
      triggerBlobDownload(blob, `abastecimento-caixa-dagua-${ano}.pdf`);
      toast.success("PDF exportado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    }
  }, [ano, lookup, monthTotals, totalAnual]);

  const chartData = useMemo(() => {
    return MESES.map((mesName, idx) => {
      const mesNum = idx + 1;
      const s1 = lookup.get(`${mesNum}-1`) || 0;
      const s2 = lookup.get(`${mesNum}-2`) || 0;
      const s3 = lookup.get(`${mesNum}-3`) || 0;
      const s4 = lookup.get(`${mesNum}-4`) || 0;
      return { mes: mesName.substring(0, 3), "Sem 01": s1, "Sem 02": s2, "Sem 03": s3, "Sem 04": s4 };
    });
  }, [lookup]);

  if (isLoading) {
    return <div className="flex justify-center p-8 text-muted-foreground">Carregando...</div>;
  }

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
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2 ml-auto">
          <FileDown className="w-4 h-4" /> Exportar PDF
        </Button>
      </div>

      <div className="border-2 border-[#1a5276] rounded overflow-x-auto">
        {/* Header */}
        <div className="bg-card p-3 border-b-2 border-[#1a5276]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1a5276] tracking-wide">
              GRÁFICO - ABASTECIMENTO CAIXA D'ÁGUA
            </h2>
            <span className="text-lg font-bold">ANO {ano}</span>
            <img loading="lazy" decoding="async" src={sucenaLogo.url} alt="Sucena Empreendimentos" className="h-14 object-contain" />
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#1a5276] text-white">
              <th className="border border-[#1a5276] px-3 py-2 text-left min-w-[100px] font-bold">Mês</th>
              {SEMANAS.map((sem) => (
                <th key={sem} className="border border-[#1a5276] px-3 py-2 text-center min-w-[90px] font-bold">
                  {sem}
                </th>
              ))}
              <th className="border border-[#1a5276] px-3 py-2 text-center min-w-[80px] font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {MESES.map((mesName, idx) => {
              const mesNum = idx + 1;
              return (
                <tr key={mesNum} className="hover:bg-muted/30 even:bg-muted/10">
                  <td className="border border-[#1a5276]/30 px-3 py-1.5 font-bold text-sm">{mesName}</td>
                  {[1, 2, 3, 4].map((semana) => {
                    const key = `${mesNum}-${semana}`;
                    const val = lookup.get(key);
                    const isEditing = editingCell?.mes === mesNum && editingCell?.semana === semana;

                    return (
                      <td
                        key={semana}
                        className="border border-[#1a5276]/30 px-0 py-0 text-center cursor-pointer"
                        onClick={() => {
                          if (!isEditing) {
                            setEditingCell({ mes: mesNum, semana });
                            setEditValue(val !== undefined ? String(val) : "");
                          }
                        }}
                      >
                        {isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full h-8 text-sm text-center p-0 border-0 rounded-none bg-yellow-100 dark:bg-yellow-900"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(mesNum, semana, editValue);
                              if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
                              if (e.key === "Tab") {
                                e.preventDefault();
                                handleSave(mesNum, semana, editValue);
                              }
                            }}
                            onBlur={() => handleSave(mesNum, semana, editValue)}
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm">{val !== undefined ? val : ""}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-[#1a5276]/30 px-3 py-1.5 text-center font-bold text-sm bg-card">
                    {monthTotals.get(mesNum) || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer - Total */}
        <div className="border-t-2 border-[#1a5276] p-4 bg-card flex items-center justify-end gap-4">
          <span className="font-bold text-sm">TOTAL ACUMULADO ANO (LITROS)</span>
          <span className="text-2xl font-bold text-[#1a5276]">{totalAnual}</span>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="bg-card rounded-2xl border border-border/50 p-5">
        <h3 className="text-lg font-bold mb-4">Abastecimento por Semana (LITROS)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
              <Legend />
              <Bar dataKey="Sem 01" fill="hsl(210, 79%, 46%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Sem 02" fill="hsl(174, 62%, 47%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Sem 03" fill="hsl(45, 93%, 47%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Sem 04" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
