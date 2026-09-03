import { Truck, CheckCircle2, AlertCircle, Info, FileDown, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEquipment } from "@/hooks/useEquipment";
import { useJardinagemEquipment } from "@/hooks/useJardinagemEquipment";
import { useEquipmentCurrentlyOut } from "@/hooks/useEquipmentMovements";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getLogoBase64, generatePdfHeader, PDF_HEADER_STYLES } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";

const StatusGeralEquipamentos = () => {
  const { data: equipment = [], isLoading: loadingEq } = useEquipment();
  const { data: jardinagemEquipment = [], isLoading: loadingJardinagem } = useJardinagemEquipment();
  const { data: equipmentOut = [], isLoading: loadingOut } = useEquipmentCurrentlyOut();

  const isLoading = loadingEq || loadingJardinagem || loadingOut;

  // Map to store movement reason for regular equipment
  const movementReasonMap: Record<string, { reason: string; obs: string | null; exit_reason: string | null }> = {};
  equipmentOut.forEach((m) => {
    const reasonLabels: Record<string, string> = {
      manutencao_corretiva: "Manutenção Corretiva",
      manutencao_preventiva: "Manutenção Preventiva",
      vistoria: "Vistoria",
      operando: "Operando",
      aguardando_frente_servico: "Aguardando Frente de Serviço",
      fim_turno: "Fim de Turno",
    };
    movementReasonMap[m.plate] = {
      reason: reasonLabels[m.exit_reason || ""] || "Saída Registrada",
      obs: m.observation,
      exit_reason: m.exit_reason
    };
  });

  // Combine lists
  const combinedEquipment = [
    ...equipment.map((eq) => {
      const mov = movementReasonMap[eq.plate];
      const isActuallyOut = mov && 
                   !["fim_turno", "operando", "aguardando_frente_servico"].includes(mov.exit_reason || "");
      
      return {
        id: eq.id,
        name: eq.name,
        type: eq.equipment_type,
        status: isActuallyOut ? "Fora" : "Ativo",
        reason: isActuallyOut ? mov.reason : "No Canteiro",
        category: "Frota Pesada",
        plate: eq.plate,
        image_url: (eq as any).image_url ?? null,
      };
    }),
    ...jardinagemEquipment.map((eq) => ({
      id: eq.id,
      name: eq.name,
      type: "jardinagem",
      status: eq.status === "entrou" ? "Ativo" : "Fora",
      reason: eq.status === "entrou" ? "No Canteiro" : "Trabalho Externo / Saída",
      category: "Jardinagem",
      plate: "-"
    }))
  ];

  const handleExportPDF = async () => {
    try {
      const logo = await getLogoBase64();
      const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      
      const stats = {
        ativos: combinedEquipment.filter(e => e.status === "Ativo").length,
        fora: combinedEquipment.filter(e => e.status === "Fora").length,
        frota: combinedEquipment.filter(e => e.category === "Frota Pesada").length,
        jardinagem: combinedEquipment.filter(e => e.category === "Jardinagem").length,
      };

      const rows = combinedEquipment.map(eq => `
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">
            <div style="font-weight: bold; font-size: 11px;">${eq.name}</div>
            <div style="font-size: 9px; color: #6b7280; font-family: monospace;">${eq.plate !== "-" ? `PLACA: ${eq.plate}` : ""}</div>
          </td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 10px; text-align: center;">${eq.category}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">
            <span style="padding: 2px 8px; border-radius: 9999px; font-size: 9px; font-weight: bold; background: ${eq.status === 'Ativo' ? '#d1fae5' : '#ffedd5'}; color: ${eq.status === 'Ativo' ? '#065f46' : '#9a3412'};">
              ${eq.status === 'Ativo' ? 'ATIVO' : 'FORA'}
            </span>
          </td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 10px; color: #4b5563; font-style: italic;">${eq.reason}</td>
        </tr>
      `).join("");

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              ${PDF_HEADER_STYLES}
              body { font-family: Arial, sans-serif; padding: 20px; color: #1f2937; }
              .summary {
                display: flex; gap: 10px; margin-bottom: 20px;
              }
              .summary-box {
                flex: 1; padding: 12px; border: 1px solid #e5e7eb; border-radius: 12px;
                background: #f9fafb; text-align: center;
              }
              .summary-label { font-size: 9px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
              .summary-value { font-size: 18px; font-weight: bold; color: #111827; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background: #f3f4f6; padding: 10px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px; text-transform: uppercase; }
              .footer { margin-top: 30px; font-size: 10px; color: #9ca3af; text-align: center; }
            </style>
          </head>
          <body>
            ${generatePdfHeader("Status Geral de Equipamentos", today, logo)}
            <div class="summary">
              <div class="summary-box">
                <div class="summary-label">Ativos</div>
                <div class="summary-value">${stats.ativos}</div>
              </div>
              <div class="summary-box">
                <div class="summary-label">Fora/Parados</div>
                <div class="summary-value">${stats.fora}</div>
              </div>
              <div class="summary-box">
                <div class="summary-label">Frota Pesada</div>
                <div class="summary-value">${stats.frota}</div>
              </div>
              <div class="summary-box">
                <div class="summary-label">Jardinagem</div>
                <div class="summary-value">${stats.jardinagem}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th style="text-align: center;">Categoria</th>
                  <th style="text-align: center;">Status</th>
                  <th>Motivo / Local</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="footer">Sucena • Gerado em ${today}</div>
          </body>
        </html>
      `;

      await downloadPdfFromHtml(html, `status-geral-equipamentos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="p-2 hover:bg-muted rounded-full transition-colors">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Truck className="h-7 w-7 text-primary" />
                Status Geral de Equipamentos
              </h1>
              <p className="text-muted-foreground">Visão consolidada de toda a frota e equipamentos de jardinagem</p>
            </div>
          </div>
          <Button onClick={handleExportPDF} className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
            <FileDown className="h-4 w-4" />
            Gerar PDF
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 flex flex-col items-center shadow-sm">
                <CheckCircle2 className="h-6 w-6 text-green-600 mb-2" />
                <p className="text-xs text-green-600 font-bold uppercase tracking-widest">Ativos</p>
                <p className="text-4xl font-black text-green-700 mt-1">
                  {combinedEquipment.filter(e => e.status === "Ativo").length}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex flex-col items-center shadow-sm">
                <AlertCircle className="h-6 w-6 text-orange-600 mb-2" />
                <p className="text-xs text-orange-600 font-bold uppercase tracking-widest">Fora / Parados</p>
                <p className="text-4xl font-black text-orange-700 mt-1">
                  {combinedEquipment.filter(e => e.status === "Fora").length}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center shadow-sm">
                <Truck className="h-6 w-6 text-primary mb-2" />
                <p className="text-xs text-primary font-bold uppercase tracking-widest">Frota Pesada</p>
                <p className="text-4xl font-black text-primary mt-1">
                  {combinedEquipment.filter(e => e.category === "Frota Pesada").length}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col items-center shadow-sm">
                <Info className="h-6 w-6 text-purple-600 mb-2" />
                <p className="text-xs text-purple-600 font-bold uppercase tracking-widest">Jardinagem</p>
                <p className="text-4xl font-black text-purple-700 mt-1">
                  {combinedEquipment.filter(e => e.category === "Jardinagem").length}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-md">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-16"></TableHead>
                      <TableHead className="font-bold text-foreground">Equipamento</TableHead>
                      <TableHead className="hidden sm:table-cell font-bold text-foreground">Categoria</TableHead>
                      <TableHead className="font-bold text-foreground text-center">Status</TableHead>
                      <TableHead className="font-bold text-foreground">Motivo / Local</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combinedEquipment.map((eq) => (
                      <TableRow key={eq.id} className="hover:bg-muted/30 border-border/50 transition-colors">
                        <TableCell className="py-5">
                          {eq.category === "Frota Pesada" ? (
                            <div className="p-2 rounded-xl bg-primary/5 flex items-center justify-center">
                              <VehicleIcon
                                type={eq.type as any}
                                size="md"
                                imageUrl={(eq as any).image_url}
                              />
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                              <Info className="h-5 w-5" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-base">{eq.name}</span>
                            {eq.plate !== "-" && (
                              <span className="text-[12px] font-mono font-medium text-muted-foreground mt-1 px-1.5 py-0.5 bg-muted/50 rounded w-fit">
                                PLACA: {eq.plate}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell py-5">
                          <Badge variant="outline" className="text-[11px] font-bold border-border/60 bg-muted/40 px-2 py-0.5">
                            {eq.category.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-5 text-center">
                          <Badge
                            className={eq.status === "Ativo" 
                              ? "bg-green-500 hover:bg-green-600 text-white border-none shadow-sm px-4 py-1 font-bold" 
                              : "bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm px-4 py-1 font-bold"}
                          >
                            {eq.status === "Ativo" ? "ATIVO" : "FORA"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-5 text-sm font-medium text-muted-foreground italic">
                          {eq.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StatusGeralEquipamentos;