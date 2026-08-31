import { useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { triggerBlobDownload } from "@/lib/pdfDownload";
import { renderParteDiariaHtmlToPngBlob } from "@/lib/parteDiariaShare";
import type { Equipment, EquipmentStopHistory } from "@/hooks/useEquipment";
import type { EquipmentMovement } from "@/hooks/useEquipmentMovements";
import { supabase } from "@/integrations/supabase/client";
import {
  buildFuelGaugeSvg,
  fuelLevelToLabel,
  fuelLevelToPercentage,
} from "@/lib/pdf/fuelGauge";

interface ExportEquipmentPngButtonProps {
  equipment: Equipment;
  movements: EquipmentMovement[];
  stopHistory: EquipmentStopHistory[];
}

export function ExportEquipmentPngButton({
  equipment,
  movements,
  stopHistory,
}: ExportEquipmentPngButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const isReturnAfterRefuelingStop = (stop: EquipmentStopHistory) => {
    const desc = stop.defect_description ?? "";
    const reason = (stop.stop_reason as string | null) ?? "";
    const nDesc = normalizeText(desc);
    const nReason = normalizeText(reason);
    return (
      nDesc.includes("retorno apos abastecimento") ||
      nDesc.includes("retorno do ponto") ||
      nReason.includes("retorno_abastecimento") ||
      nReason.includes("retorno abastecimento")
    );
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
    const maxRows = 20;
    const rows = [...params.activities]
      .slice(0, maxRows)
      .concat(
        Array.from({ length: Math.max(0, maxRows - params.activities.length) }).map(() => ({
          start: "",
          end: "",
          description: "",
        }))
      );

    const activityRowsHtml = rows
      .map(
        (r) => `
          <tr>
            <td class="cell horario">${r.start}</td>
            <td class="cell as">ÀS</td>
            <td class="cell horario">${r.end}</td>
            <td class="cell desc">${r.description}</td>
          </tr>
        `
      )
      .join("");

    const instructionText =
      "01 - PREENCHER O CABEÇALHO COM NOME, DATA, TIPO DE EQUIPAMENTO E PLACA/TAG - " +
      "02 - COLOCAR KM OU HORÍMETRO INICIAL E FINAL " +
      "03 - COLOCAR O HORÁRIO QUE INICIA CADA ATIVIDADE. " +
      "04 - COLOCAR HORÁRIO DE INICIO E FINAL QUANDO HOUVER DEFEITO MECÂNICO E DESCREVER O DEFEITO " +
      "05 - AO FINAL DA JORNADA DE TRABALHO ASSINAR E ENTREGAR PARA APONTADOR OU ENCARREGADO RESPONSÁVEL. " +
      "06 - A PARTE DIÁRIA DEVERÁ SER PREENCHIDA TODOS OS DIAS INCLUSIVE DOMINGOS E FÉRIADOS. " +
      "07 - O MOTORISTA/OPERADOR TEM ATÉ O DIA 02 DE CADA MÊS PARA ENTREGAR TODAS AS PARTES DIÁRIAS, E O APONTADOR TEM ATÉ O DIA 04 PARA ENVIAR PARA O SETOR DE CONFERÊNCIA, O DESCUMPRIMENTO DESSE ITEM IRÁ GERAR ADVERTÊNCIA POR ESCRITO.";

    const initialFuelPct = fuelLevelToPercentage(params.initialFuelLevel);
    const finalFuelPct = fuelLevelToPercentage(
      params.finalFuelLevel ?? params.initialFuelLevel
    );

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
          .top { display: flex; border-bottom: 1px solid #000; align-items: stretch; }
          .top-title { flex: 1; background: #e6e6e6; font-weight: 700; text-align: center; display: flex; align-items: center; justify-content: center; padding: 8px 10px; border-right: 1px solid #000; font-size: 14px; letter-spacing: .5px; }
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
          .sig-name {
            font-weight: bold;
            font-size: 10px;
            margin: 0 0 5px;
            padding: 0 4px 3px;
            line-height: 1.2;
            min-height: 12px;
            white-space: normal;
            overflow: visible;
            word-break: keep-all;
            border-bottom: 1px solid #000;
          }
          .sig .lbl { font-size: 9px; }

          .instructions { border-top: 1px solid #000; padding: 4px 10px; font-size: 6px; line-height: 1.1; }
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
          <div class="top">
            ${params.logoBase64 ? `<div style="padding: 8px 15px; border-right: 1px solid #000; background: #fff; display: flex; align-items: center; justify-content: center;"><img loading="lazy" decoding="async" src="${params.logoBase64}" style="height: 35px; display: block;" alt="Logo" /></div>` : ""}
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
              <div class="desc-title">DESCRIMINAÇÃO: SERVIÇOS, PARADAS E OBS.</div>
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
                  ${activityRowsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <div class="signatures">
            <div class="sig"><div class="sig-name">${params.driverName || ""}</div><div class="lbl">Ass. Motorista/Op</div></div>
            <div class="sig"><div class="sig-name">Creriane Navegantes</div><div class="lbl">Ass. Encarreg./Apontador</div></div>
            <div class="sig"><div class="sig-name">Luís Carlos</div><div class="lbl">Ass. Gerência</div></div>
          </div>

          <div class="instructions"><strong>INSTRUÇÃO:</strong> ${instructionText}</div>
        </div>
      </body>
      </html>
    `;
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

  const getExitReasonLabel = (reason: string | null) => {
    if (!reason) return "-";
    switch (reason) {
      case "manutencao_corretiva":
        return "Manutenção Corretiva";
      case "manutencao_preventiva":
        return "Manutenção Preventiva";
      case "vistoria":
        return "Vistoria";
      case "operando":
        return "Operando";
      case "aguardando_frente_servico":
        return "Aguardando Frente";
      case "fim_turno":
        return "Fim de Turno";
      default:
        return reason;
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}h${m > 0 ? ` ${m}min` : ""}`;
    }
    return `${minutes}min`;
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const logoBase64 = await getLogoBase64();
      const today = format(new Date(), "yyyy-MM-dd");
      const dateLabel = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

      // Try to load telemetry data from today's shift record (when available)
      const { data: shiftRecord } = await supabase
        .from("daily_shift_records")
        .select("initial_fuel_level, final_fuel_level, initial_km, final_km, initial_horimeter, final_horimeter, shift_end_time, driver_name, helper_name, status_history")
        .eq("equipment_id", equipment.id)
        .eq("shift_date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fallback: if no initial values for today, use previous day's final values
      let fallbackInitialHorimeter: number | null = null;
      let fallbackInitialKm: number | null = null;
      let fallbackInitialFuel: string | null = null;
      if (!shiftRecord?.initial_horimeter && !shiftRecord?.initial_km) {
        const { data: prevShift } = await supabase
          .from("daily_shift_records")
          .select("final_horimeter, final_km, final_fuel_level, initial_horimeter, initial_km, initial_fuel_level")
          .eq("equipment_id", equipment.id)
          .lt("shift_date", today)
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
          .gt("shift_date", today)
          .order("shift_date", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (nextShift) {
          fallbackFinalHorimeter = nextShift.initial_horimeter ? Number(nextShift.initial_horimeter) : null;
          fallbackFinalKm = nextShift.initial_km ? Number(nextShift.initial_km) : null;
        }
      }

      // 1. Use equipment.driver if available
      // 2. Else use shiftRecord.driver_name if available
      // 3. Else search for changed_by in status_history
      let driverName = equipment.driver || "";
      if (!driverName && shiftRecord?.driver_name) {
        driverName = shiftRecord.driver_name;
      }
      if (!driverName && shiftRecord?.status_history) {
        const history = Array.isArray(shiftRecord.status_history) 
          ? shiftRecord.status_history as Array<{ changed_by?: string | null }>
          : [];
        for (const entry of history) {
          if (entry.changed_by && !entry.changed_by.includes("(Editado)")) {
            driverName = entry.changed_by;
            break;
          }
        }
      }

      // Determine helper name with fallback
      let helperName = equipment.helper || "";
      if (!helperName && shiftRecord?.helper_name) {
        helperName = shiftRecord.helper_name;
      }

      // Re-fetch fresh stop history from DB to ensure deleted entries are excluded
      const { data: freshStopHistory } = await supabase
        .from("equipment_stop_history")
        .select("*")
        .eq("equipment_id", equipment.id)
        .order("started_at", { ascending: true });

      const activeStopHistory = freshStopHistory || stopHistory;

      // Filter today's data
      const todayMovements = movements.filter((m) => m.movement_date === today);
      const todayStops = activeStopHistory.filter((h) => {
        const stopDate = format(new Date(h.started_at), "yyyy-MM-dd");
        return stopDate === today;
      });

      // Calculate total stop time
      const totalStopMinutes = todayStops.reduce(
        (acc, stop) => acc + (stop.duration_minutes || 0),
        0
      );

      // Sort stops and filter out consecutive duplicates
      const sortedStops = [...todayStops].sort(
        (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      );

      // Only remove if same reason AND same description consecutively
      const filteredStops = sortedStops.filter((stop, index, arr) => {
        if (index === 0) return true;
        const prev = arr[index - 1];
        return (
          stop.stop_reason !== prev.stop_reason ||
          stop.defect_description !== prev.defect_description
        );
      });

      // Build activities with proper end times:
      // - Use start time of next status as end time
      // - Leave blank for last status UNLESS it's "Fim de Turno"
      // - Special rule: legacy "Operando - Retorno após abastecimento" must NOT be printed;
      //   it only closes the previous "Abastecimento" time range.
      const activities: Array<{ start: string; end: string; description: string }> = [];
      for (let i = 0; i < filteredStops.length; i++) {
        const stop = filteredStops[i];
        if (isReturnAfterRefuelingStop(stop)) {
          continue;
        }

        const nextStop = filteredStops[i + 1];
        const isLastEntry = i === filteredStops.length - 1;
        const isEndOfShift = stop.stop_reason === "end_of_shift" || stop.stop_reason === "fim_turno";

        let endTime = "";

        // Rule: last status is always blank UNLESS it's "Fim de Turno".
        // For non-last entries, use next status start time (or ended_at if available).
        if (nextStop) {
          // Use ended_at if available (e.g., closed abastecimento), else next start time
          endTime = stop.ended_at
            ? format(new Date(stop.ended_at), "HH:mm", { locale: ptBR })
            : format(new Date(nextStop.started_at), "HH:mm", { locale: ptBR });
          if (isReturnAfterRefuelingStop(nextStop)) {
            i++; // consume marker without printing
          }
        } else if (isLastEntry && isEndOfShift) {
          // Only "Fim de Turno" shows an end time when it's the last status.
          endTime = stop.ended_at
            ? format(new Date(stop.ended_at), "HH:mm", { locale: ptBR })
            : format(new Date(stop.started_at), "HH:mm", { locale: ptBR });
        }
        // Otherwise (last entry, not end of shift) → endTime stays blank

        activities.push({
          start: format(new Date(stop.started_at), "HH:mm", { locale: ptBR }),
          end: endTime,
          description: `${getStatusLabel(stop.stop_reason)}${stop.defect_description ? ` - ${stop.defect_description}` : ""}`,
        });
      }

      const htmlContent = buildParteDiariaFormHtml({
        logoBase64,
        dateLabel,
        equipmentName: equipment.name,
        plate: equipment.plate,
        driverName,
        helperName,
        helperLabel: equipment.equipment_type === "munk" ? "SINALEIRO" : "AJUDANTE",
        activities,
        initialFuelLevel: shiftRecord?.initial_fuel_level ?? fallbackInitialFuel,
        finalFuelLevel: shiftRecord?.final_fuel_level ?? null,
        initialKm: shiftRecord?.initial_km ?? fallbackInitialKm,
        finalKm: shiftRecord?.final_km ?? fallbackFinalKm,
        initialHorimeter: shiftRecord?.initial_horimeter ?? fallbackInitialHorimeter,
        finalHorimeter: shiftRecord?.final_horimeter ?? fallbackFinalHorimeter,
      });

      const blob = await renderParteDiariaHtmlToPngBlob(htmlContent);
      triggerBlobDownload(blob, `parte-diaria-${equipment.name}-${format(new Date(), "yyyy-MM-dd")}.png`);

      toast.success("PNG gerado com sucesso!");
    } catch (error) {
      console.error("Error exporting to PNG:", error);
      toast.error("Erro ao exportar para PNG");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={exportToPDF}
      disabled={isExporting}
      className="h-8 w-8 text-primary hover:bg-primary/10"
      title="Exportar Imagem (PNG)"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ImageIcon className="h-4 w-4" />
      )}
    </Button>
  );
}
