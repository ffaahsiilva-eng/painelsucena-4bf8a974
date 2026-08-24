import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";
import sucenaLogo from "@/assets/Sucena.png.asset.json";

interface DailyRecord {
  formattedDate: string;
  vehicleName: string;
  plate: string;
  point: string;
  liters: number;
}

interface RefuelingByPoint {
  point: string;
  count: number;
  liters: number;
}

interface RefuelingByVehicle {
  vehicleName: string;
  count: number;
  liters: number;
}

interface ExportConsumoAbastecimentoPdfButtonProps {
  selectedMonth: number;
  selectedYear: number;
  selectedDay: number | null;
  selectedVehicleName: string;
  dailyRecords: DailyRecord[];
  refuelingByPoint: RefuelingByPoint[];
  refuelingByVehicle: RefuelingByVehicle[];
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function ExportConsumoAbastecimentoPdfButton({
  selectedMonth,
  selectedYear,
  selectedDay,
  selectedVehicleName,
  dailyRecords,
  refuelingByPoint,
  refuelingByVehicle,
}: ExportConsumoAbastecimentoPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    if (dailyRecords.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Fetch logos
      const [sucenaLogoResponse, hydroLogoResponse] = await Promise.all([
        fetch(sucenaLogo.url),
        fetch("/logo-hydro.png").catch(() => null)
      ]);
      
      let sucenaLogoBase64 = "";
      let hydroLogoBase64 = "";
      
      if (sucenaLogoResponse.ok) {
        const blob = await sucenaLogoResponse.blob();
        sucenaLogoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      if (hydroLogoResponse?.ok) {
        const blob = await hydroLogoResponse.blob();
        hydroLogoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      // Build filter description
      let filterDescription = `${MONTH_NAMES[selectedMonth]} de ${selectedYear}`;
      if (selectedDay) {
        filterDescription = `${selectedDay} de ${MONTH_NAMES[selectedMonth]} de ${selectedYear}`;
      }
      if (selectedVehicleName !== "Todos os Veículos") {
        filterDescription += ` - ${selectedVehicleName}`;
      }

      // Calculate totals
      const totalAbastecimentos = dailyRecords.length;
      const totalLitros = dailyRecords.reduce((acc, r) => acc + r.liters, 0);

      // Generate PDF HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Abastecimentos de Água</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: #c4c9cf;
              padding: 10px;
              color: #1a1a2e;
            }
            .container {
              max-width: 1000px;
              margin: 0 auto;
              background: #c4c9cf;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
            }
            .logo {
              height: 45px;
              object-fit: contain;
            }
            .title-box {
              background: #f5a623;
              padding: 10px 30px;
              border-radius: 4px;
            }
            .title-box h1 {
              font-size: 18px;
              font-weight: bold;
              color: #1a1a2e;
              white-space: nowrap;
            }
            .filter-info {
              background: #2d2d44;
              color: white;
              padding: 10px 20px;
              border-radius: 8px;
              margin-bottom: 20px;
              text-align: center;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .summary-card {
              background: #2d2d44;
              border-radius: 8px;
              padding: 15px;
              border: 1px solid #3d3d5c;
            }
            .summary-card h3 {
              color: #9ca3af;
              font-size: 12px;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .summary-card .value {
              color: #22d3ee;
              font-size: 24px;
              font-weight: bold;
            }
            .summary-card .label {
              color: #9ca3af;
              font-size: 11px;
            }
            .section {
              background: #2d2d44;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 20px;
              border: 1px solid #3d3d5c;
            }
            .section-title {
              color: white;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 15px;
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th {
              background: #1a1a2e;
              color: #9ca3af;
              padding: 10px;
              text-align: left;
              font-size: 12px;
              font-weight: 600;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #3d3d5c;
              color: white;
              font-size: 12px;
            }
            td.point {
              color: #22d3ee;
            }
            td.right {
              text-align: right;
            }
            .totals-row {
              background: #1a1a2e;
            }
            .totals-row td {
              font-weight: bold;
              color: #22d3ee;
            }
            .footer {
              background: #f5a623;
              padding: 10px 15px;
              border-radius: 8px 8px 0 0;
              margin-top: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .footer-left {
              color: #1a1a2e;
              font-size: 10px;
            }
            .footer-left div {
              margin-bottom: 3px;
            }
            .footer-center {
              color: #1a1a2e;
              font-size: 10px;
              text-align: center;
            }
            .footer-right {
              color: #1a1a2e;
              font-size: 11px;
              text-align: right;
            }
            .points-summary {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 10px;
            }
            .point-item {
              background: #1a1a2e;
              padding: 10px;
              border-radius: 6px;
              text-align: center;
            }
            .point-item .point-name {
              color: #22d3ee;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .point-item .point-value {
              color: white;
              font-size: 12px;
            }
            @media print {
              body {
                background: white;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .container {
                background: #c4c9cf;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              ${sucenaLogoBase64 ? `<img loading="lazy" decoding="async" src="${sucenaLogoBase64}" class="logo" alt="Sucena" />` : '<div></div>'}
              <div class="title-box">
                <h1>Relatório de Abastecimentos de Água</h1>
              </div>
              ${hydroLogoBase64 ? `<img loading="lazy" decoding="async" src="${hydroLogoBase64}" class="logo" alt="Hydro" />` : '<div></div>'}
            </div>

            <!-- Filter Info -->
            <div class="filter-info">
              <strong>Período:</strong> ${filterDescription}
            </div>

            <!-- Summary Cards -->
            <div class="summary-grid">
              <div class="summary-card">
                <h3>Total Abastecimentos</h3>
                <div class="value">${totalAbastecimentos}</div>
                <div class="label">registros</div>
              </div>
              <div class="summary-card">
                <h3>Volume Total</h3>
                <div class="value">${totalLitros.toLocaleString("pt-BR")}</div>
                <div class="label">litros</div>
              </div>
              <div class="summary-card">
                <h3>Média por Abastecimento</h3>
                <div class="value">${totalAbastecimentos > 0 ? Math.round(totalLitros / totalAbastecimentos).toLocaleString("pt-BR") : 0}</div>
                <div class="label">litros</div>
              </div>
            </div>

            <!-- Points Summary -->
            ${refuelingByPoint.length > 0 ? `
            <div class="section">
              <div class="section-title">Abastecimentos por Ponto de Captação</div>
              <div class="points-summary">
                ${refuelingByPoint.map(p => `
                  <div class="point-item">
                    <div class="point-name">${p.point}</div>
                    <div class="point-value">${p.count} abast. - ${p.liters.toLocaleString("pt-BR")} L</div>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}

            <!-- Vehicle Summary -->
            ${refuelingByVehicle.length > 0 ? `
            <div class="section">
              <div class="section-title">Consumo por Veículo</div>
              <table>
                <thead>
                  <tr>
                    <th>Veículo</th>
                    <th class="right">Abastecimentos</th>
                    <th class="right">Volume (L)</th>
                  </tr>
                </thead>
                <tbody>
                  ${refuelingByVehicle.map(v => `
                    <tr>
                      <td>${v.vehicleName}</td>
                      <td class="right">${v.count}</td>
                      <td class="right">${v.liters.toLocaleString("pt-BR")}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

            <!-- Daily Records Table -->
            <div class="section">
              <div class="section-title">Detalhamento por Dia</div>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Veículo</th>
                    <th>Placa</th>
                    <th>Ponto</th>
                    <th class="right">Litros</th>
                  </tr>
                </thead>
                <tbody>
                  ${dailyRecords.map(record => `
                    <tr>
                      <td>${record.formattedDate}</td>
                      <td>${record.vehicleName}</td>
                      <td>${record.plate}</td>
                      <td class="point">${record.point}</td>
                      <td class="right">${record.liters.toLocaleString("pt-BR")} L</td>
                    </tr>
                  `).join('')}
                  <tr class="totals-row">
                    <td colspan="4"><strong>TOTAL</strong></td>
                    <td class="right">${totalLitros.toLocaleString("pt-BR")} L</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-left">
                <div>📷 sucenaempreendimentos</div>
                <div>🔗 sucenaempreendimentos.com.br</div>
              </div>
              <div class="footer-center">
                Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div class="footer-right">
                <div>📧 contato@sucenaempreendimentos.com.br</div>
                <div>📍 Brasil</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await downloadPdfFromHtml(html, `consumo-abastecimento-${new Date().toISOString().slice(0,10)}.pdf`);

      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isGenerating}
      variant="outline"
      size="icon"
      className="bg-[#2d2d44] border-[#3d3d5c] text-white hover:bg-[#3d3d5c]"
      title="Exportar PDF"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
    </Button>
  );
}
