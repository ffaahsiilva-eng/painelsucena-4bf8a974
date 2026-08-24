import { useState } from "react";
import { FileText, Loader2, Download, Printer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Order, OrderStatus, OrderItem, useOrderItems } from "@/hooks/useOrders";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";

interface ExportOrderPdfButtonProps {
  order: Order;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  solicitado: { label: "Solicitado", color: "#EAB308" },
  em_analise: { label: "Em Análise", color: "#F97316" },
  aprovado: { label: "Aprovado", color: "#3B82F6" },
  comprado: { label: "Comprado", color: "#10B981" },
  a_caminho: { label: "A Caminho", color: "#8B5CF6" },
  entregue: { label: "Entregue", color: "#22C55E" },
  pedido_realizado: { label: "Pedido Realizado", color: "#06B6D4" },
  cancelado: { label: "Cancelado", color: "#EF4444" },
  recusado: { label: "Recusado", color: "#DC2626" },
};

const UNIT_LABELS: Record<string, string> = {
  unidade: "Unidade(s)",
  par: "Par(es)",
  pecas: "Peça(s)",
  centimetros: "Centímetros",
  metros: "Metros",
  metro_quadrado: "m²",
  metro_cubico: "m³",
  quilos: "Quilos",
  litros: "Litros",
  galao: "Galão(ões)",
  balde: "Balde(s)",
  pacotes: "Pacotes",
  caixas: "Caixas",
  saco: "Saco(s)",
  rolo: "Rolo(s)",
};

export function ExportOrderPdfButton({ order }: ExportOrderPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: orderItems } = useOrderItems(order.id);

  const generateHtmlContent = async () => {
    const logoBase64 = await getLogoBase64();

    const statusConfig = STATUS_CONFIG[order.status];
    const isCancelled = order.status === "cancelado";
    const hasItems = orderItems && orderItems.length > 0;

      // Generate items table rows
      const generateItemsTable = () => {
        if (!hasItems) {
          // Legacy order - single item
          const unitLabel = UNIT_LABELS[order.quantity_unit] || order.quantity_unit;
          return `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; ${isCancelled ? 'text-decoration: line-through; color: #9ca3af;' : ''}">1</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; ${isCancelled ? 'text-decoration: line-through; color: #9ca3af;' : ''}">
                <strong>${order.product_name}</strong>
                ${order.description ? `<br><span style="font-size: 11px; color: #6b7280;">${order.description}</span>` : ''}
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; ${isCancelled ? 'text-decoration: line-through; color: #9ca3af;' : ''}">
                <strong>${order.quantity}</strong>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; ${isCancelled ? 'text-decoration: line-through; color: #9ca3af;' : ''}">${unitLabel}</td>
            </tr>
          `;
        }

        return orderItems.map((item, index) => {
          const unitLabel = UNIT_LABELS[item.quantity_unit] || item.quantity_unit;
          return `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; ${isCancelled ? 'text-decoration: line-through; color: #9ca3af;' : ''}">${index + 1}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; ${isCancelled ? 'text-decoration: line-through; color: #9ca3af;' : ''}">
                <strong>${item.product_name}</strong>
                ${item.description ? `<br><span style="font-size: 11px; color: #6b7280;">${item.description}</span>` : ''}
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; ${isCancelled ? 'text-decoration: line-through; color: #9ca3af;' : ''}">
                <strong>${item.quantity}</strong>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; ${isCancelled ? 'text-decoration: line-through; color: #9ca3af;' : ''}">${unitLabel}</td>
            </tr>
          `;
        }).join('');
      };

    const totalItems = hasItems ? orderItems.length : 1;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Pedido ${order.order_number}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #333;
              background: white;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
              margin-bottom: 30px;
            }
            .logo {
              max-height: 80px;
              max-width: 200px;
              object-fit: contain;
            }
            .header-info {
              text-align: right;
            }
            .header-info h1 {
              font-size: 24pt;
              color: #1f2937;
              margin-bottom: 5px;
            }
            .order-number {
              font-size: 14pt;
              color: #6b7280;
              font-family: monospace;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 20px;
              color: white;
              font-weight: bold;
              font-size: 11pt;
              background-color: ${statusConfig.color};
              margin-top: 10px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 12pt;
              text-transform: uppercase;
              color: #6b7280;
              letter-spacing: 0.5px;
              margin-bottom: 10px;
              font-weight: 600;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
            }
            .items-table th {
              background: #f9fafb;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              color: #374151;
              border-bottom: 2px solid #e5e7eb;
            }
            .items-table th:nth-child(3) {
              text-align: right;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-top: 20px;
            }
            .info-item {
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
              border-left: 4px solid #3b82f6;
            }
            .info-label {
              font-size: 10pt;
              color: #6b7280;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 13pt;
              color: #1f2937;
              font-weight: 500;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 10pt;
            }
            .notes-box {
              background: #fefce8;
              border: 1px solid #fde047;
              border-radius: 8px;
              padding: 15px;
              margin-top: 20px;
            }
            .notes-title {
              font-weight: bold;
              color: #854d0e;
              margin-bottom: 5px;
            }
            .notes-content {
              color: #713f12;
            }
            .total-items {
              text-align: right;
              padding: 15px;
              background: #eff6ff;
              border: 1px solid #3b82f6;
              border-radius: 8px;
              margin-top: 15px;
            }
            .total-items span {
              font-size: 14pt;
              font-weight: bold;
              color: #1e40af;
            }
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoBase64 ? `<img loading="lazy" decoding="async" src="${logoBase64}" alt="Logo" class="logo" />` : '<div></div>'}
            <div class="header-info">
              <h1>PEDIDO</h1>
              <div class="order-number">#${order.order_number}</div>
              <div class="status-badge">${statusConfig.label}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Itens do Pedido</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th>Produto</th>
                  <th style="width: 100px;">Quantidade</th>
                  <th style="width: 120px;">Unidade</th>
                </tr>
              </thead>
              <tbody>
                ${generateItemsTable()}
              </tbody>
            </table>
            <div class="total-items">
              <span>Total: ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}</span>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Solicitante</div>
              <div class="info-value">${order.requester_name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Data da Solicitação</div>
              <div class="info-value">${format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
            </div>
            ${order.expected_date ? `
              <div class="info-item">
                <div class="info-label">Previsão de Entrega</div>
                <div class="info-value">${format(new Date(`${order.expected_date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}</div>
              </div>
            ` : ''}
            ${(order.mentioned_user_name || order.mentioned_cargo) ? `
              <div class="info-item">
                <div class="info-label">Encaminhado para</div>
                <div class="info-value">${order.mentioned_user_name || formatCargoLabel(order.mentioned_cargo)}</div>
              </div>
            ` : ''}
          </div>

          ${order.notes ? `
            <div class="notes-box">
              <div class="notes-title">Observações</div>
              <div class="notes-content">${order.notes}</div>
            </div>
          ` : ''}

        <div class="footer">
          Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </body>
      </html>
    `;
  };

  const exportToPdf = async () => {
    setIsGenerating(true);
    try {
      const htmlContent = await generateHtmlContent();
      await downloadPdfFromHtml(htmlContent, `Pedido_${order.order_number}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    await exportToPdf();
  };

  const handleDownload = async () => {
    await exportToPdf();
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isGenerating}
              className="gap-1"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Exportar PDF</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" />
          Baixar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}