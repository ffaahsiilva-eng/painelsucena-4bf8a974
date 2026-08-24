import { useState } from "react";
import { format, parseISO } from "date-fns";
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

interface ExportStatusPdfButtonProps {
  allEntries: EquipmentMovement[];
  currentlyOut: EquipmentMovement[];
}

export function ExportStatusPdfButton({ 
  allEntries, 
  currentlyOut 
}: ExportStatusPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (allEntries.length === 0 && currentlyOut.length === 0) {
      toast.error("Não há registros para exportar");
      return;
    }

    setIsExporting(true);

    try {
      const logoBase64 = await getLogoBase64();

      // Group entries by equipment (unique by plate)
      const uniqueEntries = allEntries.reduce((acc, entry) => {
        const existingIndex = acc.findIndex(e => e.plate === entry.plate);
        if (existingIndex === -1) {
          acc.push(entry);
        } else if (entry.movement_date > acc[existingIndex].movement_date) {
          acc[existingIndex] = entry;
        }
        return acc;
      }, [] as EquipmentMovement[]);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Situação de Equipamentos</title>
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
              margin-bottom: 25px;
              padding: 15px;
              background: #f8fafc;
              border-radius: 8px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item strong {
              display: block;
              font-size: 24px;
              color: #1e40af;
            }
            .summary-item.out strong {
              color: #ea580c;
            }
            .summary-item.in strong {
              color: #16a34a;
            }
            .section { 
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .section-header {
              padding: 10px 15px;
              font-weight: bold;
              font-size: 14px;
              border-radius: 6px 6px 0 0;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .section-header.out {
              background: linear-gradient(135deg, #ea580c, #f97316);
              color: white;
            }
            .section-header.in {
              background: linear-gradient(135deg, #16a34a, #22c55e);
              color: white;
            }
            table { 
              width: 100%; 
              border-collapse: collapse;
            }
            th { 
              background: #e2e8f0; 
              padding: 10px 8px; 
              text-align: left;
              font-weight: 600;
              border: 1px solid #cbd5e1;
              font-size: 11px;
            }
            td { 
              padding: 8px; 
              border: 1px solid #e2e8f0;
              vertical-align: top;
            }
            .badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
            }
            .badge-out { background: #fed7aa; color: #ea580c; }
            .badge-in { background: #dcfce7; color: #16a34a; }
            .reason-corretiva { background: #fecaca; color: #dc2626; }
            .reason-preventiva { background: #fed7aa; color: #ea580c; }
            .reason-vistoria { background: #bfdbfe; color: #2563eb; }
            .problem-desc {
              background: #fee2e2;
              padding: 5px 8px;
              border-radius: 4px;
              margin-top: 5px;
              font-size: 10px;
              color: #dc2626;
              border-left: 3px solid #dc2626;
            }
            .observation {
              font-style: italic;
              color: #666;
              font-size: 10px;
              margin-top: 4px;
            }
            .no-data {
              text-align: center;
              padding: 20px;
              color: #666;
              font-style: italic;
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
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoBase64 ? `<img loading="lazy" decoding="async" src="${logoBase64}" alt="Logo" class="logo" />` : '<div></div>'}
            <div class="header-info">
              <h1>📊 Relatório de Situação de Equipamentos</h1>
              <p>Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </div>

          <div class="summary">
            <div class="summary-item out">
              <strong>${currentlyOut.length}</strong>
              <span>Fora do Canteiro</span>
            </div>
            <div class="summary-item in">
              <strong>${uniqueEntries.length}</strong>
              <span>Equipamentos Registrados</span>
            </div>
            <div class="summary-item">
              <strong>${allEntries.length}</strong>
              <span>Total de Entradas</span>
            </div>
          </div>

          <!-- Currently Out Section -->
          <div class="section">
            <div class="section-header out">
              ⬆️ Equipamentos Fora do Canteiro (${currentlyOut.length})
            </div>
            ${currentlyOut.length === 0 ? `
              <div class="no-data">
                ✅ Todos os equipamentos estão no canteiro
              </div>
            ` : `
              <table>
                <thead>
                  <tr>
                    <th style="width: 25%;">Equipamento</th>
                    <th style="width: 12%;">Placa</th>
                    <th style="width: 15%;">Data Saída</th>
                    <th style="width: 10%;">Hora</th>
                    <th style="width: 38%;">Motivo / Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  ${currentlyOut.map(m => `
                    <tr>
                      <td><strong>${m.equipment_name}</strong></td>
                      <td>${m.plate}</td>
                      <td>${format(parseISO(m.movement_date), "dd/MM/yyyy", { locale: ptBR })}</td>
                      <td>${m.movement_time.slice(0, 5)}</td>
                      <td>
                        ${m.exit_reason ? `
                          <span class="badge reason-${m.exit_reason === 'manutencao_corretiva' ? 'corretiva' : m.exit_reason === 'manutencao_preventiva' ? 'preventiva' : 'vistoria'}">
                            ${EXIT_REASON_LABELS[m.exit_reason]}
                          </span>
                        ` : '<span class="badge">-</span>'}
                        ${m.problem_description ? `
                          <div class="problem-desc">⚠️ ${m.problem_description}</div>
                        ` : ''}
                        ${m.observation ? `
                          <div class="observation">"${m.observation}"</div>
                        ` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>

          <!-- All Entries Section -->
          <div class="section">
            <div class="section-header in">
              ⬇️ Histórico de Entradas (${allEntries.length} registros)
            </div>
            ${allEntries.length === 0 ? `
              <div class="no-data">
                Nenhuma entrada registrada
              </div>
            ` : `
              <table>
                <thead>
                  <tr>
                    <th style="width: 25%;">Equipamento</th>
                    <th style="width: 12%;">Placa</th>
                    <th style="width: 15%;">Data Entrada</th>
                    <th style="width: 10%;">Hora</th>
                    <th style="width: 38%;">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  ${allEntries.slice(0, 100).map(m => `
                    <tr>
                      <td><strong>${m.equipment_name}</strong></td>
                      <td>${m.plate}</td>
                      <td>${format(parseISO(m.movement_date), "dd/MM/yyyy", { locale: ptBR })}</td>
                      <td>${m.movement_time.slice(0, 5)}</td>
                      <td>
                        ${m.observation ? `<span class="observation">"${m.observation}"</span>` : '-'}
                      </td>
                    </tr>
                  `).join('')}
                  ${allEntries.length > 100 ? `
                    <tr>
                      <td colspan="5" style="text-align: center; font-style: italic; color: #666;">
                        ... e mais ${allEntries.length - 100} registros
                      </td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            `}
          </div>

          <div class="footer">
            Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} | Sistema de Gestão Sucena
          </div>
        </body>
        </html>
      `;

      await downloadPdfFromHtml(htmlContent, `status-equipamentos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
      disabled={isExporting || (allEntries.length === 0 && currentlyOut.length === 0)}
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
