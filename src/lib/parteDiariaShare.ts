import { supabase } from "@/integrations/supabase/client";
import { getLogoBase64 } from "@/lib/pdfLogo";
import {
  buildFuelGaugeSvg,
  fuelLevelToLabel,
  fuelLevelToPercentage,
} from "@/lib/pdf/fuelGauge";
import type { Equipment, EquipmentStopHistory } from "@/hooks/useEquipment";
import type { EquipmentMovement } from "@/hooks/useEquipmentMovements";

const PARA_OFFSET_MS = 3 * 60 * 60 * 1000;

const toParaDate = (date: Date = new Date()) => new Date(date.getTime() - PARA_OFFSET_MS);
const toParaDateString = (date: Date = new Date()) => toParaDate(date).toISOString().slice(0, 10);
const toBrDateLabel = (dateString: string) => dateString.split("-").reverse().join("/");
const formatParaTime = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return toParaDate(date).toISOString().slice(11, 16);
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const isReturnAfterRefuelingStop = (stop: EquipmentStopHistory) => {
  const desc = stop.defect_description ?? "";
  const reason = (stop.stop_reason as string | null) ?? "";
  const n = normalizeText(desc);
  const r = normalizeText(reason);
  return (
    n.includes("retorno apos abastecimento") ||
    n.includes("retorno do ponto") ||
    r.includes("retorno_abastecimento") ||
    r.includes("retorno abastecimento")
  );
};

const getStatusLabel = (stopReason: string | null) => {
  if (!stopReason || stopReason === "none") return "Operando";
  const labels: Record<string, string> = {
    operando: "Operando",
    maintenance: "Manutenção",
    waiting: "Aguardando Frente",
    waiting_front: "Aguardando Frente",
    end_of_shift: "Fim de Turno",
    fim_turno: "Fim de Turno",
    end_of_day: "Abastecendo",
    abastecimento: "Abastecendo",
    almoco: "Almoço",
    rain: "Parado (Chuva)",
    manutencao_corretiva: "Manutenção Corretiva",
    manutencao_preventiva: "Manutenção Preventiva",
    vistoria: "Vistoria",
    aguardando_frente_servico: "Aguardando Frente",
    servico: "Serviço",
  };

  return labels[stopReason] || stopReason;
};

export interface BuildParteDiariaParams {
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
}

