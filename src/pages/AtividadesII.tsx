import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import * as E from "@/lib/whatsappEmojis";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Hammer, Save, Loader2, Calendar, Trash2, History, Copy, MessageCircle, Plus, X, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
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
  useGabiaoReports, 
  useGabiaoReportByDate, 
  useSaveGabiaoReport, 
  useDeleteGabiaoReport 
} from "@/hooks/useGabiaoReports";
import { getBrazilNorthDate } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import MonthlyReportDialog from "@/components/atividades/MonthlyReportDialog";
import { PhotoUploader } from "@/components/atividades/PhotoUploader";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { EditableIcon } from "@/components/cms/EditableIcon";
import { JardinagemMetasSummary } from "@/components/atividades/JardinagemMetasSummary";


const FAIXA_OPTIONS = [
  { value: "FAIXA 2", label: "FAIXA 2" },
  { value: "FAIXA 3", label: "FAIXA 3" },
  { value: "FAIXA 4", label: "FAIXA 4" },
];

// Generate fase options from 1 to 5
const FASE_OPTIONS = Array.from({ length: 5 }, (_, i) => ({
  value: (1 + i).toString(),
  label: `Fase ${1 + i}`,
}));

// Generate elevado options from 26 to 56
const ELEVADO_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: (26 + i).toString(),
  label: `${26 + i}`,
}));

