import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { getISOWeek, parseISO, format } from "date-fns";
import sucenaLogo from "@/assets/Sucena.png.asset.json";

interface DailyRecord {
  date: string; // yyyy-MM-dd
  formattedDate: string;
  time?: string;
  vehicleName: string;
  plate: string;
  equipmentId: string;
  count: number;
  liters: number;
  point: string;
}

interface Props {
  selectedVehicleName: string;
  dateFrom: string | null;
  dateTo: string | null;
  dailyRecords: DailyRecord[];
}

const MONTH = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

async function fetchLogoBuffer(): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(sucenaLogo.url);
    return await r.arrayBuffer();
  } catch { return null; }
}

export function ExportConsumoAbastecimentoExcelButton({
  selectedVehicleName,
  dateFrom,
  dateTo,
  dailyRecords,
}: Props) {
  const handleExport = async () => {
    if (!dailyRecords.length) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Sucena Empreendimentos";
      wb.created = new Date();
      const ws = wb.addWorksheet("Abastecimentos", {
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
      });

      ws.columns = [
        { width: 18 }, { width: 12 }, { width: 30 }, { width: 20 }, { width: 20 }, { width: 22 },
      ];

      // Title row with yellow background across A:F, logo overlaid
      ws.mergeCells("A1:F1");
      const tCell = ws.getCell("A1");
      tCell.value = "          RELATÓRIO DE ABASTECIMENTOS DE ÁGUA";
      tCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF1A1A2E" } };
      tCell.alignment = { vertical: "middle", horizontal: "center" };
      tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5A623" } };
      ws.getRow(1).height = 60;

      // Logo overlaid on top of yellow title
      const logoBuf = await fetchLogoBuffer();
      if (logoBuf) {
        const imgId = wb.addImage({ buffer: logoBuf as any, extension: "png" });
        ws.addImage(imgId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 110, height: 55 } });
      }

      // Period row
      ws.mergeCells("A2:F2");
      const periodText = dateFrom && dateTo
        ? `Período: ${format(parseISO(dateFrom), "dd/MM/yyyy")} a ${format(parseISO(dateTo), "dd/MM/yyyy")}`
        : "Período: Todos os registros do mês";
      const pCell = ws.getCell("A2");
      pCell.value = `${periodText}    |    Veículo: ${selectedVehicleName}`;
      pCell.font = { name: "Arial", size: 11, italic: true };
      pCell.alignment = { horizontal: "center" };

      let rowIdx = 4;

      // === Section: Resumo por Dia ===
      ws.mergeCells(`A${rowIdx}:F${rowIdx}`);
      const sec1 = ws.getCell(`A${rowIdx}`);
      sec1.value = "RESUMO POR DIA";
      sec1.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
      sec1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D2D44" } };
      sec1.alignment = { horizontal: "center" };
      rowIdx++;

      const dayHeader = ws.getRow(rowIdx);
      dayHeader.values = ["Data", "Dia da Semana", "Qtd. Abastecimentos", "Litros Totais", "", ""];
      dayHeader.eachCell((c, n) => {
        if (n <= 4) {
          c.font = { bold: true, color: { argb: "FFFFFFFF" } };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3D3D5C" } };
          c.alignment = { horizontal: "center" };
          c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        }
      });
      rowIdx++;

      const byDay = new Map<string, { count: number; liters: number }>();
      for (const r of dailyRecords) {
        const ex = byDay.get(r.date) || { count: 0, liters: 0 };
        byDay.set(r.date, { count: ex.count + 1, liters: ex.liters + r.liters });
      }
      const dayKeys = Array.from(byDay.keys()).sort();
      const weekdayNames = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
      for (const d of dayKeys) {
        const s = byDay.get(d)!;
        const dt = parseISO(d);
        const row = ws.getRow(rowIdx);
        row.values = [format(dt, "dd/MM/yyyy"), weekdayNames[dt.getDay()], s.count, `${s.liters.toLocaleString("pt-BR")} L`, "", ""];
        row.eachCell((c, n) => {
          if (n <= 4) {
            c.alignment = { horizontal: n === 1 || n === 2 ? "left" : "center" };
            c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
          }
        });
        rowIdx++;
      }

      rowIdx++;

      // === Section: Resumo por Semana ===
      ws.mergeCells(`A${rowIdx}:F${rowIdx}`);
      const sec2 = ws.getCell(`A${rowIdx}`);
      sec2.value = "RESUMO POR SEMANA";
      sec2.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
      sec2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D2D44" } };
      sec2.alignment = { horizontal: "center" };
      rowIdx++;

      const wkHeader = ws.getRow(rowIdx);
      wkHeader.values = ["Semana", "Período", "Qtd. Abastecimentos", "Litros Totais", "", ""];
      wkHeader.eachCell((c, n) => {
        if (n <= 4) {
          c.font = { bold: true, color: { argb: "FFFFFFFF" } };
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3D3D5C" } };
          c.alignment = { horizontal: "center" };
          c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        }
      });
      rowIdx++;

      const byWeek = new Map<number, { count: number; liters: number; min: string; max: string }>();
      for (const r of dailyRecords) {
        const wk = getISOWeek(parseISO(r.date));
        const ex = byWeek.get(wk);
        if (!ex) byWeek.set(wk, { count: 1, liters: r.liters, min: r.date, max: r.date });
        else {
          ex.count++; ex.liters += r.liters;
          if (r.date < ex.min) ex.min = r.date;
          if (r.date > ex.max) ex.max = r.date;
        }
      }
      const wkKeys = Array.from(byWeek.keys()).sort((a, b) => a - b);
      for (const wk of wkKeys) {
        const s = byWeek.get(wk)!;
        const row = ws.getRow(rowIdx);
        row.values = [
          `Semana ${wk}`,
          `${format(parseISO(s.min), "dd/MM")} a ${format(parseISO(s.max), "dd/MM")}`,
          s.count,
          `${s.liters.toLocaleString("pt-BR")} L`,
          "", "",
        ];
        row.eachCell((c, n) => {
          if (n <= 4) {
            c.alignment = { horizontal: n === 1 || n === 2 ? "left" : "center" };
            c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
          }
        });
        rowIdx++;
      }

      rowIdx++;

      // === Section: Detalhamento ===
      ws.mergeCells(`A${rowIdx}:F${rowIdx}`);
      const sec3 = ws.getCell(`A${rowIdx}`);
      sec3.value = "DETALHAMENTO DOS ABASTECIMENTOS";
      sec3.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
      sec3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D2D44" } };
      sec3.alignment = { horizontal: "center" };
      rowIdx++;

      const detHeader = ws.getRow(rowIdx);
      detHeader.values = ["Data", "Hora", "Veículo", "Placa", "Ponto", "Litros"];
      detHeader.eachCell((c) => {
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3D3D5C" } };
        c.alignment = { horizontal: "center" };
        c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });
      rowIdx++;

      const sorted = [...dailyRecords].sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
      for (const r of sorted) {
        const row = ws.getRow(rowIdx);
        row.values = [r.formattedDate, r.time || "-", r.vehicleName, r.plate, r.point, `${r.liters.toLocaleString("pt-BR")} L`];
        row.eachCell((c, n) => {
          c.alignment = { horizontal: n === 3 ? "left" : "center" };
          c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        });
        rowIdx++;
      }

      // Totals
      rowIdx++;
      const totLiters = dailyRecords.reduce((a, r) => a + r.liters, 0);
      ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
      const tlb = ws.getCell(`A${rowIdx}`);
      tlb.value = "TOTAL GERAL";
      tlb.font = { bold: true, color: { argb: "FFFFFFFF" } };
      tlb.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
      tlb.alignment = { horizontal: "center" };
      ws.mergeCells(`D${rowIdx}:F${rowIdx}`);
      const tlc = ws.getCell(`D${rowIdx}`);
      tlc.value = `${dailyRecords.length} abast. - ${totLiters.toLocaleString("pt-BR")} L`;
      tlc.font = { bold: true, color: { argb: "FFFFFFFF" } };
      tlc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5A623" } };
      tlc.alignment = { horizontal: "center" };
      ws.getRow(rowIdx).height = 22;

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const fname = dateFrom && dateTo
        ? `abastecimentos_${dateFrom}_a_${dateTo}.xlsx`
        : `abastecimentos.xlsx`;
      a.href = url; a.download = fname; a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel gerado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar Excel");
    }
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      size="icon"
      title="Exportar para Excel"
      className="bg-green-600 hover:bg-green-700 border-green-700 text-white"
    >
      <FileSpreadsheet className="h-4 w-4" />
    </Button>
  );
}
