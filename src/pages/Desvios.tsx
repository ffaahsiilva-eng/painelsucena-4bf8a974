import { useState, useMemo, useRef } from "react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DebouncedTextarea } from "@/components/atividades/DebouncedTextarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Plus,
  CalendarIcon,
  CheckCircle2,
  Clock,
  Search,
  Tag,
  User,
  Image as ImageIcon,
  FileText,
  Video,
  X,
  Save,
  Send,
  Check,
  Ban,
  Archive,
  Printer,
  Mail,
  Share2,
  Download,
  History,
  AlertCircle,
  FileIcon,
  Trash2,
  HelpCircle,
} from "lucide-react";
import {
  useDesvios,
  useCreateDesvio,
  useUpdateDesvio,
  useUploadDesvioPhoto,
  useDeleteDesvio,
  type Desvio,
  type DesvioAttachment,
} from "@/hooks/useDesvios";
import { useProfiles } from "@/hooks/useProfiles";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { DesviosTutorial } from "@/components/desvios/DesviosTutorial";

const STATUS_OPTIONS = [
  { id: "Aberto", label: "Aberto", color: "bg-blue-500" },
  { id: "Em Tratamento", label: "Em Tratamento", color: "bg-amber-500" },
  { id: "Em Análise", label: "Em Análise", color: "bg-purple-500" },
  { id: "corrigido", label: "Corrigido", color: "bg-green-500" },
  { id: "Cancelado", label: "Cancelado", color: "bg-gray-500" },
];

const PRIORITY_OPTIONS = [
  { id: "Baixo", label: "Baixo", color: "bg-green-500" },
  { id: "Médio", label: "Médio", color: "bg-amber-500" },
  { id: "Alto", label: "Alto", color: "bg-orange-500" },
  { id: "Crítico", label: "Crítico", color: "bg-red-500" },
];

const TAG_OPTIONS = ["Engenharia", "Segurança", "Meio Ambiente", "Qualidade", "Operação", "RH"];

