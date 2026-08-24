import { useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { InventoryItem } from "@/hooks/useInventory";
import ExcelJS from "exceljs";

interface ExportInventoryButtonProps {
  items: InventoryItem[];
}

const getCategoryLabel = (category: string) => {
  const categories: Record<string, string> = {
    epi: "EPI",
    ferramentas: "Ferramentas",
    materiais: "Materiais",
    escritorio: "Escritório",
    limpeza: "Limpeza",
    geral: "Geral",
  };
  return categories[category] || category;
};

export function ExportInventoryButton({ items }: ExportInventoryButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    if (items.length === 0) {
      toast.error("Nenhum item para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sucena Empreendimentos";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Estoque", {
        pageSetup: {
          paperSize: 9,
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
        },
      });

      worksheet.columns = [
        { key: "nome", width: 35 },
        { key: "categoria", width: 15 },
        { key: "quantidade", width: 14 },
        { key: "unidade", width: 12 },
        { key: "minimo", width: 14 },
        { key: "local", width: 20 },
        { key: "ca", width: 14 },
        { key: "validade", width: 14 },
        { key: "status", width: 14 },
        { key: "observacoes", width: 30 },
      ];

      // Logo
      let logoId: number | null = null;
      try {
        const response = await fetch("/logo-sucena-pdf.png");
        if (response.ok) {
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(blob);
          });
          logoId = workbook.addImage({ base64, extension: "png" });
        }
      } catch (e) {
        console.warn("Could not load logo:", e);
      }

      if (logoId !== null) {
        worksheet.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 180, height: 50 } });
      }

      // Spacing for logo
      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow([]);

      // Title
      const titleRow = worksheet.addRow(["RELATÓRIO DE ESTOQUE - SUCENA EMPREENDIMENTOS"]);
      titleRow.height = 28;
      worksheet.mergeCells(`A${titleRow.number}:J${titleRow.number}`);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 16, color: { argb: "FF1A1A2E" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5A623" } };

      // Subtitle
      const lowStockCount = items.filter((i) => i.quantity <= i.min_quantity).length;
      const totalQty = items.reduce((s, i) => s + i.quantity, 0);
      const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      const subtitleRow = worksheet.addRow([
        `Total: ${items.length} itens | ${totalQty} unidades | Estoque baixo: ${lowStockCount} | Gerado em: ${dateStr}`,
      ]);
      worksheet.mergeCells(`A${subtitleRow.number}:J${subtitleRow.number}`);
      subtitleRow.getCell(1).font = { size: 10, italic: true, color: { argb: "FF666666" } };
      subtitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      subtitleRow.height = 20;

      // Spacer
      worksheet.addRow([]);

      // Header
      const headers = ["Nome", "Categoria", "Quantidade", "Unidade", "Qtd Mínima", "Local", "CA", "Validade CA", "Status", "Observações"];
      const headerRow = worksheet.addRow(headers);
      const headerRowNumber = headerRow.number;
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D2D44" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FF1A1A2E" } },
          left: { style: "thin", color: { argb: "FF1A1A2E" } },
          bottom: { style: "thin", color: { argb: "FF1A1A2E" } },
          right: { style: "thin", color: { argb: "FF1A1A2E" } },
        };
      });

      // Data rows
      items.forEach((item, index) => {
        const isLowStock = item.quantity <= item.min_quantity;
        const row = worksheet.addRow([
          item.name,
          getCategoryLabel(item.category),
          item.quantity,
          item.unit,
          item.min_quantity,
          (item as any).storage_locations?.name || "-",
          item.ca_number || "-",
          item.ca_expiry ? format(new Date(item.ca_expiry), "dd/MM/yyyy") : "-",
          isLowStock ? "⚠ Baixo" : "OK",
          item.notes || "-",
        ]);
        row.height = 20;
        const isEven = index % 2 === 0;
        row.eachCell((cell, colNumber) => {
          cell.font = { size: 9, color: colNumber === 9 && isLowStock ? { argb: "FFDC2626" } : undefined };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? "FFF8F8F8" : "FFFFFFFF" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFDDDDDD" } },
            left: { style: "thin", color: { argb: "FFDDDDDD" } },
            bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
            right: { style: "thin", color: { argb: "FFDDDDDD" } },
          };
          if (colNumber === 1 || colNumber === 6 || colNumber === 10) {
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });
      });

      // Auto filter on header row
      const lastDataRow = headerRowNumber + items.length;
      worksheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: { row: lastDataRow, column: 10 },
      };

      // Summary by category
      worksheet.addRow([]);
      const catTitleRow = worksheet.addRow(["RESUMO POR CATEGORIA"]);
      worksheet.mergeCells(`A${catTitleRow.number}:B${catTitleRow.number}`);
      catTitleRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      catTitleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D2D44" } };
      catTitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      catTitleRow.height = 22;

      const catStats: Record<string, { count: number; qty: number }> = {};
      items.forEach((i) => {
        const cat = getCategoryLabel(i.category);
        if (!catStats[cat]) catStats[cat] = { count: 0, qty: 0 };
        catStats[cat].count++;
        catStats[cat].qty += i.quantity;
      });

      Object.entries(catStats)
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([cat, stats], idx) => {
          const row = worksheet.addRow([cat, `${stats.count} itens (${stats.qty} un.)`]);
          const isEven = idx % 2 === 0;
          [1, 2].forEach((col) => {
            const cell = row.getCell(col);
            cell.font = { size: 9, bold: col === 2 };
            cell.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? "FFF8F8F8" : "FFFFFFFF" } };
            cell.border = {
              top: { style: "thin", color: { argb: "FFDDDDDD" } },
              left: { style: "thin", color: { argb: "FFDDDDDD" } },
              bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
              right: { style: "thin", color: { argb: "FFDDDDDD" } },
            };
          });
        });

      // Footer
      worksheet.addRow([]);
      const footerRow = worksheet.addRow(["Sucena Empreendimentos | Sistema de Gestão de Estoque"]);
      worksheet.mergeCells(`A${footerRow.number}:J${footerRow.number}`);
      footerRow.getCell(1).font = { size: 8, italic: true, color: { argb: "FF888888" } };
      footerRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `estoque_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Excel exportado com sucesso!");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Erro ao gerar Excel");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={exportToExcel} disabled={isExporting || items.length === 0}>
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 mr-2" />
      )}
      Exportar Excel
    </Button>
  );
}
