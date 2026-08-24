import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";

interface Produto {
  id: number;
  nome: string;
  fabricante: string;
  ni: string;
  perigoso: boolean;
  controlado: boolean;
  classeRisco: string;
}

interface ExportHomologadosButtonProps {
  produtos: Produto[];
}

export function ExportHomologadosButton({ produtos }: ExportHomologadosButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const logoBase64 = await getLogoBase64();


      const tableRows = produtos
        .map(
          (p) => `
          <tr>
            <td>${p.nome}</td>
            <td>${p.fabricante || "-"}</td>
            <td class="center">${p.ni && p.ni !== "0" ? p.ni : "-"}</td>
            <td class="center">${p.perigoso ? '<span class="badge danger">Sim</span>' : '<span class="badge success">Não</span>'}</td>
            <td class="center">${p.controlado ? '<span class="badge info">Sim</span>' : '<span class="badge outline">Não</span>'}</td>
            <td>${p.classeRisco || "-"}</td>
          </tr>
        `
        )
        .join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Produtos Homologados</title>
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
              font-size: 9px;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 8px;
            }
            tr:nth-child(even) {
              background-color: #fafafa;
            }
            .center {
              text-align: center;
            }
            .badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 8px;
              font-weight: bold;
            }
            .badge.danger {
              background-color: #fee2e2;
              color: #dc2626;
            }
            .badge.success {
              background-color: #dcfce7;
              color: #16a34a;
            }
            .badge.info {
              background-color: #dbeafe;
              color: #2563eb;
            }
            .badge.outline {
              background-color: #f5f5f5;
              color: #666;
              border: 1px solid #ddd;
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
              <h1>Produtos Homologados</h1>
              <p>Lista de produtos aprovados para uso na operação</p>
            </div>
          </div>
          
          <div class="info">
            <strong>Data de Geração:</strong> ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}<br>
            <strong>Total de Produtos:</strong> ${produtos.length}
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 30%">Nome do Produto</th>
                <th style="width: 20%">Fabricante</th>
                <th style="width: 10%">NI</th>
                <th style="width: 10%">Perigoso</th>
                <th style="width: 10%">Controlado</th>
                <th style="width: 20%">Classe de Risco</th>
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

      await downloadPdfFromHtml(htmlContent, `produtos-homologados-${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("Erro ao exportar para PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToPDF}
      disabled={isExporting || produtos.length === 0}
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4 text-red-500" />
      )}
      <span className="hidden sm:inline">Exportar PDF</span>
      <Download className="h-4 w-4 sm:hidden" />
    </Button>
  );
}
