import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, addMonths, setDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Calendar, Filter, Calculator, Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getBrazilNorthDate } from "@/lib/timezone";

interface MonthlyReportDialogProps {
  reports: any[];
  type: "jardinagem" | "gabiao";
  formatReportPreview: (report: any) => string;
  getLocationLabel: (report: any) => string;
}

// Jardinagem activity totals interface
interface JardinagemTotals {
  rocagem_m2: number;
  podagem_unidade: number;
  coroamento_unidade: number;
  adubagem_unidade: number;
  plantio_unidade: number;
  limpeza_manual_m2: number;
  limpeza_assoprador_m2: number;
  controle_invasoras_unidade: number;
  retirada_mudas_unidade: number;
}

// Gabião activity totals interface
interface GabiaoTotals {
  escavacao_manual: number;
  reposicao_manta: number;
  reposicao_silte: number;
  limpeza_organizacao: number;
  limpeza_canaleta_m: number;
  recomposicao_gabiao_m: number;
  manutencao_drenagem_m: number;
  limpeza_bueiro_unidade: number;
  reparo_cerca_m: number;
}

export default function MonthlyReportDialog({ 
  reports, 
  type, 
  formatReportPreview,
  getLocationLabel 
}: MonthlyReportDialogProps) {
  const [filterMonth, setFilterMonth] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [filterType, setFilterType] = useState<"month" | "range">("month");

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
    return months;
  }, []);

  // Filter reports based on selected filter type
  const filteredReports = useMemo(() => {
    if (!reports) return [];

    if (filterType === "month") {
      const monthStart = startOfMonth(filterMonth);
      const monthEnd = endOfMonth(filterMonth);
      return reports.filter((report) => {
        const reportDate = parseISO(report.report_date);
        return isWithinInterval(reportDate, { start: monthStart, end: monthEnd });
      });
    } else if (filterType === "range" && dateRange.from && dateRange.to) {
      return reports.filter((report) => {
        const reportDate = parseISO(report.report_date);
        return isWithinInterval(reportDate, { start: dateRange.from!, end: dateRange.to! });
      });
    }

    return reports;
  }, [reports, filterType, filterMonth, dateRange]);

  // Sort by date descending
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) => 
      new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
    );
  }, [filteredReports]);

  // Calculate Jardinagem totals
  const jardinagemTotals = useMemo((): JardinagemTotals => {
    if (type !== "jardinagem") return {
      rocagem_m2: 0,
      podagem_unidade: 0,
      coroamento_unidade: 0,
      adubagem_unidade: 0,
      plantio_unidade: 0,
      limpeza_manual_m2: 0,
      limpeza_assoprador_m2: 0,
      controle_invasoras_unidade: 0,
      retirada_mudas_unidade: 0,
    };

    return filteredReports.reduce((acc, report) => {
      // Parse invasoras for total calculation
      let invasorasTotal = 0;
      if (report.controle_invasoras_nome && report.controle_invasoras_nome.startsWith("[")) {
        try {
          const invasoras = JSON.parse(report.controle_invasoras_nome) as { nome: string; unidade: string }[];
          invasorasTotal = invasoras.reduce((sum, inv) => sum + (parseInt(inv.unidade) || 0), 0);
        } catch {
          invasorasTotal = report.controle_invasoras_unidade || 0;
        }
      } else {
        invasorasTotal = report.controle_invasoras_unidade || 0;
      }

      return {
        rocagem_m2: acc.rocagem_m2 + (parseFloat(report.rocagem_m2) || 0),
        podagem_unidade: acc.podagem_unidade + (parseInt(report.podagem_unidade) || 0),
        coroamento_unidade: acc.coroamento_unidade + (parseInt(report.coroamento_unidade) || 0),
        adubagem_unidade: acc.adubagem_unidade + (parseInt(report.adubagem_unidade) || 0),
        plantio_unidade: acc.plantio_unidade + (parseInt(report.plantio_unidade) || 0),
        limpeza_manual_m2: acc.limpeza_manual_m2 + (parseFloat(report.limpeza_manual_m2) || 0),
        limpeza_assoprador_m2: acc.limpeza_assoprador_m2 + (parseFloat(report.limpeza_assoprador_m2) || 0),
        controle_invasoras_unidade: acc.controle_invasoras_unidade + invasorasTotal,
        retirada_mudas_unidade: acc.retirada_mudas_unidade + (parseInt(report.retirada_mudas_unidade) || 0),
      };
    }, {
      rocagem_m2: 0,
      podagem_unidade: 0,
      coroamento_unidade: 0,
      adubagem_unidade: 0,
      plantio_unidade: 0,
      limpeza_manual_m2: 0,
      limpeza_assoprador_m2: 0,
      controle_invasoras_unidade: 0,
      retirada_mudas_unidade: 0,
    });
  }, [filteredReports, type]);

  // Calculate Gabião totals from observacoes field
  const gabiaoTotals = useMemo((): GabiaoTotals => {
    if (type !== "gabiao") return {
      escavacao_manual: 0,
      reposicao_manta: 0,
      reposicao_silte: 0,
      limpeza_organizacao: 0,
      limpeza_canaleta_m: 0,
      recomposicao_gabiao_m: 0,
      manutencao_drenagem_m: 0,
      limpeza_bueiro_unidade: 0,
      reparo_cerca_m: 0,
    };

    return filteredReports.reduce((acc, report) => {
      const obs = report.observacoes || "";
      
      // Count checkbox activities (count occurrences)
      const escavacao = obs.includes("Escavação manual") ? 1 : 0;
      const manta = obs.includes("Reposição de manta asfáltica") ? 1 : 0;
      const silte = obs.includes("Reposição de silte asfáltico") ? 1 : 0;
      const limpeza = obs.includes("Limpeza e organização do local") ? 1 : 0;
      
      // Also count legacy structured fields if they exist
      return {
        escavacao_manual: acc.escavacao_manual + escavacao,
        reposicao_manta: acc.reposicao_manta + manta,
        reposicao_silte: acc.reposicao_silte + silte,
        limpeza_organizacao: acc.limpeza_organizacao + limpeza,
        limpeza_canaleta_m: acc.limpeza_canaleta_m + (parseFloat(report.limpeza_canaleta_m) || 0),
        recomposicao_gabiao_m: acc.recomposicao_gabiao_m + (parseFloat(report.recomposicao_gabiao_m) || 0),
        manutencao_drenagem_m: acc.manutencao_drenagem_m + (parseFloat(report.manutencao_drenagem_m) || 0),
        limpeza_bueiro_unidade: acc.limpeza_bueiro_unidade + (parseInt(report.limpeza_bueiro_unidade) || 0),
        reparo_cerca_m: acc.reparo_cerca_m + (parseFloat(report.reparo_cerca_m) || 0),
      };
    }, {
      escavacao_manual: 0,
      reposicao_manta: 0,
      reposicao_silte: 0,
      limpeza_organizacao: 0,
      limpeza_canaleta_m: 0,
      recomposicao_gabiao_m: 0,
      manutencao_drenagem_m: 0,
      limpeza_bueiro_unidade: 0,
      reparo_cerca_m: 0,
    });
  }, [filteredReports, type]);

  const handleMonthChange = (value: string) => {
    const [year, month] = value.split("-");
    setFilterMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
  };


  const colorClass = type === "jardinagem" ? "text-green-500" : "text-orange-500";
  const bgClass = type === "jardinagem" ? "bg-green-600/20" : "bg-orange-600/20";
  const title = type === "jardinagem" ? "Relatório Mensal - Jardinagem" : "Relatório Mensal - Gabião";

  const hasJardinagemTotals = Object.values(jardinagemTotals).some(v => v > 0);
  const hasGabiaoTotals = Object.values(gabiaoTotals).some(v => v > 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Relatório Mensal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", bgClass)}>
              <FileText className={cn("h-4 w-4", colorClass)} />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end pb-4 border-b">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tipo de Filtro</Label>
            <Select value={filterType} onValueChange={(v: "month" | "range") => setFilterType(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Por Mês</SelectItem>
                <SelectItem value="range">Por Período</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterType === "month" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mês</Label>
              <Select 
                value={format(filterMonth, "yyyy-MM")} 
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}


          {filterType === "range" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] gap-2">
                      <Calendar className="h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] gap-2">
                      <Calendar className="h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          <Badge variant="secondary" className="h-9 px-3">
            {sortedReports.length} registro{sortedReports.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Tabs for Summary and Details */}
        <Tabs defaultValue="summary" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary" className="gap-2">
              <Calculator className="h-4 w-4" />
              Resumo / Totais
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <FileText className="h-4 w-4" />
              Detalhes por Dia
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              {sortedReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Filter className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Nenhum registro encontrado para o período selecionado.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Period info */}
                  <div className={cn("p-4 rounded-lg border", bgClass)}>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Calculator className={cn("h-5 w-5", colorClass)} />
                      Totais do Período
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {filterType === "month" 
                        ? format(filterMonth, "MMMM 'de' yyyy", { locale: ptBR })
                        : dateRange.from && dateRange.to 
                          ? `${format(dateRange.from, "dd/MM/yyyy")} até ${format(dateRange.to, "dd/MM/yyyy")}`
                          : "Período não selecionado"
                      }
                      {" • "}{sortedReports.length} dia{sortedReports.length !== 1 ? "s" : ""} com registro
                    </p>

                    {/* Jardinagem Totals */}
                    {type === "jardinagem" && (
                      <div className="space-y-2">
                        {hasJardinagemTotals ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {jardinagemTotals.rocagem_m2 > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🌿 Roçagem</span>
                                <Badge variant="secondary">{jardinagemTotals.rocagem_m2.toLocaleString('pt-BR')} m²</Badge>
                              </div>
                            )}
                            {jardinagemTotals.podagem_unidade > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">✂️ Podagem</span>
                                <Badge variant="secondary">{jardinagemTotals.podagem_unidade} unid.</Badge>
                              </div>
                            )}
                            {jardinagemTotals.coroamento_unidade > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🌳 Coroamento</span>
                                <Badge variant="secondary">{jardinagemTotals.coroamento_unidade} unid.</Badge>
                              </div>
                            )}
                            {jardinagemTotals.adubagem_unidade > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">💧 Adubagem</span>
                                <Badge variant="secondary">{jardinagemTotals.adubagem_unidade} unid.</Badge>
                              </div>
                            )}
                            {jardinagemTotals.plantio_unidade > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🌱 Plantio</span>
                                <Badge variant="secondary">{jardinagemTotals.plantio_unidade} unid.</Badge>
                              </div>
                            )}
                            {jardinagemTotals.limpeza_manual_m2 > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🧹 Limpeza Manual</span>
                                <Badge variant="secondary">{jardinagemTotals.limpeza_manual_m2.toLocaleString('pt-BR')} m²</Badge>
                              </div>
                            )}
                            {jardinagemTotals.limpeza_assoprador_m2 > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">💨 Limpeza Soprador</span>
                                <Badge variant="secondary">{jardinagemTotals.limpeza_assoprador_m2.toLocaleString('pt-BR')} m²</Badge>
                              </div>
                            )}
                            {jardinagemTotals.controle_invasoras_unidade > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🌾 Controle Invasoras</span>
                                <Badge variant="secondary">{jardinagemTotals.controle_invasoras_unidade} unid.</Badge>
                              </div>
                            )}
                            {jardinagemTotals.retirada_mudas_unidade > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🌲 Retirada de Mudas</span>
                                <Badge variant="secondary">{jardinagemTotals.retirada_mudas_unidade} unid.</Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm italic">
                            Nenhuma atividade registrada no período.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Gabião Totals */}
                    {type === "gabiao" && (
                      <div className="space-y-2">
                        {hasGabiaoTotals ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {gabiaoTotals.escavacao_manual > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">⛏️ Escavação Manual</span>
                                <Badge variant="secondary">{gabiaoTotals.escavacao_manual} dia{gabiaoTotals.escavacao_manual !== 1 ? "s" : ""}</Badge>
                              </div>
                            )}
                            {gabiaoTotals.reposicao_manta > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🛤️ Reposição Manta</span>
                                <Badge variant="secondary">{gabiaoTotals.reposicao_manta} dia{gabiaoTotals.reposicao_manta !== 1 ? "s" : ""}</Badge>
                              </div>
                            )}
                            {gabiaoTotals.reposicao_silte > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🏗️ Reposição Silte</span>
                                <Badge variant="secondary">{gabiaoTotals.reposicao_silte} dia{gabiaoTotals.reposicao_silte !== 1 ? "s" : ""}</Badge>
                              </div>
                            )}
                            {gabiaoTotals.limpeza_organizacao > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🧹 Limpeza/Organização</span>
                                <Badge variant="secondary">{gabiaoTotals.limpeza_organizacao} dia{gabiaoTotals.limpeza_organizacao !== 1 ? "s" : ""}</Badge>
                              </div>
                            )}
                            {gabiaoTotals.limpeza_canaleta_m > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">💧 Limpeza Canaleta</span>
                                <Badge variant="secondary">{gabiaoTotals.limpeza_canaleta_m.toLocaleString('pt-BR')} m</Badge>
                              </div>
                            )}
                            {gabiaoTotals.recomposicao_gabiao_m > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🧱 Recomposição Gabião</span>
                                <Badge variant="secondary">{gabiaoTotals.recomposicao_gabiao_m.toLocaleString('pt-BR')} m</Badge>
                              </div>
                            )}
                            {gabiaoTotals.manutencao_drenagem_m > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🚰 Manutenção Drenagem</span>
                                <Badge variant="secondary">{gabiaoTotals.manutencao_drenagem_m.toLocaleString('pt-BR')} m</Badge>
                              </div>
                            )}
                            {gabiaoTotals.limpeza_bueiro_unidade > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🕳️ Limpeza Bueiro</span>
                                <Badge variant="secondary">{gabiaoTotals.limpeza_bueiro_unidade} unid.</Badge>
                              </div>
                            )}
                            {gabiaoTotals.reparo_cerca_m > 0 && (
                              <div className="flex justify-between p-3 bg-card rounded-lg border">
                                <span className="font-medium">🔩 Reparo Cerca</span>
                                <Badge variant="secondary">{gabiaoTotals.reparo_cerca_m.toLocaleString('pt-BR')} m</Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm italic">
                            Nenhuma atividade registrada no período.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              {sortedReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Filter className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Nenhum registro encontrado para o período selecionado.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-semibold">
                            {format(parseISO(report.report_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getLocationLabel(report)}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {format(parseISO(report.report_date), "dd/MM/yyyy")}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-pre-line border-t pt-2 mt-2">
                        {formatReportPreview(report)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
