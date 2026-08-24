import { useState, useRef } from "react";
import { FileText, Loader2, CalendarRange } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Dynamic imports to avoid chunk conflicts
const importJsPDF = () => import("jspdf").then(m => m.jsPDF);
const importHtml2Canvas = () => import("html2canvas").then(m => m.default);
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { supabase } from "@/integrations/supabase/client";
import { getBrazilNorthTodayString } from "@/lib/timezone";

const EXIT_REASON_LABELS: Record<string, string> = {
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  operando: "Operando",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  fim_turno: "Fim de Turno",
};

export function ExportMovementsHistoryPdfButton() {
  const today = getBrazilNorthTodayString();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error("Selecione as datas de início e fim");
      return;
    }
    if (startDate > endDate) {
      toast.error("Data de início deve ser anterior à data final");
      return;
    }

    setIsExporting(true);
    try {
      const logoBase64 = await getLogoBase64();

      // Fetch vehicle movements in the date range
      const { data: movements, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .gte("movement_date", startDate)
        .lte("movement_date", endDate)
        .order("movement_date", { ascending: true })
        .order("movement_time", { ascending: true });

      if (error) throw error;

      // Fetch full equipment list (todos cadastrados)
      const { data: allEquipment } = await supabase
        .from("equipment")
        .select("*")
        .order("name", { ascending: true });

      // Fetch ALL movements (sem filtro de período) para determinar status atual de cada equipamento
      const { data: allMovements } = await supabase
        .from("equipment_movements")
        .select("*")
        .order("movement_date", { ascending: true })
        .order("movement_time", { ascending: true });

      // Última movimentação por placa (em todo o histórico)
      const lastMovementByPlate: Record<string, any> = {};
      (allMovements || []).forEach((m: any) => {
        lastMovementByPlate[m.plate] = m;
      });

      // Equipamentos DENTRO da obra: cadastrados cuja última movimentação NÃO é "saida"
      // (inclui equipamentos sem nenhuma movimentação registrada — assume-se dentro)
      const equipmentInside = (allEquipment || []).filter((eq: any) => {
        const last = lastMovementByPlate[eq.plate];
        return !last || last.movement_type === "entrada";
      });

      // Equipamentos FORA da obra: última movimentação foi "saida"
      const equipmentOutside = (allEquipment || []).filter((eq: any) => {
        const last = lastMovementByPlate[eq.plate];
        return last && last.movement_type === "saida";
      });

      // Fetch jardinagem announcements for the date range (jardinagem doesn't have a movement history table)
      // We'll query announcements that match jardinagem patterns
      const { data: jardinagemEquipment } = await supabase
        .from("jardinagem_equipment")
        .select("*")
        .order("name");

      const startLabel = format(new Date(startDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
      const endLabel = format(new Date(endDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
      const now = new Date();
      const dateStr = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

      // Group movements by date
      const movementsByDate: Record<string, typeof movements> = {};
      (movements || []).forEach((m: any) => {
        if (!movementsByDate[m.movement_date]) {
          movementsByDate[m.movement_date] = [];
        }
        movementsByDate[m.movement_date].push(m);
      });

      const sortedDates = Object.keys(movementsByDate).sort();

      // Build a map of last known exit per plate (within the queried range)
      // so an "entrada" can show the date/reason of the previous "saída".
      const lastExitByPlate = new Map<string, { reason: string; problem: string | null; date: string }>();
      const entradaContextByMovementId = new Map<string, { reason: string; problem: string | null; date: string }>();
      (movements || []).forEach((m: any) => {
        if (m.movement_type === "saida" && m.exit_reason) {
          lastExitByPlate.set(m.plate, {
            reason: m.exit_reason,
            problem: m.problem_description ?? null,
            date: m.movement_date,
          });
        } else if (m.movement_type === "entrada") {
          const ctx = lastExitByPlate.get(m.plate);
          if (ctx) {
            entradaContextByMovementId.set(m.id, ctx);
            lastExitByPlate.delete(m.plate);
          }
        }
      });

      // Fallback: if the first movement of a plate in the range is an "entrada"
      // (the matching saída happened before the range), look it up.
      const platesNeedingPriorExit = (movements || [])
        .filter((m: any) => m.movement_type === "entrada" && !entradaContextByMovementId.has(m.id))
        .map((m: any) => ({ id: m.id, plate: m.plate }));

      if (platesNeedingPriorExit.length > 0) {
        const uniquePlates = Array.from(new Set(platesNeedingPriorExit.map((p) => p.plate)));
        const { data: priorExits } = await supabase
          .from("equipment_movements")
          .select("plate, movement_date, movement_time, exit_reason, problem_description")
          .in("plate", uniquePlates)
          .eq("movement_type", "saida")
          .lt("movement_date", startDate)
          .order("movement_date", { ascending: false })
          .order("movement_time", { ascending: false });

        const lastPriorByPlate = new Map<string, any>();
        (priorExits || []).forEach((e: any) => {
          if (!lastPriorByPlate.has(e.plate) && e.exit_reason) {
            lastPriorByPlate.set(e.plate, e);
          }
        });

        platesNeedingPriorExit.forEach(({ id, plate }) => {
          const e = lastPriorByPlate.get(plate);
          if (e) {
            entradaContextByMovementId.set(id, {
              reason: e.exit_reason,
              problem: e.problem_description ?? null,
              date: e.movement_date,
            });
          }
        });
      }

      const fmtDate = (d: string) => format(new Date(d + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });

      const buildMovementRows = (movs: any[]) => {
        return movs.map((m: any) => {
          const isEntrada = m.movement_type === "entrada";
          const emoji = isEntrada ? "🟢" : "🔴";
          const typeLabel = isEntrada ? "ENTRADA" : "SAÍDA";
          const badgeClass = isEntrada
            ? "background: #dcfce7; color: #166534;"
            : "background: #ffedd5; color: #c2410c;";

          const entradaCtx = isEntrada ? entradaContextByMovementId.get(m.id) : undefined;
          const reasonValue = !isEntrada ? m.exit_reason : entradaCtx?.reason;
          const reasonLabel = reasonValue ? (EXIT_REASON_LABELS[reasonValue] || reasonValue) : null;
          const reasonBadge = reasonLabel
            ? `<span class="badge" style="background: #fef3c7; color: #92400e;">${reasonLabel}${isEntrada ? " (saída)" : ""}</span>`
            : "-";

          const problemValue = isEntrada
            ? (m.problem_description || entradaCtx?.problem || "-")
            : (m.problem_description || "-");

          const lastExitCell = isEntrada
            ? (entradaCtx ? fmtDate(entradaCtx.date) : "-")
            : "-";

          return `
            <tr>
              <td><strong>${m.equipment_name}</strong></td>
              <td class="mono">${m.plate}</td>
              <td><span class="badge" style="${badgeClass}">${emoji} ${typeLabel}</span></td>
              <td>${lastExitCell}</td>
              <td>${reasonBadge}</td>
              <td>${problemValue}</td>
              <td>${m.observation || "-"}</td>
            </tr>
          `;
        }).join("");
      };

      const vehicleSectionsHtml = sortedDates.length === 0
        ? '<p style="padding: 10px; color: #666;">Nenhuma movimentação de veículos no período selecionado.</p>'
        : sortedDates.map(date => {
          const dateFormatted = format(new Date(date + "T12:00:00"), "EEEE, dd/MM/yyyy", { locale: ptBR });
          const movs = movementsByDate[date];
          const entradas = movs.filter((m: any) => m.movement_type === "entrada").length;
          const saidas = movs.filter((m: any) => m.movement_type === "saida").length;

          return `
            <div class="date-section">
              <div class="date-header">
                📅 ${dateFormatted}
                <span class="date-stats">
                  <span style="color: #166534;">🟢 ${entradas} entrada${entradas !== 1 ? 's' : ''}</span> |
                  <span style="color: #c2410c;">🔴 ${saidas} saída${saidas !== 1 ? 's' : ''}</span>
                </span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Equipamento</th>
                    <th style="width: 90px;">Placa</th>
                    <th style="width: 100px;">Tipo</th>
                    <th style="width: 90px;">Última Saída</th>
                    <th>Motivo</th>
                    <th>Problema</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  ${buildMovementRows(movs)}
                </tbody>
              </table>
            </div>
          `;
        }).join("");

      // Jardinagem section - show current status only since there's no history table
      const jardinagemHtml = (jardinagemEquipment && jardinagemEquipment.length > 0) ? `
        <div class="section">
          <div class="section-title jard">🌿 Equipamentos de Jardinagem - Status Atual</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Equipamento</th>
                <th style="width: 100px;">Status</th>
                <th>Última Atualização</th>
              </tr>
            </thead>
            <tbody>
              ${jardinagemEquipment.map((eq: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${eq.name}</strong></td>
                  <td><span class="badge" style="${eq.status === 'entrou' ? 'background: #dcfce7; color: #166534;' : 'background: #ffedd5; color: #c2410c;'}">${eq.status === 'entrou' ? '🟢 Entrou' : '🔴 Saiu'}</span></td>
                  <td>${format(new Date(eq.status_changed_at), "dd/MM/yyyy")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : '';

      // Summary
      const totalEntradas = (movements || []).filter((m: any) => m.movement_type === "entrada").length;
      const totalSaidas = (movements || []).filter((m: any) => m.movement_type === "saida").length;
      const uniqueEquipments = new Set((movements || []).map((m: any) => m.plate)).size;

      // Helper para calcular tempo desde uma data/hora
      const formatElapsed = (date: string, time: string | null) => {
        try {
          const dt = new Date(`${date}T${time || "00:00"}:00-04:00`);
          const diffMs = Date.now() - dt.getTime();
          if (diffMs < 0) return "-";
          const days = Math.floor(diffMs / 86400000);
          const hours = Math.floor((diffMs % 86400000) / 3600000);
          if (days > 0) return `${days}d ${hours}h`;
          const mins = Math.floor((diffMs % 3600000) / 60000);
          return `${hours}h ${mins}m`;
        } catch {
          return "-";
        }
      };

      // Status atual: DENTRO da obra
      const insideTableRows = equipmentInside.length === 0
        ? `<tr><td colspan="6" style="text-align:center; color:#666; padding:10px;">Nenhum equipamento dentro da obra no momento.</td></tr>`
        : equipmentInside.map((eq: any, idx: number) => {
            const last = lastMovementByPlate[eq.plate];
            const lastDate = last ? format(new Date(last.movement_date + "T12:00:00"), "dd/MM/yyyy") : "Sem registro";
            const elapsed = last ? formatElapsed(last.movement_date, last.movement_time) : "-";
            return `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${eq.name}</strong></td>
                <td class="mono">${eq.plate}</td>
                <td>${eq.driver || "-"}</td>
                <td>${lastDate}</td>
                <td>${elapsed}</td>
              </tr>`;
          }).join("");

      const insideHtml = `
        <div class="section">
          <div class="section-title inside">🟢 Equipamentos DENTRO da obra agora (${equipmentInside.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Equipamento</th>
                <th style="width: 90px;">Placa</th>
                <th>Motorista</th>
                <th style="width: 130px;">Última Entrada</th>
                <th style="width: 90px;">Tempo dentro</th>
              </tr>
            </thead>
            <tbody>${insideTableRows}</tbody>
          </table>
        </div>
      `;

      // Status atual: FORA da obra
      const outsideTableRows = equipmentOutside.length === 0
        ? `<tr><td colspan="8" style="text-align:center; color:#666; padding:10px;">Nenhum equipamento fora da obra no momento.</td></tr>`
        : equipmentOutside.map((eq: any, idx: number) => {
            const last = lastMovementByPlate[eq.plate];
            const lastDate = format(new Date(last.movement_date + "T12:00:00"), "dd/MM/yyyy");
            const elapsed = formatElapsed(last.movement_date, last.movement_time);
            const reasonLabel = last.exit_reason ? (EXIT_REASON_LABELS[last.exit_reason] || last.exit_reason) : "-";
            return `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${eq.name}</strong></td>
                <td class="mono">${eq.plate}</td>
                <td>${eq.driver || "-"}</td>
                <td>${lastDate}</td>
                <td>${elapsed}</td>
                <td><span class="badge" style="background: #fef3c7; color: #92400e;">${reasonLabel}</span></td>
                <td>${last.problem_description || last.observation || "-"}</td>
              </tr>`;
          }).join("");

      const outsideHtml = `
        <div class="section">
          <div class="section-title outside">🔴 Equipamentos FORA da obra agora (${equipmentOutside.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Equipamento</th>
                <th style="width: 90px;">Placa</th>
                <th>Motorista</th>
                <th style="width: 130px;">Saída</th>
                <th style="width: 80px;">Tempo fora</th>
                <th>Motivo</th>
                <th>Problema / Obs.</th>
              </tr>
            </thead>
            <tbody>${outsideTableRows}</tbody>
          </table>
        </div>
      `;

      // Build hidden div for rendering
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "800px";
      container.style.background = "#fff";
      container.style.padding = "20px";
      container.style.fontFamily = "Arial, sans-serif";
      container.style.fontSize = "11px";
      container.style.color = "#333";

      container.innerHTML = `
        <style>
          .header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .logo { height: 50px; }
          .title { flex: 1; }
          .title h1 { font-size: 16px; margin-bottom: 4px; }
          .title p { color: #666; font-size: 11px; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e2e8f0; }
          .summary-item { text-align: center; flex: 1; }
          .summary-item .number { font-size: 22px; font-weight: bold; }
          .summary-item .label { font-size: 10px; color: #666; margin-top: 2px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 13px; font-weight: bold; margin-bottom: 10px; padding: 8px; background: #f5f5f5; border-left: 4px solid #333; }
          .section-title.jard { border-left-color: #22c55e; }
          .section-title.inside { border-left-color: #16a34a; background: #f0fdf4; color: #166534; }
          .section-title.outside { border-left-color: #ea580c; background: #fff7ed; color: #9a3412; }
          .date-section { margin-bottom: 15px; }
          .date-header { font-size: 12px; font-weight: bold; padding: 6px 10px; background: #eef2ff; border-left: 4px solid #6366f1; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; }
          .date-stats { font-size: 10px; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; font-size: 10px; }
          th { background: #f9f9f9; font-weight: bold; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; white-space: nowrap; }
          .mono { font-family: monospace; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
        </style>

        <div class="header">
          <img loading="lazy" decoding="async" src="${logoBase64}" alt="Logo" class="logo" />
          <div class="title">
            <h1>Histórico de Movimentações de Equipamentos</h1>
            <p>Período: ${startLabel} a ${endLabel} | Gerado em: ${dateStr}</p>
          </div>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="number" style="color: #16a34a;">${equipmentInside.length}</div>
            <div class="label">Dentro agora</div>
          </div>
          <div class="summary-item">
            <div class="number" style="color: #ea580c;">${equipmentOutside.length}</div>
            <div class="label">Fora agora</div>
          </div>
          <div class="summary-item">
            <div class="number" style="color: #166534;">${totalEntradas}</div>
            <div class="label">Entradas (período)</div>
          </div>
          <div class="summary-item">
            <div class="number" style="color: #c2410c;">${totalSaidas}</div>
            <div class="label">Saídas (período)</div>
          </div>
          <div class="summary-item">
            <div class="number" style="color: #6366f1;">${uniqueEquipments}</div>
            <div class="label">Equip. movim.</div>
          </div>
          <div class="summary-item">
            <div class="number">${sortedDates.length}</div>
            <div class="label">Dias c/ Movim.</div>
          </div>
        </div>

        ${insideHtml}

        ${outsideHtml}

        <div class="section">
          <div class="section-title">🚛 Histórico de Movimentações no período</div>
          ${vehicleSectionsHtml}
        </div>

        ${jardinagemHtml}

        <div class="footer">
          <p>OBRA: 460001269 | Sucena Engenharia</p>
        </div>
      `;

      document.body.appendChild(container);

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 300));

      const html2canvas = await importHtml2Canvas();
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(container);

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      const JsPDF = await importJsPDF();
      const pdf = new JsPDF("p", "mm", "a4");
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `Movimentacoes_${startDate}_a_${endDate}.pdf`;
      const { triggerBlobDownload } = await import("@/lib/pdfDownload");
      triggerBlobDownload(pdf.output("blob"), filename);
      toast.success("PDF gerado com sucesso!");
      setOpen(false);
    } catch (err) {
      console.error("Erro ao exportar:", err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Exportar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            Exportar Histórico de Movimentações
          </DialogTitle>
          <DialogDescription>
            Selecione o período para gerar o relatório completo de entradas e saídas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
