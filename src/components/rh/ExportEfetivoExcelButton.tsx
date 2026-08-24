import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import type { Colaborador } from "@/data/efetivoData";
import sucenaLogo from "@/assets/Sucena.png.asset.json";

interface ExportEfetivoExcelButtonProps {
  colaboradores: Colaborador[];
  filterFuncao?: string;
}

export function ExportEfetivoExcelButton({ colaboradores, filterFuncao }: ExportEfetivoExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    if (colaboradores.length === 0) {
      toast.error("Nenhum colaborador para exportar");
      return;
    }

    setIsGenerating(true);

    try {
      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sucena Empreendimentos";
      workbook.created = new Date();
      
      const worksheet = workbook.addWorksheet("Efetivo", {
        pageSetup: {
          paperSize: 9, // A4
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: {
            left: 0.3,
            right: 0.3,
            top: 0.5,
            bottom: 0.5,
            header: 0.3,
            footer: 0.3,
          },
        },
      });

      // Sort alphabetically by name
      const sortedColaboradores = [...colaboradores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      // Set column widths
      worksheet.columns = [
        { key: "nome", width: 35 },
        { key: "funcao", width: 25 },
        { key: "matricula", width: 14 },
        { key: "matriculaHydro", width: 16 },
        { key: "cpf", width: 15 },
        { key: "admissao", width: 12 },
        { key: "nascimento", width: 12 },
        { key: "contato", width: 16 },
        { key: "localidade", width: 18 },
        { key: "aso_admissional", width: 14 },
        { key: "aso_validade", width: 14 },
        { key: "aso_periodico", width: 14 },
        { key: "aso_retorno", width: 14 },
        { key: "aso_mudanca", width: 14 },
      ];

      // Fetch and embed logo
      let logoId: number | null = null;
      try {
        const response = await fetch(sucenaLogo.url);
        if (response.ok) {
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              // Remove data URL prefix
              resolve(result.split(",")[1]);
            };
            reader.readAsDataURL(blob);
          });
          logoId = workbook.addImage({
            base64,
            extension: "png",
          });
        }
      } catch (e) {
        console.warn("Could not load logo:", e);
      }

      // Add logo if available
      if (logoId !== null) {
        worksheet.addImage(logoId, {
          tl: { col: 0, row: 0 },
          ext: { width: 180, height: 50 },
        });
      }

      // Add empty rows for logo space
      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow([]);

      // Title row
      const titleRow = worksheet.addRow(["RELATÓRIO DE EFETIVO - SUCENA EMPREENDIMENTOS"]);
      titleRow.height = 28;
      worksheet.mergeCells(`A${titleRow.number}:N${titleRow.number}`);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, size: 16, color: { argb: "FF1A1A2E" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5A623" },
      };

      // Subtitle row with filter info and date
      const filterLabel = filterFuncao && filterFuncao !== "all" ? `Filtro: ${filterFuncao}` : "Todos os colaboradores";
      const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      const subtitleRow = worksheet.addRow([`${filterLabel} | Total: ${sortedColaboradores.length} colaboradores | Gerado em: ${dateStr}`]);
      worksheet.mergeCells(`A${subtitleRow.number}:N${subtitleRow.number}`);
      const subtitleCell = subtitleRow.getCell(1);
      subtitleCell.font = { size: 10, italic: true, color: { argb: "FF666666" } };
      subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
      subtitleRow.height = 20;

      // Empty row before table
      worksheet.addRow([]);

      // Header row
      const headers = ["Nome", "Função", "Matrícula Hydro", "Matrícula Sucena", "CPF", "Admissão", "Nascimento", "Contato", "Localidade", "ASO Admissional", "ASO Validade", "ASO Periódico", "ASO Retorno", "ASO Mud. Risco"];
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2D2D44" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FF1A1A2E" } },
          left: { style: "thin", color: { argb: "FF1A1A2E" } },
          bottom: { style: "thin", color: { argb: "FF1A1A2E" } },
          right: { style: "thin", color: { argb: "FF1A1A2E" } },
        };
      });

      // Data rows
      sortedColaboradores.forEach((c, index) => {
        const row = worksheet.addRow([
          c.nome,
          c.funcao,
          c.matriculaHydro || "-",
          c.matricula,
          c.cpf,
          c.admissao,
          c.dataNascimento,
          c.contato || "-",
          c.localidade,
          c.aso?.admissional || "-",
          c.aso?.validade || "-",
          c.aso?.periodico || "-",
          c.aso?.retornoTrabalho || "-",
          c.aso?.mudancaRisco || "-",
        ]);
        row.height = 20;
        
        const isEven = index % 2 === 0;
        row.eachCell((cell, colNumber) => {
          cell.font = { size: 9 };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isEven ? "FFF8F8F8" : "FFFFFFFF" },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFDDDDDD" } },
            left: { style: "thin", color: { argb: "FFDDDDDD" } },
            bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
            right: { style: "thin", color: { argb: "FFDDDDDD" } },
          };
          // Left align name and function, center others
          if (colNumber === 1 || colNumber === 2) {
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });
      });

      // Summary row
      worksheet.addRow([]);
      const summaryRow = worksheet.addRow([`Total de colaboradores: ${sortedColaboradores.length}`]);
      worksheet.mergeCells(`A${summaryRow.number}:N${summaryRow.number}`);
      const summaryCell = summaryRow.getCell(1);
      summaryCell.font = { bold: true, size: 10, color: { argb: "FF1A1A2E" } };
      summaryCell.alignment = { horizontal: "right", vertical: "middle" };

      // Function summary
      const funcaoStats: Record<string, number> = {};
      sortedColaboradores.forEach((c) => {
        funcaoStats[c.funcao] = (funcaoStats[c.funcao] || 0) + 1;
      });
      const sortedFuncaoStats = Object.entries(funcaoStats).sort((a, b) => b[1] - a[1]);

      worksheet.addRow([]);
      const funcaoTitleRow = worksheet.addRow(["RESUMO POR FUNÇÃO"]);
      worksheet.mergeCells(`A${funcaoTitleRow.number}:B${funcaoTitleRow.number}`);
      const funcaoTitleCell = funcaoTitleRow.getCell(1);
      funcaoTitleCell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      funcaoTitleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2D2D44" },
      };
      funcaoTitleCell.alignment = { horizontal: "center", vertical: "middle" };
      funcaoTitleRow.height = 22;

      sortedFuncaoStats.forEach(([funcao, count], index) => {
        const row = worksheet.addRow([funcao, count.toString()]);
        const isEven = index % 2 === 0;
        row.getCell(1).font = { size: 9 };
        row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEven ? "FFF8F8F8" : "FFFFFFFF" },
        };
        row.getCell(1).border = {
          top: { style: "thin", color: { argb: "FFDDDDDD" } },
          left: { style: "thin", color: { argb: "FFDDDDDD" } },
          bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
          right: { style: "thin", color: { argb: "FFDDDDDD" } },
        };
        row.getCell(2).font = { size: 9, bold: true };
        row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(2).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEven ? "FFF8F8F8" : "FFFFFFFF" },
        };
        row.getCell(2).border = {
          top: { style: "thin", color: { argb: "FFDDDDDD" } },
          left: { style: "thin", color: { argb: "FFDDDDDD" } },
          bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
          right: { style: "thin", color: { argb: "FFDDDDDD" } },
        };
      });

      // Footer
      worksheet.addRow([]);
      const footerRow = worksheet.addRow(["Sucena Empreendimentos | sucenaempreendimentos.com.br | contato@sucenaempreendimentos.com.br"]);
      worksheet.mergeCells(`A${footerRow.number}:N${footerRow.number}`);
      const footerCell = footerRow.getCell(1);
      footerCell.font = { size: 8, italic: true, color: { argb: "FF888888" } };
      footerCell.alignment = { horizontal: "center", vertical: "middle" };

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const filterFileLabel = filterFuncao && filterFuncao !== "all" ? `-${filterFuncao}` : "";
      const fileDateStr = new Date().toISOString().split("T")[0];
      link.download = `efetivo${filterFileLabel}-${fileDateStr}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Excel exportado com sucesso!");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Erro ao gerar Excel");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isGenerating}
      variant="outline"
      className="gap-2"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      )}
      Baixar Planilha completa
    </Button>
  );
}