export function buildParteDiariaFormHtml(params: BuildParteDiariaParams): string {
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
          <td class="cell horario">${escapeHtml(r.start)}</td>
          <td class="cell as">ÀS</td>
          <td class="cell horario">${escapeHtml(r.end)}</td>
          <td class="cell desc">${escapeHtml(r.description)}</td>
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

  fuelLevelToPercentage(params.initialFuelLevel);
  fuelLevelToPercentage(params.finalFuelLevel ?? params.initialFuelLevel);

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Parte Diária de Equipamento - ${params.equipmentName}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; color: #000 !important; font-size: 11px; line-height: 1.3; print-color-adjust: exact; -webkit-print-color-adjust: exact; padding: 0; background: #fff; }
        body, body * { color: #000 !important; text-shadow: none !important; }
        .sheet { border: 2px solid #000; width: 100%; max-width: 190mm; margin: 0 auto; }
        .logo-row { display: flex; align-items: center; justify-content: center; padding: 8px; border-bottom: 1px solid #000; }
        .logo-row img { height: 40px; }
        .top { display: flex; border-bottom: 1px solid #000; }
        .top-title { flex: 1; background: #e6e6e6; font-weight: 700; text-align: center; padding: 8px 10px; border-right: 1px solid #000; font-size: 14px; letter-spacing: .5px; }
        .obra { width: 180px; display: flex; }
        .obra .label { background: #e6e6e6; font-weight: 700; padding: 8px 10px; border-right: 1px solid #000; font-size: 11px; }
        .obra .value { flex: 1; padding: 8px 10px; font-size: 11px; }
        .info-row { display: flex; border-bottom: 1px solid #000; }
        .cell-label { background: #f0f0f0; font-weight: 700; padding: 6px 10px; border-right: 1px solid #000; font-size: 10px; text-transform: uppercase; white-space: nowrap; }
        .cell-value { flex: 1; padding: 6px 10px; border-right: 1px solid #000; font-size: 11px; }
        .info-row .cell-value:last-child { border-right: none; }
        .info-row .cell-label:first-child { width: 150px; }
        .main { display: flex; }
        .left { width: 180px; border-right: 1px solid #000; flex-shrink: 0; }
        .right { flex: 1; }
        .block-title { background: #f0f0f0; font-weight: 700; text-align: center; padding: 6px 10px; border-bottom: 1px solid #000; font-size: 10px; text-transform: uppercase; }
        .pair { display: flex; border-bottom: 1px solid #000; }
        .pair .box { flex: 1; padding: 8px 6px; text-align: center; border-right: 1px solid #000; }
        .pair .box:last-child { border-right: none; }
        .mini { font-size: 9px; color: #000 !important; margin-bottom: 3px; }
        .val { font-family: monospace; font-weight: 700; font-size: 12px; min-height: 16px; }
        .fuel { border-bottom: 1px solid #000; padding: 8px; }
        .fuel-grid { display: flex; justify-content: space-around; }
        .fuel-item { text-align: center; }
        .fuel-item .mini { margin-bottom: 5px; }
        .fuel-svg { display: block; margin: 0 auto; }
        .desc-title { background: #f0f0f0; font-weight: 700; text-align: center; padding: 6px 10px; border-bottom: 1px solid #000; font-size: 10px; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; }
        .cell { border: 1px solid #000; padding: 5px 6px; height: 26px; font-size: 11px; }
        .horario { width: 60px; text-align: center; font-family: monospace; }
        .as { width: 35px; text-align: center; font-size: 10px; }
        .desc { width: auto; }
        .signatures { display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; padding: 34px 20px 14px; }
        .sig { text-align: center; width: 30%; min-width: 0; }
        .sig-name { font-weight: bold; font-size: 11px; margin: 0 0 4px; padding: 0 4px; line-height: 1.3; min-height: 16px; white-space: normal; overflow: visible; word-break: keep-all; }
        .sig .line { border-top: 1px solid #000; margin: 0 0 5px; }
        .sig .lbl { font-size: 9px; line-height: 1.2; color: #000 !important; }
        .instructions { border-top: 1px solid #000; padding: 8px 10px; font-size: 8px; line-height: 1.4; }
        .instructions strong { font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="sheet">
        ${params.logoBase64 ? `<div class="logo-row"><img src="${params.logoBase64}" alt="Sucena" /></div>` : ""}
        <div class="top">
          <div class="top-title">PARTE DIÁRIA DE EQUIPAMENTO</div>
          <div class="obra"><div class="label">OBRA:</div><div class="value">460001269</div></div>
        </div>
        <div class="info-row">
          <div class="cell-label">MOTORISTA/OPERADOR</div>
          <div class="cell-value">${escapeHtml(params.driverName || "")}</div>
          <div class="cell-label">DATA</div>
          <div class="cell-value">${escapeHtml(params.dateLabel)}</div>
        </div>
        <div class="info-row">
          <div class="cell-label">EQUIPAMENTO</div>
          <div class="cell-value">${escapeHtml(params.equipmentName)}</div>
          <div class="cell-label">PLACA</div>
          <div class="cell-value" style="font-family: monospace;">${escapeHtml(params.plate)}</div>
        </div>
        <div class="info-row">
          <div class="cell-label">${escapeHtml(params.helperLabel)}</div>
          <div class="cell-value">${escapeHtml(params.helperName || "-")}</div>
        </div>
        <div class="main">
          <div class="left">
            <div class="block-title">KM</div>
            <div class="pair">
              <div class="box"><div class="mini">INICIAL</div><div class="val">${escapeHtml(params.initialKm != null ? params.initialKm.toLocaleString("pt-BR") : "")}</div></div>
              <div class="box"><div class="mini">FINAL</div><div class="val">${escapeHtml(params.finalKm != null ? params.finalKm.toLocaleString("pt-BR") : "")}</div></div>
            </div>
            <div class="block-title">HORÍMETRO</div>
            <div class="pair">
              <div class="box"><div class="mini">INICIAL</div><div class="val">${escapeHtml(params.initialHorimeter != null ? params.initialHorimeter.toLocaleString("pt-BR") : "")}</div></div>
              <div class="box"><div class="mini">FINAL</div><div class="val">${escapeHtml(params.finalHorimeter != null ? params.finalHorimeter.toLocaleString("pt-BR") : "")}</div></div>
            </div>
            <div class="fuel">
              <div class="block-title" style="border: 1px solid #000; border-left: none; border-right: none; margin: -6px -6px 6px;">ABASTECIMENTO</div>
              <div class="fuel-grid">
                <div class="fuel-item">
                  <div class="mini">INICIAL</div>
                  <div class="fuel-svg">${buildFuelGaugeSvg({ level: params.initialFuelLevel, width: 80, height: 48 })}</div>
                  <div class="mini" style="margin-top: 3px; font-weight: 700; color: #000 !important;">${escapeHtml(fuelLevelToLabel(params.initialFuelLevel))}</div>
                </div>
                <div class="fuel-item">
                  <div class="mini">FINAL</div>
                  <div class="fuel-svg">${buildFuelGaugeSvg({ level: params.finalFuelLevel ?? params.initialFuelLevel, width: 80, height: 48 })}</div>
                  <div class="mini" style="margin-top: 3px; font-weight: 700; color: #000 !important;">${escapeHtml(fuelLevelToLabel(params.finalFuelLevel ?? params.initialFuelLevel))}</div>
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
              <tbody>${activityRowsHtml}</tbody>
            </table>
          </div>
        </div>
        <div class="signatures">
          <div class="sig"><div class="sig-name">${escapeHtml(params.driverName || "")}</div><div class="line"></div><div class="lbl">Motorista/Operador</div></div>
          <div class="sig"><div class="sig-name">Creriane Navegantes</div><div class="line"></div><div class="lbl">Encarregada/Apontadora</div></div>
          <div class="sig"><div class="sig-name">Luís Carlos</div><div class="line"></div><div class="lbl">Gerência</div></div>
        </div>
        <div class="instructions"><strong>INSTRUÇÃO:</strong> ${instructionText}</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Gathers shift data for an equipment for today and builds the Parte Diária HTML.
 */
export async function buildParteDiariaHtmlForEquipment(
  equipment: Equipment,
  movements: EquipmentMovement[] = [],
): Promise<string> {
  const logoBase64 = await getLogoBase64().catch(() => "");
  const today = toParaDateString();
  const dateLabel = toBrDateLabel(today);

  const { data: shiftRecord } = await supabase
    .from("daily_shift_records")
    .select(
      "initial_fuel_level, final_fuel_level, initial_km, final_km, initial_horimeter, final_horimeter, shift_start_time, shift_end_time, driver_name, helper_name, status_history"
    )
    .eq("equipment_id", equipment.id)
    .eq("shift_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let fallbackInitialHorimeter: number | null = null;
  let fallbackInitialKm: number | null = null;
  let fallbackInitialFuel: string | null = null;
  if (!shiftRecord?.initial_horimeter && !shiftRecord?.initial_km) {
    const { data: prev } = await supabase
      .from("daily_shift_records")
      .select(
        "final_horimeter, final_km, final_fuel_level, initial_horimeter, initial_km, initial_fuel_level"
      )
      .eq("equipment_id", equipment.id)
      .lt("shift_date", today)
      .order("shift_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev) {
      fallbackInitialHorimeter = prev.final_horimeter
        ? Number(prev.final_horimeter)
        : prev.initial_horimeter
        ? Number(prev.initial_horimeter)
        : null;
      fallbackInitialKm = prev.final_km
        ? Number(prev.final_km)
        : prev.initial_km
        ? Number(prev.initial_km)
        : null;
      fallbackInitialFuel = prev.final_fuel_level ?? prev.initial_fuel_level ?? null;
    }
  }

  let driverName = equipment.driver || "";
  if (!driverName && shiftRecord?.driver_name) driverName = shiftRecord.driver_name;
  if (!driverName && shiftRecord?.status_history) {
    const history = Array.isArray(shiftRecord.status_history)
      ? (shiftRecord.status_history as Array<{ changed_by?: string | null }>)
      : [];
    for (const e of history) {
      if (e.changed_by && !e.changed_by.includes("(Editado)")) {
        driverName = e.changed_by;
        break;
      }
    }
  }
  let helperName = equipment.helper || "";
  if (!helperName && shiftRecord?.helper_name) helperName = shiftRecord.helper_name;

  const { data: freshStopHistory } = await supabase
    .from("equipment_stop_history")
    .select("*")
    .eq("equipment_id", equipment.id)
    .order("started_at", { ascending: true });

  const stops = (freshStopHistory || []).filter((h: any) => {
    const stopDate = toParaDateString(new Date(h.started_at));
    return stopDate === today;
  }) as EquipmentStopHistory[];

  const sorted = [...stops].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );
  const filtered = sorted.filter((stop, i, arr) => {
    if (i === 0) return true;
    const prev = arr[i - 1];
    return (
      stop.stop_reason !== prev.stop_reason ||
      stop.defect_description !== prev.defect_description
    );
  });

  type Activity = { start: string; end: string; description: string; sortKey: number };
  const activities: Activity[] = [];
  if (shiftRecord?.shift_start_time) {
    activities.push({
      start: formatParaTime(shiftRecord.shift_start_time),
      end: "",
      description: "Início de Turno / Operando",
      sortKey: new Date(shiftRecord.shift_start_time).getTime(),
    });
  }
  for (let i = 0; i < filtered.length; i++) {
    const stop = filtered[i];
    if (isReturnAfterRefuelingStop(stop)) continue;
    const nextStop = filtered[i + 1];
    const isLast = i === filtered.length - 1;
    const isEndOfShift =
      stop.stop_reason === "end_of_shift" || (stop.stop_reason as any) === "fim_turno";
    let endTime = "";
    if (nextStop) {
      endTime = stop.ended_at
        ? formatParaTime(stop.ended_at)
        : formatParaTime(nextStop.started_at);
      if (isReturnAfterRefuelingStop(nextStop)) i++;
    } else if (isLast && isEndOfShift) {
      endTime = stop.ended_at
        ? formatParaTime(stop.ended_at)
        : formatParaTime(stop.started_at);
    }
    activities.push({
      start: formatParaTime(stop.started_at),
      end: endTime,
      description: `${getStatusLabel(stop.stop_reason)}${
        stop.defect_description ? ` - ${stop.defect_description}` : ""
      }`,
      sortKey: new Date(stop.started_at).getTime(),
    });
  }

  const statusHistory = Array.isArray(shiftRecord?.status_history)
    ? (shiftRecord.status_history as Array<{
        status?: string | null;
        timestamp?: string | null;
        description?: string | null;
      }>)
    : [];
  for (const entry of statusHistory) {
    if (!entry?.timestamp || !entry.status) continue;
    if (toParaDateString(new Date(entry.timestamp)) !== today) continue;
    const sortKey = new Date(entry.timestamp).getTime();
    const exists = activities.some(
      (a) => Math.abs(a.sortKey - sortKey) < 60_000 && normalizeText(a.description).includes(normalizeText(getStatusLabel(entry.status || null)))
    );
    if (exists) continue;
    activities.push({
      start: formatParaTime(entry.timestamp),
      end: "",
      description: `${getStatusLabel(entry.status)}${entry.description ? ` - ${entry.description}` : ""}`,
      sortKey,
    });
  }

  // Include today's equipment movements (Entrada / Saída) with their reason
  const exitReasonLabels: Record<string, string> = {
    manutencao_corretiva: "Manutenção Corretiva",
    manutencao_preventiva: "Manutenção Preventiva",
    vistoria: "Vistoria",
    operando: "Operando",
    aguardando_frente_servico: "Aguardando Frente de Serviço",
    fim_turno: "Fim de Turno",
  };

  let movementsToday = (movements || []).filter(
    (m) => m.plate === equipment.plate && m.movement_date === today,
  );
  // Fallback: fetch directly if none were passed in (e.g. backfill / WhatsApp PNG)
  if (movementsToday.length === 0) {
    const { data: freshMovements } = await supabase
      .from("equipment_movements")
      .select("*")
      .eq("plate", equipment.plate)
      .eq("movement_date", today)
      .order("movement_time", { ascending: true });
    movementsToday = (freshMovements || []) as EquipmentMovement[];
  }

  for (const mov of movementsToday) {
    const time = (mov.movement_time || "").slice(0, 5);
    const sortDate = new Date(`${mov.movement_date}T${time || "00:00"}:00-03:00`);
    const isEntrada = mov.movement_type === "entrada";
    const label = isEntrada ? "ENTRADA" : "SAÍDA";
    const reasonLabel = mov.exit_reason ? exitReasonLabels[mov.exit_reason] : null;
    let description = label;
    if (!isEntrada && reasonLabel) description += ` - ${reasonLabel}`;
    if (mov.problem_description) description += ` (${mov.problem_description})`;
    else if (mov.observation) description += ` (${mov.observation})`;
    activities.push({
      start: time,
      end: "",
      description,
      sortKey: sortDate.getTime() || 0,
    });
  }

  activities.sort((a, b) => a.sortKey - b.sortKey);
  const activitiesOut = activities.map(({ start, end, description }) => ({ start, end, description }));

  return buildParteDiariaFormHtml({
    logoBase64,
    dateLabel,
    equipmentName: equipment.name,
    plate: equipment.plate,
    driverName,
    helperName,
    helperLabel: equipment.equipment_type === "munk" ? "SINALEIRO" : "AJUDANTE",
    activities: activitiesOut,
    initialFuelLevel: shiftRecord?.initial_fuel_level ?? fallbackInitialFuel,
    finalFuelLevel: shiftRecord?.final_fuel_level ?? null,
    initialKm: shiftRecord?.initial_km ?? fallbackInitialKm,
    finalKm: shiftRecord?.final_km ?? null,
    initialHorimeter: shiftRecord?.initial_horimeter ?? fallbackInitialHorimeter,
    finalHorimeter: shiftRecord?.final_horimeter ?? null,
  });
}

/**
 * Renders the Parte Diária HTML to a PNG blob using html2canvas.
 */
export async function renderParteDiariaHtmlToPngBlob(htmlContent: string): Promise<Blob> {
  const { default: html2canvas } = await import("html2canvas");

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const styleTags = Array.from(doc.querySelectorAll("style"))
    .map((s) => s.textContent || "")
    .join("\n");
  const bodyContent = doc.body?.innerHTML || htmlContent;

  // Wrapper único que vamos inserir e remover do DOM real
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-parte-diaria-render", "true");
  wrapper.style.position = "fixed";
  wrapper.style.left = "0";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#ffffff";
  wrapper.style.zIndex = "2147483647";
  wrapper.style.pointerEvents = "none";
  wrapper.style.opacity = "1";
  wrapper.style.visibility = "visible";

  // Escopa os estilos via prefixo para não vazar para o app
  const scopedCss = `
    [data-parte-diaria-render] { all: initial; }
    [data-parte-diaria-render], [data-parte-diaria-render] * {
      box-sizing: border-box;
      font-family: Arial, Helvetica, sans-serif;
      color: #000 !important;
      text-shadow: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    [data-parte-diaria-render] { display: block; padding: 20px; background: #fff; font-size: 12px; }
    ${styleTags}
  `;

  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-parte-diaria-style", "true");
  styleEl.textContent = scopedCss;
  document.head.appendChild(styleEl);

  wrapper.innerHTML = bodyContent;
  document.body.appendChild(wrapper);

  try {
    // Espera imagens carregarem (com timeout de segurança de 6s por imagem)
    const images = Array.from(wrapper.querySelectorAll("img")) as HTMLImageElement[];
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, 6000);
          })
      )
    );
    await new Promise((r) => setTimeout(r, 150));

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
      height: Math.ceil(wrapper.scrollHeight),
      windowWidth: 794,
      windowHeight: Math.ceil(wrapper.scrollHeight),
    });

    if (isCanvasMostlyBlank(canvas)) {
      throw new Error("PNG da Parte Diária saiu em branco; tente novamente");
    }

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG vazio"))),
        "image/png",
        0.95
      );
    });
  } finally {
    wrapper.remove();
    styleEl.remove();
  }
}


/**
 * Builds today's Parte Diária PNG for an equipment, uploads to storage,
 * and returns the public URL.
 */
export async function generateAndUploadParteDiariaPng(
  equipment: Equipment
): Promise<string | null> {
  const html = await buildParteDiariaHtmlForEquipment(equipment);
  const blob = await renderParteDiariaHtmlToPngBlob(html);
  const today = toParaDateString();
  const safeName = (equipment.name || "equip").replace(/[^a-zA-Z0-9-_]/g, "_");
  const path = `parte-diaria/${today}/${safeName}-${equipment.id}-${Date.now()}.png`;

  let lastError: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await supabase.storage
      .from("site-assets")
      .upload(path, blob, { contentType: "image/png", upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      return data?.publicUrl ?? null;
    }
    lastError = error;
    console.warn(`[parteDiariaShare] upload attempt ${attempt} failed`, error);
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  throw new Error(
    `Falha ao enviar PNG ao storage após 3 tentativas: ${lastError?.message || lastError}`
  );
}

function isCanvasMostlyBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || canvas.width === 0 || canvas.height === 0) return true;

  const sampleWidth = Math.min(canvas.width, 320);
  const sampleHeight = Math.min(canvas.height, 320);
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
  let nonWhite = 0;

  for (let i = 0; i < imageData.length; i += 16) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];
    if (a > 20 && (r < 245 || g < 245 || b < 245)) nonWhite++;
    if (nonWhite > 30) return false;
  }

  return true;
}
