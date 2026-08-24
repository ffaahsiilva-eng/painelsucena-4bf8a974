import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Equipment } from "@/hooks/useEquipment";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";

interface ExportWeeklyHistoryButtonProps {
  equipment: Equipment[];
}

const stopReasonLabels: Record<string, string> = {
  none: "Operação",
  maintenance: "Manutenção",
  waiting: "Aguardando",
  rain: "Chuva",
  end_of_shift: "Fim de Turno",
  end_of_day: "Fim de Turno",
};

export function ExportWeeklyHistoryButton({ equipment }: ExportWeeklyHistoryButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const logoBase64 = await getLogoBase64();

      // Get week boundaries
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

      // Fetch all stop history for this week
      const { data: allHistory, error } = await supabase
        .from("equipment_stop_history")
        .select("*")
        .gte("started_at", weekStart.toISOString())
        .lte("started_at", weekEnd.toISOString())
        .order("started_at", { ascending: false });

      if (error) throw error;

      // Group history by equipment
      const equipmentMap = new Map(equipment.map((eq) => [eq.id, eq]));
      const historyByEquipment = new Map<string, typeof allHistory>();

      allHistory?.forEach((record) => {
        const existing = historyByEquipment.get(record.equipment_id) || [];
        existing.push(record);
        historyByEquipment.set(record.equipment_id, existing);
      });


      // Generate equipment sections
      const equipmentSections = equipment
        .map((eq) => {
          const history = historyByEquipment.get(eq.id) || [];
          
          // Calculate totals by stop reason
          const totals: Record<string, number> = {};
          history.forEach((record) => {
            if (record.duration_minutes) {
              totals[record.stop_reason] = (totals[record.stop_reason] || 0) + record.duration_minutes;
            }
          });

          const historyRows = history.length > 0
            ? history
                .map(
                  (record) => {
                    const startedAt = parseISO(record.started_at);
                    
                    // For end_of_shift/end_of_day records:
                    // - "Início" should be the equipment's start_hour (when operation began)
                    // - "Fim" should be when the stop started (startedAt time)
                    const isEndOfShift = record.stop_reason === "end_of_shift" || record.stop_reason === "end_of_day";
                    
                    // Get the stop start time in local format (UTC-3 for Brazil)
                    const stopStartHour = startedAt.getUTCHours() - 3;
                    const adjustedStopHour = stopStartHour < 0 ? stopStartHour + 24 : stopStartHour;
                    const stopStartMinutes = startedAt.getUTCMinutes();
                    const stopTimeFormatted = `${String(adjustedStopHour).padStart(2, '0')}:${String(stopStartMinutes).padStart(2, '0')}`;
                    
                    // Display start as equipment's start_hour, display end as when stop began
                    const displayStart = isEndOfShift 
                      ? `${String(eq.start_hour).padStart(2, '0')}:00`
                      : stopTimeFormatted;
                    const displayEnd = isEndOfShift 
                      ? stopTimeFormatted 
                      : "-";
                    
                    // Calculate duration from start_hour to stop time for end_of_shift
                    let calculatedDuration = "-";
                    if (isEndOfShift) {
                      const startMinutes = eq.start_hour * 60;
                      const endMinutes = adjustedStopHour * 60 + stopStartMinutes;
                      const diffMinutes = endMinutes - startMinutes;
                      if (diffMinutes > 0) {
                        calculatedDuration = formatDuration(diffMinutes);
                      }
                    }
                    
                    // Observation: show "Em manutenção" if maintenance, otherwise show defect description
                    const observation = record.stop_reason === "maintenance" 
                      ? (record.defect_description ? `Em manutenção - ${record.defect_description}` : "Em manutenção")
                      : (record.defect_description || "-");
                    
                    return `
                    <tr>
                      <td>${format(startedAt, "dd/MM (EEE)", { locale: ptBR })}</td>
                      <td>${displayStart}</td>
                      <td>${displayEnd}</td>
                      <td>${calculatedDuration}</td>
                      <td class="defect">${observation}</td>
                    </tr>
                  `;
                  }
                )
                .join("")
            : `<tr><td colspan="5" class="no-data">Sem registros nesta semana</td></tr>`;

          const totalSummary = Object.entries(totals)
            .map(([reason, mins]) => `<span class="total-item">${stopReasonLabels[reason]}: ${formatDuration(mins)}</span>`)
            .join("");

          // Get current status label and color
          const currentStatusLabel = stopReasonLabels[eq.stop_reason] || "Operação";
          const isOperating = eq.stop_reason === "none";
          const isMaintenance = eq.stop_reason === "maintenance";

          return `
            <div class="equipment-section">
              <div class="equipment-header">
                <div class="equipment-name">${eq.name}</div>
                <div class="equipment-details">
                  <span>Placa: ${eq.plate}</span>
                  <span>•</span>
                  <span>Motorista: ${eq.driver}</span>
                  <span>•</span>
                  <span class="status-badge ${isOperating ? 'status-operating' : isMaintenance ? 'status-maintenance-badge' : 'status-stopped'}">${currentStatusLabel}</span>
                </div>
              </div>
              ${totalSummary ? `<div class="totals-row">${totalSummary}</div>` : ""}
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Duração</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  ${historyRows}
                </tbody>
              </table>
            </div>
          `;
        })
        .join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Histórico Semanal de Equipamentos</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
              font-size: 11px;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
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
            .header-info h1 { font-size: 22px; margin-bottom: 5px; }
            .header-info p { font-size: 12px; color: #666; }
            .week-info {
              background: #f5f5f5;
              padding: 10px 15px;
              border-radius: 6px;
              margin-bottom: 20px;
              font-size: 12px;
            }
            .equipment-section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .equipment-header {
              background: linear-gradient(135deg, #1e2235 0%, #2a3045 100%);
              color: white;
              padding: 12px 15px;
              border-radius: 8px 8px 0 0;
            }
            .equipment-name { font-size: 14px; font-weight: bold; }
            .equipment-details { font-size: 11px; opacity: 0.8; margin-top: 3px; display: flex; align-items: center; flex-wrap: wrap; }
            .equipment-details span { margin-right: 8px; }
            .status-badge {
              padding: 2px 8px;
              border-radius: 4px;
              font-weight: bold;
              font-size: 10px;
              opacity: 1;
            }
            .status-operating { background: #22c55e; color: white; }
            .status-maintenance-badge { background: #ef4444; color: white; }
            .status-stopped { background: #f97316; color: white; }
            .totals-row {
              background: #f0f7ff;
              padding: 8px 15px;
              border-left: 1px solid #ddd;
              border-right: 1px solid #ddd;
              font-size: 10px;
            }
            .total-item {
              display: inline-block;
              background: #e0ecff;
              padding: 3px 8px;
              border-radius: 4px;
              margin-right: 8px;
              margin-bottom: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #ddd;
              border-top: none;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px 6px;
              text-align: left;
              font-size: 10px;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 9px;
            }
            tr:nth-child(even) { background-color: #fafafa; }
            .status-maintenance { color: #c53030; font-weight: bold; }
            .status-rain { color: #2b6cb0; }
            .defect { font-style: italic; color: #666; max-width: 150px; }
            .no-data { text-align: center; color: #999; padding: 20px !important; }
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
              .equipment-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoBase64 ? `<img loading="lazy" decoding="async" src="${logoBase64}" alt="Logo" class="logo" />` : '<div></div>'}
            <div class="header-info">
              <h1>Histórico Semanal de Equipamentos</h1>
              <p>Relatório de Paradas e Status</p>
            </div>
          </div>
          
          <div class="week-info">
            <strong>Período:</strong> ${format(weekStart, "dd/MM/yyyy (EEEE)", { locale: ptBR })} a ${format(weekEnd, "dd/MM/yyyy (EEEE)", { locale: ptBR })}<br>
            <strong>Gerado em:</strong> ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}<br>
            <strong>Total de Equipamentos:</strong> ${equipment.length}
          </div>
          
          ${equipmentSections}
          
          <div class="footer">
            Painel Sucena - Sistema de Gestão
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
        </html>
      `;

      await downloadPdfFromHtml(htmlContent, `historico-semanal-${format(new Date(), "yyyy-MM-dd")}.pdf`);

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
      className="gap-2"
      onClick={exportToPDF}
      disabled={isExporting || equipment.length === 0}
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">Histórico Semanal</span>
      <FileText className="w-4 h-4 sm:hidden" />
    </Button>
  );
}
