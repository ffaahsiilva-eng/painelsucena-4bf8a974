import { useState } from "react";
import { CalendarSearch, FileText, Loader2, Gauge } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { supabase } from "@/integrations/supabase/client";
import {
  buildFuelGaugeSvg,
  fuelLevelToLabel,
} from "@/lib/pdf/fuelGauge";
import { AdminCountersEditor } from "@/components/partediaria/AdminCountersEditor";
import { useIsAdmin } from "@/hooks/useUserRole";

interface Equipment {
  id: string;
  name: string;
  plate: string;
  equipment_type: string;
  driver: string;
  helper: string;
}

interface ExportMovementsByDateButtonProps {
  equipment: Equipment;
}

export function ExportMovementsByDateButton({ equipment }: ExportMovementsByDateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCounterEditor, setShowCounterEditor] = useState(false);
  const isAdmin = useIsAdmin();

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const isReturnAfterRefuelingStop = (stop: { stop_reason: string; defect_description: string | null }) => {
    const desc = stop.defect_description ?? "";
    const reason = stop.stop_reason ?? "";
    const nDesc = normalizeText(desc);
    const nReason = normalizeText(reason);
    return (
      nDesc.includes("retorno apos abastecimento") ||
      nDesc.includes("retorno do ponto") ||
      nReason.includes("retorno_abastecimento") ||
      nReason.includes("retorno abastecimento")
    );
  };

  const getStatusLabel = (stopReason: string | null) => {
    if (!stopReason || stopReason === "none") {
      return "Operando";
    }
    const labels: Record<string, string> = {
      operando: "Operando",
      maintenance: "Manutenção",
      waiting: "Aguardando Frente",
      waiting_front: "Aguardando Frente",
      end_of_shift: "Fim de Turno",
      fim_turno: "Fim de Turno",
      end_of_day: "Abastecendo",
      abastecimento: "Abastecendo",
      rain: "Parado (Chuva)",
      manutencao_corretiva: "Manutenção Corretiva",
      manutencao_preventiva: "Manutenção Preventiva",
      vistoria: "Vistoria",
      aguardando_frente_servico: "Aguardando Frente",
    };
    return labels[stopReason] || stopReason;
  };

  const buildParteDiariaFormHtml = (params: {
    logoBase64: string;
    dateLabel: string;
    equipmentName: string;
    plate: string;
    driverName: string;
    helperName: string;
    helperLabel: string;
    activities: Array<{ start: string; end: string; description: string }>;
    initialFuelLevel?: string | null;
    finalFuelLevel?: string | null;
    initialKm?: number | null;
    finalKm?: number | null;
    initialHorimeter?: number | null;
    finalHorimeter?: number | null;
  }) => {
    const ROWS_PER_TABLE = 16;
    
    // Split activities into tables of 20 rows each
    const activityTables: Array<Array<{ start: string; end: string; description: string }>> = [];
    
    for (let i = 0; i < params.activities.length; i += ROWS_PER_TABLE) {
      const tableRows = params.activities.slice(i, i + ROWS_PER_TABLE);
      // Fill with empty rows to complete the table
      const emptyRowsNeeded = ROWS_PER_TABLE - tableRows.length;
      for (let j = 0; j < emptyRowsNeeded; j++) {
        tableRows.push({ start: "", end: "", description: "" });
      }
      activityTables.push(tableRows);
    }
    
    // If no activities, create one empty table
    if (activityTables.length === 0) {
      activityTables.push(
        Array.from({ length: ROWS_PER_TABLE }).map(() => ({ start: "", end: "", description: "" }))
      );
    }

    // No extra blank continuation table
    
    // Generate HTML for a single activity table
    const buildActivityTableHtml = (rows: Array<{ start: string; end: string; description: string }>, tableIndex: number) => {
      const rowsHtml = rows.map(r => `
        <tr>
          <td class="cell horario">${r.start}</td>
          <td class="cell as">ÀS</td>
          <td class="cell horario">${r.end}</td>
          <td class="cell desc">${r.description}</td>
        </tr>
      `).join("");
      
      return `
        <div class="desc-title">${tableIndex === 0 ? 'DESCRIMINAÇÃO: SERVIÇOS, PARADAS E OBS.' : 'CONTINUAÇÃO - ATIVIDADES'}</div>
        <table>
          <thead>
            <tr>
              <th class="cell horario" style="background:#f0f0f0;">HORÁRIO</th>
              <th class="cell as" style="background:#f0f0f0;"></th>
              <th class="cell horario" style="background:#f0f0f0;">FINAL</th>
              <th class="cell desc" style="background:#f0f0f0;"></th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;
    };
    
    // First table goes in the main layout
    const mainActivityTableHtml = buildActivityTableHtml(activityTables[0], 0);
    
    // Additional tables go below the main form
    const additionalTablesHtml = activityTables.slice(1).map((rows, idx) => `
      <div class="additional-table" style="page-break-before: auto; margin-top: 15px; border: 1px solid #000;">
        <div style="background: #f0f0f0; padding: 4px 8px; font-weight: bold; font-size: 10px; border-bottom: 1px solid #000;">
          ${params.equipmentName} - ${params.dateLabel} (Página ${idx + 2})
        </div>
        ${buildActivityTableHtml(rows, idx + 1)}
      </div>
    `).join("");

    const instructionText =
      "01 - PREENCHER O CABEÇALHO COM NOME, DATA, TIPO DE EQUIPAMENTO E PLACA/TAG - " +
      "02 - COLOCAR KM OU HORÍMETRO INICIAL E FINAL " +
      "03 - COLOCAR O HORÁRIO QUE INICIA CADA ATIVIDADE. " +
      "04 - COLOCAR HORÁRIO DE INICIO E FINAL QUANDO HOUVER DEFEITO MECÂNICO E DESCREVER O DEFEITO " +
      "05 - AO FINAL DA JORNADA DE TRABALHO ASSINAR E ENTREGAR PARA APONTADOR OU ENCARREGADO RESPONSÁVEL. " +
      "06 - A PARTE DIÁRIA DEVERÁ SER PREENCHIDA TODOS OS DIAS INCLUSIVE DOMINGOS E FÉRIADOS. " +
      "07 - O MOTORISTA/OPERADOR TEM ATÉ O DIA 02 DE CADA MÊS PARA ENTREGAR TODAS AS PARTES DIÁRIAS, E O APONTADOR TEM ATÉ O DIA 04 PARA ENVIAR PARA O SETOR DE CONFERÊNCIA, O DESCUMPRIMENTO DESSE ITEM IRÁ GERAR ADVERTÊNCIA POR ESCRITO.";

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Parte Diária de Equipamento - ${params.equipmentName}</title>
        <style>
          @page { 
            size: A4 portrait; 
            margin: 12mm 10mm; 
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            width: 100%;
            height: 100%;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            font-size: 11px;
            line-height: 1.3;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            padding: 0;
          }
          .sheet {
            border: 2px solid #000;
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
          }
          .logo-row {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
            border-bottom: 1px solid #000;
          }
          .logo-row img { height: 40px; }

          .top {
            display: flex;
            border-bottom: 1px solid #000;
          }
          .top-title {
            flex: 1;
            background: #e6e6e6;
            font-weight: 700;
            text-align: center;
            padding: 8px 10px;
            border-right: 1px solid #000;
            font-size: 14px;
            letter-spacing: .5px;
          }
          .obra {
            width: 180px;
            display: flex;
          }
          .obra .label {
            background: #e6e6e6;
            font-weight: 700;
            padding: 8px 10px;
            border-right: 1px solid #000;
            font-size: 11px;
          }
          .obra .value { 
            flex: 1;
            padding: 8px 10px; 
            font-size: 11px;
          }

          .info-row {
            display: flex;
            border-bottom: 1px solid #000;
          }
          .cell-label {
            background: #f0f0f0;
            font-weight: 700;
            padding: 6px 10px;
            border-right: 1px solid #000;
            font-size: 10px;
            text-transform: uppercase;
            white-space: nowrap;
          }
          .cell-value {
            flex: 1;
            padding: 6px 10px;
            border-right: 1px solid #000;
            font-size: 11px;
          }
          .info-row .cell-value:last-child { border-right: none; }
          .info-row .cell-label:first-child { width: 150px; }

          .main {
            display: flex;
          }
          .left { 
            width: 180px;
            border-right: 1px solid #000; 
            flex-shrink: 0;
          }
          .right {
            flex: 1;
          }

          .block-title {
            background: #f0f0f0;
            font-weight: 700;
            text-align: center;
            padding: 6px 10px;
            border-bottom: 1px solid #000;
            font-size: 10px;
            text-transform: uppercase;
          }

          .pair {
            display: flex;
            border-bottom: 1px solid #000;
          }
          .pair .box {
            flex: 1;
            padding: 8px 6px;
            text-align: center;
            border-right: 1px solid #000;
          }
          .pair .box:last-child { border-right: none; }
          .mini {
            font-size: 9px;
            color: #555;
            margin-bottom: 3px;
          }
          .val {
            font-family: monospace;
            font-weight: 700;
            font-size: 12px;
            min-height: 16px;
          }

          .fuel {
            border-bottom: 1px solid #000;
            padding: 8px;
          }
          .fuel-grid {
            display: flex;
            justify-content: space-around;
          }
          .fuel-item { text-align: center; }
          .fuel-item .mini { margin-bottom: 5px; }
          .fuel-svg { display: block; margin: 0 auto; }

          .desc-title {
            background: #f0f0f0;
            font-weight: 700;
            text-align: center;
            padding: 6px 10px;
            border-bottom: 1px solid #000;
            font-size: 10px;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .cell {
            border: 1px solid #000;
            padding: 5px 6px;
            height: 26px;
            font-size: 11px;
          }
          .horario { width: 60px; text-align: center; font-family: monospace; }
          .as { width: 35px; text-align: center; font-size: 10px; }
          .desc { width: auto; }

          .signatures {
            display: flex;
            justify-content: space-between;
            padding: 20px 20px 15px;
            border-top: 1px solid #000;
          }
          .sig {
            text-align: center;
            width: 30%;
          }
          .sig-name {
            font-weight: bold;
            font-size: 10px;
            margin: 0;
            padding: 0;
            line-height: 1;
            min-height: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .sig .line {
            border-top: 1px solid #000;
            margin-top: 2px;
            margin-bottom: 5px;
          }
          .sig .lbl { font-size: 9px; }

          .instructions {
            border-top: 1px solid #000;
            padding: 8px 10px;
            font-size: 8px;
            line-height: 1.4;
          }
          .instructions strong { font-weight: 700; }

          @media print {
            html, body { 
              width: 210mm; 
              height: 297mm; 
            }
            .sheet {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          ${params.logoBase64 ? `<div class="logo-row"><img loading="lazy" decoding="async" src="${params.logoBase64}" alt="Sucena" /></div>` : ""}

          <div class="top">
            <div class="top-title">PARTE DIÁRIA DE EQUIPAMENTO</div>
            <div class="obra">
              <div class="label">OBRA:</div>
              <div class="value">460001269</div>
            </div>
          </div>

          <div class="info-row">
            <div class="cell-label">MOTORISTA/OPERADOR</div>
            <div class="cell-value">${params.driverName || ""}</div>
            <div class="cell-label">DATA</div>
            <div class="cell-value">${params.dateLabel}</div>
          </div>
          <div class="info-row">
            <div class="cell-label">EQUIPAMENTO</div>
            <div class="cell-value">${params.equipmentName}</div>
            <div class="cell-label">PLACA</div>
            <div class="cell-value" style="font-family: monospace;">${params.plate}</div>
          </div>
          <div class="info-row">
            <div class="cell-label">${params.helperLabel}</div>
            <div class="cell-value">${params.helperName || "-"}</div>
          </div>

          <div class="main">
            <div class="left">
              <div class="block-title">KM</div>
              <div class="pair">
                <div class="box"><div class="mini">INICIAL</div><div class="val">${params.initialKm != null ? params.initialKm.toLocaleString("pt-BR") : ""}</div></div>
                <div class="box"><div class="mini">FINAL</div><div class="val">${params.finalKm != null ? params.finalKm.toLocaleString("pt-BR") : ""}</div></div>
              </div>

              <div class="block-title">HORÍMETRO</div>
              <div class="pair">
                <div class="box"><div class="mini">INICIAL</div><div class="val">${params.initialHorimeter != null ? params.initialHorimeter.toLocaleString("pt-BR") : ""}</div></div>
                <div class="box"><div class="mini">FINAL</div><div class="val">${params.finalHorimeter != null ? params.finalHorimeter.toLocaleString("pt-BR") : ""}</div></div>
              </div>

              <div class="fuel">
                <div class="block-title" style="border: 1px solid #000; border-left: none; border-right: none; margin: -6px -6px 6px;">ABASTECIMENTO</div>
                <div class="fuel-grid">
                  <div class="fuel-item">
                    <div class="mini">INICIAL</div>
                    <div class="fuel-svg">${buildFuelGaugeSvg({ level: params.initialFuelLevel, width: 80, height: 48 })}</div>
                    <div class="mini" style="margin-top: 3px; font-weight: 700; color: #111;">${fuelLevelToLabel(params.initialFuelLevel)}</div>
                  </div>
                  <div class="fuel-item">
                    <div class="mini">FINAL</div>
                    <div class="fuel-svg">${buildFuelGaugeSvg({ level: params.finalFuelLevel ?? params.initialFuelLevel, width: 80, height: 48 })}</div>
                    <div class="mini" style="margin-top: 3px; font-weight: 700; color: #111;">${fuelLevelToLabel(params.finalFuelLevel ?? params.initialFuelLevel)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="right">
              ${mainActivityTableHtml}
            </div>
          </div>
          
          <!-- Additional Activity Tables (if more than 12 activities) -->
          ${additionalTablesHtml}

          <div class="signatures">
            <div class="sig"><div class="sig-name">${params.driverName || ""}</div><div class="line"></div><div class="lbl">Ass. Motorista/Op</div></div>
            <div class="sig"><div class="sig-name">Creriane Navegantes</div><div class="line"></div><div class="lbl">Ass. Encarreg./Apontador</div></div>
            <div class="sig"><div class="sig-name">Luís Carlos</div><div class="line"></div><div class="lbl">Ass. Gerência</div></div>
          </div>

          <div class="instructions"><strong>INSTRUÇÃO:</strong> ${instructionText}</div>
        </div>
      </body>
      </html>
    `;
  };

  const exportToPDF = async () => {
    if (!selectedDate) {
      toast.error("Selecione uma data");
      return;
    }

    setIsExporting(true);
    try {
      const logoBase64 = await getLogoBase64();
      const targetDate = format(selectedDate, "yyyy-MM-dd");
      const dateLabel = format(selectedDate, "dd/MM/yyyy", { locale: ptBR });

      // Load shift record for the selected date
      const { data: shiftRecord } = await supabase
        .from("daily_shift_records")
        .select("*")
        .eq("equipment_id", equipment.id)
        .eq("shift_date", targetDate)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Load stop history for the selected date
      const startOfDay = `${targetDate}T00:00:00`;
      const endOfDay = `${targetDate}T23:59:59`;
      
      const { data: stopHistory } = await supabase
        .from("equipment_stop_history")
        .select("*")
        .eq("equipment_id", equipment.id)
        .gte("started_at", startOfDay)
        .lte("started_at", endOfDay)
        .order("started_at", { ascending: true });

      const dateStops = (stopHistory || []).filter(s => !isReturnAfterRefuelingStop(s));

      // Fallback: if no initial values for the target date, use previous day's final values
      let fallbackInitialHorimeter: number | null = null;
      let fallbackInitialKm: number | null = null;
      let fallbackInitialFuel: string | null = null;
      if (!shiftRecord?.initial_horimeter && !shiftRecord?.initial_km) {
        const { data: prevShift } = await supabase
          .from("daily_shift_records")
          .select("final_horimeter, final_km, final_fuel_level, initial_horimeter, initial_km, initial_fuel_level")
          .eq("equipment_id", equipment.id)
          .lt("shift_date", targetDate)
          .order("shift_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (prevShift) {
          fallbackInitialHorimeter = prevShift.final_horimeter ? Number(prevShift.final_horimeter) : (prevShift.initial_horimeter ? Number(prevShift.initial_horimeter) : null);
          fallbackInitialKm = prevShift.final_km ? Number(prevShift.final_km) : (prevShift.initial_km ? Number(prevShift.initial_km) : null);
          fallbackInitialFuel = prevShift.final_fuel_level ?? prevShift.initial_fuel_level ?? null;
        }
      }

      // Fallback: if final values are missing, fetch next shift's initial values
      let fallbackFinalHorimeter: number | null = null;
      let fallbackFinalKm: number | null = null;
      if (!shiftRecord?.final_horimeter && !shiftRecord?.final_km) {
        const { data: nextShift } = await supabase
          .from("daily_shift_records")
          .select("initial_horimeter, initial_km")
          .eq("equipment_id", equipment.id)
          .gt("shift_date", targetDate)
          .order("shift_date", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (nextShift) {
          fallbackFinalHorimeter = nextShift.initial_horimeter ? Number(nextShift.initial_horimeter) : null;
          fallbackFinalKm = nextShift.initial_km ? Number(nextShift.initial_km) : null;
        }
      }

      // Build activities from stop history
      const activities: Array<{ start: string; end: string; description: string }> = [];
      
      // Filter consecutive duplicates
      const filteredStops = dateStops.filter((entry, index, arr) => {
        if (index === 0) return true;
        const prev = arr[index - 1];
        return entry.stop_reason !== prev.stop_reason || entry.defect_description !== prev.defect_description;
      });

      filteredStops.forEach((stop, idx) => {
        const startTime = format(new Date(stop.started_at), "HH:mm");
        let endTime = "";
        
        // For "Fim de Turno" entries, always prefer shift_end_time from the shift record
        const isEndOfShift = stop.stop_reason === "end_of_shift" || stop.stop_reason === "fim_turno";
        if (isEndOfShift && shiftRecord?.shift_end_time) {
          endTime = format(new Date(shiftRecord.shift_end_time), "HH:mm");
        } else if (stop.ended_at) {
          endTime = format(new Date(stop.ended_at), "HH:mm");
        } else if (idx < filteredStops.length - 1) {
          endTime = format(new Date(filteredStops[idx + 1].started_at), "HH:mm");
        }

        const statusLabel = getStatusLabel(stop.stop_reason);
        const description = stop.defect_description 
          ? `${statusLabel} - ${stop.defect_description}`
          : statusLabel;

        activities.push({
          start: startTime,
          end: endTime,
          description,
        });
      });

      // Get driver name from shift record, equipment, or stop history (changed_by_driver)
      const driverFromHistory = dateStops.find(s => s.changed_by_driver)?.changed_by_driver || "";
      const driverName = shiftRecord?.driver_name || equipment.driver || driverFromHistory || "";
      const helperName = shiftRecord?.helper_name || equipment.helper || "";
      
      // Use "SINALEIRO" for Munk equipment, "AJUDANTE" for others
      const helperLabel = equipment.equipment_type === "munk" ? "SINALEIRO" : "AJUDANTE";

      const htmlContent = buildParteDiariaFormHtml({
        logoBase64,
        dateLabel,
        equipmentName: equipment.name,
        plate: equipment.plate,
        driverName,
        helperName,
        helperLabel,
        activities,
        initialFuelLevel: shiftRecord?.initial_fuel_level ?? fallbackInitialFuel,
        finalFuelLevel: shiftRecord?.final_fuel_level ?? null,
        initialKm: shiftRecord?.initial_km ? Number(shiftRecord.initial_km) : fallbackInitialKm,
        finalKm: shiftRecord?.final_km ? Number(shiftRecord.final_km) : fallbackFinalKm,
        initialHorimeter: shiftRecord?.initial_horimeter ? Number(shiftRecord.initial_horimeter) : fallbackInitialHorimeter,
        finalHorimeter: shiftRecord?.final_horimeter ? Number(shiftRecord.final_horimeter) : fallbackFinalHorimeter,
      });

      await downloadPdfFromHtml(htmlContent, `movimentacoes-${format(new Date(), "yyyy-MM-dd")}.pdf`);

      setIsOpen(false);
      toast.success(`PDF gerado para ${dateLabel}`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Exportar PDF por data"
        >
          <CalendarSearch className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-3 space-y-3">
          <div className="text-sm font-medium text-center">
            Selecione a data para exportar
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setShowCounterEditor(false);
            }}
            locale={ptBR}
            disabled={(date) => date > new Date()}
            initialFocus
            className="pointer-events-auto"
          />

          {/* Admin counter editor */}
          {isAdmin && selectedDate && (
            <Collapsible open={showCounterEditor} onOpenChange={setShowCounterEditor}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                  <Gauge className="h-3.5 w-3.5" />
                  Corrigir Horímetro / KM
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <AdminCountersEditor
                  equipmentId={equipment.id}
                  equipmentName={equipment.name}
                  date={format(selectedDate, "yyyy-MM-dd")}
                  inline
                  onSaved={() => setShowCounterEditor(false)}
                />
              </CollapsibleContent>
            </Collapsible>
          )}

          <Button
            onClick={exportToPDF}
            disabled={isExporting || !selectedDate}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Exportando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
