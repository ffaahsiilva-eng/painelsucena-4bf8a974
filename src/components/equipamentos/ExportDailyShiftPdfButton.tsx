import { useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";
import type { DailyShiftRecord, StatusHistoryEntry } from "@/hooks/useDailyShiftRecords";
import {
  buildFuelGaugeSvg,
  fuelLevelToLabel,
  fuelLevelToPercentage,
} from "@/lib/pdf/fuelGauge";
import { supabase } from "@/integrations/supabase/client";

interface EquipmentMovement {
  id: string;
  movement_type: "entrada" | "saida";
  movement_time: string;
  exit_reason: string | null;
  problem_description: string | null;
  observation: string | null;
}

interface ExportDailyShiftPdfButtonProps {
  record: DailyShiftRecord;
  isLoading?: boolean;
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    none: "Operando",
    operando: "Operando",
    waiting: "Aguardando Frente",
    waiting_front: "Aguardando Frente",
    aguardando_frente_servico: "Aguardando Frente",
    rain: "Parado (Chuva)",
    end_of_day: "Abastecendo",
    abastecimento: "Abastecendo",
    maintenance: "Manutenção",
    manutencao_corretiva: "Manutenção Corretiva",
    manutencao_preventiva: "Manutenção Preventiva",
    vistoria: "Vistoria",
    end_of_shift: "Fim de Turno",
    fim_turno: "Fim de Turno",
  };
  return labels[status] || status;
};