export default function Desvios() {
  const { data: desvios, isLoading: loadingDesvios } = useDesvios();
  const { data: profiles } = useProfiles();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const createDesvio = useCreateDesvio();
  const updateDesvio = useUpdateDesvio();
  const deleteDesvio = useDeleteDesvio();
  const uploadFile = useUploadDesvioPhoto();
  const { isAdmin: isAdminFromRole } = useIsAdmin();

  const [selectedDesvio, setSelectedDesvio] = useState<Desvio | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const correctionFileInputRef = useRef<HTMLInputElement>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Form State
  const [formState, setFormState] = useState<Partial<Desvio>>({
    description: "",
    instruction: "",
    correction: "",
    tags: [],
    priority: "Baixo",
    responsible_name: "",
    responsible_company: "",
    responsible_sector: "",
    mentioned_user_id: null,
    mentioned_user_ids: [],
    mentioned_user_names: [],
    due_date: null,
    comments: "",
    status: "Aberto",
    attachments: [],
    correction_photo_urls: [],
  });

  const isCreator = useMemo(() => {
    if (!selectedDesvio || !user) return true; // Se for novo desvio, o usuário atual é o criador
    return selectedDesvio.created_by === user.id;
  }, [selectedDesvio, user]);

  const isCancelled = useMemo(() => {
    return selectedDesvio?.status === "Cancelado";
  }, [selectedDesvio]);

  const isResponsible = useMemo(() => {
    if (!selectedDesvio || !user) return false;
    if (selectedDesvio.mentioned_user_id === user.id) return true;
    const ids = (selectedDesvio.mentioned_user_ids as string[]) || [];
    return ids.includes(user.id);
  }, [selectedDesvio, user]);

  const isAdmin = useMemo(() => {
    const role = profile?.role?.toLowerCase();
    return role === "admin" || role === "master" || isAdminFromRole;
  }, [profile, isAdminFromRole]);

  const canEditProblem = useMemo(() => isCreator || isAdmin, [isCreator, isAdmin]);
  const canEditTratativa = useMemo(() => {
    // Tratativa: somente criador ou admin podem editar. Responsáveis ficam bloqueados.
    if (!selectedDesvio) return true;
    return isCreator || isAdmin;
  }, [selectedDesvio, isCreator, isAdmin]);

  const canEditCorrection = useMemo(() => {
    // Only responsible or admin can edit correction, but not if it's already in analysis or done
    if (selectedDesvio?.status === "Em Análise" || selectedDesvio?.status === "corrigido") return false;
    return isResponsible || isAdmin;
  }, [isResponsible, isAdmin, selectedDesvio]);

  const canApprove = useMemo(() => {
    // Only creator or admin can approve
    return isCreator || isAdmin;
  }, [isCreator, isAdmin]);

  const availableStatuses = useMemo(() => {
    if (!selectedDesvio) return STATUS_OPTIONS;
    
    if (isAdmin) return STATUS_OPTIONS;

    const options = [];
    
    // Creator can always cancel or move to treatment
    if (isCreator) {
      options.push(STATUS_OPTIONS.find(s => s.id === "Aberto")!);
      options.push(STATUS_OPTIONS.find(s => s.id === "Em Tratamento")!);
      options.push(STATUS_OPTIONS.find(s => s.id === "Cancelado")!);
      
      // Creator can approve if it's in analysis
      if (selectedDesvio.status === "Em Análise") {
        options.push(STATUS_OPTIONS.find(s => s.id === "corrigido")!);
      }
    }

    // Responsible can move to treatment or analysis
    if (isResponsible) {
      if (!options.some(o => o.id === "Em Tratamento")) {
        options.push(STATUS_OPTIONS.find(s => s.id === "Em Tratamento")!);
      }
      options.push(STATUS_OPTIONS.find(s => s.id === "Em Análise")!);
    }

    // If it's already corrected, just show corrected
    if (selectedDesvio.status === "corrigido") {
      if (!options.some(o => o.id === "corrigido")) {
        options.push(STATUS_OPTIONS.find(s => s.id === "corrigido")!);
      }
    }

    // Deduplicate and filter out nulls
    return Array.from(new Set(options)).filter(Boolean);
  }, [isCreator, isResponsible, isAdmin, selectedDesvio]);

  const dashboardStats = useMemo(() => {
    if (!desvios) return { total: 0, open: 0, inTreatment: 0, done: 0, delayed: 0 };
    return {
      total: desvios.length,
      open: desvios.filter((d) => d.status === "Aberto").length,
      inTreatment: desvios.filter((d) => d.status === "Em Tratamento").length,
      done: desvios.filter((d) => d.status === "corrigido").length,
      delayed: desvios.filter((d) => 
        !["corrigido", "Cancelado", "Em Análise"].includes(d.status) && 
        d.due_date && isPast(parseISO(d.due_date)) && !isToday(parseISO(d.due_date))
      ).length,
    };
  }, [desvios]);

  const filteredDesvios = useMemo(() => {
    if (!desvios) return [];
    return desvios.filter((d) => {
      const matchesSearch = 
        d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.responsible_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (!activeFilter) return true;
      if (activeFilter === "total") return true;
      if (activeFilter === "open") return d.status === "Aberto";
      if (activeFilter === "inTreatment") return d.status === "Em Tratamento";
      if (activeFilter === "done") return d.status === "corrigido";
      if (activeFilter === "delayed") {
        return !["corrigido", "Cancelado", "Em Análise"].includes(d.status) && 
               d.due_date && isPast(parseISO(d.due_date)) && !isToday(parseISO(d.due_date));
      }
      return true;
    });
  }, [desvios, searchQuery, activeFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const url = await uploadFile.mutateAsync(file);
        const attachment: DesvioAttachment = {
          name: file.name,
          url,
          type: file.type,
        };
        setFormState((prev) => ({
          ...prev,
          attachments: [...(prev.attachments || []), attachment],
        }));
      } catch (error) {
        toast.error(`Erro ao fazer upload de ${file.name}`);
      }
    }
  };
  
  const handleCorrectionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const url = await uploadFile.mutateAsync(file);
        setFormState((prev) => ({
          ...prev,
          correction_photo_urls: [...(prev.correction_photo_urls || []), url],
        }));
      } catch (error) {
        toast.error(`Erro ao fazer upload de ${file.name}`);
      }
    }
  };

  const resetForm = () => {
    setFormState({
      description: "",
      instruction: "",
      correction: "",
      tags: [],
      priority: "Baixo",
      responsible_name: "",
      responsible_company: "",
      responsible_sector: "",
      mentioned_user_id: null,
      mentioned_user_ids: [],
      mentioned_user_names: [],
      due_date: null,
      comments: "",
      status: "Aberto",
      attachments: [],
      correction_photo_urls: [],
    });
    setSelectedDesvio(null);
    setIsEditing(false);
    setShowForm(false);
  };

  const handleSave = async (send = false) => {
    if (isSaving) return;
    if (!formState.description) {
      toast.error("A descrição do desvio é obrigatória.");
      return;
    }
    setIsSaving(true);

    const toastId = toast.loading(send ? "Salvando e enviando..." : "Salvando...");

    try {
      const isNewCorrection = 
        selectedDesvio && 
        canEditCorrection && 
        ((formState.correction && formState.correction !== selectedDesvio.correction) || 
         (formState.correction_photo_urls && JSON.stringify(formState.correction_photo_urls) !== JSON.stringify(selectedDesvio.correction_photo_urls)));

      const finalUpdates = {
        ...formState,
        status: isNewCorrection ? "Em Análise" : formState.status
      };

      if (selectedDesvio) {
        await updateDesvio.mutateAsync({
          id: selectedDesvio.id,
          updates: finalUpdates,
          action: isNewCorrection ? "Enviado para Análise" : "Edição",
          comment: isNewCorrection ? "Correção realizada e enviada para aprovação" : (send ? "Desvio salvo e enviado" : "Desvio atualizado"),
          forceNotify: send,
        });
      } else {
        await createDesvio.mutateAsync({ ...finalUpdates, notify: send } as any);
      }

      toast.success(send ? "Registro salvo e enviado!" : "Registro salvo com sucesso!", { id: toastId });
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar registro", { id: toastId });
    } finally {
      setTimeout(() => setIsSaving(false), 2000);
    }
  };

  const handleStatusChange = async (status: string, customComment?: string) => {
    if (!selectedDesvio) return;
    try {
      const isReopening = selectedDesvio.status === "Em Análise" && status === "Em Tratamento";
      
      const updates: any = { status };
      
      // Se for reabertura por recusa, limpamos os campos de correção para nova tentativa
      if (isReopening) {
        updates.correction = null;
        updates.correction_photo_urls = [];
      }

      await updateDesvio.mutateAsync({
        id: selectedDesvio.id,
        updates,
        action: isReopening ? "Solicitação de Reajuste" : "Mudança de Status",
        comment: customComment || (isReopening ? "Correção recusada, solicitado reajuste." : `Status alterado para ${status}`),
      });
      
      setFormState(prev => ({ 
        ...prev, 
        status,
        ...(isReopening ? { correction: "", correction_photo_urls: [] } : {})
      }));

      if (status === "Em Tratamento" || status === "corrigido") {
        resetForm();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const generatePDF = async () => {
    const { downloadPdfFromHtml } = await import("@/lib/pdfDownload");
    const logoUrl = (await import("@/assets/logo-principal.png")).default;

    const data = selectedDesvio || (formState as any);
    const esc = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string)));
    const fmtDate = (d?: string | null) => (d ? format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }) : "—");

    const responsaveis = (data?.mentioned_user_names && data.mentioned_user_names.length > 0)
      ? data.mentioned_user_names.join(", ")
      : data?.responsible_name || "—";
    const tags = (data?.tags && data.tags.length > 0) ? data.tags.join(", ") : "—";
    const attachments = (data?.attachments || []) as DesvioAttachment[];
    const imageAttachments = attachments.filter((a) => a.type?.startsWith("image/"));
    const correctionPhotos: string[] = data?.correction_photo_urls || [];

    const photoGrid = (urls: string[]) =>
      urls.length === 0
        ? `<div style="padding:8px;color:#000;font-size:11px;">Nenhuma foto anexada.</div>`
        : `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px;">${urls
            .map(
              (u) =>
                `<div style="border:1px solid #ccc;padding:2px;background:#fafafa;"><img loading="lazy" decoding="async" src="${u}" crossorigin="anonymous" style="width:100%;height:130px;object-fit:cover;display:block;"/></div>`
            )
            .join("")}</div>`;

    const html = `
      <html><head><style>
        @page { size: A4; margin: 0; }
        * { color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 11px; background: #fff; }
        .sheet { width: 754px; padding: 20px; box-sizing: border-box; background: #fff; color: #000; }
        table { border-collapse: collapse; width: 100%; table-layout: fixed; background: #fff; }
        th, td { border: 1px solid #444; padding: 6px 8px; vertical-align: top; word-wrap: break-word; color: #000 !important; background: #fff; }
        th { background: #1f3a5f !important; color: #fff !important; text-align: left; font-size: 11px; }
        .label { background: #e8eef5 !important; font-weight: bold; width: 22%; color: #000 !important; }
        .header { display: flex; align-items: center; justify-content: space-between; border: 2px solid #1f3a5f; padding: 10px 14px; margin-bottom: 10px; background: #fff; }
        .header img { height: 60px; }
        .title { text-align: right; }
        .title h1 { margin: 0; font-size: 18px; color: #1f3a5f !important; }
        .title p { margin: 2px 0 0; font-size: 10px; color: #555 !important; }
        .section-title { background: #1f3a5f !important; color: #fff !important; padding: 6px 10px; margin-top: 10px; font-weight: bold; font-size: 12px; letter-spacing: 0.5px; }
        .section-title * { color: #fff !important; }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 10px; color: #fff !important; font-size: 10px; font-weight: bold; }
        .desc-cell { min-height: 70px; white-space: pre-wrap; color: #000 !important; }
        .signature { margin-top: 28px; display: flex; justify-content: space-between; gap: 30px; }
        .signature .box { flex: 1; text-align: center; }
        .signature .line { border-top: 1px solid #444; margin-top: 40px; padding-top: 4px; font-size: 10px; color: #000 !important; }
      </style></head><body style="background:#fff;color:#000;"><div class="sheet">

        <div class="header">
          <img loading="lazy" decoding="async" src="${logoUrl}" crossorigin="anonymous" />
          <div class="title">
            <h1>RELATÓRIO DE DESVIO</h1>
            <p>Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            <p>Nº ${esc(data?.id?.slice(0, 8) || "—")}</p>
          </div>
        </div>

        <div class="section-title">IDENTIFICAÇÃO</div>
        <table>
          <tr><td class="label">Status</td><td>${esc(data?.status)}</td>
              <td class="label">Prioridade</td><td>${esc(data?.priority)}</td></tr>
          <tr><td class="label">Data de Abertura</td><td>${fmtDate(data?.created_at)}</td>
              <td class="label">Prazo</td><td>${fmtDate(data?.due_date)}</td></tr>
          <tr><td class="label">Responsáveis</td><td colspan="3">${esc(responsaveis)}</td></tr>
          <tr><td class="label">Setor</td><td>${esc(data?.responsible_sector)}</td>
              <td class="label">Etiquetas</td><td>${esc(tags)}</td></tr>
        </table>

        <div class="section-title">PROBLEMA / ASSUNTO</div>
        <table><tr><td class="desc-cell">${esc(data?.description)}</td></tr></table>

        <div class="section-title">TRATATIVA / INSTRUÇÃO</div>
        <table><tr><td class="desc-cell">${esc(data?.instruction)}</td></tr></table>

        <div class="section-title">CORREÇÃO REALIZADA</div>
        <table><tr><td class="desc-cell">${esc(data?.correction)}</td></tr></table>

        <div class="section-title">ANEXOS / EVIDÊNCIAS DO DESVIO</div>
        ${photoGrid(imageAttachments.map((a) => a.url))}

        <div class="section-title">FOTOS DA CORREÇÃO</div>
        ${photoGrid(correctionPhotos)}

        <div class="signature">
          <div class="box"><div class="line">Responsável pela Correção</div></div>
          <div class="box"><div class="line">Aprovação / Segurança</div></div>
        </div>
      </div></body></html>
    `;

    await downloadPdfFromHtml(html, `Desvio_${(data?.id || "novo").slice(0, 8)}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
    toast.success("PDF gerado com sucesso");
  };




  if (showForm || isEditing) {
    return (
      <Layout>
        <div className="p-4 md:p-6 pb-56 space-y-6 max-w-7xl mx-auto print:p-0 print:pb-0">
          <div className="flex items-center justify-between print:hidden">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold">{isEditing ? "Editar Desvio" : "Novo Desvio"}</h1>
            </div>
            <div className="flex items-center gap-2">
              {availableStatuses.map((opt) => (
                <Badge
                  key={opt.id}
                  variant="outline"
                  className={cn(
                    "cursor-pointer hover:opacity-80 transition-opacity",
                    formState.status === opt.id ? `${opt.color} text-white border-transparent` : "text-muted-foreground"
                  )}
                  onClick={() => handleStatusChange(opt.id)}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Coluna 1: Problema / Assunto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Problema / Assunto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição do Desvio</label>
                  <DebouncedTextarea
                    placeholder="Descreva o desvio detalhadamente..."
                    className="min-h-[200px]"
                    value={formState.description || ""}
                    onChange={(val) => setFormState({ ...formState, description: val })}
                    disabled={!canEditProblem || (isCancelled && !isAdmin)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Anexos</label>
                  <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto pr-1 mb-2 sm:grid-cols-4 md:grid-cols-3">
                    {formState.attachments?.map((att, i) => (
                      <div key={i} className="relative group border rounded-md p-1 flex flex-col items-center gap-1 bg-muted/30 overflow-hidden">
                        {att.type.startsWith("image/") ? (
                          <div className="w-full h-12 overflow-hidden rounded sm:h-14">
                            <img loading="lazy" decoding="async" src={att.url} alt={att.name} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(att.url, '_blank')} />
                          </div>
                        ) : att.type.includes("pdf") ? (
                          <div className="h-12 flex items-center justify-center sm:h-14">
                            <FileText className="w-6 h-6 text-red-500" />
                          </div>
                        ) : (
                          <div className="h-12 flex items-center justify-center sm:h-14">
                            <Video className="w-6 h-6 text-purple-500" />
                          </div>
                        )}
                        <span className="text-[9px] leading-none truncate w-full text-center">{att.name}</span>
                        <button
                          disabled={!canEditProblem || (isCancelled && !isAdmin)}
                          className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
                          onClick={() => setFormState({ ...formState, attachments: formState.attachments?.filter((_, idx) => idx !== i) })}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!canEditProblem || (isCancelled && !isAdmin)}
                  >
                    <Plus className="w-4 h-4" /> Adicionar Anexo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Coluna 2: Tratativa */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Tratativa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Instrução</label>
                  <DebouncedTextarea
                    placeholder="Instruções para correção..."
                    className="min-h-[200px]"
                    value={formState.instruction || ""}
                    onChange={(val) => setFormState({ ...formState, instruction: val })}
                    disabled={!canEditTratativa || (isCancelled && !isAdmin)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Etiquetas de Ação</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {formState.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className={`w-3 h-3 ${canEditTratativa && !(isCancelled && !isAdmin) ? "cursor-pointer hover:text-destructive" : "opacity-30 pointer-events-none"}`}
                          onClick={() => { if (!canEditTratativa || (isCancelled && !isAdmin)) return; setFormState({ ...formState, tags: formState.tags?.filter((t) => t !== tag) }); }}
                        />
                      </Badge>
                    ))}
                  </div>
                  <Select
                    disabled={!canEditTratativa || (isCancelled && !isAdmin)}
                    onValueChange={(val) => {
                      if (!formState.tags?.includes(val)) {
                        setFormState({ ...formState, tags: [...(formState.tags || []), val] });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar etiquetas..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TAG_OPTIONS.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Coluna 3: Correção */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-blue-600" />
                  Correção
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Correção Realizada</label>
                    {selectedDesvio?.status === "Em Análise" && (isCreator || isAdmin) && (
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 animate-pulse">
                        Aguardando Aprovação
                      </Badge>
                    )}
                  </div>
                  <DebouncedTextarea
                    placeholder="Descreva a correção efetuada..."
                    className="min-h-[200px]"
                    value={formState.correction || ""}
                    onChange={(val) => setFormState({ ...formState, correction: val })}
                    disabled={!canEditCorrection || (isCancelled && !isAdmin)}
                  />
                  {!canEditCorrection && (
                    <p className="text-[10px] text-muted-foreground italic">
                      Somente o usuário responsável ou administradores podem preencher este campo.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fotos da Correção</label>
                  <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto pr-1 mb-2 sm:grid-cols-4 md:grid-cols-3">
                    {formState.correction_photo_urls?.map((url, i) => (
                      <div key={i} className="relative group border rounded-md overflow-hidden h-14 bg-muted/30 sm:h-16">
                        <img loading="lazy" decoding="async" src={url} alt={`Correção ${i}`} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(url, '_blank')} />
                        <button
                          className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setFormState({ ...formState, correction_photo_urls: formState.correction_photo_urls?.filter((_, idx) => idx !== i) })}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    ref={correctionFileInputRef}
                    onChange={handleCorrectionFileUpload}
                  />
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-dashed"
                    onClick={() => correctionFileInputRef.current?.click()}
                    disabled={!canEditCorrection || (isCancelled && !isAdmin)}
                  >
                    <ImageIcon className="w-4 h-4" /> Anexar Fotos da Correção
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Coluna 4: Aprovação (Só visível se estiver em análise) */}
            {selectedDesvio?.status === "Em Análise" && (
              <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <CheckCircle2 className="w-5 h-5" />
                    Aprovação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-purple-600">
                    A correção foi enviada e está aguardando sua aprovação para ser finalizada.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button 
                      className="w-full gap-2 bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusChange("corrigido")}
                      disabled={!canApprove}
                    >
                      <Check className="w-4 h-4" /> Aprovar Correção
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleStatusChange("Em Tratamento", formState.comments)}
                      disabled={!canApprove}
                    >
                      <Ban className="w-4 h-4" /> Recusar / Solicitar Reajuste
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Coluna 4: Responsável / Prazo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Responsável / Prazo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pessoas Responsáveis</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal h-auto min-h-10 py-2" disabled={(!isCreator && isResponsible && !isAdmin) || (isCancelled && !isAdmin)}>
                        <div className="flex flex-wrap gap-1 items-center">
                          {(formState.mentioned_user_ids && formState.mentioned_user_ids.length > 0) ? (
                            (formState.mentioned_user_names || []).map((name, i) => (
                              <Badge key={i} variant="secondary" className="gap-1 text-xs">
                                {name}
                                <X
                                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newIds = (formState.mentioned_user_ids || []).filter((_, idx) => idx !== i);
                                    const newNames = (formState.mentioned_user_names || []).filter((_, idx) => idx !== i);
                                    setFormState((prev) => ({
                                      ...prev,
                                      mentioned_user_ids: newIds,
                                      mentioned_user_names: newNames,
                                      mentioned_user_id: newIds[0] || null,
                                      responsible_name: newNames[0] || "",
                                    }));
                                  }}
                                />
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">Selecionar usuários...</span>
                          )}
                        </div>
                        <Search className="w-4 h-4 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar usuário..." />
                        <CommandList>
                          <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                          <CommandGroup>
                            {profiles?.map((p) => {
                              const currentIds = formState.mentioned_user_ids || [];
                              const isSelected = currentIds.includes(p.user_id);
                              return (
                                <CommandItem
                                  key={p.user_id}
                                  value={p.full_name || ""}
                                  onSelect={() => {
                                    const currentNames = formState.mentioned_user_names || [];
                                    let newIds: string[];
                                    let newNames: string[];
                                    if (isSelected) {
                                      const idx = currentIds.indexOf(p.user_id);
                                      newIds = currentIds.filter((_, i) => i !== idx);
                                      newNames = currentNames.filter((_, i) => i !== idx);
                                    } else {
                                      newIds = [...currentIds, p.user_id];
                                      newNames = [...currentNames, p.full_name || "Usuário"];
                                    }
                                    setFormState((prev) => ({
                                      ...prev,
                                      mentioned_user_ids: newIds,
                                      mentioned_user_names: newNames,
                                      mentioned_user_id: newIds[0] || null,
                                      responsible_name: newNames[0] || "",
                                      responsible_company: newIds.length > 0 ? "N/A" : "",
                                      responsible_sector: newIds.length > 0 ? (p.cargo || "N/A") : "",
                                    }));
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                  <div className="flex flex-col">
                                    <span>{p.full_name}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {p.cargo || "N/A"}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {(formState.mentioned_user_names && formState.mentioned_user_names.length > 0) && (
                    <div className="p-2 border rounded bg-muted/20 text-[10px] space-y-0.5">
                      <div><strong>Selecionados:</strong> {formState.mentioned_user_names.length}</div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioridade</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <Button
                        key={opt.id}
                        type="button"
                        variant={formState.priority === opt.id ? "default" : "outline"}
                        disabled={(!isCreator && isResponsible && !isAdmin) || (isCancelled && !isAdmin)}
                        className={cn(
                          "w-full text-xs h-8",
                          formState.priority === opt.id && opt.color
                        )}
                        onClick={() => setFormState({ ...formState, priority: opt.id })}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Limite</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={(!isCreator && isResponsible && !isAdmin) || (isCancelled && !isAdmin)}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formState.due_date ? format(new Date(formState.due_date), "dd/MM/yyyy") : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formState.due_date ? new Date(formState.due_date) : undefined}
                        onSelect={(date) => setFormState({ ...formState, due_date: date ? format(date, "yyyy-MM-dd") : null })}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Comentários</label>
                  <DebouncedTextarea
                    placeholder="Observações adicionais..."
                    value={formState.comments || ""}
                    onChange={(val) => setFormState({ ...formState, comments: val })}
                    disabled={(!isCreator && !isAdmin) || (isCancelled && !isAdmin)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Histórico */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação realizada</TableHead>
                      <TableHead>Comentário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formState.history?.length ? (
                      formState.history.slice().reverse().map((ev, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs whitespace-nowrap">{format(new Date(ev.date), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="text-xs font-medium">{ev.user}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline">{ev.action}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{ev.comment}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum registro encontrado</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Rodapé: Botões de Ação */}
          <div className="sticky bottom-24 z-40 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/90 p-3 shadow-lg backdrop-blur-md print:hidden md:bottom-20">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={generatePDF}>
                <Printer className="w-4 h-4" /> Impressão
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => handleSave(false)} disabled={isSaving}>
                <Save className="w-4 h-4" /> {isSaving ? "Salvando..." : "Salvar"}
              </Button>
              <Button size="sm" className="gap-2" onClick={() => handleSave(true)} disabled={isSaving}>
                <Send className="w-4 h-4" /> {isSaving ? "Enviando..." : "Salvar e Enviar"}
              </Button>
              
              {isAdmin && selectedDesvio && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Desvio</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este desvio? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={async () => {
                          try {
                            await deleteDesvio.mutateAsync(selectedDesvio.id);
                            resetForm();
                          } catch (error) {
                            console.error(error);
                          }
                        }}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {(isCreator || isAdmin) && selectedDesvio && (
                <>
                  {formState.status === "Cancelado" ? (
                    <Button 
                      size="sm" 
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" 
                      onClick={() => handleStatusChange("Aberto")}
                    >
                      <History className="w-4 h-4" /> Reabrir Desvio
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusChange("corrigido")}>
                        <Check className="w-4 h-4" /> Aprovar
                      </Button>
                      <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleStatusChange("Em Tratamento")}>
                        <Ban className="w-4 h-4" /> Reprovar
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleStatusChange("corrigido")}>
                        <Archive className="w-4 h-4" /> Encerrar Desvio
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleStatusChange("Cancelado")}>
                        <X className="w-4 h-4" /> Cancelar
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-56 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-destructive/10">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <EditablePageTitle pageKey="desvios" defaultValue="Desvios" className="text-xl md:text-2xl font-bold text-foreground" />
              <p className="text-sm text-muted-foreground">Gestão de desvios e ocorrências</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DesviosTutorial />
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Desvio
            </Button>
          </div>
        </div>

        {/* Dashboard Resumido */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              activeFilter === "total" ? "bg-primary/10 border-primary" : "bg-primary/5 border-primary/20"
            )}
            onClick={() => setActiveFilter(activeFilter === "total" ? null : "total")}
          >
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{dashboardStats.total}</div>
              <div className="text-xs text-muted-foreground">Total de Desvios</div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              activeFilter === "open" ? "bg-blue-500/10 border-blue-500" : "bg-blue-500/5 border-blue-500/20"
            )}
            onClick={() => setActiveFilter(activeFilter === "open" ? null : "open")}
          >
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{dashboardStats.open}</div>
              <div className="text-xs text-muted-foreground">Abertos</div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              activeFilter === "inTreatment" ? "bg-amber-500/10 border-amber-500" : "bg-amber-500/5 border-amber-500/20"
            )}
            onClick={() => setActiveFilter(activeFilter === "inTreatment" ? null : "inTreatment")}
          >
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">{dashboardStats.inTreatment}</div>
              <div className="text-xs text-muted-foreground">Em Tratamento</div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              activeFilter === "done" ? "bg-green-500/10 border-green-500" : "bg-green-500/5 border-green-500/20"
            )}
            onClick={() => setActiveFilter(activeFilter === "done" ? null : "done")}
          >
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{dashboardStats.done}</div>
              <div className="text-xs text-muted-foreground">Corrigidos</div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              activeFilter === "delayed" ? "bg-red-500/10 border-red-500" : "bg-red-500/5 border-red-500/20"
            )}
            onClick={() => setActiveFilter(activeFilter === "delayed" ? null : "delayed")}
          >
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{dashboardStats.delayed}</div>
              <div className="text-xs text-muted-foreground">Atrasados</div>
            </CardContent>
          </Card>
        </div>

        {/* Busca e Lista */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar desvios..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDesvios.map((desvio) => (
            <Card
              key={desvio.id}
              className="virtual-card cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {
                setSelectedDesvio(desvio);
                setFormState(desvio);
                setIsEditing(true);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-1">
                    <Badge className={cn("text-[10px]", STATUS_OPTIONS.find(s => s.id === desvio.status)?.color)}>
                      {STATUS_OPTIONS.find(s => s.id === desvio.status)?.label || desvio.status}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px]", PRIORITY_OPTIONS.find(p => p.id === desvio.priority)?.color, "text-white border-transparent")}>
                      {desvio.priority}
                    </Badge>
                  </div>
                  
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Desvio</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este desvio? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await deleteDesvio.mutateAsync(desvio.id);
                              } catch (error) {
                                console.error(error);
                              }
                            }}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <CardTitle className="text-sm line-clamp-2 leading-relaxed">
                  {desvio.description}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span className="truncate">{desvio.responsible_name || "Sem responsável"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarIcon className="w-3 h-3" />
                  <span>{desvio.due_date ? format(parseISO(desvio.due_date), "dd/MM/yyyy") : "Sem prazo"}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {desvio.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {((desvio.attachments && desvio.attachments.length > 0) || (desvio.correction_photo_urls && desvio.correction_photo_urls.length > 0)) && (
                  <div className="flex gap-1 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                    {desvio.attachments?.filter(att => att.type.startsWith("image/")).map((att, i) => (
                      <div key={i} className="h-12 w-12 flex-shrink-0 rounded border overflow-hidden">
                        <img loading="lazy" decoding="async" 
                          src={att.url} 
                          alt={att.name} 
                          className="h-full w-full object-cover cursor-pointer hover:scale-110 transition-transform" 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(att.url, '_blank');
                          }}
                        />
                      </div>
                    ))}
                    {desvio.correction_photo_urls?.map((url, i) => (
                      <div key={i} className="h-12 w-12 flex-shrink-0 rounded border border-blue-200 overflow-hidden">
                        <img loading="lazy" decoding="async" 
                          src={url} 
                          alt={`Correção ${i}`} 
                          className="h-full w-full object-cover cursor-pointer hover:scale-110 transition-transform" 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(url, '_blank');
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {!loadingDesvios && filteredDesvios.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Nenhum desvio encontrado.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
