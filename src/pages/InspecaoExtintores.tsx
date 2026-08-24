import { useState, useRef } from "react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileDown, Plus, Trash2, FlameKindling } from "lucide-react";
import { getLogoBase64, PDF_HEADER_STYLES } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";

type InspectionValue = "C" | "NC" | "NA" | "NV" | "";

interface ExtinguisherRow {
  id: number;
  localizacao: string;
  tipoCapacidade: string;
  nTag: string;
  nFabricacao: string;
  proxRecarga: string;
  proxTeste: string;
  usado: InspectionValue;
  naoEncontrado: InspectionValue;
  localNaoAcessado: InspectionValue;
  obstrucao: InspectionValue;
  suporte: InspectionValue;
  etiquetaSubstituida: InspectionValue;
  sinalizacaoVertical: InspectionValue;
  sinalizacaoHorizontal: InspectionValue;
  seloInmetro: InspectionValue;
  rotulo: InspectionValue;
  lacre: InspectionValue;
  mangote: InspectionValue;
  pressurizacao: InspectionValue;
  difusor: InspectionValue;
  punho: InspectionValue;
  pesoVazio: string;
  pesoCheio: string;
  pesagem: string;
}

interface ActionPlanRow {
  id: number;
  naoConformidade: string;
  acao: string;
  quem: string;
  quando: string;
  responsavel: string;
  status: string;
}

const defaultRow = (num: number): ExtinguisherRow => ({
  id: num,
  localizacao: "",
  tipoCapacidade: "ABC 06KG",
  nTag: String(num),
  nFabricacao: "",
  proxRecarga: "",
  proxTeste: "",
  usado: "C",
  naoEncontrado: "C",
  localNaoAcessado: "C",
  obstrucao: "C",
  suporte: "C",
  etiquetaSubstituida: "C",
  sinalizacaoVertical: "NA",
  sinalizacaoHorizontal: "NA",
  seloInmetro: "C",
  rotulo: "C",
  lacre: "C",
  mangote: "C",
  pressurizacao: "C",
  difusor: "NA",
  punho: "NA",
  pesoVazio: "",
  pesoCheio: "",
  pesagem: "",
});

const INSPECTION_FIELDS: { key: keyof ExtinguisherRow; label: string }[] = [
  { key: "usado", label: "Usado/Não Comunicado" },
  { key: "naoEncontrado", label: "Não Encontrado" },
  { key: "localNaoAcessado", label: "Local Não Acessado" },
  { key: "obstrucao", label: "Obstrução" },
  { key: "suporte", label: "Suporte" },
  { key: "etiquetaSubstituida", label: "Etiqueta Substituída" },
  { key: "sinalizacaoVertical", label: "Sinal. Vertical" },
  { key: "sinalizacaoHorizontal", label: "Sinal. Horizontal" },
  { key: "seloInmetro", label: "Selo INMETRO" },
  { key: "rotulo", label: "Rótulo" },
  { key: "lacre", label: "Lacre" },
  { key: "mangote", label: "Mangote" },
  { key: "pressurizacao", label: "Pressurização" },
  { key: "difusor", label: "Difusor" },
  { key: "punho", label: "Punho" },
];

