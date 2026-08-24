import ExcelJS from "exceljs";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { triggerBlobDownload } from "@/lib/pdfDownload";
import { getLogoBase64 } from "@/lib/pdfLogo";
import {
  colorLabels,
  colorMonthMap,
  type SlingColor,
  type SlingWithInspection,
} from "@/hooks/useSlingEquipment";

const colorHex: Record<SlingColor, string> = {
  red: "FFEF4444",
  blue: "FF3B82F6",
  yellow: "FFEAB308",
  green: "FF22C55E",
};

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    const d = parseISO(value);
    if (!isValid(d)) return value;
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return value || "—";
  }
}

function statusLabel(status?: string | null, isMonthColor?: boolean) {
  if (!isMonthColor) return "Não é mês de inspeção";
  if (!status || status === "pending") return "Pendente";
  if (status === "inspected") return "Inspecionada";
  if (status === "cancelled") return "Cancelada";
  return status;
}

export async function exportSlingsToExcel(
  slings: SlingWithInspection[],
  monthYear: string, // "YYYY-MM"
) {
  const [yearStr, monthStr] = monthYear.split("-");
  const monthNum = parseInt(monthStr, 10);
  const yearNum = parseInt(yearStr, 10);
  const monthColor = colorMonthMap[monthNum];
  const monthLabel = monthNames[monthNum - 1];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Painel Sucena";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Vistoria de Cintas", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  // Logo
  try {
    const logoBase64 = await getLogoBase64();
    if (logoBase64) {
      const imageId = workbook.addImage({
        base64: logoBase64,
        extension: "png",
      });
      sheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 130, height: 65 },
      });
    }
  } catch {
    /* ignore logo failure */
  }

  // Column widths
  sheet.columns = [
    { width: 10 },
    { width: 22 },
    { width: 18 },
    { width: 28 },
    { width: 20 },
    { width: 18 },
    { width: 40 },
  ];

  // Title
  sheet.mergeCells("A1:G1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "Relatório de Vistoria de Cintas";
  titleCell.font = { name: "Arial", size: 18, bold: true, color: { argb: "FF1F2937" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 32;

  sheet.mergeCells("A2:G2");
  const subtitle = sheet.getCell("A2");
  subtitle.value = `Mês de Inspeção: ${monthLabel} / ${yearNum}  •  Cor do mês: ${colorLabels[monthColor]}`;
  subtitle.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF374151" } };
  subtitle.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 22;

  sheet.mergeCells("A3:G3");
  const info = sheet.getCell("A3");
  info.value = `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}  •  Total de cintas: ${slings.length}`;
  info.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF6B7280" } };
  info.alignment = { horizontal: "center", vertical: "middle" };

  // spacer
  sheet.getRow(4).height = 6;

  // Header row
  const headerRow = sheet.getRow(5);
  const headers = ["Cor", "Tag", "Descrição", "Status", "Data Inspeção", "Foto", "Observações"];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF111827" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF9CA3AF" } },
      left: { style: "thin", color: { argb: "FF9CA3AF" } },
      bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
      right: { style: "thin", color: { argb: "FF9CA3AF" } },
    };
  });
  headerRow.height = 26;

  // Data rows
  slings.forEach((sling, idx) => {
    const rowIdx = 6 + idx;
    const row = sheet.getRow(rowIdx);
    const isMonthColor = sling.color === monthColor;
    const insp = sling.currentInspection;

    row.getCell(1).value = colorLabels[sling.color];
    row.getCell(2).value = sling.tag;
    row.getCell(3).value = sling.description;
    row.getCell(4).value = statusLabel(insp?.status, isMonthColor);
    row.getCell(5).value = formatDate(insp?.inspected_at);
    row.getCell(6).value = insp?.photo_url
      ? { text: "Ver foto", hyperlink: insp.photo_url }
      : "—";
    row.getCell(7).value = insp?.notes || "—";

    // color swatch on col A (fill only)
    const colorCell = row.getCell(1);
    colorCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colorHex[sling.color] },
    };
    colorCell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: sling.color === "yellow" ? "FF1F2937" : "FFFFFFFF" },
    };
    colorCell.alignment = { horizontal: "center", vertical: "middle" };

    // Status coloring
    const statusCell = row.getCell(4);
    let statusFill = "FFE5E7EB"; // gray
    let statusColor = "FF374151";
    if (isMonthColor && (!insp || insp.status === "pending")) {
      statusFill = "FFFEE2E2";
      statusColor = "FFB91C1C";
    } else if (insp?.status === "inspected") {
      statusFill = "FFDCFCE7";
      statusColor = "FF166534";
    } else if (insp?.status === "cancelled") {
      statusFill = "FFF3F4F6";
      statusColor = "FF4B5563";
    }
    statusCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: statusFill },
    };
    statusCell.font = { name: "Arial", size: 10, bold: true, color: { argb: statusColor } };
    statusCell.alignment = { horizontal: "center", vertical: "middle" };

    // photo link style
    if (insp?.photo_url) {
      const photoCell = row.getCell(6);
      photoCell.font = {
        name: "Arial",
        size: 10,
        color: { argb: "FF2563EB" },
        underline: true,
      };
      photoCell.alignment = { horizontal: "center", vertical: "middle" };
    }

    // default cell styles
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      if (!cell.font) cell.font = { name: "Arial", size: 10 };
      if (!cell.alignment) {
        cell.alignment = { vertical: "middle", wrapText: true, horizontal: c === 3 || c === 7 ? "left" : "center" };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    }

    if (idx % 2 === 1) {
      for (let c = 2; c <= 7; c++) {
        const cell = row.getCell(c);
        if (c === 4) continue; // preserve status color
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FAFB" },
        };
      }
    }

    row.height = 22;
  });

  // Freeze header
  sheet.views = [{ state: "frozen", ySplit: 5 }];

  // Print area & repeat header on each page
  sheet.pageSetup.printTitlesRow = "5:5";

  // Second sheet: Color legend
  const legend = workbook.addWorksheet("Calendário de Cores");
  legend.columns = [
    { width: 14 },
    { width: 40 },
  ];
  legend.mergeCells("A1:B1");
  const legendTitle = legend.getCell("A1");
  legendTitle.value = "Calendário de Inspeções por Cor";
  legendTitle.font = { name: "Arial", size: 14, bold: true };
  legendTitle.alignment = { horizontal: "center" };
  legend.getRow(1).height = 26;

  const legendHeader = legend.getRow(2);
  legendHeader.getCell(1).value = "Cor";
  legendHeader.getCell(2).value = "Meses";
  [1, 2].forEach((c) => {
    const cell = legendHeader.getCell(c);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
    cell.alignment = { horizontal: "center" };
  });

  const monthShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  (Object.keys(colorLabels) as SlingColor[]).forEach((color, i) => {
    const r = legend.getRow(3 + i);
    r.getCell(1).value = colorLabels[color];
    r.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colorHex[color] },
    };
    r.getCell(1).font = {
      bold: true,
      color: { argb: color === "yellow" ? "FF1F2937" : "FFFFFFFF" },
    };
    r.getCell(1).alignment = { horizontal: "center" };

    const months = monthShort
      .filter((_, mi) => colorMonthMap[mi + 1] === color)
      .join(", ");
    r.getCell(2).value = months;
    r.getCell(2).alignment = { horizontal: "center" };
    r.height = 22;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const filename = `vistoria-cintas-${monthLabel.toLowerCase()}-${yearNum}.xlsx`;
  triggerBlobDownload(blob, filename);
}
