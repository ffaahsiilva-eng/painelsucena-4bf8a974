import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getLogoBase64, PDF_HEADER_STYLES, generatePdfHeader } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";
import {
  useSlingWithInspections,
  colorLabels,
  SlingWithInspection,
} from "@/hooks/useSlingEquipment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ExportSlingPendingPdfButton() {
  const { pendingInspections, currentMonthColor, isLoading } = useSlingWithInspections();

  const handleExport = async () => {
    if (pendingInspections.length === 0) {
      toast.info("Nenhuma cinta pendente para exportar");
      return;
    }

    try {
      const logoBase64 = await getLogoBase64();
      const now = new Date();
      const monthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR });
      const colorLabel = colorLabels[currentMonthColor];

      const colorHex: Record<string, string> = {
        red: "#ef4444",
        blue: "#3b82f6",
        yellow: "#eab308",
        green: "#22c55e",
      };

      const rows = pendingInspections
        .map(
          (s: SlingWithInspection, i: number) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${colorHex[s.color] || "#999"};flex-shrink:0;"></span>
                <strong>${s.tag}</strong>
              </div>
            </td>
            <td>${s.description}</td>
            <td style="text-align:center;">Pendente</td>
            <td style="border:1px solid #d1d5db;width:80px;"></td>
          </tr>`
        )
        .join("");

      const html = `
        <html>
        <head>
          <style>
            @page { size: A4; margin: 15mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 12px; }
            ${PDF_HEADER_STYLES}
            .subtitle {
              text-align: center;
              margin-bottom: 18px;
              font-size: 15px;
              font-weight: 600;
              color: #374151;
            }
            .color-badge {
              display: inline-block;
              padding: 3px 12px;
              border-radius: 12px;
              color: #fff;
              font-weight: 700;
              font-size: 13px;
              background: ${colorHex[currentMonthColor]};
            }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th {
              background: #f3f4f6;
              padding: 8px 10px;
              text-align: left;
              border: 1px solid #d1d5db;
              font-size: 11px;
              text-transform: uppercase;
              color: #6b7280;
            }
            td {
              padding: 7px 10px;
              border: 1px solid #e5e7eb;
              font-size: 12px;
            }
            tr:nth-child(even) td { background: #f9fafb; }
            .footer {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #9ca3af;
            }
            .sig-line {
              margin-top: 50px;
              display: flex;
              justify-content: space-around;
              gap: 40px;
            }
            .sig-line div {
              text-align: center;
              flex: 1;
            }
            .sig-line span {
              display: block;
              border-top: 1px solid #1f2937;
              padding-top: 4px;
              font-size: 11px;
              color: #374151;
            }
          </style>
        </head>
        <body>
          ${generatePdfHeader("Vistoria de Cintas", `Pendentes — ${monthLabel}`, logoBase64)}
          <div class="subtitle">
            Cor do mês: <span class="color-badge">${colorLabel}</span>
            &nbsp;—&nbsp; Total: <strong>${pendingInspections.length}</strong> cinta(s)
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:40px;text-align:center;">#</th>
                <th>Identificação</th>
                <th>Descrição</th>
                <th style="width:90px;text-align:center;">Status</th>
                <th style="width:80px;text-align:center;">Visto</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="sig-line">
            <div><span>Responsável pela Inspeção</span></div>
            <div><span>Técnico de Segurança</span></div>
          </div>
          <div class="footer">
            <span>Gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm")}</span>
            <span>Sucena Empreendimentos</span>
          </div>
        </body>
        </html>
      `;

      await downloadPdfFromHtml(html, `cintas-pendentes-${format(now, "yyyy-MM-dd")}.pdf`);

      toast.success("PDF gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  if (isLoading || pendingInspections.length === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="gap-1.5 text-xs"
    >
      <FileDown className="w-3.5 h-3.5" />
      PDF Cintas
    </Button>
  );
}
