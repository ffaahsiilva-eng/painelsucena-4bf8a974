import { useState } from "react";
import { format, startOfWeek, endOfWeek, subWeeks, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EquipmentMovement, ExitReason } from "@/hooks/useEquipmentMovements";
import { getLogoBase64, PDF_HEADER_STYLES } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";

const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  operando: "Operando",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  fim_turno: "Fim de Turno",
};

interface ExportMovementsPdfButtonProps {
  movements: EquipmentMovement[];
  startDate: string;
  endDate: string;
}

export function ExportMovementsPdfButton({ 
  movements, 
  startDate, 
  endDate 
}: ExportMovementsPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (movements.length === 0) {
      toast.error("Não há registros para exportar");
      return;
    }

    setIsExporting(true);

    try {
      const logoBase64 = await getLogoBase64();

      // Group movements by date
      const groupedByDate = movements.reduce((acc, movement) => {
        const date = movement.movement_date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(movement);
        return acc;
      }, {} as Record<string, EquipmentMovement[]>);

      // Generate HTML for PDF
      const formattedStartDate = format(parseISO(startDate), "dd/MM/yyyy", { locale: ptBR });
      const formattedEndDate = format(parseISO(endDate), "dd/MM/yyyy", { locale: ptBR });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Entrada e Saída de Equipamentos</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 11px; 
              line-height: 1.4;
              padding: 20px;
              color: #333;
            }
            ${PDF_HEADER_STYLES}
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #2563eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .header .logo {
              max-height: 50px;
              max-width: 140px;
              object-fit: contain;
            }
            .header-info h1 { 
              font-size: 18px; 
              color: #1e40af;
              margin-bottom: 5px;
            }
            .header-info p { 
              font-size: 12px; 
              color: #666;
            }
            .summary {
              display: flex;
              justify-content: space-around;
              margin-bottom: 20px;
              padding: 10px;
              background: #f8fafc;
              border-radius: 8px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item strong {
              display: block;
              font-size: 18px;
              color: #1e40af;
            }
            .date-section { 
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .date-header {
              background: #2563eb;
              color: white;
              padding: 8px 12px;
              font-weight: bold;
              border-radius: 4px 4px 0 0;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 10px;
            }
            th { 
              background: #e2e8f0; 
              padding: 8px; 
              text-align: left;
              font-weight: 600;
              border: 1px solid #cbd5e1;
            }
            td { 
              padding: 6px 8px; 
              border: 1px solid #e2e8f0;
              vertical-align: top;
            }
            .entrada { background: #dcfce7; }
            .saida { background: #fef3c7; }
            .type-badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-weight: bold;
              font-size: 10px;
            }
            .type-entrada { background: #22c55e; color: white; }
            .type-saida { background: #f97316; color: white; }
            .reason-badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
              margin-top: 4px;
            }
            .reason-corretiva { background: #fecaca; color: #dc2626; }
            .reason-preventiva { background: #fed7aa; color: #ea580c; }
            .reason-vistoria { background: #bfdbfe; color: #2563eb; }
            .problem-desc {
              background: #fee2e2;
              padding: 4px 6px;
              border-radius: 4px;
              margin-top: 4px;
              font-size: 10px;
              color: #dc2626;
            }
            .observation {
              font-style: italic;
              color: #666;
              font-size: 10px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            @media print {
              body { padding: 10px; }
              .date-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoBase64 ? `<img loading="lazy" decoding="async" src="${logoBase64}" alt="Logo" class="logo" />` : '<div></div>'}
            <div class="header-info">
              <h1>📋 Relatório de Entrada e Saída de Equipamentos</h1>
              <p>Período: ${formattedStartDate} a ${formattedEndDate}</p>
            </div>
          </div>

          <div class="summary">
            <div class="summary-item">
              <strong>${movements.filter(m => m.movement_type === 'entrada').length}</strong>
              <span>Entradas</span>
            </div>
            <div class="summary-item">
              <strong>${movements.filter(m => m.movement_type === 'saida').length}</strong>
              <span>Saídas</span>
            </div>
            <div class="summary-item">
              <strong>${movements.length}</strong>
              <span>Total de Registros</span>
            </div>
          </div>

          ${Object.entries(groupedByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dayMovements]) => `
              <div class="date-section">
                <div class="date-header">
                  📅 ${format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 60px;">Hora</th>
                      <th style="width: 60px;">Tipo</th>
                      <th>Equipamento</th>
                      <th style="width: 80px;">Placa</th>
                      <th>Motivo/Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${dayMovements.map(m => `
                      <tr class="${m.movement_type}">
                        <td>${m.movement_time.slice(0, 5)}</td>
                        <td>
                          <span class="type-badge type-${m.movement_type}">
                            ${m.movement_type === 'entrada' ? '⬇️ Entrada' : '⬆️ Saída'}
                          </span>
                        </td>
                        <td><strong>${m.equipment_name}</strong></td>
                        <td>${m.plate}</td>
                        <td>
                          ${m.exit_reason ? `
                            <span class="reason-badge reason-${m.exit_reason === 'manutencao_corretiva' ? 'corretiva' : m.exit_reason === 'manutencao_preventiva' ? 'preventiva' : 'vistoria'}">
                              ${EXIT_REASON_LABELS[m.exit_reason]}
                            </span>
                          ` : ''}
                          ${m.problem_description ? `
                            <div class="problem-desc">⚠️ ${m.problem_description}</div>
                          ` : ''}
                          ${m.observation ? `
                            <div class="observation">"${m.observation}"</div>
                          ` : ''}
                          ${!m.exit_reason && !m.problem_description && !m.observation ? '-' : ''}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `).join('')}

          <div class="footer">
            Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} | Sistema de Gestão Sucena
          </div>
        </body>
        </html>
      `;

      await downloadPdfFromHtml(htmlContent, `movimentacoes-semana-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      onClick={handleExport} 
      variant="outline" 
      className="gap-2"
      disabled={isExporting || movements.length === 0}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Exportar PDF
    </Button>
  );
}
