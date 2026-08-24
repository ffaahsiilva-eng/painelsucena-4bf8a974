import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Search, Save, Loader2, Users, ChevronDown, FileText, Lock, Unlock, BarChart3, ChevronRight } from "lucide-react";
import { useDDSParticipation, useSaveDDSParticipation, AbsenceReason } from "@/hooks/useDDSParticipation";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getLogoBase64, generatePdfHeader, PDF_HEADER_STYLES } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import { useEnvironment, ENVIRONMENTS } from "@/hooks/useEnvironment";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
}

const ABSENCE_LABELS: Record<AbsenceReason, string> = {
  falta: "Falta",
  atestado: "Atestado",
  treinamento: "Treinamento",
  exame: "Exame",
  folga: "Folga",
  afastado: "Afastado",
};

const ABSENCE_COLORS: Record<AbsenceReason, string> = {
  falta: "bg-red-500 text-white",
  atestado: "bg-yellow-500 text-white",
  treinamento: "bg-blue-500 text-white",
  exame: "bg-purple-500 text-white",
  folga: "bg-orange-500 text-white",
  afastado: "bg-gray-500 text-white",
};

interface AttendanceState {
  present: boolean;
  absence_reason: AbsenceReason | null;
}

const UNLOCK_CARGOS = [
  "tecnico_seguranca_i",
  "tecnico_seguranca_ii",
  "tecnico_meio_ambiente",
  "encarregado_i",
  "encarregado_ii",
];

