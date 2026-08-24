import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import type { Colaborador } from "@/data/efetivoData";
import type { AbsenceRow, AbsenceReason } from "@/hooks/useAbsenceReasons";
import sucenaLogo from "@/assets/logo-sucena.png";

interface Props {
  year: number;
  month: number;
  colaboradores: Colaborador[];
  absences: AbsenceRow[];
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Sigla curta padrão usada em relatórios de presença
const reasonShort = (r: string): string => {
  const map: Record<string, string> = {
    "Falta": "F",
    "Atestado": "AT",
    "Treinamento": "TR",
    "Folga por Exame": "FE",
    "Folga": "FG",
    "Afastado": "AF",
    "Licença Maternidade/Paternidade": "LM",
    "INSS": "IN",
    "Folga de Campo": "FC",
    "Licença Casamento": "LC",
    "Licença Morte": "LO",
  };
  return map[r] || r.slice(0, 2).toUpperCase();
};

// Cores ARGB (hex sem #) por motivo - tons suaves p/ legibilidade
const REASON_FILL: Record<string, string> = {
  "Falta": "FFFECACA",
  "Atestado": "FFFEF3C7",
  "Treinamento": "FFDBEAFE",
  "Folga por Exame": "FFE9D5FF",
  "Folga": "FFD1FAE5",
  "Afastado": "FFFED7AA",
  "Licença Maternidade/Paternidade": "FFFBCFE8",
  "INSS": "FFCFFAFE",
  "Folga de Campo": "FFCCFBF1",
  "Licença Casamento": "FFFFE4E6",
  "Licença Morte": "FFE2E8F0",
};

const REASON_FONT: Record<string, string> = {
  "Falta": "FFB91C1C",
  "Atestado": "FFB45309",
  "Treinamento": "FF1D4ED8",
  "Folga por Exame": "FF7E22CE",
  "Folga": "FF047857",
  "Afastado": "FFC2410C",
  "Licença Maternidade/Paternidade": "FFBE185D",
  "INSS": "FF0E7490",
  "Folga de Campo": "FF0F766E",
  "Licença Casamento": "FFBE123C",
  "Licença Morte": "FF334155",
};

const ALL_REASONS: AbsenceReason[] = [
  "Falta", "Atestado", "Treinamento", "Folga por Exame", "Folga", "Afastado",
  "Licença Maternidade/Paternidade", "INSS", "Folga de Campo", "Licença Casamento", "Licença Morte",
];

export const ExportRelatorioPresencaExcel = ({ year, month, colaboradores, absences }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!colaboradores.length) {
      toast.error("Sem colaboradores para exportar");
      return;
    }
    setLoading(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "OpsHub";
      wb.created = new Date();
      const ws = wb.addWorksheet(`${MONTH_NAMES[month - 1]} ${year}`, {
        views: [{ state: "frozen", xSplit: 3, ySplit: 4 }],
      });

      const daysInMonth = new Date(year, month, 0).getDate();
      const dayList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      // Map absences: empKey -> date -> row
      const absMap = new Map<string, Map<string, AbsenceRow>>();
      absences.forEach((a) => {
        if (!absMap.has(a.employee_id)) absMap.set(a.employee_id, new Map());
        absMap.get(a.employee_id)!.set(a.date, a);
      });
      const empKey = (c: Colaborador) => String(c.matricula || c.id);

      const totalCols = 3 + daysInMonth + ALL_REASONS.length + 1 + 3; // matr, nome, função + dias + motivos + total + CID + CIDs por dia + Observações

      // Logo Sucena - carrega como base64 e adiciona à planilha
      try {
        const logoResp = await fetch(sucenaLogo);
        const logoBuffer = await logoResp.arrayBuffer();
        const imageId = wb.addImage({ buffer: logoBuffer as any, extension: "png" });
        ws.addImage(imageId, {
          tl: { col: 0.15, row: 0.15 },
          ext: { width: 110, height: 60 },
          editAs: "oneCell",
        });
      } catch (err) {
        console.warn("Falha ao carregar logo Sucena:", err);
      }

      // Title
      ws.mergeCells(1, 1, 1, totalCols);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = `RELATÓRIO DE PRESENÇA — ${MONTH_NAMES[month - 1].toUpperCase()} / ${year}`;
      titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
      ws.getRow(1).height = 70;

      // Subtitle
      ws.mergeCells(2, 1, 2, totalCols);
      const subCell = ws.getCell(2, 1);
      subCell.value = `Total de colaboradores: ${colaboradores.length}   •   Gerado em ${new Date().toLocaleString("pt-BR")}`;
      subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };
      subCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(2).height = 18;

      // Header row 1 - groups
      ws.mergeCells(3, 1, 4, 1);
      ws.mergeCells(3, 2, 4, 2);
      ws.mergeCells(3, 3, 4, 3);
      ws.getCell(3, 1).value = "MATRÍCULA";
      ws.getCell(3, 2).value = "COLABORADOR";
      ws.getCell(3, 3).value = "FUNÇÃO";

