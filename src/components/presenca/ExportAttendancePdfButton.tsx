import { useState, useMemo } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { toast } from "sonner";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import jsPDF from "jspdf";
import type { Colaborador } from "@/data/efetivoData";
import type { Tables } from "@/integrations/supabase/types";

type AttendanceWithEmployee = Tables<"attendance_records"> & {
  employees: Tables<"employees"> | null;
};

// Get the measurement cycle dates (21 of month to 20 of next month)
const getMeasurementCycleDates = (referenceDate: Date) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  let startDate: Date;
  let endDate: Date;

  if (day >= 21) {
    // Current cycle: 21 of current month to 20 of next month
    startDate = new Date(year, month, 21);
    endDate = new Date(year, month + 1, 20);
  } else {
    // Previous cycle: 21 of previous month to 20 of current month
    startDate = new Date(year, month - 1, 21);
    endDate = new Date(year, month, 20);
  }

  return { startDate, endDate };
};

const formatDateBR = (d: Date) => {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateISO = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTitleCase = (name: string) =>
  name.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export const ExportAttendancePdfButton = () => {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Default to current measurement cycle
  const today = new Date();
  const defaultCycle = getMeasurementCycleDates(today);
  const [startDate, setStartDate] = useState(formatDateISO(defaultCycle.startDate));
  const [endDate, setEndDate] = useState(formatDateISO(defaultCycle.endDate));

  const { data: rhData } = useRHEfetivo();

  // Fetch all attendance records in date range
  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance_pdf_range", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, employees (*)")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date");

      if (error) throw error;
      return data as AttendanceWithEmployee[];
    },
    enabled: open && !!startDate && !!endDate,
  });

  const rhColaboradores = useMemo(() => {
    if (!rhData?.colaboradores?.length) return [];
    const deletedIds = rhData.deletedIds || [];
    return rhData.colaboradores
      .filter(c => !deletedIds.includes(c.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rhData]);

  // Generate all dates in range
  const allDates = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    const current = new Date(start);
    while (current <= end) {
      dates.push(formatDateISO(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  // Build attendance lookup: employeeName -> date -> status
  const attendanceLookup = useMemo(() => {
    const lookup = new Map<string, Map<string, "present" | "absent">>();
    records?.forEach((r) => {
      if (r.employees) {
        const name = r.employees.name.toUpperCase().trim();
        if (!lookup.has(name)) lookup.set(name, new Map());
        const status = r.status === "present" || r.status === "late" ? "present" : "absent";
        lookup.get(name)!.set(r.date, status);
      }
    });
    return lookup;
  }, [records]);

  const generatePdf = async () => {
    if (!rhColaboradores.length) {
      toast.error("Nenhum colaborador encontrado no RH");
      return;
    }

    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 8;

      // Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório de Presença Mensal", pageWidth / 2, 12, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const startBR = formatDateBR(new Date(startDate + "T00:00:00"));
      const endBR = formatDateBR(new Date(endDate + "T00:00:00"));
      doc.text(`Período: ${startBR} a ${endBR}`, pageWidth / 2, 18, { align: "center" });

      // Table setup
      const nameColWidth = 50;
      const matriculaColWidth = 18;
      const funcaoColWidth = 32;
      const totalColWidth = 12;
      const availableWidth = pageWidth - margin * 2 - nameColWidth - matriculaColWidth - funcaoColWidth - totalColWidth;
      const dayColWidth = Math.min(availableWidth / allDates.length, 8);
      const headerY = 24;
      const rowHeight = 5.5;
      const fontSize = 5.5;

      // Calculate how many dates fit per page
      const maxDatesPerPage = Math.floor(availableWidth / dayColWidth);
      const dateChunks: string[][] = [];
      for (let i = 0; i < allDates.length; i += maxDatesPerPage) {
        dateChunks.push(allDates.slice(i, i + maxDatesPerPage));
      }

      // Calculate how many employees fit per page
      const maxRowsPerPage = Math.floor((pageHeight - headerY - 15) / rowHeight);

      // Split employees into page groups
      const employeeChunks: Colaborador[][] = [];
      for (let i = 0; i < rhColaboradores.length; i += maxRowsPerPage) {
        employeeChunks.push(rhColaboradores.slice(i, i + maxRowsPerPage));
      }

      let isFirstPage = true;

      for (const dateChunk of dateChunks) {
        for (const empChunk of employeeChunks) {
          if (!isFirstPage) doc.addPage();
          isFirstPage = false;

          let y = headerY;

          // Column headers
          doc.setFontSize(fontSize);
          doc.setFont("helvetica", "bold");
          doc.setFillColor(34, 139, 34);
          doc.rect(margin, y, pageWidth - margin * 2, rowHeight + 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.text("Funcionário", margin + 2, y + rowHeight - 1);
          doc.text("Matrícula", margin + nameColWidth + 1, y + rowHeight - 1);
          doc.text("Função", margin + nameColWidth + matriculaColWidth + 1, y + rowHeight - 1);

          let xDate = margin + nameColWidth + matriculaColWidth + funcaoColWidth;
          dateChunk.forEach((d) => {
            const dayNum = d.split("-")[2];
            doc.text(dayNum, xDate + dayColWidth / 2, y + rowHeight - 1, { align: "center" });
            xDate += dayColWidth;
          });
          doc.text("Total", xDate + 1, y + rowHeight - 1);
          doc.setTextColor(0, 0, 0);
          y += rowHeight + 1;

          // Rows
          doc.setFont("helvetica", "normal");
          empChunk.forEach((colab, idx) => {
            const isEven = idx % 2 === 0;
            if (isEven) {
              doc.setFillColor(245, 245, 245);
              doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
            }

            // Name
            doc.setFontSize(fontSize);
            const displayName = toTitleCase(colab.nome);
            doc.text(displayName.substring(0, 30), margin + 2, y + rowHeight - 1.5);

            // Matrícula
            const matricula = colab.matricula || "-";
            doc.text(matricula, margin + nameColWidth + 1, y + rowHeight - 1.5);

            // Function
            const funcao = toTitleCase(colab.funcao || "-");
            doc.text(funcao.substring(0, 15), margin + nameColWidth + matriculaColWidth + 1, y + rowHeight - 1.5);

            // Days
            const empName = colab.nome.toUpperCase().trim();
            const empAttendance = attendanceLookup.get(empName);
            let absentCount = 0;

            xDate = margin + nameColWidth + matriculaColWidth + funcaoColWidth;
            const squarePadding = 0.8;
            const squareSize = Math.min(dayColWidth - squarePadding * 2, rowHeight - squarePadding * 2);
            dateChunk.forEach((d) => {
              const status = empAttendance?.get(d);
              const sqX = xDate + (dayColWidth - squareSize) / 2;
              const sqY = y + (rowHeight - squareSize) / 2;
              
              if (!status) {
                doc.setDrawColor(200, 200, 200);
                doc.rect(sqX, sqY, squareSize, squareSize, "S");
              } else if (status === "present") {
                doc.setFillColor(34, 139, 34);
                doc.rect(sqX, sqY, squareSize, squareSize, "F");
              } else {
                absentCount++;
                doc.setFillColor(220, 38, 38);
                doc.rect(sqX, sqY, squareSize, squareSize, "F");
              }
              xDate += dayColWidth;
            });

            // Total absent
            doc.setFont("helvetica", "bold");
            doc.setTextColor(220, 38, 38);
            doc.text(String(absentCount), xDate + totalColWidth / 2, y + rowHeight - 1.5, { align: "center" });
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
            doc.setFont("helvetica", "normal");

            y += rowHeight;
          });

          // Border
          doc.setDrawColor(200, 200, 200);
          doc.rect(margin, headerY, pageWidth - margin * 2, y - headerY);
        }
      }

      // Footer on each page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Gerado em ${new Date().toLocaleDateString("pt-BR")} - Página ${i}/${totalPages}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: "center" }
        );
      }

      doc.save(`presenca_${startDate}_a_${endDate}.pdf`);
      toast.success("PDF gerado com sucesso!");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          Relatório PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Relatório de Presença Mensal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            O ciclo mensal vai do dia 21 ao dia 20 do mês seguinte.
          </p>
          <div className="grid grid-cols-2 gap-4">
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
          <div className="text-xs text-muted-foreground">
            {allDates.length} dias no período selecionado • {rhColaboradores.length} colaboradores
          </div>
          <Button
            onClick={generatePdf}
            disabled={generating || isLoading || !rhColaboradores.length}
            className="w-full gap-2"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {generating ? "Gerando..." : "Gerar PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
