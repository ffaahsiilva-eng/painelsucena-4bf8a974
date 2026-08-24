import { useState } from "react";
import { FileSpreadsheet, Loader2, CalendarRange } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ExcelJS from "exceljs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const fmtDate = (d: string) =>
  format(new Date(d + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });

const normalizePlate = (plate: string | null | undefined) =>
  (plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const inspectionFields = [
  { key: "laudo_opacidade", label: "Laudo Opacidade" },
  { key: "laudo_mecanico", label: "Laudo Mecânico" },
  { key: "plano_manutencao", label: "Plano Manutenção" },
  { key: "cronografo", label: "Tacógrafo" },
] as const;

type NextInspectionInfo = {
  date: string;
  type: string;
};

export function ExportMovementsHistoryExcelButton() {
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
      const { data: movements, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .gte("movement_date", startDate)
        .lte("movement_date", endDate)
        .order("movement_date", { ascending: true })
        .order("movement_time", { ascending: true });
      if (error) throw error;

      const { data: allEquipment } = await supabase
        .from("equipment")
        .select("*")
        .order("name", { ascending: true });

      const { data: allMovements } = await supabase
        .from("equipment_movements")
        .select("*")
        .order("movement_date", { ascending: true })
        .order("movement_time", { ascending: true });

      const { data: inspections, error: inspectionsError } = await supabase
        .from("vehicle_inspections")
        .select("placa, laudo_opacidade, laudo_mecanico, plano_manutencao, cronografo, updated_at")
        .order("updated_at", { ascending: false });
      if (inspectionsError) throw inspectionsError;

      const nextInspectionByPlate: Record<string, NextInspectionInfo> = {};
      (inspections || []).forEach((vehicleInspection: any) => {
        const plateKey = normalizePlate(vehicleInspection.placa);
        if (!plateKey || nextInspectionByPlate[plateKey]) return;

        const today = new Date().toISOString().slice(0, 10);
        const validInspections = inspectionFields
          .flatMap((field) => {
            const date = vehicleInspection[field.key] as string | null;
            return date && date >= today ? [{ date, type: field.label }] : [];
          })
          .sort((a, b) => a.date.localeCompare(b.date));

        if (validInspections.length === 0) return;

        // Only the earliest date; if multiple types share that date, list them
        const earliestDate = validInspections[0].date;
        const typesOnEarliest = validInspections
          .filter((i) => i.date === earliestDate)
          .map((i) => i.type);

        nextInspectionByPlate[plateKey] = {
          date: fmtDate(earliestDate),
          type: typesOnEarliest.join(" / "),
        };

      });

      const lastMovementByPlate: Record<string, any> = {};
      (allMovements || []).forEach((m: any) => {
        lastMovementByPlate[m.plate] = m;
      });

      const equipmentInside = (allEquipment || []).filter((eq: any) => {
        const last = lastMovementByPlate[eq.plate];
        return !last || last.movement_type === "entrada";
      });
      const equipmentOutside = (allEquipment || []).filter((eq: any) => {
        const last = lastMovementByPlate[eq.plate];
        return last && last.movement_type === "saida";
      });

      // Compute last saída context per entrada within range
      const lastExitByPlate = new Map<string, { reason: string; problem: string | null; date: string }>();
      const entradaCtx = new Map<string, { reason: string; problem: string | null; date: string }>();
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
            entradaCtx.set(m.id, ctx);
            lastExitByPlate.delete(m.plate);
          }
        }
      });

      const platesNeedingPrior = (movements || [])
        .filter((m: any) => m.movement_type === "entrada" && !entradaCtx.has(m.id))
        .map((m: any) => ({ id: m.id, plate: m.plate }));

      if (platesNeedingPrior.length > 0) {
        const uniquePlates = Array.from(new Set(platesNeedingPrior.map((p) => p.plate)));
        const { data: priorExits } = await supabase
          .from("equipment_movements")
          .select("plate, movement_date, exit_reason, problem_description")
          .in("plate", uniquePlates)
          .eq("movement_type", "saida")
          .lt("movement_date", startDate)
          .order("movement_date", { ascending: false });
        const lastPrior = new Map<string, any>();
        (priorExits || []).forEach((e: any) => {
          if (!lastPrior.has(e.plate) && e.exit_reason) lastPrior.set(e.plate, e);
        });
        platesNeedingPrior.forEach(({ id, plate }) => {
          const e = lastPrior.get(plate);
          if (e) {
            entradaCtx.set(id, {
              reason: e.exit_reason,
              problem: e.problem_description ?? null,
              date: e.movement_date,
            });
          }
        });
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sucena Empreendimentos";
      workbook.created = new Date();

      // Logo
      let logoId: number | null = null;
      try {
        const response = await fetch("/logo-sucena-pdf.png");
        if (response.ok) {
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(blob);
          });
          logoId = workbook.addImage({ base64, extension: "png" });
        }
      } catch (e) {
        console.warn("Logo not loaded:", e);
      }

      const startLabel = fmtDate(startDate);
      const endLabel = fmtDate(endDate);

      const addHeader = (ws: ExcelJS.Worksheet, title: string, colSpan: string) => {
        if (logoId !== null) {
          ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 160, height: 45 } });
        }
        ws.addRow([]); ws.addRow([]); ws.addRow([]);
        const titleRow = ws.addRow([title]);
        titleRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
        titleRow.alignment = { horizontal: "center", vertical: "middle" };
        titleRow.height = 26;
        ws.mergeCells(`A${titleRow.number}:${colSpan}${titleRow.number}`);
        titleRow.eachCell((c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
        });
        const periodRow = ws.addRow([`Período: ${startLabel} a ${endLabel}  |  Gerado em: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`]);
        ws.mergeCells(`A${periodRow.number}:${colSpan}${periodRow.number}`);
        periodRow.alignment = { horizontal: "center" };
        periodRow.font = { italic: true, color: { argb: "FF555555" } };
        ws.addRow([]);
      };

      const styleHeaderRow = (row: ExcelJS.Row) => {
        row.font = { bold: true, color: { argb: "FFFFFFFF" } };
        row.alignment = { horizontal: "center", vertical: "middle" };
        row.height = 22;
        row.eachCell((c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
          c.border = {
            top: { style: "thin" }, left: { style: "thin" },
            bottom: { style: "thin" }, right: { style: "thin" },
          };
        });
      };

      const styleDataRow = (row: ExcelJS.Row, zebra: boolean) => {
        row.alignment = { vertical: "middle", wrapText: true };
        row.eachCell((c) => {
          c.border = {
            top: { style: "thin", color: { argb: "FFDDDDDD" } },
            left: { style: "thin", color: { argb: "FFDDDDDD" } },
            bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
            right: { style: "thin", color: { argb: "FFDDDDDD" } },
          };
          if (zebra) {
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F8FB" } };
          }
        });
      };

      // Last saída date per plate from entire history
      const lastSaidaByPlateAll: Record<string, string> = {};
      (allMovements || []).forEach((m: any) => {
        if (m.movement_type === "saida") lastSaidaByPlateAll[m.plate] = m.movement_date;
      });

      // === Single sheet: Movimentações + Sem Alterações ===
      const wsMov = workbook.addWorksheet("Movimentações", {
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      });
      wsMov.columns = [
        { width: 16 }, { width: 12 }, { width: 28 }, { width: 12 },
        { width: 14 }, { width: 14 }, { width: 22 }, { width: 28 }, { width: 30 }, { width: 30 },
      ];
      addHeader(wsMov, "MOVIMENTAÇÕES DE EQUIPAMENTOS", "J");
      const movHeader = wsMov.addRow([
        "Tipo", "Data Movimentação", "Equipamento", "Placa",
        "Última Saída", "Motivo", "Problema", "Próx. Vistoria", "Vistoria a Fazer", "Observação",
      ]);
      styleHeaderRow(movHeader);

      const platesWithMovement = new Set<string>();
      (movements || []).forEach((m: any, idx: number) => {
        platesWithMovement.add(m.plate);
        const isEntrada = m.movement_type === "entrada";
        const ctx = isEntrada ? entradaCtx.get(m.id) : undefined;
        const reasonValue = !isEntrada ? m.exit_reason : ctx?.reason;
        const reasonLabel = reasonValue ? (EXIT_REASON_LABELS[reasonValue] || reasonValue) : "-";
        const problemValue = isEntrada
          ? (m.problem_description || ctx?.problem || "-")
          : (m.problem_description || "-");
        const lastExit = isEntrada ? (ctx ? fmtDate(ctx.date) : "-") : "-";
        const nextInsp = nextInspectionByPlate[normalizePlate(m.plate)];

        const row = wsMov.addRow([
          isEntrada ? "ENTRADA" : "SAÍDA",
          fmtDate(m.movement_date),
          m.equipment_name,
          m.plate,
          lastExit,
          reasonLabel,
          problemValue,
          nextInsp ? nextInsp.date : "-",
          nextInsp?.type || "-",
          m.observation || "-",
        ]);
        styleDataRow(row, idx % 2 === 1);
        const typeCell = row.getCell(1);
        typeCell.font = { bold: true, color: { argb: isEntrada ? "FF166534" : "FFC2410C" } };
        typeCell.alignment = { horizontal: "center", vertical: "middle" };
        const lastExitCell = row.getCell(5);
        lastExitCell.font = { bold: true, color: { argb: "FFC81E1E" } };
        lastExitCell.alignment = { horizontal: "center", vertical: "middle" };
        const nextInspCell = row.getCell(8);
        nextInspCell.font = { bold: true, color: { argb: "FF1D4ED8" } };
        nextInspCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        const nextInspTypeCell = row.getCell(9);
        nextInspTypeCell.font = { bold: true, color: { argb: "FF1D4ED8" } };
        nextInspTypeCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });


      if (!movements || movements.length === 0) {
        const r = wsMov.addRow(["Nenhuma movimentação no período."]);
        wsMov.mergeCells(`A${r.number}:J${r.number}`);
        r.alignment = { horizontal: "center" };
        r.font = { italic: true, color: { argb: "FF888888" } };
      }

      // Sub-section: equipamentos sem alterações no período
      const semAlteracoes = (allEquipment || []).filter(
        (eq: any) => !platesWithMovement.has(eq.plate),
      );

      wsMov.addRow([]);
      const subTitle = wsMov.addRow([
        `EQUIPAMENTOS SEM ALTERAÇÕES NO PERÍODO (${semAlteracoes.length})`,
      ]);
      wsMov.mergeCells(`A${subTitle.number}:J${subTitle.number}`);
      subTitle.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      subTitle.alignment = { horizontal: "center", vertical: "middle" };
      subTitle.height = 24;
      subTitle.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B7280" } };
      });

      const semHeader = wsMov.addRow([
        "Tipo", "Data Últ. Movimentação", "Equipamento", "Placa",
        "Última Saída", "Motivo", "Problema", "Próx. Vistoria", "Vistoria a Fazer", "Observação",
      ]);
      styleHeaderRow(semHeader);

      semAlteracoes.forEach((eq: any, idx: number) => {
        const last = lastMovementByPlate[eq.plate];
        const lastSaida = lastSaidaByPlateAll[eq.plate];
        const nextInsp = nextInspectionByPlate[normalizePlate(eq.plate)];
        const r = wsMov.addRow([
          "SEM ALTERAÇÕES",
          last ? fmtDate(last.movement_date) : "-",
          eq.name,
          eq.plate,
          lastSaida ? fmtDate(lastSaida) : "-",
          "-",
          "-",
          nextInsp ? nextInsp.date : "-",
          nextInsp?.type || "-",
          "Sem alterações no período",
        ]);
        styleDataRow(r, idx % 2 === 1);
        const typeCell = r.getCell(1);
        typeCell.font = { bold: true, italic: true, color: { argb: "FF6B7280" } };
        typeCell.alignment = { horizontal: "center", vertical: "middle" };
        const lastExitCell = r.getCell(5);
        lastExitCell.font = { bold: true, color: { argb: "FFC81E1E" } };
        lastExitCell.alignment = { horizontal: "center", vertical: "middle" };
        const nextInspCell = r.getCell(8);
        nextInspCell.font = { bold: true, color: { argb: "FF1D4ED8" } };
        nextInspCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        const nextInspTypeCell = r.getCell(9);
        nextInspTypeCell.font = { bold: true, color: { argb: "FF1D4ED8" } };
        nextInspTypeCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });



      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Movimentacoes_${startDate}_a_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Excel gerado com sucesso!");
      setOpen(false);
    } catch (err) {
      console.error("Erro ao exportar Excel:", err);
      toast.error("Erro ao gerar Excel");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            Exportar Histórico em Excel
          </DialogTitle>
          <DialogDescription>
            Selecione o período para baixar a planilha completa de entradas e saídas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Gerar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
