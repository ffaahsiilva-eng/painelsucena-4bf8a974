import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save, FileDown, Download, AlertTriangle, Lock, Unlock } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { PDF_LOGO_URL } from "@/lib/pdfLogo";
import pdfLogoAsset from "@/assets/sucena-official-3.png.asset.json";
import { bermaLabel } from "@/lib/bermaLabel";

type AspersorReport = {
  id: string;
  report_date: string;
  environment: string;
  data: Record<string, { count: number; damaged: number; repaired?: number }>;
  created_at: string;
  updated_at: string;
};

export default function AspersoresTab() {
  const { environment } = useEnvironment();
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const qc = useQueryClient();
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isLocked, setIsLocked] = useState(true);

  const { data: report, isLoading: isLoadingReport } = useQuery({
    queryKey: ["aspersores-report", environment, selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aspersores_annotations" as any)
        .select("*")
        .eq("environment", environment)
        .eq("report_date" as any, selectedDate)
        .eq("page", 1)
        .maybeSingle();
      if (error) throw error;
      return data as AspersorReport | null;
    },
    enabled: !!environment,
  });

  const { data: mapConfig } = useQuery({
    queryKey: ["aspersores-map-config", environment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aspersores_annotations")
        .select("data")
        .eq("environment", environment)
        .eq("page", 2)
        .maybeSingle();
      if (error) throw error;
      return data?.data as any;
    },
    enabled: !!environment,
  });

  const { data: estoqueItens = [] } = useQuery({
    queryKey: ["irrigacao_itens", environment],
    queryFn: async () => {
      if (!environment) return [];
      const { data, error } = await supabase
        .from("irrigacao_itens")
        .select("*")
        .eq("environment", environment)
        .order("nome");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!environment,
  });

  const sections = useMemo(() => {
    const evenBermas: string[] = [];
    for (let i = 28; i <= 58; i += 2) evenBermas.push(String(i));

    return [
      { label: "FAIXA 3", bermas: [...evenBermas] },
      { label: "FAIXA 4", bermas: [...evenBermas] },
      { label: "FAIXA 4 (MIRANTE)", bermas: [...evenBermas] },
    ] as { label: string; bermas: string[] }[];
  }, []);


  const [localData, setLocalData] = useState<Record<string, { count: number; damaged: number; repaired?: number }>>({});

  // Sync with database report, but only if we don't have local changes or just changed date/environment
  useMemo(() => {
    if (report?.data) {
      setLocalData(report.data);
      setIsLocked(true);
    } else if (report === null && !isLoadingReport) {
      // Only clear if the report is explicitly null (not found) and not loading
      setLocalData({});
      setIsLocked(false);
    }
  }, [report, isLoadingReport]);

  const saveReport = useMutation({
    mutationFn: async () => {
      const payload = {
        environment,
        report_date: selectedDate,
        data: localData,
        page: 1, // Ensure page is always 1 for standard reports to avoid conflict with map config (page 2)
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("aspersores_annotations" as any)
        .upsert(payload as any, { onConflict: "environment,report_date,page" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Relatório de aspersores salvo!");
      setIsLocked(true);
      qc.invalidateQueries({ queryKey: ["aspersores-report", environment, selectedDate] });
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message),
  });

  const totalOperacionais = Object.values(localData).reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
  const totalDanificados = Object.values(localData).reduce((acc, curr) => acc + (Number(curr.damaged) || 0), 0);
  const totalConsertadosGeral = Object.values(localData).reduce((acc, curr) => acc + (Number(curr.repaired) || 0), 0);
  const totalGeral = totalOperacionais + totalDanificados;

  const exportPdf = async () => {
    const doc = new jsPDF();
    
    const renderPdfContent = async () => {
      // Use the specific uploaded logo for Aspersores PDF
      const logoUrl = pdfLogoAsset.url || settings?.logo_url || PDF_LOGO_URL;
      let logoImg: HTMLImageElement | null = null;

      if (logoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = logoUrl;
          });
          logoImg = img;
        } catch (e) {
          console.error("Error adding logo to PDF", e);
        }
      }

      let isFirstPage = true;

      // Draws logo + title header on the current page and returns the Y cursor
      const drawHeader = (title: string) => {
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        let y = 15;
        if (logoImg) {
          const imgWidth = 50;
          const imgHeight = (logoImg.height * imgWidth) / logoImg.width;
          doc.addImage(logoImg, "PNG", 14, 10, imgWidth, imgHeight);
          y = 15 + imgHeight + 10;
        }

        doc.setFontSize(16);
        doc.text(title, 14, y);
        y += 7;
        doc.setFontSize(10);
        doc.text(`Ambiente: ${environment} | Data: ${selectedDate}`, 14, y);
        return y + 8;
      };

      // Resumo Geral (apenas uma página com tudo consolidado)
      let currentY = drawHeader("Resumo Geral de Aspersores");
      
      doc.setFontSize(12);
      doc.text("RESUMO GERAL", 14, currentY);
      currentY += 4;
      autoTable(doc, {
        startY: currentY,
        head: [["Total de Aspersores", "Operacionais", "Danificados", "Consertados"]],
        body: [[totalGeral, totalOperacionais, totalDanificados, totalConsertadosGeral]],
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text("DETALHAMENTO POR FAIXA", 14, currentY);
      currentY += 4;

      const faixasRows = sections.map(section => {
        const sectionData = Object.entries(localData)
          .filter(([key]) => key.startsWith(`${section.label}-`))
          .map(([_, data]) => data);
        
        const subOp = sectionData.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
        const subDan = sectionData.reduce((acc, curr) => acc + (Number(curr.damaged) || 0), 0);
        const subConsertado = sectionData.reduce((acc, curr) => acc + (Number(curr.repaired) || 0), 0);
        
        return [section.label, subOp, subDan, subConsertado, subOp + subDan];
      });

      autoTable(doc, {
        startY: currentY,
        head: [["Faixa", "Operacionais", "Danificados", "Consertados", "Total"]],
        body: faixasRows,
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 9 },
      });

      // Detalhamento por Berma (Novo)
      let bermaY = drawHeader("Detalhamento por Berma");
      
      sections.forEach((section) => {
        const bermasRows = section.bermas.map((b) => {
          const key = `${section.label}-${b}`;
          const data = localData[key] || { count: 0, damaged: 0, repaired: 0 };
          return [bermaLabel(b), data.count, data.damaged, data.repaired || 0];
        });

        doc.setFontSize(12);
        doc.text(section.label, 14, bermaY);
        bermaY += 4;

        autoTable(doc, {
          startY: bermaY,
          head: [["Berma", "Total", "Danificados", "Consertados"]],
          body: bermasRows,
          headStyles: { fillColor: [16, 185, 129] }, // Emerald-500
          styles: { fontSize: 8 },
          margin: { bottom: 20 },
        });

        bermaY = (doc as any).lastAutoTable.finalY + 10;
        
        // Se estiver muito perto do fim da página, o drawHeader já adiciona nova se necessário
        if (bermaY > 250) {
          bermaY = drawHeader("Detalhamento por Berma (Continuação)");
        }
      });

      // Estoque Irrigação (página separada)
      let estoqueY = drawHeader("Estoque Irrigação");
      doc.setFontSize(12);
      doc.text("ESTOQUE IRRIGAÇÃO", 14, estoqueY);
      estoqueY += 4;
      const totalEstoque = estoqueItens.reduce((a: number, i: any) => a + (Number(i.quantidade) || 0), 0);
      autoTable(doc, {
        startY: estoqueY,
        head: [["Item", "Unidade", "Quantidade"]],
        body: estoqueItens.length
          ? estoqueItens.map((i: any) => [i.nome, i.unidade, Number(i.quantidade) || 0])
          : [["Sem itens cadastrados", "-", 0]],
        foot: [["TOTAL", "", totalEstoque]],
        headStyles: { fillColor: [234, 179, 8] },
        footStyles: { fillColor: [161, 98, 7] },
        styles: { fontSize: 9 },
      });

      // Consertos (página separada)
      const { data: consertos = [] } = await supabase
        .from("aspersores_consertos" as any)
        .select("*")
        .eq("environment", environment)
        .eq("report_date", selectedDate);
      
      if (consertos && consertos.length > 0) {
        let consertoY = drawHeader("Relatório de Consertos");
        doc.setFontSize(12);
        doc.text("CONSERTOS DO DIA", 14, consertoY);
        consertoY += 4;
        const totalConsertados = consertos.reduce((a: number, c: any) => a + (Number(c.count) || 0), 0);
        autoTable(doc, {
          startY: consertoY,
          head: [["Registrado por", "Quantidade", "Notas"]],
          body: consertos.map((c: any) => [c.created_by_name || "—", c.count, c.notes || "—"]),
          foot: [["TOTAL", totalConsertados, ""]],
          headStyles: { fillColor: [201, 168, 76] },
          footStyles: { fillColor: [176, 147, 64], textColor: 255 },
          styles: { fontSize: 9 },
        });
      }

      doc.save(`relatorio-aspersores-${selectedDate}.pdf`);
    };


    await renderPdfContent();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-card/40 p-4 rounded-xl border border-border/40">
        <div className="space-y-2 w-full md:w-auto">
          <Label>Data do Relatório</Label>
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="bg-background/50"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="flex-1 md:flex-none"
            onClick={() => {
              if (mapConfig) {
                const blob = new Blob([JSON.stringify(mapConfig, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `mapa-aspersores-${environment}.json`;
                a.click();
              } else {
                toast.error("Configuração do mapa não encontrada");
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" /> Baixar Mapa
          </Button>
          <Button variant="outline" onClick={exportPdf} className="flex-1 md:flex-none">
            <FileDown className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              if (isLocked) {
                // When unlocking, we might want to ensure we have the latest data
                // but we definitely don't want to clear what's already there
                setIsLocked(false);
              } else {
                setIsLocked(true);
              }
            }}
            className="flex-1 md:flex-none"
          >
            {isLocked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
            {isLocked ? "Editar" : "Bloquear"}
          </Button>
          <Button 
            onClick={() => saveReport.mutate()} 
            disabled={saveReport.isPending || isLocked}
            className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white"
          >
            {saveReport.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map(section => {
          const sectionData = Object.entries(localData)
            .filter(([key]) => key.startsWith(`${section.label}-`))
            .map(([_, data]) => data);
          
          const sectionOperacionais = sectionData.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
          const sectionDanificados = sectionData.reduce((acc, curr) => acc + (Number(curr.damaged) || 0), 0);
          const sectionConsertados = sectionData.reduce((acc, curr) => acc + (Number(curr.repaired) || 0), 0);
          const sectionTotal = sectionOperacionais + sectionDanificados;

          return (
            <Card key={section.label} className="bg-card/40 border-border/40 overflow-hidden">
              <div className="bg-emerald-500/10 px-4 py-2 border-b border-emerald-500/20 font-bold text-emerald-400">
                Resumo {section.label}
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-[10px] uppercase text-blue-400 font-bold mb-1">Total</div>
                    <div className="text-xl font-black text-blue-100">{sectionTotal}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-red-400 font-bold mb-1">Danificados</div>
                    <div className="text-xl font-black text-red-100">{sectionDanificados}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-orange-400 font-bold mb-1">Consertados</div>
                    <div className="text-xl font-black text-orange-100">{sectionConsertados}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-green-400 font-bold mb-1">Operacionais</div>
                    <div className="text-xl font-black text-green-100">{sectionOperacionais}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-400 font-medium text-center">Total Geral de Aspersores</div>
            <div className="text-3xl font-black text-blue-100 text-center">{totalGeral}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="pt-6">
            <div className="text-sm text-red-400 font-medium text-center">Total Geral Danificados</div>
            <div className="text-3xl font-black text-red-100 text-center">{totalDanificados}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="text-sm text-orange-400 font-medium text-center">Total Geral Consertados</div>
            <div className="text-3xl font-black text-orange-100 text-center">{totalConsertadosGeral}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="text-sm text-green-400 font-medium text-center">Total Geral Operacionais</div>
            <div className="text-3xl font-black text-green-100 text-center">{totalOperacionais}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/60 backdrop-blur border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Quantidade por Faixa e Berma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.label} className="space-y-4">
                <h3 className="text-xl font-bold text-emerald-400 border-b border-emerald-500/30 pb-2">
                  {section.label}
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Local</TableHead>
                        <TableHead className="w-24">Operacionais</TableHead>
                        <TableHead className="w-24">Danificados</TableHead>
                        <TableHead className="w-24">Consertados</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.bermas.map((b) => {
                        const key = `${section.label}-${b}`;
                        const data = localData[key] || { count: 0, damaged: 0, repaired: 0 };
                        const isDamaged = data.damaged > 0;
                        const isFixed = data.damaged > 0 && data.repaired === data.damaged;

                        return (
                          <TableRow key={key}>
                            <TableCell className="font-medium">{bermaLabel(b)}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={data.count || ""}
                                disabled={isLocked}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setLocalData(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], count: val }
                                  }));
                                }}
                                className="h-8 w-24 bg-background/30"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={data.count}
                                value={data.damaged || ""}
                                disabled={isLocked}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setLocalData(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], damaged: val }
                                  }));
                                }}
                                className={`h-8 w-24 bg-background/30 ${isDamaged ? 'text-red-400 border-red-500/50' : ''}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={data.repaired || ""}
                                disabled={isLocked}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setLocalData(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], repaired: val }
                                  }));
                                }}
                                className="h-8 w-20 bg-background/30 text-orange-400 border-orange-500/30"
                              />
                            </TableCell>
                            <TableCell>
                              {isDamaged && !isFixed && (
                                <div className="flex items-center text-red-400 text-xs gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Alerta
                                </div>
                              )}
                              {isFixed && (
                                <div className="flex items-center text-green-400 text-xs gap-1">
                                  <div className="h-3 w-3 rounded-full bg-green-500" />
                                  Ok
                                </div>
                              )}

                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