const getExitReasonLabel = (reason: string | null): string => {
  if (!reason) return "-";
  const labels: Record<string, string> = {
    manutencao_corretiva: "Manutenção Corretiva",
    manutencao_preventiva: "Manutenção Preventiva",
    vistoria: "Vistoria",
    operando: "Operando",
    aguardando_frente_servico: "Aguardando Frente",
    fim_turno: "Fim de Turno",
  };
  return labels[reason] || reason;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isReturnAfterRefuelingEntry = (entry: StatusHistoryEntry) => {
  const desc = entry.description ?? "";
  const status = entry.status ?? "";
  const nDesc = normalizeText(desc);
  const nStatus = normalizeText(status);
  return (
    nDesc.includes("retorno apos abastecimento") ||
    nDesc.includes("retorno do ponto") ||
    nStatus.includes("retorno_abastecimento") ||
    nStatus.includes("retorno abastecimento")
  );
};

export const ExportDailyShiftPdfButton = forwardRef<HTMLButtonElement, ExportDailyShiftPdfButtonProps>(
  function ExportDailyShiftPdfButton({ record, isLoading }, ref) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Re-fetch the latest record from DB to ensure we have fresh data (e.g. after admin edits/deletes)
      const { data: freshRecord } = await supabase
        .from("daily_shift_records")
        .select("*")
        .eq("id", record.id)
        .single();
      
      // Use fresh data if available, fallback to prop
      const activeRecord = freshRecord ? {
        ...record,
        status_history: Array.isArray(freshRecord.status_history) 
          ? (freshRecord.status_history as unknown as StatusHistoryEntry[]) 
          : [],
        initial_horimeter: freshRecord.initial_horimeter != null ? Number(freshRecord.initial_horimeter) : record.initial_horimeter,
        initial_km: freshRecord.initial_km != null ? Number(freshRecord.initial_km) : record.initial_km,
        final_horimeter: freshRecord.final_horimeter != null ? Number(freshRecord.final_horimeter) : record.final_horimeter,
        final_km: freshRecord.final_km != null ? Number(freshRecord.final_km) : record.final_km,
        driver_name: freshRecord.driver_name || record.driver_name,
        helper_name: freshRecord.helper_name || record.helper_name,
        initial_fuel_level: freshRecord.initial_fuel_level || record.initial_fuel_level,
        final_fuel_level: freshRecord.final_fuel_level || record.final_fuel_level,
        shift_end_time: freshRecord.shift_end_time || record.shift_end_time,
      } : record;

      const logoBase64 = await getLogoBase64();
      const formattedDate = format(new Date(activeRecord.shift_date), "dd/MM/yyyy", { locale: ptBR });

      // Fallback: if initial values are missing, fetch previous shift's final (or initial) values
      let effectiveInitialHorimeter = activeRecord.initial_horimeter;
      let effectiveInitialKm = activeRecord.initial_km;
      if (effectiveInitialHorimeter == null || effectiveInitialKm == null) {
        const { data: prevShift } = await supabase
          .from("daily_shift_records")
          .select("final_horimeter, final_km, initial_horimeter, initial_km")
          .eq("equipment_id", activeRecord.equipment_id)
          .lt("shift_date", activeRecord.shift_date)
          .order("shift_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (prevShift) {
          if (effectiveInitialHorimeter == null) {
            effectiveInitialHorimeter = prevShift.final_horimeter ?? prevShift.initial_horimeter;
          }
          if (effectiveInitialKm == null) {
            effectiveInitialKm = prevShift.final_km ?? prevShift.initial_km;
          }
        }
      }

      // Fallback: if final values are missing, fetch next shift's initial values
      let effectiveFinalHorimeter = activeRecord.final_horimeter;
      let effectiveFinalKm = activeRecord.final_km;
      if (effectiveFinalHorimeter == null || effectiveFinalKm == null) {
        const { data: nextShift } = await supabase
          .from("daily_shift_records")
          .select("initial_horimeter, initial_km")
          .eq("equipment_id", activeRecord.equipment_id)
          .gt("shift_date", activeRecord.shift_date)
          .order("shift_date", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (nextShift) {
          if (effectiveFinalHorimeter == null) effectiveFinalHorimeter = nextShift.initial_horimeter;
          if (effectiveFinalKm == null) effectiveFinalKm = nextShift.initial_km;
        }
      }

      // Fetch exit movement for this equipment on this date
      const { data: exitMovements } = await supabase
        .from("equipment_movements")
        .select("movement_time, exit_reason, problem_description, observation")
        .eq("plate", activeRecord.plate)
        .eq("movement_date", activeRecord.shift_date)
        .eq("movement_type", "saida")
        .order("movement_time", { ascending: false })
        .limit(1);
      
      const exitMovement = exitMovements?.[0] || null;
      

      // Sort history by time first (important to fill the "FINAL" column correctly)
      const sortedHistory = [...activeRecord.status_history].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Filter out consecutive duplicate statuses (same status AND same description)
      const filteredHistory = sortedHistory.filter(
        (entry: StatusHistoryEntry, index: number, arr: StatusHistoryEntry[]) => {
          if (index === 0) return true;
          const prevEntry = arr[index - 1];
          return entry.status !== prevEntry.status || entry.description !== prevEntry.description;
        }
      );

      // Generate activity rows from filtered status history.
      // "Retorno após abastecimento" entries are rendered as "Operando" rows.
      const allActivityRows: string[] = [];
      for (let i = 0; i < filteredHistory.length; i++) {
        const entry = filteredHistory[i];
        const nextEntry = filteredHistory[i + 1];
        const startTime = format(new Date(entry.timestamp), "HH:mm", { locale: ptBR });

        const isLastEntry = i === filteredHistory.length - 1;
        const isEndOfShift = entry.status === "end_of_shift" || entry.status === "fim_turno";

        let endTime = "";
        if (nextEntry) {
          endTime = format(new Date(nextEntry.timestamp), "HH:mm", { locale: ptBR });
        } else if (isLastEntry && isEndOfShift) {
          endTime = startTime;
        }

        // Build description - rename "retorno" entries to "Operando"
        let description: string;
        if (isReturnAfterRefuelingEntry(entry)) {
          description = "Operando";
        } else if (entry.description) {
          description = entry.description;
        } else {
          description = getStatusLabel(entry.status);
        }

        allActivityRows.push(`
          <tr>
            <td class="cell horario-cell">${startTime}</td>
            <td class="cell as-cell">ÀS</td>
            <td class="cell horario-cell">${endTime}</td>
            <td class="cell desc-cell">${description}</td>
          </tr>
        `);
      }

      // DEBUG: Log the number of activity rows generated

      // Split rows into tables of 20 rows each (more space for manual entries)
      const ROWS_PER_TABLE = 16;
      const activityTables: string[][] = [];
      
      for (let i = 0; i < allActivityRows.length; i += ROWS_PER_TABLE) {
        const tableRows = [...allActivityRows.slice(i, i + ROWS_PER_TABLE)]; // Create a copy to avoid mutation
        // Fill with empty rows to complete the table
        const emptyRowsNeeded = ROWS_PER_TABLE - tableRows.length;
        for (let j = 0; j < emptyRowsNeeded; j++) {
          tableRows.push(`
            <tr>
              <td class="cell horario-cell"></td>
              <td class="cell as-cell">ÀS</td>
              <td class="cell horario-cell"></td>
              <td class="cell desc-cell"></td>
            </tr>
          `);
        }
        activityTables.push(tableRows);
      }
      
      // DEBUG: Log the number of tables generated
      
      // If no activities, create one empty table
      if (activityTables.length === 0) {
        const emptyRows: string[] = [];
        for (let i = 0; i < ROWS_PER_TABLE; i++) {
          emptyRows.push(`
            <tr>
              <td class="cell horario-cell"></td>
              <td class="cell as-cell">ÀS</td>
              <td class="cell horario-cell"></td>
              <td class="cell desc-cell"></td>
            </tr>
          `);
        }
        activityTables.push(emptyRows);
      }

      // No extra blank continuation table
      
      // Generate HTML for all activity tables
      const buildActivityTableHtml = (rows: string[], tableIndex: number) => `
        <div class="activities-header">${tableIndex === 0 ? 'DESCRIMINAÇÃO: SERVIÇOS, PARADAS E OBS.' : 'CONTINUAÇÃO - ATIVIDADES'}</div>
        <table class="activities-table">
          <thead>
            <tr>
              <th class="cell horario-cell" style="background:#e8e8e8;">HORÁRIO</th>
              <th class="cell as-cell" style="background:#e8e8e8;"></th>
              <th class="cell horario-cell" style="background:#e8e8e8;">FINAL</th>
              <th class="cell desc-cell" style="background:#e8e8e8;"></th>
            </tr>
          </thead>
          <tbody>
            ${rows.join("")}
          </tbody>
        </table>
      `;
      
      // First table goes in the main layout, additional tables go below
      const mainActivityTableHtml = buildActivityTableHtml(activityTables[0], 0);
      const additionalTablesHtml = activityTables.slice(1).map((rows, idx) => `
        <div class="additional-table-container" style="page-break-before: always; margin-top: 20px; border: 2px solid #000; background: #fff;">
          <div style="background: #d0d0d0; padding: 8px 12px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #000; text-align: center;">
            ${activeRecord.equipment_name} - ${activeRecord.plate} - ${formattedDate} (Página ${idx + 2} de ${activityTables.length})
          </div>
          <div style="padding: 8px;">
            ${buildActivityTableHtml(rows, idx + 1)}
          </div>
        </div>
      `).join("");

      const initialFuelPct = fuelLevelToPercentage(activeRecord.initial_fuel_level);
      const finalFuelPct = fuelLevelToPercentage(activeRecord.final_fuel_level || activeRecord.initial_fuel_level);

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Parte Diária - ${activeRecord.equipment_name} - ${formattedDate}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              color: #000;
              background: #fff;
              padding: 5mm;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .form-container {
              border: 2px solid #000;
              width: 100%;
            }
            .row {
              display: flex;
              border-bottom: 1px solid #000;
            }
            .row:last-child { border-bottom: none; }
            .cell-label {
              background: #e8e8e8;
              font-weight: bold;
              padding: 5px 8px;
              border-right: 1px solid #000;
              font-size: 10px;
            }
            .cell-value {
              padding: 5px 8px;
              border-right: 1px solid #000;
              flex: 1;
            }
            .cell-value:last-child { border-right: none; }
            .header-row {
              background: #d0d0d0;
              font-weight: bold;
              font-size: 12px;
              text-align: center;
              display: flex;
              align-items: stretch;
            }
            .header-title {
              flex: 1;
              padding: 8px;
              border-right: 1px solid #000;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .header-obra {
              width: 180px;
              display: flex;
            }
            .header-obra .cell-label {
              background: #d0d0d0;
            }
            .main-section {
              display: flex;
            }
            .left-col {
              width: 160px;
              border-right: 1px solid #000;
            }
            .right-col {
              flex: 1;
            }
            .section-title {
              background: #e8e8e8;
              font-weight: bold;
              padding: 4px 8px;
              border-bottom: 1px solid #000;
              font-size: 10px;
              text-align: center;
            }
            .km-row {
              display: flex;
              border-bottom: 1px solid #000;
            }
            .km-cell {
              flex: 1;
              text-align: center;
              padding: 4px;
              border-right: 1px solid #000;
            }
            .km-cell:last-child { border-right: none; }
            .km-label { font-size: 8px; color: #666; }
            .km-value { font-weight: bold; font-size: 12px; }
            .fuel-section {
              padding: 8px;
              border-bottom: 1px solid #000;
            }
            .fuel-row {
              display: flex;
              justify-content: space-around;
            }
            .fuel-item { text-align: center; }
            .fuel-label { font-size: 8px; color: #666; margin-bottom: 3px; }
            .fuel-text { font-weight: bold; font-size: 9px; }
            .activities-header {
              background: #e8e8e8;
              font-weight: bold;
              padding: 4px 8px;
              border-bottom: 1px solid #000;
              font-size: 9px;
              text-align: center;
            }
            .activities-table {
              width: 100%;
              border-collapse: collapse;
            }
            .activities-table .cell {
              border: 1px solid #000;
              padding: 3px 5px;
              height: 20px;
              font-size: 10px;
            }
            .horario-cell { width: 45px; text-align: center; }
            .as-cell { width: 25px; text-align: center; font-size: 9px; }
            .desc-cell { }
            .signatures {
              display: flex;
              justify-content: space-between;
              padding: 25px 15px 10px;
              border-top: 1px solid #000;
            }
            .sig-box { text-align: center; width: 30%; }
            .sig-name { font-weight: bold; font-size: 10px; margin: 0 0 5px; padding: 0 4px 3px; line-height: 1.2; min-height: 12px; white-space: normal; overflow: visible; word-break: keep-all; border-bottom: 1px solid #000; }
            .sig-label { font-size: 8px; margin-top: 2px; }
            .instructions { border-top: 1px solid #000; padding: 4px 10px; font-size: 6px; line-height: 1.1; }
            .instructions { border-top: 1px solid #000; padding: 4px 10px; font-size: 6px; line-height: 1.1; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="form-container">
            <!-- Title Row with Logo -->
            <div class="row header-row">
              ${logoBase64 ? `<div style="padding: 5px 15px; border-right: 1px solid #000; background: #fff; display: flex; align-items: center; justify-content: center;"><img loading="lazy" decoding="async" src="${logoBase64}" style="height: 30px; display: block;" alt="Logo" /></div>` : ""}
              <div class="header-title">PARTE DIÁRIA DE EQUIPAMENTO</div>
              <div class="header-obra">
                <div class="cell-label" style="background:#d0d0d0;">OBRA:</div>
                <div class="cell-value">460001269</div>
              </div>
            </div>

            <!-- Motorista/Data -->
            <div class="row">
              <div class="cell-label" style="width:140px;">MOTORISTA/OPERADOR</div>
              <div class="cell-value" style="flex:2;">${activeRecord.driver_name}</div>
              <div class="cell-label">DATA</div>
              <div class="cell-value" style="width:100px;">${formattedDate}</div>
            </div>

            <!-- Equipamento/Placa -->
            <div class="row">
              <div class="cell-label" style="width:140px;">EQUIPAMENTO</div>
              <div class="cell-value" style="flex:2;">${activeRecord.equipment_name}</div>
              <div class="cell-label">PLACA</div>
              <div class="cell-value" style="width:100px;font-family:monospace;">${activeRecord.plate}</div>
            </div>

            <!-- Ajudante -->
            <div class="row">
              <div class="cell-label" style="width:140px;">AJUDANTE</div>
              <div class="cell-value">${activeRecord.helper_name || "-"}</div>
            </div>

            <!-- Saída do Equipamento (if exists) -->
            ${exitMovement ? `
            <div class="row" style="background:#fff3cd;">
              <div class="cell-label" style="width:140px;">SAÍDA</div>
              <div class="cell-value" style="width:80px;">${exitMovement.movement_time?.substring(0, 5) || "-"}</div>
              <div class="cell-label">MOTIVO</div>
              <div class="cell-value" style="flex:2;">${getExitReasonLabel(exitMovement.exit_reason)}${exitMovement.problem_description ? ` - ${exitMovement.problem_description}` : ""}${exitMovement.observation ? ` (${exitMovement.observation})` : ""}</div>
            </div>
            ` : ""}

            <!-- Main Section: KM/Horimetro/Fuel + Activities -->
            <div class="main-section">
              <!-- Left Column -->
              <div class="left-col">
                <!-- KM -->
                <div class="section-title">KM</div>
                <div class="km-row">
                  <div class="km-cell">
                    <div class="km-label">INICIAL</div>
                    <div class="km-value">${effectiveInitialKm ?? "-"}</div>
                  </div>
                  <div class="km-cell" style="border-right:none;">
                    <div class="km-label">FINAL</div>
                    <div class="km-value">${effectiveFinalKm ?? "-"}</div>
                  </div>
                </div>

                <!-- Horímetro -->
                <div class="section-title">HORÍMETRO</div>
                <div class="km-row">
                  <div class="km-cell">
                    <div class="km-label">INICIAL</div>
                    <div class="km-value">${effectiveInitialHorimeter ?? "-"}</div>
                  </div>
                  <div class="km-cell" style="border-right:none;">
                    <div class="km-label">FINAL</div>
                    <div class="km-value">${effectiveFinalHorimeter ?? "-"}</div>
                  </div>
                </div>

                <!-- Abastecimento/Fuel -->
                <div class="section-title">ABASTECIMENTO</div>
                <div class="fuel-section">
                  <div class="fuel-row">
                    <div class="fuel-item">
                      <div class="fuel-label">INICIAL</div>
                      ${buildFuelGaugeSvg({ level: activeRecord.initial_fuel_level, width: 80, height: 48 })}
                      <div class="fuel-text">${fuelLevelToLabel(activeRecord.initial_fuel_level)}</div>
                    </div>
                    <div class="fuel-item">
                      <div class="fuel-label">FINAL</div>
                      ${buildFuelGaugeSvg({ level: activeRecord.final_fuel_level || activeRecord.initial_fuel_level, width: 80, height: 48 })}
                      <div class="fuel-text">${fuelLevelToLabel(activeRecord.final_fuel_level || activeRecord.initial_fuel_level)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Column: Activities -->
              <div class="right-col">
                ${mainActivityTableHtml}
              </div>
            </div>

            <!-- Signatures -->
            <div class="signatures">
              <div class="sig-box">
                <div class="sig-name">${activeRecord.driver_name}</div>
                <div class="sig-label">Ass. Motorista/Op</div>
              </div>
              <div class="sig-box">
                <div class="sig-name">Creriane Navegantes</div>
                <div class="sig-label">Ass. Encarreg./Apontador</div>
              </div>
              <div class="sig-box">
                <div class="sig-name">Luís Carlos</div>
                <div class="sig-label">Ass. Gerência</div>
              </div>
            </div>

            <!-- Instructions -->
            <div class="instructions">
              <strong>INSTRUÇÃO:</strong>
              01 - PREENCHER O CABEÇALHO COM NOME, DATA, TIPO DE EQUIPAMENTO E PLACA/TAG.
              02 - COLOCAR KM OU HORÍMETRO INICIAL E FINAL.
              03 - COLOCAR HORÁRIO QUE INICIA CADA ATIVIDADE.
              04 - COLOCAR HORÁRIO DE INICIO E FINAL QUANDO HOUVER DEFEITO MECÂNICO E DESCREVER O DEFEITO.
              05 - AO FINAL DA JORNADA DE TRABALHO ASSINAR E ENTREGAR PARA APONTADOR OU ENCARREGADO RESPONSÁVEL.
              06 - A PARTE DIÁRIA DEVERÁ SER PREENCHIDA TODOS OS DIAS INCLUSIVE DOMINGOS E FERIADOS.
              07 - O MOTORISTA/OPERADOR TEM ATÉ O DIA 02 DE CADA MÊS PARA ENTREGAR TODAS AS PARTES DIÁRIAS, E O APONTADOR TEM ATÉ O DIA 04 PARA ENVIAR PARA O SETOR DE CONFERÊNCIA.
            </div>
          </div>
          
          <!-- Additional Activity Tables (if more than 12 activities) - Outside main container for proper page breaks -->
          ${additionalTablesHtml}
        </body>
        </html>
      `;

      await downloadPdfFromHtml(htmlContent, `relatorio-turno-${activeRecord.plate}-${activeRecord.shift_date}.pdf`);

      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      ref={ref}
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isLoading || isExporting}
      className="h-8 w-8 p-0"
      title="Exportar PDF"
    >
      {isLoading || isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <FileText className="h-4 w-4 text-red-600" />
      )}
    </Button>
  );
});