      ws.mergeCells(3, 4, 3, 3 + daysInMonth);
      ws.getCell(3, 4).value = "DIAS DO MÊS";
      ws.mergeCells(3, 4 + daysInMonth, 3, 3 + daysInMonth + ALL_REASONS.length);
      ws.getCell(3, 4 + daysInMonth).value = "TOTAIS POR MOTIVO";
      const totalAusCol = 3 + daysInMonth + ALL_REASONS.length + 1;
      const cidCol = totalAusCol + 1;
      const cidByDayCol = totalAusCol + 2;
      const obsCol = totalAusCol + 3;
      ws.mergeCells(3, totalAusCol, 4, totalAusCol);
      ws.getCell(3, totalAusCol).value = "TOTAL\nAUSÊNCIAS";
      ws.mergeCells(3, cidCol, 4, cidCol);
      ws.getCell(3, cidCol).value = "CID";
      ws.mergeCells(3, cidByDayCol, 4, cidByDayCol);
      ws.getCell(3, cidByDayCol).value = "CIDs POR DIA";
      ws.mergeCells(3, obsCol, 4, obsCol);
      ws.getCell(3, obsCol).value = "OBSERVAÇÕES";

      // Header row 2 - days + reasons
      dayList.forEach((d, idx) => {
        const cell = ws.getCell(4, 4 + idx);
        cell.value = String(d).padStart(2, "0");
      });
      ALL_REASONS.forEach((r, idx) => {
        const cell = ws.getCell(4, 4 + daysInMonth + idx);
        cell.value = reasonShort(r);
      });

