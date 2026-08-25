import { bermaLabel } from "@/lib/bermaLabel";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as E from "@/lib/whatsappEmojis";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Leaf, Save, Loader2, Calendar, Trash2, History, ArrowRight, Plus, X, Copy, Droplets, MessageCircle, Sprout, Lock, Unlock } from "lucide-react";
import { type ActivityEntry } from "@/components/atividades/ExtraActivityEntries";
import { ExtraActivityEntries, AddMoreButton } from "@/components/atividades/ExtraActivityEntries";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DebouncedTextarea } from "@/components/atividades/DebouncedTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useReportLock } from "@/hooks/useReportLock";
import { 
  useJardinagemReports, 
  useJardinagemReportByDate, 
  useSaveJardinagemReport, 
  useDeleteJardinagemReport,
  type JardinagemReport,
} from "@/hooks/useJardinagemReports";
import { useQueryClient } from "@tanstack/react-query";

import { getBrazilNorthDate, getBrazilNorthTodayString } from "@/lib/timezone";
import { useMudasPlantioByDate } from "@/hooks/useMudasPlantio";
import { cn } from "@/lib/utils";
import MonthlyReportDialog from "@/components/atividades/MonthlyReportDialog";
import { PhotoUploader } from "@/components/atividades/PhotoUploader";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { Alert, AlertDescription } from "@/components/ui/alert";


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MudasParaPlantarTab from "@/components/atividades/MudasParaPlantarTab";
import CronogramaLimpezaMiranteTab from "@/components/atividades/CronogramaLimpezaMiranteTab";
import { JardinagemMetasSummary } from "@/components/atividades/JardinagemMetasSummary";
import { useMudasParaPlantar, useUpdateMudaParaPlantar, useAddMudaParaPlantar } from "@/hooks/useMudasParaPlantar";
import { TreePine } from "lucide-react";

interface InvasoraEntry {
  nome: string;
  unidade: string;
  berma?: string;
}

const FAIXA_OPTIONS = [
  { value: "FAIXA 2", label: "FAIXA 2" },
  { value: "FAIXA 3", label: "FAIXA 3" },
  { value: "FAIXA 4", label: "FAIXA 4" },
];

// Invasoras options
const INVASORAS_OPTIONS = [
  { value: "Acácia", label: "Acácia" },
  { value: "Erva Daninha", label: "Erva Daninha" },
  { value: "Erva-de-passarinho", label: "Erva-de-passarinho" },
  { value: "Juqueri", label: "Juqueri" },
  { value: "Leucena", label: "Leucena" },
];

// Generate berma options from 28 to 56 + Mirante
const BERMA_OPTIONS = [
  ...Array.from({ length: 29 }, (_, i) => ({
    value: (28 + i).toString(),
    label: `Berma ${28 + i}`,
  })),
  { value: "mirante", label: "Mirante" },
  { value: "gabiao-1", label: "Gabião 1" },
  { value: "gabiao-2", label: "Gabião 2" },
  { value: "gabiao-3", label: "Gabião 3" },
  { value: "gabiao-4", label: "Gabião 4" },
];

// Generate even berma options from 28 to 56 (only even numbers)
const BERMA_OPTIONS_EVEN = Array.from({ length: 15 }, (_, i) => ({
  value: (28 + i * 2).toString(),
  label: `Berma ${28 + i * 2}`,
}));