const OPTIONS: InspectionValue[] = ["C", "NC", "NA", "NV"];

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function InspecaoExtintores() {
  const [numero, setNumero] = useState("01");
  const [area, setArea] = useState("DRS1");
  const [mes, setMes] = useState(meses[new Date().getMonth()]);
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [tipoPrincipal, setTipoPrincipal] = useState("CO2");
  const [inspecionador, setInspecionador] = useState("");
  const [engSeguranca, setEngSeguranca] = useState("");

  const [rows, setRows] = useState<ExtinguisherRow[]>([
    { ...defaultRow(1), localizacao: "Canteiro", nFabricacao: "04571", proxRecarga: "Oct-25", proxTeste: "Oct-27" },
    { ...defaultRow(2), localizacao: "Frente de serviço - Gabião", nFabricacao: "20290", proxRecarga: "Oct-25", proxTeste: "Oct-29" },
    { ...defaultRow(3), localizacao: "Frente de serviço - Jardinagem", nFabricacao: "39605", proxRecarga: "Oct-25", proxTeste: "Oct-29" },
    { ...defaultRow(4), localizacao: "Gerador de Energia", nFabricacao: "01246", proxRecarga: "Jul-25", proxTeste: "Jul-27" },
    { ...defaultRow(5), localizacao: "Onibus", nFabricacao: "20290", proxRecarga: "Jul-25", proxTeste: "Jul-27" },
    { ...defaultRow(6), localizacao: "", tipoCapacidade: "ABC 04KG", nFabricacao: "07861", proxRecarga: "Jul-25", proxTeste: "Jul-25" },
  ]);

  const [actionPlan, setActionPlan] = useState<ActionPlanRow[]>([]);

  const updateRow = (idx: number, field: keyof ExtinguisherRow, value: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    setRows(prev => [...prev, defaultRow(prev.length + 1)]);
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const addActionRow = () => {
    setActionPlan(prev => [...prev, { id: prev.length + 1, naoConformidade: "", acao: "", quem: "", quando: "", responsavel: "", status: "" }]);
  };

  const updateActionRow = (idx: number, field: keyof ActionPlanRow, value: string) => {
    setActionPlan(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeActionRow = (idx: number) => {
    setActionPlan(prev => prev.filter((_, i) => i !== idx));
  };

  const generatePdf = async () => {
    try {
      const logoBase64 = await getLogoBase64();

      const inspCols = INSPECTION_FIELDS.map(f => `<th class="insp-th">${f.label}</th>`).join("");

      const tableRows = rows.map((r, i) => {
        const inspCells = INSPECTION_FIELDS.map(f => {
          const val = r[f.key] as string;
          const cls = val === "NC" ? "nc-cell" : val === "C" ? "c-cell" : "";
          return `<td class="insp-td ${cls}">${val}</td>`;
        }).join("");
        return `<tr>
          <td class="td">${i + 1}</td>
          <td class="td">${r.localizacao}</td>
          <td class="td">${r.tipoCapacidade}</td>
          <td class="td">${r.nTag}</td>
          <td class="td">${r.nFabricacao}</td>
          <td class="td">${r.proxRecarga}</td>
          <td class="td">${r.proxTeste}</td>
          ${inspCells}
          <td class="td">${r.pesoVazio}</td>
          <td class="td">${r.pesoCheio}</td>
          <td class="td">${r.pesagem}</td>
        </tr>`;
      }).join("");

      const actionRows = actionPlan.length > 0
        ? actionPlan.map(a => `<tr>
            <td class="td">${a.id}</td>
            <td class="td">${a.naoConformidade}</td>
            <td class="td">${a.acao}</td>
            <td class="td">${a.quem}</td>
            <td class="td">${a.quando}</td>
            <td class="td">${a.responsavel}</td>
            <td class="td">${a.status}</td>
          </tr>`).join("")
        : '<tr><td class="td" colspan="7" style="text-align:center;color:#999;">Nenhuma não conformidade registrada</td></tr>';

      const html = `
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Inspeção Extintores</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 8px; color: #1f2937; padding: 10px; }
            ${PDF_HEADER_STYLES}
            .title-bar { background: #1e3a5f; color: white; padding: 8px 12px; font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 6px; }
            .sub-bar { display: flex; justify-content: space-between; padding: 4px 8px; background: #f3f4f6; border: 1px solid #d1d5db; margin-bottom: 8px; font-size: 9px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .td, .insp-td { border: 1px solid #d1d5db; padding: 3px 4px; text-align: center; font-size: 7px; }
            th { border: 1px solid #d1d5db; padding: 3px 4px; text-align: center; font-size: 7px; background: #e5e7eb; font-weight: 600; }
            .insp-th { writing-mode: vertical-rl; text-orientation: mixed; min-width: 18px; max-width: 22px; padding: 4px 2px; font-size: 6.5px; }
            .nc-cell { background: #fecaca; color: #991b1b; font-weight: bold; }
            .c-cell { color: #166534; }
            .section-title { font-size: 10px; font-weight: bold; margin: 8px 0 4px; color: #1e3a5f; }
            .footer { margin-top: 10px; font-size: 8px; color: #6b7280; border-top: 1px solid #d1d5db; padding-top: 6px; }
            .legend { font-size: 7px; color: #6b7280; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="title-bar">
            SUCENA - INSPEÇÃO DO SISTEMA DE PREVENÇÃO CONTRA INCÊNDIO - CONTROLE DE EXTINTORES
          </div>
          <div class="sub-bar">
            <span>Número: ${numero} &nbsp; Área: ${area}</span>
            <span>Mês: ${mes} / ${ano}</span>
            <span>Data: ${data}</span>
            <span>${tipoPrincipal}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Localização</th>
                <th>Tipo / Capacidade</th>
                <th>Nº Tag</th>
                <th>Nº Fabricação</th>
                <th>Próx. Recarga</th>
                <th>Próx. Teste</th>
                ${inspCols}
                <th>Peso Vazio</th>
                <th>Peso Cheio</th>
                <th>Pesagem</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>

          <div class="section-title">PLANO DE AÇÃO PARA AS NÃO CONFORMIDADES</div>
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Não Conformidade(s)</th>
                <th>Ação Tomada</th>
                <th>Quem</th>
                <th>Quando</th>
                <th>Responsável</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${actionRows}</tbody>
          </table>

          <div class="legend">
            Legenda: C: Conforme &nbsp; NC: Não Conforme &nbsp; NA: Não se Aplica &nbsp; NV: Não Visível &nbsp; *= Mais de um extintor com a mesma não conformidade
          </div>

          <div class="footer">
            <p>Inspecionador(es): ${inspecionador}</p>
            <p>Eng. de Segurança do Trabalho: ${engSeguranca}</p>
          </div>
        </body>
        </html>
      `;

      await downloadPdfFromHtml(html, `inspecao-extintores-${new Date().toISOString().slice(0,10)}.pdf`);

      toast.success("PDF gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF.");
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-4 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlameKindling className="h-7 w-7 text-red-500" />
            <div>
              <EditablePageTitle pageKey="inspecao-extintores" defaultValue="Inspeção de Extintores" className="text-2xl font-bold text-foreground" />
              <p className="text-sm text-muted-foreground">Controle de prevenção contra incêndio</p>
            </div>
          </div>
          <Button onClick={generatePdf} className="gap-2">
            <FileDown className="h-4 w-4" />
            Gerar PDF
          </Button>
        </div>

        {/* Header Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div><Label>Número</Label><Input value={numero} onChange={e => setNumero(e.target.value)} /></div>
              <div><Label>Área</Label><Input value={area} onChange={e => setArea(e.target.value)} /></div>
              <div>
                <Label>Mês</Label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Ano</Label><Input value={ano} onChange={e => setAno(e.target.value)} /></div>
              <div><Label>Data</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
              <div><Label>Tipo</Label><Input value={tipoPrincipal} onChange={e => setTipoPrincipal(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Extinguisher Rows */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Extintores</CardTitle>
            <Button size="sm" variant="outline" onClick={addRow} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((row, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3 relative bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Extintor #{idx + 1}</span>
                  <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => removeRow(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div><Label className="text-xs">Localização</Label><Input className="h-8 text-xs" value={row.localizacao} onChange={e => updateRow(idx, "localizacao", e.target.value)} /></div>
                  <div><Label className="text-xs">Tipo / Capacidade</Label><Input className="h-8 text-xs" value={row.tipoCapacidade} onChange={e => updateRow(idx, "tipoCapacidade", e.target.value)} /></div>
                  <div><Label className="text-xs">Nº Tag</Label><Input className="h-8 text-xs" value={row.nTag} onChange={e => updateRow(idx, "nTag", e.target.value)} /></div>
                  <div><Label className="text-xs">Nº Fabricação</Label><Input className="h-8 text-xs" value={row.nFabricacao} onChange={e => updateRow(idx, "nFabricacao", e.target.value)} /></div>
                  <div><Label className="text-xs">Próx. Recarga</Label><Input className="h-8 text-xs" value={row.proxRecarga} onChange={e => updateRow(idx, "proxRecarga", e.target.value)} /></div>
                  <div><Label className="text-xs">Próx. Teste</Label><Input className="h-8 text-xs" value={row.proxTeste} onChange={e => updateRow(idx, "proxTeste", e.target.value)} /></div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {INSPECTION_FIELDS.map(f => (
                    <div key={f.key}>
                      <Label className="text-[10px] leading-tight block mb-1">{f.label}</Label>
                      <Select value={row[f.key] as string} onValueChange={v => updateRow(idx, f.key, v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Peso Vazio</Label><Input className="h-8 text-xs" value={row.pesoVazio} onChange={e => updateRow(idx, "pesoVazio", e.target.value)} /></div>
                  <div><Label className="text-xs">Peso Cheio</Label><Input className="h-8 text-xs" value={row.pesoCheio} onChange={e => updateRow(idx, "pesoCheio", e.target.value)} /></div>
                  <div><Label className="text-xs">Pesagem</Label><Input className="h-8 text-xs" value={row.pesagem} onChange={e => updateRow(idx, "pesagem", e.target.value)} /></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Plan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Plano de Ação - Não Conformidades</CardTitle>
            <Button size="sm" variant="outline" onClick={addActionRow} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionPlan.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma não conformidade registrada. Clique em "Adicionar" se necessário.</p>
            )}
            {actionPlan.map((a, idx) => (
              <div key={idx} className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end border rounded-lg p-3 bg-muted/20">
                <div><Label className="text-xs">Não Conformidade</Label><Input className="h-8 text-xs" value={a.naoConformidade} onChange={e => updateActionRow(idx, "naoConformidade", e.target.value)} /></div>
                <div><Label className="text-xs">Ação Tomada</Label><Input className="h-8 text-xs" value={a.acao} onChange={e => updateActionRow(idx, "acao", e.target.value)} /></div>
                <div><Label className="text-xs">Quem</Label><Input className="h-8 text-xs" value={a.quem} onChange={e => updateActionRow(idx, "quem", e.target.value)} /></div>
                <div><Label className="text-xs">Quando</Label><Input className="h-8 text-xs" type="date" value={a.quando} onChange={e => updateActionRow(idx, "quando", e.target.value)} /></div>
                <div><Label className="text-xs">Responsável</Label><Input className="h-8 text-xs" value={a.responsavel} onChange={e => updateActionRow(idx, "responsavel", e.target.value)} /></div>
                <div><Label className="text-xs">Status</Label><Input className="h-8 text-xs" value={a.status} onChange={e => updateActionRow(idx, "status", e.target.value)} /></div>
                <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => removeActionRow(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Inspecionador(es)</Label><Input value={inspecionador} onChange={e => setInspecionador(e.target.value)} placeholder="Ex: Itamar de Souza" /></div>
              <div><Label>Eng. de Segurança do Trabalho</Label><Input value={engSeguranca} onChange={e => setEngSeguranca(e.target.value)} placeholder="Ex: Cosme Pontes" /></div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Legenda: C = Conforme | NC = Não Conforme | NA = Não se Aplica | NV = Não Visível</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