export default function AtividadesII() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const { isAdmin, authReady } = useIsAdmin();
  const queryClient = useQueryClient();
  
  const today = getBrazilNorthDate();

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: existingReport, isLoading: isLoadingReport } = useGabiaoReportByDate(selectedDateStr);
  const { data: allReports } = useGabiaoReports();
  const saveReport = useSaveGabiaoReport();
  const deleteReport = useDeleteGabiaoReport();
  const { isAreaLocked, canUnlockArea, lockArea, unlockArea } = useReportLock(selectedDateStr);
  const isGabiaoLocked = isAreaLocked("gabiao");

  // Form state
  const [localServico, setLocalServico] = useState("FAIXA 2");
  const [fase, setFase] = useState("");
  const [elevado, setElevado] = useState("");
  
  // Activity checkboxes
  const [escavacaoManual, setEscavacaoManual] = useState(false);
  const [reposicaoManta, setReposicaoManta] = useState(false);
  const [mantaDimensao, setMantaDimensao] = useState("");
  const [reposicaoSilte, setReposicaoSilte] = useState(false);
  const [silteQuantidade, setSilteQuantidade] = useState("");
  const [limpezaOrganizacao, setLimpezaOrganizacao] = useState(false);
  
  // New activities
  const [retiradaTela, setRetiradaTela] = useState(false);
  const [retiradaTelaDimensao, setRetiradaTelaDimensao] = useState("");
  const [retiradaCascalho, setRetiradaCascalho] = useState(false);
  const [retiradaCascalhoQuantidade, setRetiradaCascalhoQuantidade] = useState("");
  const [lavagemVertedouro, setLavagemVertedouro] = useState(false);
  const [lavagemBaciasVertedouro, setLavagemBaciasVertedouro] = useState(false);
  const [reposicaoGeotextil, setReposicaoGeotextil] = useState(false);
  const [reposicaoGeotextilDimensao, setReposicaoGeotextilDimensao] = useState("");
  const [retiradaGeotextil, setRetiradaGeotextil] = useState(false);
  const [retiradaGeotextilDimensao, setRetiradaGeotextilDimensao] = useState("");
  const [retiradaGeomembrana, setRetiradaGeomembrana] = useState(false);
  const [retiradaGeomembranaDimensao, setRetiradaGeomembranaDimensao] = useState("");
  const [reposicaoGeomembrana, setReposicaoGeomembrana] = useState(false);
  const [reposicaoGeomembranaDimensao, setReposicaoGeomembranaDimensao] = useState("");
  
  // Recomposição activities
  const [recomposicaoTela, setRecomposicaoTela] = useState(false);
  const [recomposicaoTelaDimensao, setRecomposicaoTelaDimensao] = useState("");
  const [recomposicaoCascalho, setRecomposicaoCascalho] = useState(false);
  const [recomposicaoCascalhoQuantidade, setRecomposicaoCascalhoQuantidade] = useState("");
  const [recomposicaoSilte, setRecomposicaoSilte] = useState(false);
  const [recomposicaoSilteQuantidade, setRecomposicaoSilteQuantidade] = useState("");
  
  // Transporte de Materiais
  const [transporteMateriais, setTransporteMateriais] = useState(false);
  const [transporteMateriaisQuantidade, setTransporteMateriaisQuantidade] = useState("");
  // Manual activities text
  const [atividadesManuais, setAtividadesManuais] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  // Extra entries for activities with quantities/dimensions
  const [gabiaoExtra, setGabiaoExtra] = useState<Record<string, string[]>>({});
  
  const addGabiaoExtra = (key: string) => {
    setGabiaoExtra(prev => ({ ...prev, [key]: [...(prev[key] || []), ""] }));
  };
  const updateGabiaoExtra = (key: string, index: number, val: string) => {
    setGabiaoExtra(prev => {
      const entries = [...(prev[key] || [])];
      entries[index] = val;
      return { ...prev, [key]: entries };
    });
  };
  const removeGabiaoExtra = (key: string, index: number) => {
    setGabiaoExtra(prev => {
      const entries = (prev[key] || []).filter((_, i) => i !== index);
      const next = { ...prev };
      if (entries.length === 0) delete next[key];
      else next[key] = entries;
      return next;
    });
  };
  
  // Photo state
  const [photos, setPhotos] = useState<string[]>([]);

  // Load existing data when report changes
  useEffect(() => {
    if (existingReport) {
      const localServicoStr = existingReport.local_servico || "";
      
      // Parse faixa from local_servico (e.g., "FAIXA 2 - Fase 1 - Elevado 28")
      const faixaMatch = localServicoStr.match(/^(FAIXA \d+)/);
      if (faixaMatch) {
        setLocalServico(faixaMatch[1]);
      } else {
        setLocalServico("FAIXA 2");
      }
      
      // Parse fase from local_servico if it contains "Fase"
      const faseMatch = localServicoStr.match(/Fase (\d+)/);
      if (faseMatch) {
        setFase(faseMatch[1]);
      } else {
        setFase("");
      }
      // Parse elevado from local_servico if it contains "Elevado"
      const elevadoMatch = localServicoStr.match(/Elevado (\d+)/);
      if (elevadoMatch) {
        setElevado(elevadoMatch[1]);
      } else {
        setElevado("");
      }
      
      // Parse saved activities from observacoes field
      const obs = existingReport.observacoes || "";
      
      // Parse checkbox activities
      setEscavacaoManual(obs.includes("Escavação manual"));
      setReposicaoManta(obs.includes("Reposição de manta"));
      setReposicaoSilte(obs.includes("Reposição de silte"));
      setLimpezaOrganizacao(obs.includes("Limpeza e organização"));
      setRetiradaTela(obs.includes("Retirada de tela"));
      setRetiradaCascalho(obs.includes("Retirada de cascalho"));
      setLavagemVertedouro(obs.includes("Lavagem de vertedouro") && !obs.includes("Lavagem de bacias"));
      setLavagemBaciasVertedouro(obs.includes("Lavagem de bacias"));
      setReposicaoGeotextil(obs.includes("Reposição de Geotêxtil"));
      setRetiradaGeotextil(obs.includes("Retirada de Geotêxtil"));
      setRetiradaGeomembrana(obs.includes("Retirada de Geomembrana"));
      setReposicaoGeomembrana(obs.includes("Reposição de Geomembrana"));
      setRecomposicaoTela(obs.includes("Recomposição de tela"));
      setRecomposicaoCascalho(obs.includes("Recomposição de cascalho"));
      setRecomposicaoSilte(obs.includes("Recomposição de silte"));
      setTransporteMateriais(obs.includes("Transporte de Materiais"));
      
      // Parse dimensions/quantities from activities
      const mantaMatch = obs.match(/Reposição de manta asfáltica - ([^\n]+)/);
      setMantaDimensao(mantaMatch ? mantaMatch[1] : "");
      
      const silteMatch = obs.match(/Reposição de silte - ([\d.]+) m²/);
      setSilteQuantidade(silteMatch ? silteMatch[1] : "");
      
      const telaMatch = obs.match(/Retirada de tela - ([^\n]+)/);
      setRetiradaTelaDimensao(telaMatch ? telaMatch[1] : "");
      
      const cascalhoMatch = obs.match(/Retirada de cascalho - ([\d.]+) m²/);
      setRetiradaCascalhoQuantidade(cascalhoMatch ? cascalhoMatch[1] : "");
      
      const geotextilMatch = obs.match(/Reposição de Geotêxtil - ([^\n]+)/);
      setReposicaoGeotextilDimensao(geotextilMatch ? geotextilMatch[1] : "");

      const retGeotextilMatch = obs.match(/Retirada de Geotêxtil - ([^\n]+)/);
      setRetiradaGeotextilDimensao(retGeotextilMatch ? retGeotextilMatch[1] : "");

      const retGeomembranaMatch = obs.match(/Retirada de Geomembrana - ([^\n]+)/);
      setRetiradaGeomembranaDimensao(retGeomembranaMatch ? retGeomembranaMatch[1] : "");

      const repGeomembranaMatch = obs.match(/Reposição de Geomembrana - ([^\n]+)/);
      setReposicaoGeomembranaDimensao(repGeomembranaMatch ? repGeomembranaMatch[1] : "");
      
      const recompTelaMatch = obs.match(/Recomposição de tela - ([^\n]+)/);
      setRecomposicaoTelaDimensao(recompTelaMatch ? recompTelaMatch[1] : "");
      
      const recompCascalhoMatch = obs.match(/Recomposição de cascalho - ([\d.]+) m²/);
      setRecomposicaoCascalhoQuantidade(recompCascalhoMatch ? recompCascalhoMatch[1] : "");
      
      const recompSilteMatch = obs.match(/Recomposição de silte - ([\d.]+) m²/);
      setRecomposicaoSilteQuantidade(recompSilteMatch ? recompSilteMatch[1] : "");

      const transporteMatch = obs.match(/Transporte de Materiais - ([\d.]+) m³/);
      setTransporteMateriaisQuantidade(transporteMatch ? transporteMatch[1] : "");
      
      // Parse atividades manuais and observacoes using markers
      const manuaisMarkerIdx = obs.indexOf("[ATIVIDADES_MANUAIS]");
      const obsMarkerIdx = obs.indexOf("[OBSERVACOES]");
      
      if (manuaisMarkerIdx !== -1) {
        const manuaisStart = manuaisMarkerIdx + "[ATIVIDADES_MANUAIS]".length;
        const manuaisEnd = obsMarkerIdx !== -1 ? obsMarkerIdx : obs.length;
        setAtividadesManuais(obs.substring(manuaisStart, manuaisEnd).trim());
      } else {
        setAtividadesManuais("");
      }
      
      if (obsMarkerIdx !== -1) {
        const obsStart = obsMarkerIdx + "[OBSERVACOES]".length;
        setObservacoes(obs.substring(obsStart).trim());
      } else if (manuaisMarkerIdx === -1) {
        // Legacy format: non-* lines after activities go to observacoes
        const lines = obs.split("\n");
        const obsLines: string[] = [];
        let isAfterActivities = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) { isAfterActivities = true; continue; }
          if (trimmed.startsWith("*")) continue;
          if (isAfterActivities) obsLines.push(trimmed);
        }
        setObservacoes(obsLines.join("\n"));
      } else {
        setObservacoes("");
      }
      setPhotos((existingReport as any).photo_urls || []);
      setGabiaoExtra({});
    } else {
      // Reset form for new date
      setLocalServico("FAIXA 2");
      setFase("");
      setElevado("");
      setEscavacaoManual(false);
      setReposicaoManta(false);
      setMantaDimensao("");
      setReposicaoSilte(false);
      setSilteQuantidade("");
      setLimpezaOrganizacao(false);
      setRetiradaTela(false);
      setRetiradaTelaDimensao("");
      setRetiradaCascalho(false);
      setRetiradaCascalhoQuantidade("");
      setLavagemVertedouro(false);
      setLavagemBaciasVertedouro(false);
      setReposicaoGeotextil(false);
      setReposicaoGeotextilDimensao("");
      setRetiradaGeotextil(false);
      setRetiradaGeotextilDimensao("");
      setRetiradaGeomembrana(false);
      setRetiradaGeomembranaDimensao("");
      setReposicaoGeomembrana(false);
      setReposicaoGeomembranaDimensao("");
      setRecomposicaoTela(false);
      setRecomposicaoTelaDimensao("");
      setRecomposicaoCascalho(false);
      setRecomposicaoCascalhoQuantidade("");
      setRecomposicaoSilte(false);
      setRecomposicaoSilteQuantidade("");
      setTransporteMateriais(false);
      setTransporteMateriaisQuantidade("");
      setAtividadesManuais("");
      setObservacoes("");
      setObservacoes("");
      setPhotos([]);
      setGabiaoExtra({});
      setPhotos([]);
    }
  }, [existingReport, selectedDateStr]);

  // Check access permissions - can view if encarregado_geral, encarregado_ii, planejador, engenheiro_planejamento, or admin
  const canView = authReady && (
    isAdmin || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_ii" ||
    profile?.cargo === "planejador" ||
    profile?.cargo === "engenheiro_planejamento"
  );
  
  // Check edit permission - respects lock state
  const canEdit = authReady && !isGabiaoLocked && (
    isAdmin || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_ii"
  );
  
  // Permission to edit ignoring lock (for UI logic)
  const hasEditPermission = authReady && (
    isAdmin || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_ii"
  );

  if (!authReady || isLoadingProfile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!canView) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Hammer className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-4">
            Apenas Administradores, Encarregado Geral e Encarregados II podem acessar esta página.
          </p>
          <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
        </div>
      </Layout>
    );
  }

  const formattedDate = format(selectedDate, "dd/MM/yy (EEEE)", { locale: ptBR });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Build the combined observacoes to save
  const buildObservacoes = () => {
    const lines: string[] = [];
    
    const addWithExtras = (checked: boolean, label: string, mainVal: string, unit: string, key: string) => {
      if (!checked) return;
      lines.push(`* ${label}${mainVal ? ` - ${mainVal}${unit ? ` ${unit}` : ""}` : ""}`);
      (gabiaoExtra[key] || []).forEach(v => {
        if (v) lines.push(`* ${label} - ${v}${unit ? ` ${unit}` : ""}`);
      });
    };
    
    const addSimpleWithExtras = (checked: boolean, label: string, key: string) => {
      if (!checked) return;
      lines.push(`* ${label}`);
      (gabiaoExtra[key] || []).forEach(() => {
        lines.push(`* ${label}`);
      });
    };

    addSimpleWithExtras(escavacaoManual, "Escavação manual", "escavacao");
    addWithExtras(reposicaoManta, "Reposição de manta asfáltica", mantaDimensao, "", "manta");
    addWithExtras(reposicaoSilte, "Reposição de silte", silteQuantidade, "m²", "silte");
    addSimpleWithExtras(limpezaOrganizacao, "Limpeza e organização", "limpeza");
    addWithExtras(retiradaTela, "Retirada de tela", retiradaTelaDimensao, "", "retiradaTela");
    addWithExtras(retiradaCascalho, "Retirada de cascalho", retiradaCascalhoQuantidade, "m²", "retiradaCascalho");
    addSimpleWithExtras(lavagemVertedouro, "Lavagem de vertedouro", "lavagemVertedouro");
    addSimpleWithExtras(lavagemBaciasVertedouro, "Lavagem de bacias do vertedouro", "lavagemBacias");
    addWithExtras(reposicaoGeotextil, "Reposição de Geotêxtil", reposicaoGeotextilDimensao, "", "geotextil");
    addWithExtras(retiradaGeotextil, "Retirada de Geotêxtil", retiradaGeotextilDimensao, "", "retiradaGeotextil");
    addWithExtras(retiradaGeomembrana, "Retirada de Geomembrana", retiradaGeomembranaDimensao, "", "retiradaGeomembrana");
    addWithExtras(reposicaoGeomembrana, "Reposição de Geomembrana", reposicaoGeomembranaDimensao, "", "reposicaoGeomembrana");
    addWithExtras(recomposicaoTela, "Recomposição de tela", recomposicaoTelaDimensao, "", "recomposicaoTela");
    addWithExtras(recomposicaoCascalho, "Recomposição de cascalho", recomposicaoCascalhoQuantidade, "m²", "recomposicaoCascalho");
    addWithExtras(recomposicaoSilte, "Recomposição de silte", recomposicaoSilteQuantidade, "m²", "recomposicaoSilte");
    addWithExtras(transporteMateriais, "Transporte de Materiais", transporteMateriaisQuantidade, "m³", "transporte");
    
    if (atividadesManuais.trim()) {
      lines.push("");
      lines.push("[ATIVIDADES_MANUAIS]");
      atividadesManuais.split("\n").forEach((l) => {
        const t = l.trim().replace(/^\*\s*/, "");
        if (t) lines.push(`* ${t}`);
      });
    }

    if (observacoes.trim()) {
      lines.push("");
      lines.push("[OBSERVACOES]");
      lines.push(observacoes.trim());
    }
    
    return lines.join("\n");
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar.");
      return;
    }

    if (!localServico) {
      toast.error("Selecione o Local do Serviço.");
      return;
    }

    const combinedObservacoes = buildObservacoes();
    
    // Build local servico with fase and elevado if selected
    let fullLocalServico = localServico;
    if (fase) {
      fullLocalServico += ` - Fase ${fase}`;
    }
    if (elevado) {
      fullLocalServico += ` - Elevado ${elevado}`;
    }

    try {
      await saveReport.mutateAsync({
        report_date: selectedDateStr,
        local_servico: fullLocalServico,
        observacoes: combinedObservacoes || null,
        photo_urls: photos.length > 0 ? photos : null,
      });
      
      // Invalidate queries to ensure UI sync
      queryClient.invalidateQueries({ queryKey: ["gabiao-report", selectedDateStr] });
      queryClient.invalidateQueries({ queryKey: ["gabiao-reports"] });


      // Auto-lock after saving
      if (!isGabiaoLocked) {
        await lockArea.mutateAsync("gabiao");
      }
      
      toast.success("Atividades salvas e bloqueadas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  // Generate RDO summary for WhatsApp
  const generateRDOSummary = () => {
    const formattedDate = format(selectedDate, "dd/MM/yyyy");
    
    let fullLocalServico = localServico;
    if (fase) {
      fullLocalServico += ` - Fase ${fase}`;
    }
    if (elevado) {
      fullLocalServico += ` - Elevado ${elevado}`;
    }
    
    let summary = `${E.EMOJI_CALENDAR} *RDO GABIÃO - ${formattedDate}*\n\n`;
    summary += `${E.EMOJI_PIN} *Local:* ${fullLocalServico}\n\n`;
    summary += `${E.EMOJI_WRENCH} *Atividades Realizadas:*\n`;
    
    const activities = getPreviewText();
    if (activities.length > 0) {
      activities.forEach(activity => {
        summary += `${activity}\n`;
      });
    } else {
      summary += "Nenhuma atividade registrada\n";
    }
    
    if (observacoes.trim()) {
      summary += `\n${E.EMOJI_MEMO} *Observações:*\n${observacoes.trim()}`;
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

  const handleDelete = async () => {
    if (!existingReport) return;
    
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;

    try {
      await deleteReport.mutateAsync(existingReport.id);
      toast.success("Registro excluído!");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  // Get dates with reports for calendar highlighting
  const datesWithReports = allReports?.map((r) => r.report_date) || [];

  const getFaixaLabel = (value: string) => {
    return FAIXA_OPTIONS.find((f) => f.value === value)?.label || value;
  };

  // Generate preview
  const getPreviewText = () => {
    const lines: string[] = [];
    
    const addWithExtras = (checked: boolean, label: string, mainVal: string, unit: string, key: string) => {
      if (!checked) return;
      lines.push(`* ${label}${mainVal ? ` - ${mainVal}${unit ? ` ${unit}` : ""}` : ""}`);
      (gabiaoExtra[key] || []).forEach(v => {
        if (v) lines.push(`* ${label} - ${v}${unit ? ` ${unit}` : ""}`);
      });
    };
    
    const addSimpleWithExtras = (checked: boolean, label: string, key: string) => {
      if (!checked) return;
      lines.push(`* ${label}`);
      (gabiaoExtra[key] || []).forEach(() => {
        lines.push(`* ${label}`);
      });
    };

    addSimpleWithExtras(escavacaoManual, "Escavação manual", "escavacao");
    addWithExtras(reposicaoManta, "Reposição de manta asfáltica", mantaDimensao, "", "manta");
    addWithExtras(reposicaoSilte, "Reposição de silte", silteQuantidade, "m²", "silte");
    addSimpleWithExtras(limpezaOrganizacao, "Limpeza e organização", "limpeza");
    addWithExtras(retiradaTela, "Retirada de tela", retiradaTelaDimensao, "", "retiradaTela");
    addWithExtras(retiradaCascalho, "Retirada de cascalho", retiradaCascalhoQuantidade, "m²", "retiradaCascalho");
    addSimpleWithExtras(lavagemVertedouro, "Lavagem de vertedouro", "lavagemVertedouro");
    addSimpleWithExtras(lavagemBaciasVertedouro, "Lavagem de bacias do vertedouro", "lavagemBacias");
    addWithExtras(reposicaoGeotextil, "Reposição de Geotêxtil", reposicaoGeotextilDimensao, "", "geotextil");
    addWithExtras(retiradaGeotextil, "Retirada de Geotêxtil", retiradaGeotextilDimensao, "", "retiradaGeotextil");
    addWithExtras(retiradaGeomembrana, "Retirada de Geomembrana", retiradaGeomembranaDimensao, "", "retiradaGeomembrana");
    addWithExtras(reposicaoGeomembrana, "Reposição de Geomembrana", reposicaoGeomembranaDimensao, "", "reposicaoGeomembrana");
    addWithExtras(recomposicaoTela, "Recomposição de tela", recomposicaoTelaDimensao, "", "recomposicaoTela");
    addWithExtras(recomposicaoCascalho, "Recomposição de cascalho", recomposicaoCascalhoQuantidade, "m²", "recomposicaoCascalho");
    addWithExtras(recomposicaoSilte, "Recomposição de silte", recomposicaoSilteQuantidade, "m²", "recomposicaoSilte");
    addWithExtras(transporteMateriais, "Transporte de Materiais", transporteMateriaisQuantidade, "m³", "transporte");
    
    if (atividadesManuais.trim()) {
      atividadesManuais.split("\n").forEach(line => {
        const t = line.trim().replace(/^\*\s*/, "");
        if (t) lines.push(`* ${t}`);
      });
    }
    
    return lines;
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Read-only banner */}
        {!hasEditPermission && <ReadOnlyBanner message="Você está visualizando esta página em modo somente leitura. Apenas Administradores, Encarregado Geral e Encarregado II podem editar." />}
        {isGabiaoLocked && hasEditPermission && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <Lock className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-500">
              Relatório bloqueado. Clique em "Desbloquear" para editar novamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Resumo de meta do mês — Linha 250 (Gabião) */}
        <JardinagemMetasSummary
          linhas={[250]}
          title="Meta do mês — Gabião"
          iconColor="text-orange-600"
          borderColor="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-amber-500/5"
        />

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-orange-600/20 flex items-center justify-center shrink-0">
              <Hammer className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
            </div>
            <div className="min-w-0">
              <EditablePageTitle pageKey="atividades-ii" defaultValue="Atividades II - Gabião" className="text-lg sm:text-2xl font-bold" />
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
                  <DialogTitle>Histórico de Atividades - Gabião</DialogTitle>
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
                                {report.local_servico}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {report.local_servico}
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
              type="gabiao"
              getLocationLabel={(report) => report.local_servico || "Sem local"}
              formatReportPreview={(report) => {
                return report.observacoes || "Nenhuma atividade registrada";
              }}
            />

            {/* Unlock button when locked */}
            {isGabiaoLocked && hasEditPermission && (
              <Button 
                variant="outline" 
                onClick={() => unlockArea.mutateAsync("gabiao")}
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

            <Button onClick={() => handleSave()} disabled={saveReport.isPending || !hasEditPermission || isGabiaoLocked} variant="outline">
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


        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hammer className="h-5 w-5 text-orange-500" />
                Registro de Atividades - Gabião
              </CardTitle>
              <CardDescription>
                Selecione as atividades realizadas e/ou escreva manualmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Local Selection */}
              <div className="space-y-4">
                <Label>📍 LOCAL DO SERVIÇO</Label>
                <div className="flex flex-wrap gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Faixa</Label>
                    <Select value={localServico} onValueChange={setLocalServico}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {FAIXA_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Fase</Label>
                    <Select value={fase || "none"} onValueChange={(val) => setFase(val === "none" ? "" : val)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {FASE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Elevado</Label>
                    <Select value={elevado || "none"} onValueChange={(val) => setElevado(val === "none" ? "" : val)}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {ELEVADO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            Elevado {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Activity Checkboxes */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">📋 ATIVIDADES</Label>
                
                {/* Escavação manual */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id="escavacao" 
                        checked={escavacaoManual}
                        onCheckedChange={(checked) => setEscavacaoManual(checked === true)}
                      />
                      <Label htmlFor="escavacao" className="cursor-pointer font-medium">
                        Escavação manual
                      </Label>
                    </div>
                    {escavacaoManual && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("escavacao")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground">
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {escavacaoManual && (gabiaoExtra.escavacao || []).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between ml-7 text-sm text-muted-foreground">
                      <span>+ Escavação manual</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("escavacao", idx)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>

                {/* Reposição de manta asfáltica */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="manta" checked={reposicaoManta} onCheckedChange={(checked) => setReposicaoManta(checked === true)} />
                      <Label htmlFor="manta" className="cursor-pointer font-medium">Reposição de manta asfáltica</Label>
                    </div>
                    {reposicaoManta && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("manta")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground">
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {reposicaoManta && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Button type="button" variant={mantaDimensao === "10 x 3" ? "default" : "outline"} size="sm" onClick={() => setMantaDimensao(mantaDimensao === "10 x 3" ? "" : "10 x 3")}>10 x 3</Button>
                        <span className="text-sm text-muted-foreground">ou</span>
                        <Input type="text" placeholder="Dimensão personalizada" value={mantaDimensao !== "10 x 3" ? mantaDimensao : ""} onChange={(e) => setMantaDimensao(e.target.value)} className="w-[180px]" />
                      </div>
                      {(gabiaoExtra.manta || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="text" placeholder="Dimensão" value={val} onChange={(e) => updateGabiaoExtra("manta", idx, e.target.value)} className="w-[180px]" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("manta", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Reposição de silte */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="silte" checked={reposicaoSilte} onCheckedChange={(checked) => setReposicaoSilte(checked === true)} />
                      <Label htmlFor="silte" className="cursor-pointer font-medium">Reposição de silte</Label>
                    </div>
                    {reposicaoSilte && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("silte")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground">
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {reposicaoSilte && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Input type="number" min="0" step="0.01" placeholder="Quantidade" value={silteQuantidade} onChange={(e) => setSilteQuantidade(e.target.value)} className="w-[120px]" />
                        <span className="text-sm font-medium">m²</span>
                      </div>
                      {(gabiaoExtra.silte || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="number" min="0" step="0.01" placeholder="Quantidade" value={val} onChange={(e) => updateGabiaoExtra("silte", idx, e.target.value)} className="w-[120px]" />
                          <span className="text-sm font-medium">m²</span>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("silte", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Limpeza e organização */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id="limpeza" 
                        checked={limpezaOrganizacao}
                        onCheckedChange={(checked) => setLimpezaOrganizacao(checked === true)}
                      />
                      <Label htmlFor="limpeza" className="cursor-pointer font-medium">
                        Limpeza e organização
                      </Label>
                    </div>
                    {limpezaOrganizacao && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("limpeza")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground">
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {limpezaOrganizacao && (gabiaoExtra.limpeza || []).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between ml-7 text-sm text-muted-foreground">
                      <span>+ Limpeza e organização</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("limpeza", idx)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>

                {/* Retirada de tela */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="retiradaTela" checked={retiradaTela} onCheckedChange={(checked) => setRetiradaTela(checked === true)} />
                      <Label htmlFor="retiradaTela" className="cursor-pointer font-medium">Retirada de tela</Label>
                    </div>
                    {retiradaTela && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("retiradaTela")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {retiradaTela && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Input type="text" placeholder="Ex: 8 x 8" value={retiradaTelaDimensao} onChange={(e) => setRetiradaTelaDimensao(e.target.value)} className="w-[150px]" />
                      </div>
                      {(gabiaoExtra.retiradaTela || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="text" placeholder="Ex: 8 x 8" value={val} onChange={(e) => updateGabiaoExtra("retiradaTela", idx, e.target.value)} className="w-[150px]" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("retiradaTela", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Retirada de cascalho */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="retiradaCascalho" checked={retiradaCascalho} onCheckedChange={(checked) => setRetiradaCascalho(checked === true)} />
                      <Label htmlFor="retiradaCascalho" className="cursor-pointer font-medium">Retirada de cascalho</Label>
                    </div>
                    {retiradaCascalho && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("retiradaCascalho")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {retiradaCascalho && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Input type="number" min="0" step="0.01" placeholder="Quantidade" value={retiradaCascalhoQuantidade} onChange={(e) => setRetiradaCascalhoQuantidade(e.target.value)} className="w-[120px]" />
                        <span className="text-sm font-medium">m²</span>
                      </div>
                      {(gabiaoExtra.retiradaCascalho || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="number" min="0" step="0.01" placeholder="Quantidade" value={val} onChange={(e) => updateGabiaoExtra("retiradaCascalho", idx, e.target.value)} className="w-[120px]" />
                          <span className="text-sm font-medium">m²</span>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("retiradaCascalho", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Lavagem de vertedouro */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="lavagemVertedouro" checked={lavagemVertedouro} onCheckedChange={(checked) => setLavagemVertedouro(checked === true)} />
                      <Label htmlFor="lavagemVertedouro" className="cursor-pointer font-medium">Lavagem de vertedouro</Label>
                    </div>
                    {lavagemVertedouro && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("lavagemVertedouro")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground">
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {lavagemVertedouro && (gabiaoExtra.lavagemVertedouro || []).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between ml-7 text-sm text-muted-foreground">
                      <span>+ Lavagem de vertedouro</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("lavagemVertedouro", idx)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>

                {/* Lavagem de bacias do vertedouro */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="lavagemBacias" checked={lavagemBaciasVertedouro} onCheckedChange={(checked) => setLavagemBaciasVertedouro(checked === true)} />
                      <Label htmlFor="lavagemBacias" className="cursor-pointer font-medium">Lavagem de bacias do vertedouro</Label>
                    </div>
                    {lavagemBaciasVertedouro && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("lavagemBacias")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground">
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {lavagemBaciasVertedouro && (gabiaoExtra.lavagemBacias || []).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between ml-7 text-sm text-muted-foreground">
                      <span>+ Lavagem de bacias do vertedouro</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("lavagemBacias", idx)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>

                {/* Reposição de Geotêxtil */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="reposicaoGeotextil" checked={reposicaoGeotextil} onCheckedChange={(checked) => setReposicaoGeotextil(checked === true)} />
                      <Label htmlFor="reposicaoGeotextil" className="cursor-pointer font-medium">Reposição de Geotêxtil</Label>
                    </div>
                    {reposicaoGeotextil && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("geotextil")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {reposicaoGeotextil && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Input type="text" placeholder="Ex: 8 x 8" value={reposicaoGeotextilDimensao} onChange={(e) => setReposicaoGeotextilDimensao(e.target.value)} className="w-[150px]" />
                      </div>
                      {(gabiaoExtra.geotextil || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="text" placeholder="Ex: 8 x 8" value={val} onChange={(e) => updateGabiaoExtra("geotextil", idx, e.target.value)} className="w-[150px]" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("geotextil", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Retirada de Geotêxtil */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="retiradaGeotextil" checked={retiradaGeotextil} onCheckedChange={(checked) => setRetiradaGeotextil(checked === true)} />
                      <Label htmlFor="retiradaGeotextil" className="cursor-pointer font-medium">Retirada de Geotêxtil</Label>
                    </div>
                    {retiradaGeotextil && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("retiradaGeotextil")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {retiradaGeotextil && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Input type="text" placeholder="Ex: 8 x 8" value={retiradaGeotextilDimensao} onChange={(e) => setRetiradaGeotextilDimensao(e.target.value)} className="w-[150px]" />
                      </div>
                      {(gabiaoExtra.retiradaGeotextil || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="text" placeholder="Ex: 8 x 8" value={val} onChange={(e) => updateGabiaoExtra("retiradaGeotextil", idx, e.target.value)} className="w-[150px]" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("retiradaGeotextil", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Retirada de Geomembrana */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="retiradaGeomembrana" checked={retiradaGeomembrana} onCheckedChange={(checked) => setRetiradaGeomembrana(checked === true)} />
                      <Label htmlFor="retiradaGeomembrana" className="cursor-pointer font-medium">Retirada de Geomembrana</Label>
                    </div>
                    {retiradaGeomembrana && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("retiradaGeomembrana")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {retiradaGeomembrana && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Input type="text" placeholder="Ex: 8 x 8" value={retiradaGeomembranaDimensao} onChange={(e) => setRetiradaGeomembranaDimensao(e.target.value)} className="w-[150px]" />
                      </div>
                      {(gabiaoExtra.retiradaGeomembrana || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="text" placeholder="Ex: 8 x 8" value={val} onChange={(e) => updateGabiaoExtra("retiradaGeomembrana", idx, e.target.value)} className="w-[150px]" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("retiradaGeomembrana", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Reposição de Geomembrana */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="reposicaoGeomembrana" checked={reposicaoGeomembrana} onCheckedChange={(checked) => setReposicaoGeomembrana(checked === true)} />
                      <Label htmlFor="reposicaoGeomembrana" className="cursor-pointer font-medium">Reposição de Geomembrana</Label>
                    </div>
                    {reposicaoGeomembrana && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("reposicaoGeomembrana")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {reposicaoGeomembrana && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Input type="text" placeholder="Ex: 8 x 8" value={reposicaoGeomembranaDimensao} onChange={(e) => setReposicaoGeomembranaDimensao(e.target.value)} className="w-[150px]" />
                      </div>
                      {(gabiaoExtra.reposicaoGeomembrana || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="text" placeholder="Ex: 8 x 8" value={val} onChange={(e) => updateGabiaoExtra("reposicaoGeomembrana", idx, e.target.value)} className="w-[150px]" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("reposicaoGeomembrana", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Recomposição de tela */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="recomposicaoTela" checked={recomposicaoTela} onCheckedChange={(checked) => setRecomposicaoTela(checked === true)} />
                      <Label htmlFor="recomposicaoTela" className="cursor-pointer font-medium">Recomposição de tela</Label>
                    </div>
                    {recomposicaoTela && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("recomposicaoTela")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {recomposicaoTela && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Input type="text" placeholder="Ex: 8 x 8" value={recomposicaoTelaDimensao} onChange={(e) => setRecomposicaoTelaDimensao(e.target.value)} className="w-[150px]" />
                      </div>
                      {(gabiaoExtra.recomposicaoTela || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="text" placeholder="Ex: 8 x 8" value={val} onChange={(e) => updateGabiaoExtra("recomposicaoTela", idx, e.target.value)} className="w-[150px]" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("recomposicaoTela", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Recomposição de cascalho */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="recomposicaoCascalho" checked={recomposicaoCascalho} onCheckedChange={(checked) => setRecomposicaoCascalho(checked === true)} />
                      <Label htmlFor="recomposicaoCascalho" className="cursor-pointer font-medium">Recomposição de cascalho</Label>
                    </div>
                    {recomposicaoCascalho && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("recomposicaoCascalho")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {recomposicaoCascalho && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Input type="number" min="0" step="0.01" placeholder="Quantidade" value={recomposicaoCascalhoQuantidade} onChange={(e) => setRecomposicaoCascalhoQuantidade(e.target.value)} className="w-[120px]" />
                        <span className="text-sm font-medium">m²</span>
                      </div>
                      {(gabiaoExtra.recomposicaoCascalho || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="number" min="0" step="0.01" placeholder="Quantidade" value={val} onChange={(e) => updateGabiaoExtra("recomposicaoCascalho", idx, e.target.value)} className="w-[120px]" />
                          <span className="text-sm font-medium">m²</span>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("recomposicaoCascalho", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Recomposição de silte */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="recomposicaoSilte" checked={recomposicaoSilte} onCheckedChange={(checked) => setRecomposicaoSilte(checked === true)} />
                      <Label htmlFor="recomposicaoSilte" className="cursor-pointer font-medium">Recomposição de silte</Label>
                    </div>
                    {recomposicaoSilte && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("recomposicaoSilte")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {recomposicaoSilte && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Input type="number" min="0" step="0.01" placeholder="Quantidade" value={recomposicaoSilteQuantidade} onChange={(e) => setRecomposicaoSilteQuantidade(e.target.value)} className="w-[120px]" />
                        <span className="text-sm font-medium">m²</span>
                      </div>
                      {(gabiaoExtra.recomposicaoSilte || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="number" min="0" step="0.01" placeholder="Quantidade" value={val} onChange={(e) => updateGabiaoExtra("recomposicaoSilte", idx, e.target.value)} className="w-[120px]" />
                          <span className="text-sm font-medium">m²</span>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("recomposicaoSilte", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Transporte de Materiais */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="transporteMateriais" checked={transporteMateriais} onCheckedChange={(checked) => setTransporteMateriais(checked === true)} />
                      <Label htmlFor="transporteMateriais" className="cursor-pointer font-medium">Transporte de Materiais</Label>
                    </div>
                    {transporteMateriais && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addGabiaoExtra("transporte")} className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {transporteMateriais && (
                    <>
                      <div className="flex items-center gap-2 ml-7">
                        <Input type="number" min="0" step="0.01" placeholder="Quantidade" value={transporteMateriaisQuantidade} onChange={(e) => setTransporteMateriaisQuantidade(e.target.value)} className="w-[120px]" />
                        <span className="text-sm font-medium">m³</span>
                      </div>
                      {(gabiaoExtra.transporte || []).map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 ml-7">
                          <Input type="number" min="0" step="0.01" placeholder="Quantidade" value={val} onChange={(e) => updateGabiaoExtra("transporte", idx, e.target.value)} className="w-[120px]" />
                          <span className="text-sm font-medium">m³</span>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeGabiaoExtra("transporte", idx)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Manual Activities Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">✏️ ATIVIDADES MANUAIS</Label>
                </div>
                <DebouncedTextarea
                  value={atividadesManuais}
                  onChange={setAtividadesManuais}
                  placeholder="Escreva outras atividades realizadas (uma por linha)..."
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Cada linha será formatada como um item de atividade no relatório.
                </p>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>📝 OBSERVAÇÕES</Label>
                </div>
                <DebouncedTextarea
                  value={observacoes}
                  onChange={setObservacoes}
                  placeholder="Observações adicionais sobre as atividades..."
                  rows={3}
                />
              </div>

              {/* Photo Upload Section */}
              <div className="pt-4 border-t">
                <PhotoUploader
                  photos={photos}
                  onPhotosChange={setPhotos}
                  disabled={!canEdit}
                  folder="gabiao"
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
              <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
                <p className="font-bold">📍 Local: {getFaixaLabel(localServico)}{fase ? ` - Fase ${fase}` : ""}{elevado ? ` - Elevado ${elevado}` : ""}</p>
                <div className="border-t pt-2 mt-2 space-y-1">
                  {generateRDOSummary().split("\n").map((line, idx) => {
                    if (idx < 3) return null; // Skip title and local in individual lines
                    return line ? <p key={idx}>{line}</p> : <div key={idx} className="h-1" />;
                  })}
                </div>
              </div>


              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  💡 Os dados preenchidos aqui serão automaticamente incluídos na seção "Gabião" do RDO.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
