import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownCircle, ArrowUpCircle, Clock, Download, History, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EquipmentMovement } from "@/hooks/useEquipmentMovements";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";
import { toast } from "sonner";

const EXIT_REASON_LABELS: Record<string, string> = {
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  operando: "Operando",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  fim_turno: "Fim de Turno",
};

interface Props {
  equipmentName: string;
  plate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function getDriverName(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.full_name || "Não identificado";
}

function generateMovementPdfHtml(
  m: EquipmentMovement,
  equipmentName: string,
  plate: string,
  driverName: string,
  logoBase64: string
): string {
  const dateFormatted = format(new Date(m.movement_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
  const isEntrada = m.movement_type === "entrada";
  const typeLabel = isEntrada ? "ENTRADA" : "SAÍDA";
  const typeColor = isEntrada ? "#16a34a" : "#dc2626";

  const reasonRow = !isEntrada && m.exit_reason
    ? `<tr><td class="label">Motivo da Saída</td><td>${EXIT_REASON_LABELS[m.exit_reason] || m.exit_reason}</td></tr>`
    : "";
  const descRow = m.problem_description
    ? `<tr><td class="label">Descrição do Problema</td><td>${m.problem_description}</td></tr>`
    : "";
  const obsRow = m.observation
    ? `<tr><td class="label">Observação</td><td>${m.observation}</td></tr>`
    : "";

  return `
    <html><head><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; padding: 30px; }
      .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #e5e7eb; padding-bottom: 18px; margin-bottom: 24px; }
      .header .logo { max-height: 60px; max-width: 160px; object-fit: contain; }
      .header-center { text-align: center; flex: 1; }
      .header-center h1 { font-size: 18px; color: #1f2937; margin-bottom: 4px; }
      .header-center p { font-size: 11px; color: #666; }
      .type-badge { display: inline-block; padding: 6px 18px; border-radius: 6px; font-weight: bold; font-size: 16px; color: white; background: ${typeColor}; margin-bottom: 20px; }
      table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      table.info td { padding: 10px 14px; border: 1px solid #d1d5db; font-size: 13px; vertical-align: top; }
      table.info td.label { background: #f3f4f6; font-weight: 600; width: 200px; color: #374151; }
      .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    </style></head><body>
      <div class="header">
        ${logoBase64 ? `<img loading="lazy" decoding="async" src="${logoBase64}" alt="Logo Sucena" class="logo" />` : "<div></div>"}
        <div class="header-center">
          <h1>Registro de Movimentação de Equipamento</h1>
          <p>Entrada e Saída de Equipamentos</p>
        </div>
        <div style="width:160px"></div>
      </div>

      <div style="text-align:center; margin-bottom: 20px;">
        <span class="type-badge">${typeLabel}</span>
      </div>

      <table class="info">
        <tr><td class="label">Equipamento</td><td>${equipmentName}</td></tr>
        <tr><td class="label">Placa</td><td>${plate}</td></tr>
        <tr><td class="label">Motorista / Registrado por</td><td>${driverName}</td></tr>
        <tr><td class="label">Data</td><td>${dateFormatted}</td></tr>
        <tr><td class="label">Horário</td><td>${m.movement_time}</td></tr>
        <tr><td class="label">Tipo de Movimento</td><td style="color:${typeColor}; font-weight:bold;">${isEntrada ? "Entrada" : "Saída"}</td></tr>
        ${reasonRow}
        ${descRow}
        ${obsRow}
      </table>

      <div class="footer">
        Documento gerado automaticamente em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — Sucena Engenharia
      </div>
    </body></html>
  `;
}

export function EquipmentMovementHistoryDialog({ equipmentName, plate, open, onOpenChange }: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["equipment-movements-by-plate", plate],
    queryFn: async (): Promise<EquipmentMovement[]> => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .eq("plate", plate)
        .order("movement_date", { ascending: false })
        .order("movement_time", { ascending: false });

      if (error) throw error;
      return (data || []) as EquipmentMovement[];
    },
    enabled: open,
    staleTime: 0,
  });

  const handleDownloadPdf = async (m: EquipmentMovement) => {
    setDownloadingId(m.id);
    try {
      const [logoBase64, driverName] = await Promise.all([
        getLogoBase64(),
        getDriverName(m.created_by),
      ]);

      const html = generateMovementPdfHtml(m, equipmentName, plate, driverName, logoBase64);
      const dateStr = m.movement_date.replace(/-/g, "");
      const typeStr = m.movement_type === "entrada" ? "Entrada" : "Saida";
      const filename = `Movimentacao_${typeStr}_${equipmentName.replace(/\s+/g, "_")}_${dateStr}.pdf`;

      await downloadPdfFromHtml(html, filename);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Movimentações
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 p-3 rounded-lg mb-4">
          <p className="font-medium">{equipmentName}</p>
          <p className="text-sm text-muted-foreground">Placa: <span className="font-semibold font-mono">{plate}</span></p>
          <p className="text-sm text-muted-foreground">Total de registros: <span className="font-semibold">{movements.length}</span></p>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : movements.length > 0 ? (
            <div className="space-y-3">
              {movements.map((m) => (
                <div key={m.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {m.movement_type === "entrada" ? (
                        <ArrowDownCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Badge
                        variant="outline"
                        className={
                          m.movement_type === "entrada"
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : "bg-red-500/10 text-red-600 border-red-500/30"
                        }
                      >
                        {m.movement_type === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(m.movement_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        {" "}
                        {m.movement_time}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDownloadPdf(m)}
                        disabled={downloadingId === m.id}
                        title="Baixar PDF"
                      >
                        {downloadingId === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {m.movement_type === "saida" && m.exit_reason && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Motivo:</span>{" "}
                      <span className="font-medium">{EXIT_REASON_LABELS[m.exit_reason] || m.exit_reason}</span>
                    </p>
                  )}

                  {m.problem_description && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Descrição:</span>{" "}
                      {m.problem_description}
                    </p>
                  )}

                  {m.observation && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Observação:</span>{" "}
                      {m.observation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