export default function Atividades() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const { isAdmin, authReady } = useIsAdmin();
  const queryClient = useQueryClient();
  
  const today = getBrazilNorthDate();

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: existingReport, isLoading: isLoadingReport } = useJardinagemReportByDate(selectedDateStr);
  const { data: allReports } = useJardinagemReports();
  const saveReport = useSaveJardinagemReport();
  const deleteReport = useDeleteJardinagemReport();
  const { data: mudasPlantadasDoDia } = useMudasPlantioByDate(selectedDateStr);
  const { data: estoqueData } = useMudasParaPlantar();
  const updateEstoque = useUpdateMudaParaPlantar();
  const addMudaParaPlantar = useAddMudaParaPlantar();
  const { isAreaLocked, canUnlockArea, lockArea, unlockArea } = useReportLock(selectedDateStr);
  const isJardinagemLocked = isAreaLocked("jardinagem");

  // Aggregate stock by species for PLANTIO species picker
  const estoqueByEspecie = useMemo(() => {
    if (!estoqueData) return new Map<string, { total: number; items: { id: string; quantidade: number }[] }>();
    const map = new Map<string, { total: number; items: { id: string; quantidade: number }[] }>();
    estoqueData.forEach((m) => {
      const key = m.especie.trim().toUpperCase();
      const existing = map.get(key) || { total: 0, items: [] };
      existing.total += m.quantidade;
      existing.items.push({ id: m.id, quantidade: m.quantidade });
      map.set(key, existing);
    });
    return map;
  }, [estoqueData]);

  const especiesDisponiveis = useMemo(() => {
    return Array.from(estoqueByEspecie.entries())
      .filter(([, v]) => v.total > 0)
      .map(([key, v]) => {
        const original = estoqueData?.find((m) => m.especie.trim().toUpperCase() === key);
        return { especie: original?.especie || key, disponivel: v.total };
      });
  }, [estoqueByEspecie, estoqueData]);

  

  // Form state
  const [localFaixa, setLocalFaixa] = useState("FAIXA 2");
  const [rocagem, setRocagem] = useState("");
  const [rocagemBerma, setRocagemBerma] = useState("");
  const [rocagemFaixa, setRocagemFaixa] = useState("");
  const [podagem, setPodagem] = useState("");
  const [podagemBerma, setPodagemBerma] = useState("");
  const [podagemFaixa, setPodagemFaixa] = useState("");
  const [cova, setCova] = useState("");
  const [covaBerma, setCovaBerma] = useState("");
  const [covaFaixa, setCovaFaixa] = useState("");
  const [coroamento, setCoroamento] = useState("");
  const [coroamentoBerma, setCoroamentoBerma] = useState("");
  const [coroamentoFaixa, setCoroamentoFaixa] = useState("");
  const [adubagem, setAdubagem] = useState("");
  const [adubagemBerma, setAdubagemBerma] = useState("");
  const [adubagemFaixa, setAdubagemFaixa] = useState("");
  const [plantio, setPlantio] = useState("");
  const [plantioBerma, setPlantioBerma] = useState("");
  const [plantioFaixa, setPlantioFaixa] = useState("");
  const [plantioEspecie, setPlantioEspecie] = useState("");
  const [limpezaManual, setLimpezaManual] = useState("");
  const [limpezaManualBerma, setLimpezaManualBerma] = useState("");
  const [limpezaManualFaixa, setLimpezaManualFaixa] = useState("");
  const [limpezaAssoprador, setLimpezaAssoprador] = useState("");
  const [limpezaAssopradorBerma, setLimpezaAssopradorBerma] = useState("");
  const [limpezaAssopradorFaixa, setLimpezaAssopradorFaixa] = useState("");
  const [manutencaoCanteiro, setManutencaoCanteiro] = useState("");
  const [invasoras, setInvasoras] = useState<InvasoraEntry[]>([{ nome: "", unidade: "", berma: "" }]);
  const [invasorasBerma, setInvasorasBerma] = useState("");
  const [invasorasFaixa, setInvasorasFaixa] = useState("");
  const [retiradaMudasUnidade, setRetiradaMudasUnidade] = useState("");
  const [retiradaMudasFaixa, setRetiradaMudasFaixa] = useState("");
  const [retiradaMudasBerma, setRetiradaMudasBerma] = useState("");
  const [manutencaoCanteiroFaixa, setManutencaoCanteiroFaixa] = useState("");
  const [manutencaoCanteiroBerma, setManutencaoCanteiroBerma] = useState("");
  const [atividadesManuaisFaixa, setAtividadesManuaisFaixa] = useState("");
  const [atividadesManuaisBerma, setAtividadesManuaisBerma] = useState("");
  
  // Plantio de Grama state
  const [plantioGrama, setPlantioGrama] = useState("");
  const [plantioGramaFaixa, setPlantioGramaFaixa] = useState("");
  const [plantioGramaBerma, setPlantioGramaBerma] = useState("");

  // Extra entries for multi-line activities
  const [extraEntries, setExtraEntries] = useState<Record<string, ActivityEntry[]>>({});
  
  const addExtraEntry = (key: string) => {
    setExtraEntries(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { value: "", faixa: "", berma: "" }],
    }));
  };
  
  const updateExtraEntry = (key: string, index: number, field: keyof ActivityEntry, val: string) => {
    setExtraEntries(prev => {
      const entries = [...(prev[key] || [])];
      entries[index] = { ...entries[index], [field]: val };
      return { ...prev, [key]: entries };
    });
  };
  
  const removeExtraEntry = (key: string, index: number) => {
    setExtraEntries(prev => {
      const entries = (prev[key] || []).filter((_, i) => i !== index);
      const next = { ...prev };
      if (entries.length === 0) delete next[key];
      else next[key] = entries;
      return next;
    });
  };
  
  // Atividades manuais state
  const [atividadesManuais, setAtividadesManuais] = useState("");
  
  // Irrigation state
  const [irrigacaoPipas, setIrrigacaoPipas] = useState(false);
  const [irrigacaoCarretel, setIrrigacaoCarretel] = useState(false);
  const [irrigacaoCarretelBermas, setIrrigacaoCarretelBermas] = useState<number[]>([]);
  
  // Photo state
  const [photos, setPhotos] = useState<string[]>([]);

  // Helper functions for invasoras
  const addInvasora = () => {
    setInvasoras([...invasoras, { nome: "", unidade: "", berma: "" }]);
  };

  const removeInvasora = (index: number) => {
    if (invasoras.length > 1) {
      setInvasoras(invasoras.filter((_, i) => i !== index));
    }
  };

  const updateInvasora = (index: number, field: keyof InvasoraEntry, value: string) => {
    const updated = [...invasoras];
    updated[index][field] = value;
    setInvasoras(updated);
  };

  // Parse invasoras from stored data
  const parseInvasorasFromStorage = (nome: string | null, unidade: number | null): InvasoraEntry[] => {
    if (!nome && !unidade) return [{ nome: "", unidade: "", berma: "" }];
    
    // Check if it's a JSON array
    if (nome && nome.startsWith("[")) {
      try {
        return JSON.parse(nome);
      } catch {
        return [{ nome: nome || "", unidade: unidade?.toString() || "", berma: "" }];
      }
    }
    
    return [{ nome: nome || "", unidade: unidade?.toString() || "", berma: "" }];
  };

  // Format invasoras for storage
  const formatInvasorasForStorage = (): { nome: string | undefined; unidade: number | undefined } => {
    const filtered = invasoras.filter(i => i.nome || i.unidade || i.berma);
    if (filtered.length === 0) return { nome: undefined, unidade: undefined };
    
    if (filtered.length === 1) {
      return {
        nome: filtered[0].nome || undefined,
        unidade: filtered[0].unidade ? parseInt(filtered[0].unidade) : undefined
      };
    }
    
    // Multiple entries: store as JSON and sum units
    const totalUnidade = filtered.reduce((sum, i) => sum + (parseInt(i.unidade) || 0), 0);
    return {
      nome: JSON.stringify(filtered),
      unidade: totalUnidade > 0 ? totalUnidade : undefined
    };
  };

  // Check access permission - can view if encarregado_geral, encarregado_i, planejador, engenheiro_planejamento, or admin
  const canView = authReady && (
    isAdmin || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_i" ||
    profile?.cargo === "planejador" ||
    profile?.cargo === "engenheiro_planejamento"
  );
  
  // Check edit permission - only encarregado_geral, encarregado_i, or admin can edit, and must not be locked
  const canEdit = authReady && !isJardinagemLocked && (
    isAdmin || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_i"
  );
  
  // Permission to edit ignoring lock (for save button logic)
  const hasEditPermission = authReady && (
    isAdmin || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_i"
  );

  // Load existing report when date changes
  useEffect(() => {
    if (existingReport) {
      setLocalFaixa(existingReport.local_faixa || "FAIXA 2");
      setRocagem(existingReport.rocagem_m2?.toString() || "");
      setRocagemBerma(existingReport.rocagem_berma || "");
      setRocagemFaixa(existingReport.rocagem_faixa || "");
      setPodagem(existingReport.podagem_unidade?.toString() || "");
      setPodagemBerma(existingReport.podagem_berma || "");
      setPodagemFaixa(existingReport.podagem_faixa || "");
      setCova(existingReport.cova_unidade?.toString() || "");
      setCovaBerma(existingReport.cova_berma || "");
      setCovaFaixa(existingReport.cova_faixa || "");
      setCoroamento(existingReport.coroamento_unidade?.toString() || "");
      setCoroamentoBerma(existingReport.coroamento_berma || "");
      setCoroamentoFaixa(existingReport.coroamento_faixa || "");
      setAdubagem(existingReport.adubagem_unidade?.toString() || "");
      setAdubagemBerma(existingReport.adubagem_berma || "");
      setAdubagemFaixa(existingReport.adubagem_faixa || "");
      setPlantio(existingReport.plantio_unidade?.toString() || "");
      setPlantioBerma(existingReport.plantio_berma || "");
      setPlantioFaixa(existingReport.plantio_faixa || "");
      setPlantioEspecie((existingReport as any).plantio_especie || "");
      setLimpezaManual(existingReport.limpeza_manual_m2?.toString() || "");
      setLimpezaManualBerma(existingReport.limpeza_manual_berma || "");
      setLimpezaManualFaixa(existingReport.limpeza_manual_faixa || "");
      setLimpezaAssoprador(existingReport.limpeza_assoprador_m2?.toString() || "");
      setLimpezaAssopradorBerma(existingReport.limpeza_assoprador_berma || "");
      setLimpezaAssopradorFaixa(existingReport.limpeza_assoprador_faixa || "");
      setManutencaoCanteiro(existingReport.manutencao_canteiro || "");
      setManutencaoCanteiroFaixa(existingReport.manutencao_canteiro_faixa || "");
      setManutencaoCanteiroBerma(existingReport.manutencao_canteiro_berma || "");
      setInvasoras(parseInvasorasFromStorage(existingReport.controle_invasoras_nome, existingReport.controle_invasoras_unidade));
      setInvasorasBerma(existingReport.controle_invasoras_berma || "");
      setInvasorasFaixa(existingReport.controle_invasoras_faixa || "");
      setRetiradaMudasUnidade(existingReport.retirada_mudas_unidade?.toString() || "");
      setRetiradaMudasFaixa(existingReport.retirada_mudas_faixa || "");
      setRetiradaMudasBerma(existingReport.retirada_mudas_berma || "");
      setIrrigacaoPipas(existingReport.irrigacao_pipas || false);
      setIrrigacaoCarretel(existingReport.irrigacao_carretel || false);
      setIrrigacaoCarretelBermas(existingReport.irrigacao_carretel_bermas || []);
      setPlantioGrama(existingReport.plantio_grama_m2?.toString() || "");
      setPlantioGramaFaixa(existingReport.plantio_grama_faixa || "");
      setPlantioGramaBerma(existingReport.plantio_grama_berma || "");
      setAtividadesManuais(existingReport.atividades_manuais || "");
      setAtividadesManuaisFaixa(existingReport.atividades_manuais_faixa || "");
      setAtividadesManuaisBerma(existingReport.atividades_manuais_berma || "");
      setPhotos(existingReport.photo_urls || []);
      setExtraEntries((existingReport.extra_entries as any) || {});
    } else {
      setLocalFaixa("FAIXA 2");
      setRocagem(""); setRocagemBerma(""); setRocagemFaixa("");
      setPodagem(""); setPodagemBerma(""); setPodagemFaixa("");
      setCova(""); setCovaBerma(""); setCovaFaixa("");
      setCoroamento(""); setCoroamentoBerma(""); setCoroamentoFaixa("");
      setAdubagem(""); setAdubagemBerma(""); setAdubagemFaixa("");
      setPlantio(""); setPlantioBerma(""); setPlantioFaixa("");
      setPlantioEspecie("");
      setLimpezaManual(""); setLimpezaManualBerma(""); setLimpezaManualFaixa("");
      setLimpezaAssoprador(""); setLimpezaAssopradorBerma(""); setLimpezaAssopradorFaixa("");
      setManutencaoCanteiro(""); setManutencaoCanteiroFaixa(""); setManutencaoCanteiroBerma("");
      setInvasoras([{ nome: "", unidade: "", berma: "" }]);
      setInvasorasBerma(""); setInvasorasFaixa("");
      setRetiradaMudasUnidade(""); setRetiradaMudasFaixa(""); setRetiradaMudasBerma("");
      setIrrigacaoPipas(false); setIrrigacaoCarretel(false); setIrrigacaoCarretelBermas([]);
      setPlantioGrama(""); setPlantioGramaFaixa(""); setPlantioGramaBerma("");
      setAtividadesManuais(""); setAtividadesManuaisFaixa(""); setAtividadesManuaisBerma("");
      setPhotos([]); setExtraEntries({});
    }
  }, [existingReport, selectedDateStr]);

  // Show loading while checking permissions
  if (!authReady || isLoadingProfile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // Redirect if no view access
  if (!canView) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Leaf className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-muted-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Esta página é visível apenas para Administradores, Encarregado Geral e Encarregado I.
          </p>
          <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
        </div>
      </Layout>
    );
  }

  const formattedDate = format(selectedDate, "dd/MM/yy (EEEE)", { locale: ptBR });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const handleSave = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar.");
      return;
    }

    if (!localFaixa) {
      toast.error("Selecione a Faixa.");
      return;
    }

    try {
      const invasorasData = formatInvasorasForStorage();
      await saveReport.mutateAsync({
        report_date: selectedDateStr,
        local_faixa: localFaixa,
        rocagem_m2: rocagem ? parseFloat(rocagem) : null,
        rocagem_berma: rocagemBerma || null,
        rocagem_faixa: rocagemFaixa || null,
        podagem_unidade: podagem ? parseInt(podagem) : null,
        podagem_berma: podagemBerma || null,
        podagem_faixa: podagemFaixa || null,
        cova_unidade: cova ? parseInt(cova) : null,
        cova_berma: covaBerma || null,
        cova_faixa: covaFaixa || null,
        coroamento_unidade: coroamento ? parseInt(coroamento) : null,
        coroamento_berma: coroamentoBerma || null,
        coroamento_faixa: coroamentoFaixa || null,
        adubagem_unidade: adubagem ? parseInt(adubagem) : null,
        adubagem_berma: adubagemBerma || null,
        adubagem_faixa: adubagemFaixa || null,
        plantio_unidade: plantio ? parseInt(plantio) : null,
        plantio_berma: plantioBerma || null,
        plantio_faixa: plantioFaixa || null,
        plantio_especie: plantioEspecie || null,
        limpeza_manual_m2: limpezaManual ? parseFloat(limpezaManual) : null,
        limpeza_manual_berma: limpezaManualBerma || null,
        limpeza_manual_faixa: limpezaManualFaixa || null,
        limpeza_assoprador_m2: limpezaAssoprador ? parseFloat(limpezaAssoprador) : null,
        limpeza_assoprador_berma: limpezaAssopradorBerma || null,
        limpeza_assoprador_faixa: limpezaAssopradorFaixa || null,
        manutencao_canteiro: manutencaoCanteiro || null,
        manutencao_canteiro_faixa: manutencaoCanteiroFaixa || null,
        manutencao_canteiro_berma: manutencaoCanteiroBerma || null,
        controle_invasoras_unidade: invasorasData.unidade,
        controle_invasoras_nome: invasorasData.nome,
        controle_invasoras_berma: invasorasBerma || null,
        controle_invasoras_faixa: invasorasFaixa || null,
        retirada_mudas_unidade: retiradaMudasUnidade ? parseInt(retiradaMudasUnidade) : null,
        retirada_mudas_faixa: retiradaMudasFaixa || null,
        retirada_mudas_berma: retiradaMudasBerma || null,
        irrigacao_pipas: irrigacaoPipas,
        irrigacao_carretel: irrigacaoCarretel,
        irrigacao_carretel_bermas: irrigacaoCarretel && irrigacaoCarretelBermas.length > 0 ? irrigacaoCarretelBermas : null,
        plantio_grama_m2: plantioGrama ? parseFloat(plantioGrama) : null,
        plantio_grama_faixa: plantioGramaFaixa || null,
        plantio_grama_berma: plantioGramaBerma || null,
        atividades_manuais: atividadesManuais || null,
        atividades_manuais_faixa: atividadesManuaisFaixa || null,
        atividades_manuais_berma: atividadesManuaisBerma || null,
        photo_urls: photos.length > 0 ? photos : null,
        extra_entries: Object.keys(extraEntries).length > 0 ? extraEntries : null,
      });
      
      // Invalidate queries to ensure UI sync
      queryClient.invalidateQueries({ queryKey: ["jardinagem-report", selectedDateStr] });
      queryClient.invalidateQueries({ queryKey: ["jardinagem-reports"] });

      
      // If editing an existing report, restore old plantio values to stock first
      if (existingReport) {
        await restoreStockFromReport(existingReport as JardinagemReport);
      }

      // Fetch fresh stock data directly from DB (after potential restore)
      const { data: freshEstoque } = await supabase
        .from("mudas_para_plantar")
        .select("*")
        .order("created_at", { ascending: false });

      // Build a mutable copy of stock quantities to track cumulative deductions
      const mutableStock = new Map<string, { id: string; quantidade: number }[]>();
      if (freshEstoque) {
        for (const item of freshEstoque) {
          const key = item.especie.trim().toUpperCase();
          if (!mutableStock.has(key)) mutableStock.set(key, []);
          mutableStock.get(key)!.push({ id: item.id, quantidade: item.quantidade });
        }
      }

      const deductFromStock = async (especie: string, qtd: number) => {
        const items = mutableStock.get(especie.trim().toUpperCase());
        if (!items || qtd <= 0) return;
        let remaining = qtd;
        for (const item of items) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, item.quantidade);
          if (deduct <= 0) continue;
          item.quantidade -= deduct;
          await updateEstoque.mutateAsync({
            id: item.id,
            quantidade: item.quantidade,
          });
          remaining -= deduct;
        }
      };

      // Deduct stock if plantio has species and quantity
      const plantioQtd = plantio ? parseInt(plantio) : 0;
      if (plantioEspecie && plantioQtd > 0) {
        await deductFromStock(plantioEspecie, plantioQtd);
      }

      // Deduct stock for extra plantio entries with species
      for (const entry of (extraEntries["plantio"] || [])) {
        const extraQtd = entry.value ? parseInt(entry.value) : 0;
        if (entry.especie && extraQtd > 0) {
          await deductFromStock(entry.especie, extraQtd);
        }
      }
      // Auto-lock after saving
      if (!isJardinagemLocked) {
        await lockArea.mutateAsync("jardinagem");
      }

      toast.success("Atividades salvas e bloqueadas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  // Generate RDO summary for WhatsApp
  const generateRDOSummary = () => {
    const formattedDateStr = format(selectedDate, "dd/MM/yyyy");
    
    let summary = `${E.EMOJI_CALENDAR} *RDO JARDINAGEM - ${formattedDateStr}*\n\n`;
    summary += `${E.EMOJI_PIN} *Local:* ${localFaixa}\n\n`;
    summary += `${E.EMOJI_SEEDLING} *Atividades Realizadas:*\n`;
    
    const lines: string[] = [];
    const formatBerma = (berma: string): string => berma ? ` (${bermaLabel(berma)})` : "";
    const formatFaixa = (faixa: string): string => faixa ? ` - ${faixa}` : "";

    const appendExtras = (key: string, label: string, unit: string) => {
      (extraEntries[key] || []).forEach(entry => {
        const v = parseFloat(entry.value);
        if (!v || v <= 0) return;
        const bermaText = entry.berma ? ` (${bermaLabel(entry.berma)})` : "";
        const faixaText = entry.faixa ? ` - ${entry.faixa}` : "";
        lines.push(`* ${label} - ${entry.value} ${unit}${bermaText}${faixaText}`);
      });
    };
    
    if (rocagem && parseFloat(rocagem) > 0) {
      lines.push(`* Roçagem - ${rocagem} m²${formatBerma(rocagemBerma)}${formatFaixa(rocagemFaixa)}`);
    }
    appendExtras("rocagem", "Roçagem", "m²");

    if (podagem && parseInt(podagem) > 0) {
      lines.push(`* Podagem - ${podagem} unidade(s)${formatBerma(podagemBerma)}${formatFaixa(podagemFaixa)}`);
    }
    appendExtras("podagem", "Podagem", "unidade(s)");

    if (cova && parseInt(cova) > 0) {
      lines.push(`* Cova - ${cova} unidade(s)${formatBerma(covaBerma)}${formatFaixa(covaFaixa)}`);
    }
    appendExtras("cova", "Cova", "unidade(s)");


    if (coroamento && parseInt(coroamento) > 0) {
      lines.push(`* Coroamento - ${coroamento} unidade(s)${formatBerma(coroamentoBerma)}${formatFaixa(coroamentoFaixa)}`);
    }
    appendExtras("coroamento", "Coroamento", "unidade(s)");

    if (adubagem && parseInt(adubagem) > 0) {
      lines.push(`* Adubagem - ${adubagem} unidade(s)${formatBerma(adubagemBerma)}${formatFaixa(adubagemFaixa)}`);
    }
    appendExtras("adubagem", "Adubagem", "unidade(s)");

    if (plantio && parseInt(plantio) > 0) {
      lines.push(`* Plantio${plantioEspecie ? ` (${plantioEspecie})` : ""} - ${plantio} unidade(s)${formatBerma(plantioBerma)}${formatFaixa(plantioFaixa)}`);
    }
    // Plantio extras with species
    (extraEntries["plantio"] || []).forEach(entry => {
      const v = parseFloat(entry.value);
      if (!v || v <= 0) return;
      const especieText = entry.especie ? ` (${entry.especie})` : "";
      const bermaText = entry.berma ? ` (${bermaLabel(entry.berma)})` : "";
      const faixaText = entry.faixa ? ` - ${entry.faixa}` : "";
      lines.push(`* Plantio${especieText} - ${entry.value} unidade(s)${bermaText}${faixaText}`);
    });

    if (limpezaManual && parseFloat(limpezaManual) > 0) {
      lines.push(`* Limpeza Manual - ${limpezaManual} m²${formatBerma(limpezaManualBerma)}${formatFaixa(limpezaManualFaixa)}`);
    }
    appendExtras("limpezaManual", "Limpeza Manual", "m²");

    if (limpezaAssoprador && parseFloat(limpezaAssoprador) > 0) {
      lines.push(`* Limpeza com Soprador - ${limpezaAssoprador} m²${formatBerma(limpezaAssopradorBerma)}${formatFaixa(limpezaAssopradorFaixa)}`);
    }
    appendExtras("limpezaAssoprador", "Limpeza com Soprador", "m²");

    const filteredInvasoras = invasoras.filter(i => i.unidade && parseInt(i.unidade) > 0);
    filteredInvasoras.forEach(inv => {
      const nomeText = inv.nome ? ` (${inv.nome})` : "";
      const faixaText = invasorasFaixa ? ` - ${invasorasFaixa}` : "";
      lines.push(`* Controle de Invasoras${nomeText} - ${inv.unidade} unidade(s)${formatBerma(invasorasBerma)}${faixaText}`);
    });
    
    if (retiradaMudasUnidade && parseInt(retiradaMudasUnidade) > 0) {
      const faixaText = retiradaMudasFaixa ? ` - ${retiradaMudasFaixa}` : "";
      const bermaText = retiradaMudasBerma ? ` (${bermaLabel(retiradaMudasBerma)})` : "";
      lines.push(`* Retirada de Mudas (Árvores) - ${retiradaMudasUnidade} unidade(s)${bermaText}${faixaText}`);
    }
    if (manutencaoCanteiro && manutencaoCanteiro.trim()) {
      const faixaText = manutencaoCanteiroFaixa ? ` - ${manutencaoCanteiroFaixa}` : "";
      const bermaText = manutencaoCanteiroBerma ? ` (${bermaLabel(manutencaoCanteiroBerma)})` : "";
      lines.push(`* Manutenção de Canteiro: ${manutencaoCanteiro}${bermaText}${faixaText}`);
    }
    if (plantioGrama && parseFloat(plantioGrama) > 0) {
      const faixaText = plantioGramaFaixa ? ` - ${plantioGramaFaixa}` : "";
      const bermaText = plantioGramaBerma ? ` (${bermaLabel(plantioGramaBerma)})` : "";
      lines.push(`* Plantio de Grama - ${plantioGrama} m²${bermaText}${faixaText}`);
    }
    appendExtras("plantioGrama", "Plantio de Grama", "m²");

    if (atividadesManuais && atividadesManuais.trim()) {
      const faixaText = atividadesManuaisFaixa ? ` - ${atividadesManuaisFaixa}` : "";
      const bermaText = atividadesManuaisBerma ? ` (${bermaLabel(atividadesManuaisBerma)})` : "";
      atividadesManuais.split("\n").forEach((l) => {
        const t = l.trim();
        if (t) lines.push(`* ${t}${bermaText}${faixaText}`);
      });
    }
    if (irrigacaoPipas) lines.push(`* Irrigação com Pipas nas Faixas 3 e 4 e Mirante`);
    if (irrigacaoCarretel && irrigacaoCarretelBermas.length > 0) {
      const bermasText = irrigacaoCarretelBermas.sort((a, b) => a - b).join(", ");
      lines.push(`* Irrigação com Carretel (Bermas: ${bermasText})`);
    } else if (irrigacaoCarretel) {
      lines.push(`* Irrigação com Carretel`);
    }

    // Add mudas plantadas do dia
    if (mudasPlantadasDoDia && mudasPlantadasDoDia.length > 0) {
      mudasPlantadasDoDia.forEach((m) => {
        let local = "";
        if (m.faixa) local += ` - ${m.faixa}`;
        if (m.berma) local += ` (${bermaLabel(m.berma)})`;
        lines.push(`* Mudas Plantadas: ${m.especie} - ${m.quantidade} unidade(s)${local}`);
      });
    }
    
    if (lines.length > 0) {
      lines.forEach(line => {
        summary += `${line}\n`;
      });
    } else {
      summary += "Nenhuma atividade registrada\n";
    }
    
    return summary;
  };

  const handleWhatsAppReport = async () => {
    const summary = generateRDOSummary();
    const ok = await copyAndShareWhatsApp(summary);
    if (ok) toast.success("Enviado para WhatsApp!");
    else toast.error("Erro ao compartilhar");
  };

  const handleCopyReport = async () => {
    const summary = generateRDOSummary();
    const ok = await copyToClipboard(summary);
    if (ok) toast.success("Relatório copiado!");
    else toast.error("Erro ao copiar relatório");
  };

  const restoreStockFromReport = async (report: JardinagemReport) => {
    const addBack = async (especie: string, qtd: number) => {
      if (!especie || qtd <= 0) return;
      const key = especie.trim().toUpperCase();
      const items = mutableStockForRestore(key);
      if (items.length > 0) {
        // Add back to the first matching stock item
        await updateEstoque.mutateAsync({
          id: items[0].id,
          quantidade: items[0].quantidade + qtd,
        });
      } else {
        // Re-create stock entry if it was fully consumed
        await addMudaParaPlantar.mutateAsync({
          especie: especie.trim(),
          quantidade: qtd,
        });
      }
    };

    // Restore main plantio
    if (report.plantio_especie && report.plantio_unidade && report.plantio_unidade > 0) {
      await addBack(report.plantio_especie, report.plantio_unidade);
    }

    // Restore extra plantio entries
    const extras = report.extra_entries as Record<string, { value: string; faixa: string; berma: string; especie?: string }[]> | null;
    if (extras?.plantio) {
      for (const entry of extras.plantio) {
        const qtd = entry.value ? parseInt(entry.value) : 0;
        if (entry.especie && qtd > 0) {
          await addBack(entry.especie, qtd);
        }
      }
    }
  };

  const mutableStockForRestore = (key: string) => {
    if (!estoqueData) return [];
    return estoqueData.filter(item => item.especie.trim().toUpperCase() === key);
  };

  // When unlocking, restore the stock to the state it had BEFORE the last save.
  // This way, the deducted seedlings come back, and saving again will deduct fresh.
  const handleUnlock = async () => {
    try {
      if (existingReport) {
        await restoreStockFromReport(existingReport as JardinagemReport);
      }
      await unlockArea.mutateAsync("jardinagem");
      toast.success("Área desbloqueada e estoque de mudas restaurado!");
    } catch (error: any) {
      toast.error("Erro ao desbloquear: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!existingReport) return;
    
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;

    try {
      // Restore stock before deleting
      await restoreStockFromReport(existingReport as JardinagemReport);
      
      await deleteReport.mutateAsync(existingReport.id);
      // Reset all form state after deletion
      setRocagem(""); setRocagemBerma(""); setRocagemFaixa("");
      setPodagem(""); setPodagemBerma(""); setPodagemFaixa("");
      setCova(""); setCovaBerma(""); setCovaFaixa("");
      setCoroamento(""); setCoroamentoBerma(""); setCoroamentoFaixa("");
      setAdubagem(""); setAdubagemBerma(""); setAdubagemFaixa("");
      setPlantio(""); setPlantioBerma(""); setPlantioFaixa("");
      setLimpezaManual(""); setLimpezaManualBerma(""); setLimpezaManualFaixa("");
      setLimpezaAssoprador(""); setLimpezaAssopradorBerma(""); setLimpezaAssopradorFaixa("");
      setManutencaoCanteiro(""); setManutencaoCanteiroFaixa(""); setManutencaoCanteiroBerma("");
      setInvasoras([{ nome: "", unidade: "" }]); setInvasorasBerma(""); setInvasorasFaixa("");
      setRetiradaMudasUnidade(""); setRetiradaMudasFaixa(""); setRetiradaMudasBerma("");
      setPlantioGrama(""); setPlantioGramaFaixa(""); setPlantioGramaBerma("");
      setAtividadesManuais(""); setAtividadesManuaisFaixa(""); setAtividadesManuaisBerma("");
      setIrrigacaoPipas(false);
      setIrrigacaoCarretel(false);
      setIrrigacaoCarretelBermas([]);
      setPhotos([]);
      setExtraEntries({});
      setLocalFaixa("FAIXA 2");
      toast.success("Registro excluído e estoque restaurado!");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  // Get dates with reports for calendar highlighting
  const datesWithReports = allReports?.map((r) => r.report_date) || [];

  const getFaixaLabel = (value: string) => {
    return FAIXA_OPTIONS.find((f) => f.value === value)?.label || value;
  };


  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Read-only banner */}
        {!hasEditPermission && <ReadOnlyBanner message="Você está visualizando esta página em modo somente leitura. Apenas Administradores, Encarregado Geral e Encarregado I podem editar." />}
        {isJardinagemLocked && hasEditPermission && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <Lock className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-500">
              Relatório bloqueado. Clique em "Desbloquear" para editar novamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs defaultValue="jardinagem" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="jardinagem" className="gap-2">
              <Leaf className="h-4 w-4" />
              Jardinagem
            </TabsTrigger>
            <TabsTrigger value="mudas-plantar" className="gap-2">
              <TreePine className="h-4 w-4" />
              Mudas para Plantar
            </TabsTrigger>
            <TabsTrigger value="cronograma-mirante" className="gap-2">
              <Calendar className="h-4 w-4" />
              Cronograma Limpeza do Mirante
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mudas-plantar" className="mt-4">
            <MudasParaPlantarTab canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="cronograma-mirante" className="mt-4">
            <CronogramaLimpezaMiranteTab />
          </TabsContent>

          <TabsContent value="jardinagem" className="mt-4 space-y-4 sm:space-y-6">

        {/* Resumo de metas do mês */}
        <JardinagemMetasSummary />

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-600/20 flex items-center justify-center shrink-0">
              <Leaf className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            </div>
            <div className="min-w-0">
              <EditablePageTitle pageKey="atividades" defaultValue="Atividades - Jardinagem" className="text-lg sm:text-2xl font-bold" />
              <p className="text-sm text-muted-foreground truncate">{capitalizedDate}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(selectedDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  modifiers={{
                    hasReport: datesWithReports.map((d) => parseISO(d)),
                  }}
                  modifiersStyles={{
                    hasReport: {
                      backgroundColor: "hsl(var(--primary) / 0.2)",
                      fontWeight: "bold",
                    },
                  }}
                />
              </PopoverContent>
            </Popover>

            {/* History Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <History className="h-4 w-4" />
                  Histórico
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Histórico de Atividades</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                  {allReports?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum registro salvo ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {allReports?.map((report) => (
                        <button
                          key={report.id}
                          onClick={() => {
                            setSelectedDate(parseISO(report.report_date));
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            report.report_date === selectedDateStr
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-secondary"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {format(parseISO(report.report_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {getFaixaLabel(report.local_faixa)}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {getFaixaLabel(report.local_faixa)}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Monthly Report Dialog */}
            <MonthlyReportDialog
              reports={allReports || []}
              type="jardinagem"
              getLocationLabel={(report) => report.local_faixa || "Sem local"}
              formatReportPreview={(report) => {
                const lines = [];
                const formatBerma = (berma: any) => berma ? ` (${bermaLabel(berma)})` : "";
                const formatFaixa = (faixa: any) => faixa ? ` - ${faixa}` : "";
                
                if (report.rocagem_m2 && parseFloat(report.rocagem_m2) > 0) {
                  lines.push(`* Roçagem - ${report.rocagem_m2} m²${formatBerma(report.rocagem_berma)}${formatFaixa(report.rocagem_faixa)}`);
                }
                if (report.podagem_unidade && parseInt(report.podagem_unidade) > 0) {
                  lines.push(`* Podagem - ${report.podagem_unidade} unidade(s)${formatBerma(report.podagem_berma)}${formatFaixa(report.podagem_faixa)}`);
                }
                if (report.cova_unidade && parseInt(report.cova_unidade) > 0) {
                  lines.push(`* Cova - ${report.cova_unidade} unidade(s)${formatBerma(report.cova_berma)}${formatFaixa(report.cova_faixa)}`);
                }
                if (report.coroamento_unidade && parseInt(report.coroamento_unidade) > 0) {
                  lines.push(`* Coroamento - ${report.coroamento_unidade} unidade(s)${formatBerma(report.coroamento_berma)}${formatFaixa(report.coroamento_faixa)}`);
                }
                if (report.adubagem_unidade && parseInt(report.adubagem_unidade) > 0) {
                  lines.push(`* Adubagem - ${report.adubagem_unidade} unidade(s)${formatBerma(report.adubagem_berma)}${formatFaixa(report.adubagem_faixa)}`);
                }
                if (report.plantio_unidade && parseInt(report.plantio_unidade) > 0) {
                  lines.push(`* Plantio - ${report.plantio_unidade} unidade(s)${formatBerma(report.plantio_berma)}${formatFaixa(report.plantio_faixa)}`);
                }
                if (report.limpeza_manual_m2 && parseFloat(report.limpeza_manual_m2) > 0) {
                  lines.push(`* Limpeza Manual - ${report.limpeza_manual_m2} m²${formatBerma(report.limpeza_manual_berma)}${formatFaixa(report.limpeza_manual_faixa)}`);
                }
                if (report.limpeza_assoprador_m2 && parseFloat(report.limpeza_assoprador_m2) > 0) {
                  lines.push(`* Limpeza com Soprador - ${report.limpeza_assoprador_m2} m²${formatBerma(report.limpeza_assoprador_berma)}${formatFaixa(report.limpeza_assoprador_faixa)}`);
                }
                if (report.controle_invasoras_unidade && parseInt(report.controle_invasoras_unidade) > 0) {
                  const faixaText = report.controle_invasoras_faixa ? ` - ${report.controle_invasoras_faixa}` : "";
                  lines.push(`* Controle de Invasoras${report.controle_invasoras_nome ? ` (${report.controle_invasoras_nome})` : ""} - ${report.controle_invasoras_unidade} unidade(s)${formatBerma(report.controle_invasoras_berma)}${faixaText}`);
                }
                if (report.retirada_mudas_unidade && parseInt(report.retirada_mudas_unidade) > 0) {
                  const faixaText = report.retirada_mudas_faixa ? ` - ${report.retirada_mudas_faixa}` : "";
                  lines.push(`* Retirada de Mudas - ${report.retirada_mudas_unidade} unidade(s)${formatBerma(report.retirada_mudas_berma)}${faixaText}`);
                }
                if (report.manutencao_canteiro) {
                  const faixaText = report.manutencao_canteiro_faixa ? ` - ${report.manutencao_canteiro_faixa}` : "";
                  lines.push(`* Manutenção de Canteiro: ${report.manutencao_canteiro}${formatBerma(report.manutencao_canteiro_berma)}${faixaText}`);
                }
                return lines.length > 0 ? lines.join("\n") : "Nenhuma atividade registrada";
              }}
            />

            {/* Unlock button when locked */}
            {isJardinagemLocked && hasEditPermission && (
              <Button 
                variant="outline" 
                onClick={handleUnlock}
                disabled={unlockArea.isPending}
                className="gap-2"
              >
                {unlockArea.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                Desbloquear
              </Button>
            )}

            {existingReport && canEdit && (
              <Button variant="destructive" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <Button onClick={() => handleSave()} disabled={saveReport.isPending || !hasEditPermission || isJardinagemLocked} variant="outline">
              {saveReport.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>

            <Button 
              onClick={handleWhatsAppReport} 
              variant="outline"
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
              WhatsApp
            </Button>
            <Button 
              onClick={handleCopyReport} 
              variant="outline"
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
          </div>
        </div>

        {isLoadingReport && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-500" />
                Relatório de Atividades
              </CardTitle>
              <CardDescription>
                Preencha os dados das atividades de jardinagem do dia. 
                Estes dados serão enviados automaticamente para o RDO.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Activity Fields */}
              <div className="space-y-4">
                {/* Roçagem */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-0">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_auto] gap-3">
                    <div className="space-y-2">
                      <Label>ROÇAGEM (m²)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rocagem}
                        onChange={(e) => setRocagem(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Faixa</Label>
                      <Select value={rocagemFaixa} onValueChange={setRocagemFaixa}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {FAIXA_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Berma</Label>
                      <Select 
                        value={rocagemBerma || "none"} 
                        onValueChange={(val) => setRocagemBerma(val === "none" ? "" : val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Berma">
                            {rocagemBerma ? BERMA_OPTIONS.find(o => o.value === rocagemBerma)?.label : "Berma"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione</SelectItem>
                          {BERMA_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <AddMoreButton activityKey="rocagem" onAdd={addExtraEntry} />
                    </div>
                  </div>
                  <ExtraActivityEntries
                    activityKey="rocagem"
                    entries={extraEntries.rocagem || []}
                    onAdd={addExtraEntry}
                    onUpdate={updateExtraEntry}
                    onRemove={removeExtraEntry}
                    faixaOptions={FAIXA_OPTIONS}
                    bermaOptions={BERMA_OPTIONS}
                    inputType="number"
                    step="0.01"
                  />
                </div>

                {/* Roçagem (unidade) */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-0">
                  <div className="flex items-center justify-between">
                    <Label>ROÇAGEM ASPERSORES (Unidades)</Label>
                    <AddMoreButton activityKey="rocagemUnidade" onAdd={addExtraEntry} />
                  </div>
                  <ExtraActivityEntries
                    activityKey="rocagemUnidade"
                    entries={extraEntries.rocagemUnidade || []}
                    onAdd={addExtraEntry}
                    onUpdate={updateExtraEntry}
                    onRemove={removeExtraEntry}
                    faixaOptions={FAIXA_OPTIONS}
                    bermaOptions={BERMA_OPTIONS}
                    inputType="number"
                    step="1"
                  />
                </div>


                {/* Podagem */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>PODAGEM (Unidade)</Label>
                    <AddMoreButton activityKey="podagem" onAdd={addExtraEntry} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3">
                    <Input type="number" min="0" value={podagem} onChange={(e) => setPodagem(e.target.value)} placeholder="0" />
                    <Select value={podagemFaixa} onValueChange={setPodagemFaixa}><SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger><SelectContent>{FAIXA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                    <Select value={podagemBerma || "none"} onValueChange={(val) => setPodagemBerma(val === "none" ? "" : val)}><SelectTrigger><SelectValue placeholder="Berma">{podagemBerma ? BERMA_OPTIONS.find(o => o.value === podagemBerma)?.label : "Berma"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="none">Selecione</SelectItem>{BERMA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                  </div>
                  <ExtraActivityEntries activityKey="podagem" entries={extraEntries.podagem || []} onAdd={addExtraEntry} onUpdate={updateExtraEntry} onRemove={removeExtraEntry} faixaOptions={FAIXA_OPTIONS} bermaOptions={BERMA_OPTIONS} />
                </div>

                {/* Cova */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>COVA (Unidade)</Label>
                    <AddMoreButton activityKey="cova" onAdd={addExtraEntry} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3">
                    <Input type="number" min="0" value={cova} onChange={(e) => setCova(e.target.value)} placeholder="0" />
                    <Select value={covaFaixa} onValueChange={setCovaFaixa}><SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger><SelectContent>{FAIXA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                    <Select value={covaBerma || "none"} onValueChange={(val) => setCovaBerma(val === "none" ? "" : val)}><SelectTrigger><SelectValue placeholder="Berma">{covaBerma ? BERMA_OPTIONS.find(o => o.value === covaBerma)?.label : "Berma"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="none">Selecione</SelectItem>{BERMA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                  </div>
                  <ExtraActivityEntries activityKey="cova" entries={extraEntries.cova || []} onAdd={addExtraEntry} onUpdate={updateExtraEntry} onRemove={removeExtraEntry} faixaOptions={FAIXA_OPTIONS} bermaOptions={BERMA_OPTIONS} />
                </div>

                {/* Coroamento */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>COROAMENTO (Unidade)</Label>
                    <AddMoreButton activityKey="coroamento" onAdd={addExtraEntry} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3">
                    <Input type="number" min="0" value={coroamento} onChange={(e) => setCoroamento(e.target.value)} placeholder="0" />
                    <Select value={coroamentoFaixa} onValueChange={setCoroamentoFaixa}><SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger><SelectContent>{FAIXA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                    <Select value={coroamentoBerma || "none"} onValueChange={(val) => setCoroamentoBerma(val === "none" ? "" : val)}><SelectTrigger><SelectValue placeholder="Berma">{coroamentoBerma ? BERMA_OPTIONS.find(o => o.value === coroamentoBerma)?.label : "Berma"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="none">Selecione</SelectItem>{BERMA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                  </div>
                  <ExtraActivityEntries activityKey="coroamento" entries={extraEntries.coroamento || []} onAdd={addExtraEntry} onUpdate={updateExtraEntry} onRemove={removeExtraEntry} faixaOptions={FAIXA_OPTIONS} bermaOptions={BERMA_OPTIONS} />
                </div>

                {/* Adubagem */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>ADUBAGEM (Unidade)</Label>
                    <AddMoreButton activityKey="adubagem" onAdd={addExtraEntry} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3">
                    <Input type="number" min="0" value={adubagem} onChange={(e) => setAdubagem(e.target.value)} placeholder="0" />
                    <Select value={adubagemFaixa} onValueChange={setAdubagemFaixa}><SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger><SelectContent>{FAIXA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                    <Select value={adubagemBerma || "none"} onValueChange={(val) => setAdubagemBerma(val === "none" ? "" : val)}><SelectTrigger><SelectValue placeholder="Berma">{adubagemBerma ? BERMA_OPTIONS.find(o => o.value === adubagemBerma)?.label : "Berma"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="none">Selecione</SelectItem>{BERMA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                  </div>
                  <ExtraActivityEntries activityKey="adubagem" entries={extraEntries.adubagem || []} onAdd={addExtraEntry} onUpdate={updateExtraEntry} onRemove={removeExtraEntry} faixaOptions={FAIXA_OPTIONS} bermaOptions={BERMA_OPTIONS} />
                </div>

                {/* Plantio */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>PLANTIO (Unidade)</Label>
                    <AddMoreButton activityKey="plantio" onAdd={addExtraEntry} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_140px] gap-3">
                    <Select value={plantioEspecie} onValueChange={setPlantioEspecie}>
                      <SelectTrigger><SelectValue placeholder="Espécie" /></SelectTrigger>
                      <SelectContent>
                        {especiesDisponiveis.length === 0 ? (
                          <SelectItem value="__empty" disabled>Sem estoque</SelectItem>
                        ) : (
                          especiesDisponiveis.map((e) => (
                            <SelectItem key={e.especie} value={e.especie}>
                              {e.especie} ({e.disponivel} disp.)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Input type="number" min="0" value={plantio} onChange={(e) => setPlantio(e.target.value)} placeholder="0" />
                    <Select value={plantioFaixa} onValueChange={setPlantioFaixa}><SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger><SelectContent>{FAIXA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                    <Select value={plantioBerma || "none"} onValueChange={(val) => setPlantioBerma(val === "none" ? "" : val)}><SelectTrigger><SelectValue placeholder="Berma">{plantioBerma ? BERMA_OPTIONS.find(o => o.value === plantioBerma)?.label : "Berma"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="none">Selecione</SelectItem>{BERMA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                  </div>
                  <ExtraActivityEntries activityKey="plantio" entries={extraEntries.plantio || []} onAdd={addExtraEntry} onUpdate={updateExtraEntry} onRemove={removeExtraEntry} faixaOptions={FAIXA_OPTIONS} bermaOptions={BERMA_OPTIONS} showEspecie especiesDisponiveis={especiesDisponiveis} />
                </div>

                {/* Limpeza Manual */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>LIMPEZA MANUAL (m²)</Label>
                    <AddMoreButton activityKey="limpezaManual" onAdd={addExtraEntry} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3">
                    <Input type="number" min="0" step="0.01" value={limpezaManual} onChange={(e) => setLimpezaManual(e.target.value)} placeholder="0.00" />
                    <Select value={limpezaManualFaixa} onValueChange={setLimpezaManualFaixa}><SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger><SelectContent>{FAIXA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                    <Select value={limpezaManualBerma || "none"} onValueChange={(val) => setLimpezaManualBerma(val === "none" ? "" : val)}><SelectTrigger><SelectValue placeholder="Berma">{limpezaManualBerma ? BERMA_OPTIONS.find(o => o.value === limpezaManualBerma)?.label : "Berma"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="none">Selecione</SelectItem>{BERMA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                  </div>
                  <ExtraActivityEntries activityKey="limpezaManual" entries={extraEntries.limpezaManual || []} onAdd={addExtraEntry} onUpdate={updateExtraEntry} onRemove={removeExtraEntry} faixaOptions={FAIXA_OPTIONS} bermaOptions={BERMA_OPTIONS} inputType="number" step="0.01" />
                </div>

                {/* Limpeza com Soprador */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>LIMPEZA COM SOPRADOR (m²)</Label>
                    <AddMoreButton activityKey="limpezaAssoprador" onAdd={addExtraEntry} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3">
                    <Input type="number" min="0" step="0.01" value={limpezaAssoprador} onChange={(e) => setLimpezaAssoprador(e.target.value)} placeholder="0.00" />
                    <Select value={limpezaAssopradorFaixa} onValueChange={setLimpezaAssopradorFaixa}><SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger><SelectContent>{FAIXA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                    <Select value={limpezaAssopradorBerma || "none"} onValueChange={(val) => setLimpezaAssopradorBerma(val === "none" ? "" : val)}><SelectTrigger><SelectValue placeholder="Berma">{limpezaAssopradorBerma ? BERMA_OPTIONS.find(o => o.value === limpezaAssopradorBerma)?.label : "Berma"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="none">Selecione</SelectItem>{BERMA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                  </div>
                  <ExtraActivityEntries activityKey="limpezaAssoprador" entries={extraEntries.limpezaAssoprador || []} onAdd={addExtraEntry} onUpdate={updateExtraEntry} onRemove={removeExtraEntry} faixaOptions={FAIXA_OPTIONS} bermaOptions={BERMA_OPTIONS} inputType="number" step="0.01" />
                </div>
              </div>

              {/* Invasoras Fields */}
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <Label className="text-base font-semibold">🌿 CONTROLE DE INVASORAS</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Faixa:</Label>
                      <Select value={invasorasFaixa} onValueChange={setInvasorasFaixa}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Faixa" />
                        </SelectTrigger>
                        <SelectContent>
                          {FAIXA_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addInvasora}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar mais
                    </Button>
                  </div>
                </div>
                
                {invasoras.map((invasora, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_auto] gap-2 items-end p-3 rounded-lg bg-background/50">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nome da Invasora</Label>
                      <Select 
                        value={invasora.nome} 
                        onValueChange={(value) => updateInvasora(index, "nome", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a invasora" />
                        </SelectTrigger>
                        <SelectContent>
                          {INVASORAS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Unidade</Label>
                      <Input
                        type="number"
                        min="0"
                        value={invasora.unidade}
                        onChange={(e) => updateInvasora(index, "unidade", e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Berma</Label>
                      <Select 
                        value={invasora.berma || "none"} 
                        onValueChange={(value) => updateInvasora(index, "berma", value === "none" ? "" : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Berma">
                            {invasora.berma ? BERMA_OPTIONS.find(o => o.value === invasora.berma)?.label : "Berma"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione</SelectItem>
                          {BERMA_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {invasoras.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInvasora(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {invasoras.length === 1 && (
                      <div className="w-10" /> 
                    )}
                  </div>
                ))}
              </div>

              {/* Retirada de Mudas */}
              <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                <Label className="font-semibold">🌳 RETIRADA DE MUDAS - ÁRVORES (Unidade)</Label>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3">
                  <Input
                    type="number"
                    min="0"
                    value={retiradaMudasUnidade}
                    onChange={(e) => setRetiradaMudasUnidade(e.target.value)}
                    placeholder="0"
                  />
                  <Select value={retiradaMudasFaixa} onValueChange={setRetiradaMudasFaixa}>
                    <SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger>
                    <SelectContent>{FAIXA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
                  </Select>
                  <Select value={retiradaMudasBerma} onValueChange={setRetiradaMudasBerma}>
                    <SelectTrigger><SelectValue>{retiradaMudasBerma ? BERMA_OPTIONS.find(o => o.value === retiradaMudasBerma)?.label : "Berma"}</SelectValue></SelectTrigger>
                    <SelectContent>{BERMA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Plantio de Grama */}
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-green-600 dark:text-green-400">🌿 PLANTIO DE GRAMA (m²)</Label>
                  <AddMoreButton activityKey="plantioGrama" onAdd={addExtraEntry} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3">
                  <Input type="number" min="0" step="0.01" value={plantioGrama} onChange={(e) => setPlantioGrama(e.target.value)} placeholder="0.00" />
                  <Select value={plantioGramaFaixa} onValueChange={setPlantioGramaFaixa}><SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger><SelectContent>{FAIXA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                  <Select value={plantioGramaBerma} onValueChange={setPlantioGramaBerma}><SelectTrigger><SelectValue>{plantioGramaBerma ? BERMA_OPTIONS.find(o => o.value === plantioGramaBerma)?.label : "Berma"}</SelectValue></SelectTrigger><SelectContent>{BERMA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
                </div>
                <ExtraActivityEntries activityKey="plantioGrama" entries={extraEntries.plantioGrama || []} onAdd={addExtraEntry} onUpdate={updateExtraEntry} onRemove={removeExtraEntry} faixaOptions={FAIXA_OPTIONS} bermaOptions={BERMA_OPTIONS} inputType="number" step="0.01" />
              </div>

              {/* Atividades Manuais */}
              <div className="space-y-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                  <Label className="text-amber-600 dark:text-amber-400 font-semibold">✏️ OUTRAS ATIVIDADES (Preenchimento Manual)</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={atividadesManuaisFaixa} onValueChange={setAtividadesManuaisFaixa}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Faixa" /></SelectTrigger>
                      <SelectContent>{FAIXA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>))}</SelectContent>
                    </Select>
                    <Select value={atividadesManuaisBerma} onValueChange={setAtividadesManuaisBerma}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue>{atividadesManuaisBerma ? BERMA_OPTIONS.find(o => o.value === atividadesManuaisBerma)?.label : "Berma"}</SelectValue></SelectTrigger>
                      <SelectContent>{BERMA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <DebouncedTextarea
                  value={atividadesManuais}
                  onChange={setAtividadesManuais}
                  placeholder="Descreva outras atividades realizadas que não estão listadas acima..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Este campo será incluído no resumo do RDO exatamente como preenchido.
                </p>
              </div>

              <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                  <Label className="font-semibold">MANUTENÇÃO DE CANTEIRO</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={manutencaoCanteiroFaixa} onValueChange={setManutencaoCanteiroFaixa}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Faixa" /></SelectTrigger>
                      <SelectContent>{FAIXA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>))}</SelectContent>
                    </Select>
                    <Select value={manutencaoCanteiroBerma} onValueChange={setManutencaoCanteiroBerma}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue>{manutencaoCanteiroBerma ? BERMA_OPTIONS.find(o => o.value === manutencaoCanteiroBerma)?.label : "Berma"}</SelectValue></SelectTrigger>
                      <SelectContent>{BERMA_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <DebouncedTextarea
                  value={manutencaoCanteiro}
                  onChange={setManutencaoCanteiro}
                  placeholder="Descreva as atividades de manutenção de canteiro..."
                  rows={3}
                />
              </div>

              {/* Irrigation Section */}
              <div className="space-y-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  <Label className="text-base font-semibold text-blue-500">IRRIGAÇÃO</Label>
                </div>
                
                {/* Irrigação com Pipas */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50">
                  <Checkbox
                    id="irrigacao-pipas"
                    checked={irrigacaoPipas}
                    onCheckedChange={(checked) => setIrrigacaoPipas(checked === true)}
                  />
                  <Label htmlFor="irrigacao-pipas" className="cursor-pointer">
                    Irrigação com Pipas nas Faixas 3 e 4 e Mirante
                  </Label>
                </div>

                {/* Irrigação com Carretel */}
                <div className="space-y-3 p-3 rounded-lg bg-background/50">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="irrigacao-carretel"
                      checked={irrigacaoCarretel}
                      onCheckedChange={(checked) => {
                        setIrrigacaoCarretel(checked === true);
                        if (!checked) {
                          setIrrigacaoCarretelBermas([]);
                        }
                      }}
                    />
                    <Label htmlFor="irrigacao-carretel" className="cursor-pointer">
                      Irrigação com Carretel
                    </Label>
                  </div>

                  {irrigacaoCarretel && (
                    <div className="ml-7 space-y-2">
                      <Label className="text-sm text-muted-foreground">Selecione as Bermas (somente pares):</Label>
                      <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                        {BERMA_OPTIONS_EVEN.map((opt) => {
                          const bermaNum = parseInt(opt.value);
                          const isSelected = irrigacaoCarretelBermas.includes(bermaNum);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setIrrigacaoCarretelBermas(irrigacaoCarretelBermas.filter(b => b !== bermaNum));
                                } else {
                                  setIrrigacaoCarretelBermas([...irrigacaoCarretelBermas, bermaNum].sort((a, b) => a - b));
                                }
                              }}
                              className={cn(
                                "px-3 py-2 text-sm rounded-md border transition-colors",
                                isSelected
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "bg-background border-input hover:bg-muted"
                              )}
                            >
                              {bermaNum}
                            </button>
                          );
                        })}
                      </div>
                      {irrigacaoCarretelBermas.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Selecionadas: {irrigacaoCarretelBermas.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="pt-4 border-t">
                <PhotoUploader
                  photos={photos}
                  onPhotosChange={setPhotos}
                  disabled={!canEdit}
                  folder="jardinagem"
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary Preview */}
          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                📋 Resumo para RDO
                {existingReport && (
                  <Badge variant="secondary">Salvo</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Esta prévia mostra como os dados aparecerão no RDO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm overflow-x-auto">
                <p className="font-bold">📍 Local: {localFaixa}</p>
                <div className="border-t pt-2 mt-2 space-y-1">
                  {generateRDOSummary().split("\n").map((line, idx) => {
                    if (idx < 3) return null; // Skip title and local in individual lines
                    return line ? <p key={idx}>{line}</p> : <div key={idx} className="h-1" />;
                  })}
                </div>
              </div>


              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">
                  💡 Os dados preenchidos aqui serão automaticamente incluídos na seção "Jardinagem" do RDO.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
