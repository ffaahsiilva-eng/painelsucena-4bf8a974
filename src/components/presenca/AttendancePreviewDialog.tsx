import { useState } from "react";
import { Eye, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface EmployeeRow {
  nome: string;
  funcao?: string | null;
  attendanceStatus: "present" | "absent";
}

interface Props {
  employees: EmployeeRow[];
  date: string; // YYYY-MM-DD
}

const toTitleCase = (name: string) =>
  name
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");

export const AttendancePreviewDialog = ({ employees, date }: Props) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const dateObj = new Date(`${date}T00:00:00`);
  const dateLabel = dateObj.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const presentes = employees.filter((e) => e.attendanceStatus === "present");
  const ausentes = employees.filter((e) => e.attendanceStatus === "absent");

  const lines: string[] = [];
  lines.push(`📋 LISTA DE PRESENÇA`);
  lines.push(`📅 ${dateLabel}`);
  lines.push("");
  lines.push(`✅ Presentes: ${presentes.length}`);
  lines.push(`❌ Ausentes: ${ausentes.length}`);
  lines.push(`👥 Total: ${employees.length}`);
  lines.push("");
  lines.push("───────────────────────────");
  lines.push("");

  employees.forEach((e) => {
    const mark = e.attendanceStatus === "present" ? "✅" : "❌";
    lines.push(`${mark} ${toTitleCase(e.nome)}`);
  });

  if (ausentes.length > 0) {
    lines.push("");
    lines.push("───────────────────────────");
    lines.push("");
    lines.push(`❌ AUSENTES (${ausentes.length}):`);
    ausentes.forEach((e) => {
      lines.push(`   • ${toTitleCase(e.nome)}`);
    });
  }

  const text = lines.join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Relatório copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="w-4 h-4" />
          Pré-visualizar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pré-visualização do Relatório</DialogTitle>
          <DialogDescription>
            Marcação automática: ✅ presentes / ❌ ausentes
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] rounded-md border bg-muted/30 p-4">
          <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
            {text}
          </pre>
        </ScrollArea>

        <div className="flex justify-end">
          <Button onClick={handleCopy} className="gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar texto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