      // Style headers
      const headerStyle = (row: number) => {
        const r = ws.getRow(row);
        r.eachCell((cell) => {
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FF1E293B" } },
            left: { style: "thin", color: { argb: "FF1E293B" } },
            bottom: { style: "thin", color: { argb: "FF1E293B" } },
            right: { style: "thin", color: { argb: "FF1E293B" } },
          };
        });
      };
      headerStyle(3);
      headerStyle(4);
      ws.getRow(3).height = 22;
      ws.getRow(4).height = 22;

      // Data rows
      colaboradores.forEach((c, i) => {
        const rowIdx = 5 + i;
        const row = ws.getRow(rowIdx);
        const empMap = absMap.get(empKey(c));

        row.getCell(1).value = c.matricula || "";
        row.getCell(2).value = c.nome;
        row.getCell(3).value = c.funcao;

        const reasonCounts: Record<string, number> = {};
        let totalAus = 0;
        const cidSet = new Set<string>();
        const cidByDayList: string[] = [];
        const obsList: string[] = [];

        dayList.forEach((d, idx) => {
          const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const abs = empMap?.get(date);
          const cell = row.getCell(4 + idx);
          if (abs) {
            cell.value = abs.reason;
            const fill = REASON_FILL[abs.reason] || "FFE2E8F0";
            const font = REASON_FONT[abs.reason] || "FF1E293B";
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
            cell.font = { name: "Arial", size: 8, bold: true, color: { argb: font } };
            reasonCounts[abs.reason] = (reasonCounts[abs.reason] || 0) + 1;
            totalAus++;
            if (abs.cid) {
              cidSet.add(abs.cid);
              cidByDayList.push(`Dia ${String(d).padStart(2, "0")}: ${abs.cid}`);
            }
            if (abs.notes) obsList.push(`Dia ${String(d).padStart(2, "0")}: ${abs.notes}`);
          } else {
            cell.value = "•";
            cell.font = { name: "Arial", size: 9, color: { argb: "FF94A3B8" } };
          }
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        });

        // Reason totals
        ALL_REASONS.forEach((r, idx) => {
          const cell = row.getCell(4 + daysInMonth + idx);
          const v = reasonCounts[r] || 0;
          cell.value = v || "";
          cell.alignment = { horizontal: "center", vertical: "middle" };
          if (v > 0) {
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: REASON_FONT[r] } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REASON_FILL[r] } };
          } else {
            cell.font = { name: "Arial", size: 9, color: { argb: "FFCBD5E1" } };
          }
        });

        const totalCell = row.getCell(totalAusCol);
        totalCell.value = totalAus || "";
        totalCell.font = { name: "Arial", size: 10, bold: true, color: { argb: totalAus ? "FFB91C1C" : "FFCBD5E1" } };
        totalCell.alignment = { horizontal: "center", vertical: "middle" };
        totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

        // CID column (concatena todos os CIDs únicos do mês)
        const cidCell = row.getCell(cidCol);
        cidCell.value = Array.from(cidSet).join(", ");
        cidCell.font = { name: "Arial", size: 9, color: { argb: "FF1E293B" } };
        cidCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

        // CIDs por dia (lista detalhada)
        const cidByDayCell = row.getCell(cidByDayCol);
        cidByDayCell.value = cidByDayList.join(" | ");
        cidByDayCell.font = { name: "Arial", size: 9, color: { argb: "FF1E293B" } };
        cidByDayCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true, indent: 1 };

        // Observações (todas as ocorrências do mês)
        const obsCell = row.getCell(obsCol);
        obsCell.value = obsList.join(" | ");
        obsCell.font = { name: "Arial", size: 9, color: { argb: "FF1E293B" } };
        obsCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true, indent: 1 };

        // Row styling
        row.getCell(1).font = { name: "Arial", size: 9, bold: true };
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(2).font = { name: "Arial", size: 10, bold: true };
        row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(3).font = { name: "Arial", size: 9, color: { argb: "FF475569" } };
        row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };

        // Zebra
        if (i % 2 === 1) {
          for (let col = 1; col <= 3; col++) {
            const cc = row.getCell(col);
            if (!cc.fill || (cc.fill as ExcelJS.FillPattern).fgColor === undefined) {
              cc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
            }
          }
        }

        // Borders for all cells in this row
        for (let col = 1; col <= totalCols; col++) {
          const cc = row.getCell(col);
          cc.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        }
        row.height = 28;
      });

      // Totals row
      const totalsRowIdx = 5 + colaboradores.length;
      const totalsRow = ws.getRow(totalsRowIdx);
      ws.mergeCells(totalsRowIdx, 1, totalsRowIdx, 3);
      totalsRow.getCell(1).value = "TOTAIS";
      totalsRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.getCell(1).font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      totalsRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };

      // Daily totals (count of absences per day)
      dayList.forEach((d, idx) => {
        const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        let count = 0;
        absences.forEach((a) => { if (a.date === date) count++; });
        const cell = totalsRow.getCell(4 + idx);
        cell.value = count || "";
        cell.font = { name: "Arial", size: 9, bold: true, color: { argb: count ? "FFFFFFFF" : "FFCBD5E1" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // Reason totals row
      ALL_REASONS.forEach((r, idx) => {
        const count = absences.filter((a) => a.reason === r).length;
        const cell = totalsRow.getCell(4 + daysInMonth + idx);
        cell.value = count || "";
        cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      const grandTotalCell = totalsRow.getCell(totalAusCol);
      grandTotalCell.value = absences.length || "";
      grandTotalCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      grandTotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } };
      grandTotalCell.alignment = { horizontal: "center", vertical: "middle" };
      // Preenche CID/CIDs por dia/Obs do totalsRow vazios com mesmo fundo escuro
      [cidCol, cidByDayCol, obsCol].forEach((col) => {
        const c = totalsRow.getCell(col);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
      });
      totalsRow.height = 22;

      // Legend (below)
      const legendStart = totalsRowIdx + 2;
      ws.mergeCells(legendStart, 1, legendStart, Math.min(totalCols, 6));
      const legTitle = ws.getCell(legendStart, 1);
      legTitle.value = "LEGENDA";
      legTitle.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      legTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
      legTitle.alignment = { horizontal: "left", vertical: "middle", indent: 1 };

      ALL_REASONS.forEach((r, idx) => {
        const lr = ws.getRow(legendStart + 1 + idx);
        lr.getCell(1).value = reasonShort(r);
        lr.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: REASON_FILL[r] } };
        lr.getCell(1).font = { name: "Arial", size: 10, bold: true, color: { argb: REASON_FONT[r] } };
        lr.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        ws.mergeCells(legendStart + 1 + idx, 2, legendStart + 1 + idx, 6);
        lr.getCell(2).value = r;
        lr.getCell(2).font = { name: "Arial", size: 10 };
        lr.getCell(2).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      });

      // Column widths (otimizado para A4 paisagem)
      ws.getColumn(1).width = 8;
      ws.getColumn(2).width = 26;
      ws.getColumn(3).width = 16;
      for (let i = 0; i < daysInMonth; i++) ws.getColumn(4 + i).width = 3.2;
      for (let i = 0; i < ALL_REASONS.length; i++) ws.getColumn(4 + daysInMonth + i).width = 4;
      ws.getColumn(totalAusCol).width = 7;
      ws.getColumn(cidCol).width = 10;
      ws.getColumn(cidByDayCol).width = 22;
      ws.getColumn(obsCol).width = 28;

      // Print setup — A4 paisagem
      ws.pageSetup = {
        orientation: "landscape",
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      };
      ws.pageSetup.printTitlesRow = "1:3";
      ws.headerFooter.oddFooter = "&CPágina &P de &N";

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatorio_Presenca_${MONTH_NAMES[month - 1]}_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel exportado com sucesso");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao exportar: " + (e?.message || "falha"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline" size="sm" className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
      Exportar Excel
    </Button>
  );
};

export default ExportRelatorioPresencaExcel;
