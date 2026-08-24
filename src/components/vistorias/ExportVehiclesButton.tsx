import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { VehicleInspection, DATE_FIELDS } from "@/hooks/useVehicleInspections";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";

interface ExportVehiclesButtonProps {
  vehicles: VehicleInspection[];
}

export function ExportVehiclesButton({ vehicles }: ExportVehiclesButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return dateStr;
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr || "-";
    }
  };

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      // CSV header
      const headers = [
        "Placa", 
        "Modelo do Veículo", 
        "Nº Crachá", 
        ...DATE_FIELDS.map((f) => f.label)
      ];
      
      // CSV rows
      const rows = vehicles.map((v) => [
        v.placa,
        v.modelo_veiculo,
        v.numero_cracha,
        formatDate(v.vistoria),
        formatDate(v.laudo_opacidade),
        formatDate(v.laudo_mecanico),
        formatDate(v.plano_manutencao),
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(";"),
        ...rows.map((row) => row.join(";")),
      ].join("\n");

      // Add BOM for Excel UTF-8 compatibility
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      
      // Create download link
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `veiculos_terceiros_${format(new Date(), "yyyy-MM-dd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Exportado para Excel com sucesso!");
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error("Erro ao exportar para Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const logoBase64 = await getLogoBase64();


      const tableRows = vehicles
        .map(
          (v) => `
          <tr>
            <td>${v.placa}</td>
            <td>${v.modelo_veiculo}</td>
            <td>${v.numero_cracha}</td>
            <td>${formatDate(v.vistoria)}</td>
            <td>${formatDate(v.laudo_opacidade)}</td>
            <td>${formatDate(v.laudo_mecanico)}</td>
            <td>${formatDate(v.plano_manutencao)}</td>
          </tr>
        `
        )
        .join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Veículos Terceiros</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 15px;
              border-bottom: 2px solid #333;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .header .logo {
              max-height: 50px;
              max-width: 140px;
              object-fit: contain;
            }
            .header-info { text-align: right; }
            .header-info h1 {
              font-size: 24px;
              margin-bottom: 5px;
            }
            .header-info p {
              font-size: 12px;
              color: #666;
            }
            .info {
              margin-bottom: 20px;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px 6px;
              text-align: left;
              font-size: 10px;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 9px;
            }
            tr:nth-child(even) {
              background-color: #fafafa;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              padding-top: 15px;
              border-top: 1px solid #ddd;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoBase64 ? `<img loading="lazy" decoding="async" src="${logoBase64}" alt="Logo" class="logo" />` : '<div></div>'}
            <div class="header-info">
              <h1>Relatório de Veículos Terceiros</h1>
              <p>Controle de Vistorias e Laudos</p>
            </div>
          </div>
          
          <div class="info">
            <strong>Data de Geração:</strong> ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}<br>
            <strong>Total de Veículos:</strong> ${vehicles.length}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Modelo</th>
                <th>Nº Crachá</th>
                <th>Vistoria</th>
                <th>Laudo Opacidade</th>
                <th>Laudo Mecânico</th>
                <th>Plano Manutenção</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          
          <div class="footer">
            Painel Sucena - Sistema de Gestão
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `;

      await downloadPdfFromHtml(htmlContent, `veiculos-terceiros-${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("Erro ao exportar para PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isExporting || vehicles.length === 0}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="w-4 h-4 text-green-500" />
          Exportar para Excel (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4 text-red-500" />
          Exportar para PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