const useDDSLock = (date: string) => {
  return useQuery({
    queryKey: ["dds-participation-lock", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dds_participation_locks")
        .select("*")
        .eq("dds_date", date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!date,
  });
};

export const DDSParticipationDialog = ({ open, onOpenChange, date }: Props) => {
  const { data: rhData } = useRHEfetivo();
  const { data: existing, isLoading } = useDDSParticipation(date);
  const saveMutation = useSaveDDSParticipation();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { info: envInfo } = useEnvironment();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const { data: lockData, isLoading: lockLoading } = useDDSLock(date);
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttendanceState>>({});
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [expandedReason, setExpandedReason] = useState<string | null>(null);

  // Fetch monthly participation data for stats
  const monthYear = date.substring(0, 7); // yyyy-MM
  const { data: monthlyData } = useQuery({
    queryKey: ["dds-participation-monthly-stats", monthYear, date],
    queryFn: async () => {
      const startDate = `${monthYear}-01`;
      const endDate = date;
      const { data, error } = await supabase
        .from("dds_participation")
        .select("employee_name, present, absence_reason")
        .gte("dds_date", startDate)
        .lte("dds_date", endDate);
      if (error) throw error;
      return data || [];
    },
    enabled: showStats && !!date,
  });

  const canUnlock = useMemo(() => {
    if (isAdmin) return true;
    if (!profile) return false;
    return UNLOCK_CARGOS.includes(profile.cargo || "");
  }, [isAdmin, profile]);

  const isLocked = !!lockData && !lockLoading;

  const employees = useMemo(() => {
    if (!rhData) return [];
    const deleted = new Set(rhData.deletedIds);
    return rhData.colaboradores
      .filter((c) => !deleted.has(c.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rhData]);

  useEffect(() => {
    if (!open) return;
    const map: Record<string, AttendanceState> = {};
    employees.forEach((e) => {
      map[e.nome] = { present: false, absence_reason: null };
    });
    if (existing) {
      existing.forEach((r) => {
        map[r.employee_name] = {
          present: r.present,
          absence_reason: (r.absence_reason as AbsenceReason) || null,
        };
      });
    }
    setAttendance(map);
    setSearch("");
  }, [open, existing, employees]);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter((e) => e.nome.toLowerCase().includes(q));
  }, [employees, search]);

  const togglePresent = (name: string) => {
    if (isLocked) return;
    setAttendance((prev) => {
      const cur = prev[name];
      if (cur?.present) {
        return { ...prev, [name]: { present: false, absence_reason: "falta" } };
      }
      return { ...prev, [name]: { present: true, absence_reason: null } };
    });
  };

  const setAbsenceReason = (name: string, reason: AbsenceReason) => {
    if (isLocked) return;
    setAttendance((prev) => ({
      ...prev,
      [name]: { present: false, absence_reason: reason },
    }));
  };

  const markAll = (present: boolean) => {
    if (isLocked) return;
    const map: Record<string, AttendanceState> = {};
    employees.forEach((e) => {
      map[e.nome] = { present, absence_reason: present ? null : "falta" };
    });
    setAttendance(map);
  };

  const getForbiddenColor = (dateStr: string) => {
    const month = parseInt(dateStr.split("-")[1], 10) - 1;
    const colorMap: Record<number, { name: string; hex: string }> = {
      0: { name: "Vermelha", hex: "#ef4444" },
      1: { name: "Azul", hex: "#3b82f6" },
      2: { name: "Amarela", hex: "#facc15" },
      3: { name: "Verde", hex: "#22c55e" },
      4: { name: "Vermelha", hex: "#ef4444" },
      5: { name: "Azul", hex: "#3b82f6" },
      6: { name: "Amarela", hex: "#facc15" },
      7: { name: "Verde", hex: "#22c55e" },
      8: { name: "Vermelha", hex: "#ef4444" },
      9: { name: "Azul", hex: "#3b82f6" },
      10: { name: "Amarela", hex: "#facc15" },
      11: { name: "Verde", hex: "#22c55e" },
    };
    return colorMap[month];
  };

  const postToInstaCena = async () => {
    if (!user || !profile) return;
    try {
      const logoBase64 = await getLogoBase64();
      const formattedDate = date.split("-").reverse().join("/");
      const sortedEntries = Object.entries(attendance).sort(([a], [b]) => a.localeCompare(b));
      const presentList = sortedEntries.filter(([, s]) => s.present);
      const absentList = sortedEntries.filter(([, s]) => !s.present);
      const forbiddenColor = getForbiddenColor(date);
      const envLabel = envInfo?.label || "";

      const reasonLabel = (r: AbsenceReason | null) => {
        if (!r) return "Falta";
        return ABSENCE_LABELS[r] || r;
      };

      const html = `
        <div id="dds-capture" style="font-family:Arial,sans-serif;padding:30px;color:#1f2937;background:white;width:800px;">
          ${generatePdfHeader("Lista de Presença - DDS", formattedDate, logoBase64)}
          <div style="display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap;">
            <div style="padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;background:#dcfce7;color:#166534;">✅ Presentes: ${presentList.length}</div>
            <div style="padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;background:#fee2e2;color:#991b1b;">❌ Ausentes: ${absentList.length}</div>
            <div style="padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;background:#f3f4f6;color:#374151;">Total: ${sortedEntries.length}</div>
            <div style="padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;background:#1f2937;color:white;display:flex;align-items:center;gap:8px;">🚫 Cor Proibida: <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${forbiddenColor.hex};border:2px solid white;"></span> ${forbiddenColor.name}</div>
            ${envLabel ? `<div style="padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;background:#e0f2fe;color:#075985;">📍 Local: ${envLabel}</div>` : ""}
          </div>
          <div style="font-size:14px;font-weight:700;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #e5e7eb;">Presentes</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr><th style="background:#1f2937;color:white;padding:8px 12px;text-align:left;">#</th><th style="background:#1f2937;color:white;padding:8px 12px;text-align:left;">Colaborador</th><th style="background:#1f2937;color:white;padding:8px 12px;text-align:left;">Status</th></tr></thead>
            <tbody>
              ${presentList.map(([name], i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}"><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;">${i + 1}</td><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;">${name}</td><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;"><span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;">Presente</span></td></tr>`).join("")}
              ${presentList.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:12px;">Nenhum</td></tr>' : ""}
            </tbody>
          </table>
          <div style="font-size:14px;font-weight:700;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #e5e7eb;">Ausentes</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr><th style="background:#1f2937;color:white;padding:8px 12px;text-align:left;">#</th><th style="background:#1f2937;color:white;padding:8px 12px;text-align:left;">Colaborador</th><th style="background:#1f2937;color:white;padding:8px 12px;text-align:left;">Motivo</th></tr></thead>
            <tbody>
              ${absentList.map(([name, state], i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}"><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;">${i + 1}</td><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;">${name}</td><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;"><span style="padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;">${reasonLabel(state.absence_reason)}</span></td></tr>`).join("")}
              ${absentList.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:12px;">Nenhum</td></tr>' : ""}
            </tbody>
          </table>
          <div style="margin-top:40px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:15px;">Sucena Engenharia • Lista de Presença DDS • ${formattedDate}</div>
        </div>
      `;

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.innerHTML = html;
      document.body.appendChild(container);

      const target = container.querySelector("#dds-capture") as HTMLElement;
      const canvas = await html2canvas(target, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      document.body.removeChild(container);

      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));

      const path = `instacena/dds-presenca-${date}-${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage.from("site-assets").upload(path, blob, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);

      const ddsCaption = `📋 Lista de Presença DDS - ${formattedDate}${envLabel ? `\n📍 Local: ${envLabel}` : ""}\n✅ ${presentList.length} presentes | ❌ ${absentList.length} ausentes | Total: ${sortedEntries.length}\n🚫 Cor Proibida do Mês: ${forbiddenColor.name}`;

      await supabase.from("instacena_posts").insert({
        user_id: user.id,
        user_name: profile.full_name || "Sistema",
        user_avatar_url: profile.avatar_url,
        content: ddsCaption,
        image_urls: [urlData.publicUrl],
        is_system_post: false,
      });

      // Envio automático ao grupo do WhatsApp (se ativado no painel admin)
      try {
        await supabase.functions.invoke("wapi-dds-photo-notify", {
          body: { caption: ddsCaption, image_url: urlData.publicUrl },
        });
      } catch (waErr) {
        console.warn("[DDS] envio WhatsApp falhou (silencioso)", waErr);
      }
    } catch (err) {
      console.error("Erro ao postar no InstaCena:", err);
    }
  };

  const lockList = async () => {
    if (!profile) return;
    try {
      await supabase.from("dds_participation_locks").insert({
        dds_date: date,
        locked_by: profile.user_id,
        locked_by_name: profile.full_name || "Sistema",
      });
      queryClient.invalidateQueries({ queryKey: ["dds-participation-lock", date] });
    } catch (err) {
      console.error("Erro ao bloquear lista:", err);
    }
  };

  const handleUnlock = async () => {
    if (!canUnlock) {
      toast.error("Apenas Técnico de Segurança ou Admin pode desbloquear");
      return;
    }
    try {
      await supabase.from("dds_participation_locks").delete().eq("dds_date", date);
      queryClient.invalidateQueries({ queryKey: ["dds-participation-lock", date] });
      toast.success("Lista desbloqueada!");
    } catch {
      toast.error("Erro ao desbloquear lista");
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    const participants = Object.entries(attendance).map(([name, state]) => ({
      name,
      present: state.present,
      absence_reason: state.absence_reason,
    }));
    try {
      await saveMutation.mutateAsync({ date, participants, userId: profile.user_id });
      toast.success("Lista de presença do DDS salva!");
      await lockList();
      await postToInstaCena();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar lista");
    }
  };

  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      const logoBase64 = await getLogoBase64();
      const formattedDate = date.split("-").reverse().join("/");

      const sortedEntries = Object.entries(attendance).sort(([a], [b]) => a.localeCompare(b));
      const presentList = sortedEntries.filter(([, s]) => s.present);
      const absentList = sortedEntries.filter(([, s]) => !s.present);

      const reasonLabel = (r: AbsenceReason | null) => {
        if (!r) return "Falta";
        return ABSENCE_LABELS[r] || r;
      };

      const html = `
        <html><head><style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #1f2937; }
          ${PDF_HEADER_STYLES}
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary-item { padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
          .summary-present { background: #dcfce7; color: #166534; }
          .summary-absent { background: #fee2e2; color: #991b1b; }
          .summary-total { background: #f3f4f6; color: #374151; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #1f2937; color: white; padding: 8px 12px; text-align: left; }
          td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) { background: #f9fafb; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
          .badge-present { background: #dcfce7; color: #166534; }
          .badge-falta { background: #fee2e2; color: #991b1b; }
          .badge-atestado { background: #fef3c7; color: #92400e; }
          .badge-treinamento { background: #dbeafe; color: #1e40af; }
          .badge-exame { background: #ede9fe; color: #5b21b6; }
           .badge-folga { background: #ffedd5; color: #9a3412; }
           .badge-afastado { background: #e5e7eb; color: #374151; }
          .section-title { font-size: 14px; font-weight: 700; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e5e7eb; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
        </style></head><body>
          ${generatePdfHeader("Lista de Presença - DDS", formattedDate, logoBase64)}
          <div class="summary">
            <div class="summary-item summary-present">✅ Presentes: ${presentList.length}</div>
            <div class="summary-item summary-absent">❌ Ausentes: ${absentList.length}</div>
            <div class="summary-item summary-total">Total: ${sortedEntries.length}</div>
          </div>

          <div class="section-title">Presentes</div>
          <table>
            <thead><tr><th>#</th><th>Colaborador</th><th>Status</th></tr></thead>
            <tbody>
              ${presentList.map(([name], i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${name}</td>
                  <td><span class="badge badge-present">Presente</span></td>
                </tr>
              `).join("")}
              ${presentList.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Nenhum</td></tr>' : ""}
            </tbody>
          </table>

          <div class="section-title">Ausentes</div>
          <table>
            <thead><tr><th>#</th><th>Colaborador</th><th>Motivo</th></tr></thead>
            <tbody>
              ${absentList.map(([name, state], i) => {
                const reason = state.absence_reason || "falta";
                return `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${name}</td>
                    <td><span class="badge badge-${reason}">${reasonLabel(state.absence_reason)}</span></td>
                  </tr>
                `;
              }).join("")}
              ${absentList.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Nenhum</td></tr>' : ""}
            </tbody>
          </table>

          <div class="footer">Sucena Engenharia • Lista de Presença DDS • ${formattedDate}</div>
        </body></html>
      `;

      await downloadPdfFromHtml(html, `DDS_Presenca_${date}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const presentCount = Object.values(attendance).filter((s) => s.present).length;
  const totalCount = employees.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Lista de Presença DDS — {date.split("-").reverse().join("/")}
          {isLocked && (
            <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
              <Lock className="h-3 w-3" />
              Bloqueada
            </span>
          )}
        </DialogTitle>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-green-600">{presentCount} presentes</span>
          <span>de {totalCount} colaboradores</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => setShowStats(s => !s)} title="Ver gráfico de status">
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>

        {showStats && (() => {
          if (!monthlyData) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

          const presentNames = new Set<string>();
          const reasonNames: Record<string, Set<string>> = {};
          
          monthlyData.forEach(r => {
            if (r.present) {
              presentNames.add(r.employee_name);
            } else {
              const key = r.absence_reason || "falta";
              if (!reasonNames[key]) reasonNames[key] = new Set();
              reasonNames[key].add(r.employee_name);
            }
          });

          const presentUniqueCount = presentNames.size;
          const allCounts = [presentUniqueCount, ...Object.values(reasonNames).map(s => s.size)];
          const maxBar = Math.max(...allCounts, 1);
          const formattedStart = `01/${date.substring(5, 7)}`;
          const formattedEnd = `${date.substring(8, 10)}/${date.substring(5, 7)}`;
          const colorMap: Record<string, string> = { falta: "bg-red-500", atestado: "bg-yellow-500", treinamento: "bg-blue-500", exame: "bg-purple-500", folga: "bg-orange-500", afastado: "bg-gray-500" };

          const toTitleCase = (n: string) => n.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

          return (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-xs">
              <p className="text-[10px] text-muted-foreground mb-2 text-center">Período: {formattedStart} a {formattedEnd}</p>
              
              {/* Presentes */}
              <button className="flex items-center gap-2 w-full hover:bg-muted/50 rounded p-1 transition-colors" onClick={() => setExpandedReason(expandedReason === "present" ? null : "present")}>
                <ChevronRight className={`h-3 w-3 transition-transform ${expandedReason === "present" ? "rotate-90" : ""}`} />
                <span className="w-24 text-right font-medium">✅ Presentes</span>
                <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${(presentUniqueCount / maxBar) * 100}%` }} />
                </div>
                <span className="w-8 font-bold text-right">{presentUniqueCount}</span>
              </button>
              {expandedReason === "present" && (
                <div className="ml-8 pl-2 border-l-2 border-green-300 dark:border-green-700 space-y-0.5 py-1 max-h-32 overflow-y-auto">
                  {[...presentNames].sort().map(n => <p key={n} className="text-[11px] text-muted-foreground">{toTitleCase(n)}</p>)}
                </div>
              )}

              {/* Ausências por motivo */}
              {(Object.keys(ABSENCE_LABELS) as AbsenceReason[]).map(reason => {
                const names = reasonNames[reason];
                if (!names || names.size === 0) return null;
                const isExpanded = expandedReason === reason;
                return (
                  <div key={reason}>
                    <button className="flex items-center gap-2 w-full hover:bg-muted/50 rounded p-1 transition-colors" onClick={() => setExpandedReason(isExpanded ? null : reason)}>
                      <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      <span className="w-24 text-right font-medium">❌ {ABSENCE_LABELS[reason]}</span>
                      <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                        <div className={`${colorMap[reason]} h-full rounded-full transition-all`} style={{ width: `${(names.size / maxBar) * 100}%` }} />
                      </div>
                      <span className="w-8 font-bold text-right">{names.size}</span>
                    </button>
                    {isExpanded && (
                      <div className="ml-8 pl-2 border-l-2 border-muted-foreground/20 space-y-0.5 py-1 max-h-32 overflow-y-auto">
                        {[...names].sort().map(n => <p key={n} className="text-[11px] text-muted-foreground">{toTitleCase(n)}</p>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {isLocked && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
            <Lock className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-amber-700 dark:text-amber-300 flex-1">
              Lista bloqueada por <strong>{lockData?.locked_by_name}</strong>
            </span>
            {canUnlock && (
              <Button variant="outline" size="sm" onClick={handleUnlock} className="gap-1 text-xs h-7">
                <Unlock className="h-3 w-3" />
                Desbloquear
              </Button>
            )}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {!isLocked && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => markAll(true)} className="text-xs">
              <Check className="h-3 w-3 mr-1" /> Marcar todos
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAll(false)} className="text-xs">
              <X className="h-3 w-3 mr-1" /> Desmarcar todos
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh] border rounded-lg overflow-y-auto" style={{ maxHeight: "50vh" }}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((emp) => {
                const state = attendance[emp.nome] ?? { present: false, absence_reason: null };
                return (
                  <div key={emp.id} className="flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <button
                      onClick={() => togglePresent(emp.nome)}
                      className="flex-shrink-0"
                      disabled={isLocked}
                    >
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
                          state.present
                            ? "bg-green-500 text-white"
                            : "bg-red-100 dark:bg-red-900/30 text-red-500"
                        } ${isLocked ? "opacity-60" : ""}`}
                      >
                        {state.present ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </div>
                    </button>
                    <div className="flex-1 min-w-0" onClick={() => togglePresent(emp.nome)} role="button">
                      <p className="text-sm font-medium truncate">{emp.nome}</p>
                      <p className="text-xs text-muted-foreground">{emp.funcao}</p>
                    </div>
                    {!state.present && !isLocked && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`text-xs h-7 px-2 gap-1 ${
                              state.absence_reason ? ABSENCE_COLORS[state.absence_reason] : ""
                            }`}
                          >
                            {state.absence_reason ? ABSENCE_LABELS[state.absence_reason] : "Motivo"}
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(Object.keys(ABSENCE_LABELS) as AbsenceReason[]).map((reason) => (
                            <DropdownMenuItem
                              key={reason}
                              onClick={() => setAbsenceReason(emp.nome, reason)}
                              className="text-xs"
                            >
                              {ABSENCE_LABELS[reason]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {!state.present && isLocked && state.absence_reason && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ABSENCE_COLORS[state.absence_reason]}`}>
                        {ABSENCE_LABELS[state.absence_reason]}
                      </span>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center py-6 text-sm text-muted-foreground">
                  Nenhum colaborador encontrado
                </p>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2">
          {!isLocked ? (
            <Button onClick={handleSave} disabled={saveMutation.isPending || generatingPdf} className="flex-1">
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Lista
            </Button>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground gap-1">
              <Lock className="h-4 w-4" />
              Lista salva e bloqueada
            </div>
          )}
          <Button
            variant="outline"
            onClick={generatePdf}
            disabled={generatingPdf || Object.keys(attendance).length === 0}
            className="gap-1"
          >
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
