import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Send, Search, Users, Bell, Play, FileImage, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { generateAndUploadParteDiariaPng } from "@/lib/parteDiariaShare";
import { format } from "date-fns";

const formatBR = (digits: string): string => {
  const d = (digits || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const GroupIdOverrideInput = ({
  id, value, onChange, defaultGroupId,
}: { id: string; value: string; onChange: (v: string) => void; defaultGroupId: string }) => (
  <div className="rounded-md border p-3 bg-background space-y-1.5 mt-3">
    <Label htmlFor={id} className="text-xs font-medium">
      ID do grupo específico para este alerta (opcional)
    </Label>
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={defaultGroupId ? `Padrão: ${defaultGroupId}` : "Deixe em branco para usar o grupo padrão"}
    />
    <p className="text-[11px] text-muted-foreground">
      Quando preenchido, este alerta será enviado para este grupo específico em vez do grupo padrão configurado acima.
    </p>
  </div>
);

const AdminWhatsApp = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const queryClient = useQueryClient();

  const [instanceUrl, setInstanceUrl] = useState("");
  const [instanceToken, setInstanceToken] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState<number>(5);
  const [groupId, setGroupId] = useState("");
  const [reroutePrivateToGroup, setReroutePrivateToGroup] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendToGroup, setSendToGroup] = useState(false);
  const [groupIdOverride, setGroupIdOverride] = useState("");
  const [ddsAutoNotify, setDdsAutoNotify] = useState(false);
  const [ddsNotifyDayBefore, setDdsNotifyDayBefore] = useState(false);
  const [autoSendReq, setAutoSendReq] = useState(false);
  const [autoSendReminders, setAutoSendReminders] = useState(false);
  const [autoSendAsoAlert, setAutoSendAsoAlert] = useState(false);
  const [autoSendMatrixAlert, setAutoSendMatrixAlert] = useState(false);
  const [autoSendForbiddenColorAlert, setAutoSendForbiddenColorAlert] = useState(false);
  const [autoSendCampaignAlert, setAutoSendCampaignAlert] = useState(false);
  const [autoSendOrderAlerts, setAutoSendOrderAlerts] = useState(false);
  const [autoSendOrdersToGroup, setAutoSendOrdersToGroup] = useState(false);
  const [groupIdOrders, setGroupIdOrders] = useState("");
  const [autoSendEquipmentMovements, setAutoSendEquipmentMovements] = useState(false);
  const [autoSendPlanningAlerts, setAutoSendPlanningAlerts] = useState(false);
  const [autoSendBillingAlert, setAutoSendBillingAlert] = useState(false);
  const [autoSendVehicleInspectionAlert, setAutoSendVehicleInspectionAlert] = useState(false);
  const [autoSendSlingInspectionAlert, setAutoSendSlingInspectionAlert] = useState(false);
  // Group ID overrides per feature (when empty, falls back to default group_id)
  const [groupIdRequisitions, setGroupIdRequisitions] = useState("");
  const [groupIdReminders, setGroupIdReminders] = useState("");
  const [groupIdAso, setGroupIdAso] = useState("");
  const [groupIdMatrix, setGroupIdMatrix] = useState("");
  const [groupIdForbiddenColor, setGroupIdForbiddenColor] = useState("");
  const [groupIdCampaign, setGroupIdCampaign] = useState("");
  const [groupIdEquipmentMovements, setGroupIdEquipmentMovements] = useState("");
  const [groupIdPlanning, setGroupIdPlanning] = useState("");
  const [groupIdBilling, setGroupIdBilling] = useState("");
  const [groupIdVehicleInspection, setGroupIdVehicleInspection] = useState("");
  const [groupIdSlingInspection, setGroupIdSlingInspection] = useState("");
  const [autoSendPosChuva, setAutoSendPosChuva] = useState(false);
  const [groupIdPosChuva, setGroupIdPosChuva] = useState("");
  const [autoSendDdsPhoto, setAutoSendDdsPhoto] = useState(false);
  const [groupIdDds, setGroupIdDds] = useState("");
  const [autoSendAttendance, setAutoSendAttendance] = useState(false);
  const [groupIdAttendance, setGroupIdAttendance] = useState("");
  const [autoSendDesvios, setAutoSendDesvios] = useState(false);
  const [groupIdDesvios, setGroupIdDesvios] = useState("");
  const [autoSendDesvioDue, setAutoSendDesvioDue] = useState(false);
  const [groupIdDesvioDue, setGroupIdDesvioDue] = useState("");
  const [testingDesvioDue, setTestingDesvioDue] = useState(false);
  const [autoSendLowStock, setAutoSendLowStock] = useState(false);
  const [groupIdLowStock, setGroupIdLowStock] = useState("");
  const [autoSendAdubo, setAutoSendAdubo] = useState(false);
  const [groupIdAdubo, setGroupIdAdubo] = useState("");
  const [testingPlanning, setTestingPlanning] = useState(false);
  const [testingBilling, setTestingBilling] = useState(false);
  const [testingVehicleInspection, setTestingVehicleInspection] = useState(false);
  const [testingSlingInspection, setTestingSlingInspection] = useState(false);
  const [testingDds, setTestingDds] = useState(false);
  const [testingDdsTomorrow, setTestingDdsTomorrow] = useState(false);
  const [testingAso, setTestingAso] = useState(false);
  const [autoSendTrainingAlert, setAutoSendTrainingAlert] = useState(false);
  const [groupIdTraining, setGroupIdTraining] = useState("");
  const [testingTraining, setTestingTraining] = useState(false);
  const [autoSendAtaContrato, setAutoSendAtaContrato] = useState(false);
  const [groupIdAtaContrato, setGroupIdAtaContrato] = useState("");
  const [testingAtaContrato, setTestingAtaContrato] = useState(false);
  const [testingMatrix, setTestingMatrix] = useState(false);
  const [testingForbiddenColor, setTestingForbiddenColor] = useState(false);
  const [testingCampaign, setTestingCampaign] = useState(false);
  const [autoSendCronogramaMirante, setAutoSendCronogramaMirante] = useState(false);
  const [groupIdCronogramaMirante, setGroupIdCronogramaMirante] = useState("");
  const [testingCronogramaMirante, setTestingCronogramaMirante] = useState(false);
  const [autoSendDriverStatus, setAutoSendDriverStatus] = useState(false);
  const [groupIdDriverStatus, setGroupIdDriverStatus] = useState("");
  const [autoSendDriverAppReminder, setAutoSendDriverAppReminder] = useState(false);
  const [groupIdDriverAppReminder, setGroupIdDriverAppReminder] = useState("");
  const [testingDriverAppReminder, setTestingDriverAppReminder] = useState(false);
  const [autoSendPlannedActivities, setAutoSendPlannedActivities] = useState(false);
  const [groupIdPlannedActivities, setGroupIdPlannedActivities] = useState("");
  const [testingPlannedActivities, setTestingPlannedActivities] = useState(false);
  const [parteDiariaOpen, setParteDiariaOpen] = useState(false);
  const [parteDiariaLoading, setParteDiariaLoading] = useState(false);
  const [parteDiariaRecords, setParteDiariaRecords] = useState<any[]>([]);
  const [sendingParteId, setSendingParteId] = useState<string | null>(null);




  const { data: cfg } = useQuery({
    queryKey: ["wapi-config"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wapi_config" as never)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; instance_url: string; instance_token: string; instance_id: string; enabled: boolean; delay_seconds: number | null; group_id: string | null; dds_auto_notify: boolean | null; dds_notify_day_before: boolean | null; auto_send_requisitions: boolean | null; auto_send_reminders: boolean | null; auto_send_aso_alert: boolean | null; auto_send_matrix_alert: boolean | null; auto_send_forbidden_color_alert: boolean | null; auto_send_campaign_alert: boolean | null; auto_send_order_alerts: boolean | null; auto_send_equipment_movements: boolean | null; auto_send_planning_alerts: boolean | null; auto_send_billing_alert: boolean | null; auto_send_vehicle_inspection_alert: boolean | null; auto_send_sling_inspection_alert: boolean | null } | null;
    },
  });

  useEffect(() => {
    if (cfg) {
      setInstanceUrl(cfg.instance_url || "");
      setInstanceToken(cfg.instance_token || "");
      setInstanceId(cfg.instance_id || "");
      setEnabled(!!cfg.enabled);
      setDelaySeconds(typeof cfg.delay_seconds === "number" ? cfg.delay_seconds : 5);
      setGroupId(cfg.group_id || "");
      const c = cfg as unknown as Record<string, unknown>;
      setReroutePrivateToGroup((c.reroute_private_to_group as boolean | null) !== false);
      setGroupIdRequisitions((c.group_id_requisitions as string | null) || "");
      setGroupIdReminders((c.group_id_reminders as string | null) || "");
      setGroupIdAso((c.group_id_aso as string | null) || "");
      setGroupIdMatrix((c.group_id_matrix as string | null) || "");
      setGroupIdForbiddenColor((c.group_id_forbidden_color as string | null) || "");
      setGroupIdCampaign((c.group_id_campaign as string | null) || "");
      setGroupIdEquipmentMovements((c.group_id_equipment_movements as string | null) || "");
      setGroupIdPlanning((c.group_id_planning as string | null) || "");
      setGroupIdBilling((c.group_id_billing as string | null) || "");
      setGroupIdVehicleInspection((c.group_id_vehicle_inspection as string | null) || "");
      setGroupIdSlingInspection((c.group_id_sling_inspection as string | null) || "");
      setDdsAutoNotify(!!cfg.dds_auto_notify);
      setDdsNotifyDayBefore(!!cfg.dds_notify_day_before);
      setAutoSendReq(!!cfg.auto_send_requisitions);
      setAutoSendReminders(!!cfg.auto_send_reminders);
      setAutoSendAsoAlert(!!cfg.auto_send_aso_alert);
      setAutoSendMatrixAlert(!!cfg.auto_send_matrix_alert);
      setAutoSendForbiddenColorAlert(!!cfg.auto_send_forbidden_color_alert);
      setAutoSendCampaignAlert(!!cfg.auto_send_campaign_alert);
      setAutoSendOrderAlerts(!!cfg.auto_send_order_alerts);
      setAutoSendOrdersToGroup(!!(c.auto_send_orders_to_group as boolean | null));
      setGroupIdOrders((c.group_id_orders as string | null) || "");
      setAutoSendEquipmentMovements(!!cfg.auto_send_equipment_movements);
      setAutoSendPlanningAlerts(!!cfg.auto_send_planning_alerts);
      setAutoSendBillingAlert(!!cfg.auto_send_billing_alert);
      setAutoSendVehicleInspectionAlert(!!cfg.auto_send_vehicle_inspection_alert);
      setAutoSendSlingInspectionAlert(!!cfg.auto_send_sling_inspection_alert);
      setAutoSendPosChuva(!!(c.auto_send_pos_chuva as boolean | null));
      setGroupIdPosChuva((c.group_id_pos_chuva as string | null) || "");
      setAutoSendDdsPhoto(!!(c.auto_send_dds_photo as boolean | null));
      setGroupIdDds((c.group_id_dds as string | null) || "");
      setAutoSendAttendance(!!(c.auto_send_attendance as boolean | null));
      setGroupIdAttendance((c.group_id_attendance as string | null) || "");
      setAutoSendDesvios(!!(c.auto_send_desvios as boolean | null));
      setGroupIdDesvios((c.group_id_desvios as string | null) || "");
      setAutoSendDesvioDue(!!(c.auto_send_desvio_due_alert as boolean | null));
      setGroupIdDesvioDue((c.group_id_desvio_due as string | null) || "");
      setAutoSendLowStock(!!(c.auto_send_low_stock_alert as boolean | null));
      setGroupIdLowStock((c.group_id_low_stock as string | null) || "");
      setAutoSendTrainingAlert(!!(c.auto_send_training_alert as boolean | null));
      setGroupIdTraining((c.group_id_training as string | null) || "");
      setAutoSendAdubo(!!(c.auto_send_adubo_alert as boolean | null));
      setGroupIdAdubo((c.group_id_adubo as string | null) || "");
      setAutoSendAtaContrato(!!(c.auto_send_ata_contrato as boolean | null));
      setGroupIdAtaContrato((c.group_id_ata_contrato as string | null) || "");
      setAutoSendCronogramaMirante(!!(c.auto_send_cronograma_mirante as boolean | null));
      setGroupIdCronogramaMirante((c.group_id_cronograma_mirante as string | null) || "");
      setAutoSendDriverStatus(!!(c.auto_send_driver_status as boolean | null));
      setGroupIdDriverStatus((c.group_id_driver_status as string | null) || "");
      setAutoSendDriverAppReminder(!!(c.auto_send_driver_app_reminder as boolean | null));
      setGroupIdDriverAppReminder((c.group_id_driver_app_reminder as string | null) || "");
      setAutoSendPlannedActivities(!!(c.auto_send_planned_activities as boolean | null));
      setGroupIdPlannedActivities((c.group_id_planned_activities as string | null) || "");
    }
  }, [cfg]);


  const { data: profiles } = useQuery({
    queryKey: ["wapi-profiles"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, whatsapp_number")
        .not("whatsapp_number", "is", null)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data || []).filter((p: { whatsapp_number: string | null }) => (p.whatsapp_number || "").length >= 10);
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["wapi-logs"],
    enabled: !!user && isAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wapi_message_logs" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Array<{ id: string; recipient_name: string | null; recipient_phone: string; status: string; error_message: string | null; created_at: string; message: string }>;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles || [];
    return (profiles || []).filter((p: { full_name: string | null; whatsapp_number: string | null }) =>
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.whatsapp_number || "").includes(q)
    );
  }, [profiles, search]);

  const allSelected = filtered.length > 0 && filtered.every((p: { user_id: string }) => selected.has(p.user_id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) {
      filtered.forEach((p: { user_id: string }) => next.delete(p.user_id));
    } else {
      filtered.forEach((p: { user_id: string }) => next.add(p.user_id));
    }
    setSelected(next);
  };

  const saveConfig = useMutation({
    mutationFn: async () => {
      const payload = {
        instance_url: instanceUrl.trim(),
        instance_token: instanceToken.trim(),
        instance_id: instanceId.trim(),
        group_id: groupId.trim() || null,
        reroute_private_to_group: reroutePrivateToGroup,
        enabled,
        delay_seconds: Math.max(0, Math.min(600, Math.floor(Number(delaySeconds) || 0))),
        dds_auto_notify: ddsAutoNotify,
        dds_notify_day_before: ddsNotifyDayBefore,
        auto_send_requisitions: autoSendReq,
        auto_send_reminders: autoSendReminders,
        auto_send_aso_alert: autoSendAsoAlert,
        auto_send_matrix_alert: autoSendMatrixAlert,
        auto_send_forbidden_color_alert: autoSendForbiddenColorAlert,
        auto_send_campaign_alert: autoSendCampaignAlert,
        auto_send_order_alerts: autoSendOrderAlerts,
        auto_send_orders_to_group: autoSendOrdersToGroup,
        group_id_orders: groupIdOrders.trim() || null,
        auto_send_equipment_movements: autoSendEquipmentMovements,
        auto_send_planning_alerts: autoSendPlanningAlerts,
        auto_send_billing_alert: autoSendBillingAlert,
        auto_send_vehicle_inspection_alert: autoSendVehicleInspectionAlert,
        auto_send_sling_inspection_alert: autoSendSlingInspectionAlert,
        group_id_requisitions: groupIdRequisitions.trim() || null,
        group_id_reminders: groupIdReminders.trim() || null,
        group_id_aso: groupIdAso.trim() || null,
        group_id_matrix: groupIdMatrix.trim() || null,
        group_id_forbidden_color: groupIdForbiddenColor.trim() || null,
        group_id_campaign: groupIdCampaign.trim() || null,
        group_id_equipment_movements: groupIdEquipmentMovements.trim() || null,
        group_id_planning: groupIdPlanning.trim() || null,
        group_id_billing: groupIdBilling.trim() || null,
        group_id_vehicle_inspection: groupIdVehicleInspection.trim() || null,
        group_id_sling_inspection: groupIdSlingInspection.trim() || null,
        auto_send_pos_chuva: autoSendPosChuva,
        group_id_pos_chuva: groupIdPosChuva.trim() || null,
        auto_send_dds_photo: autoSendDdsPhoto,
        group_id_dds: groupIdDds.trim() || null,
        auto_send_attendance: autoSendAttendance,
        group_id_attendance: groupIdAttendance.trim() || null,
        auto_send_desvios: autoSendDesvios,
        group_id_desvios: groupIdDesvios.trim() || null,
        auto_send_desvio_due_alert: autoSendDesvioDue,
        group_id_desvio_due: groupIdDesvioDue.trim() || null,
        auto_send_low_stock_alert: autoSendLowStock,
        group_id_low_stock: groupIdLowStock.trim() || null,
        auto_send_training_alert: autoSendTrainingAlert,
        group_id_training: groupIdTraining.trim() || null,
        auto_send_adubo_alert: autoSendAdubo,
        group_id_adubo: groupIdAdubo.trim() || null,
        auto_send_ata_contrato: autoSendAtaContrato,
        group_id_ata_contrato: groupIdAtaContrato.trim() || null,
        auto_send_cronograma_mirante: autoSendCronogramaMirante,
        group_id_cronograma_mirante: groupIdCronogramaMirante.trim() || null,
        auto_send_driver_status: autoSendDriverStatus,
        group_id_driver_status: groupIdDriverStatus.trim() || null,
        auto_send_driver_app_reminder: autoSendDriverAppReminder,
        group_id_driver_app_reminder: groupIdDriverAppReminder.trim() || null,
        auto_send_planned_activities: autoSendPlannedActivities,
        group_id_planned_activities: groupIdPlannedActivities.trim() || null,
        updated_by: user?.id ?? null,

      };
      if (cfg?.id) {
        const { error } = await supabase.from("wapi_config" as never).update(payload).eq("id", cfg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wapi_config" as never).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configuração salva");
      queryClient.invalidateQueries({ queryKey: ["wapi-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSend = async () => {
    if (!message.trim()) return toast.error("Escreva uma mensagem");

    const targetGroup = (groupIdOverride.trim() || groupId.trim());
    if (sendToGroup && !targetGroup) return toast.error("Informe o ID do grupo");
    if (!sendToGroup && selected.size === 0) return toast.error("Selecione ao menos um destinatário");

    const recipients = sendToGroup
      ? []
      : (profiles || [])
          .filter((p: { user_id: string }) => selected.has(p.user_id))
          .map((p: { user_id: string; full_name: string | null; whatsapp_number: string | null }) => ({
            user_id: p.user_id,
            name: p.full_name,
            phone: p.whatsapp_number || "",
          }));

    setSending(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-send`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: message.trim(),
            recipients,
            group_id: sendToGroup ? targetGroup : null,
          }),
        });
      } catch (netErr) {
        const detail = netErr instanceof Error ? `${netErr.name}: ${netErr.message}` : String(netErr);
        toast.error(`Falha de rede ao chamar ${url}`, { description: detail, duration: 15000 });
        console.error("[wapi-send] network error", netErr);
        throw netErr;
      }

      const responseText = await response.text();
      let data: any = null;
      try { data = responseText ? JSON.parse(responseText) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        const preview = (responseText || "(sem corpo)").slice(0, 500);
        toast.error(`Erro HTTP ${response.status} ${response.statusText}`, {
          description: preview,
          duration: 15000,
        });
        console.error("[wapi-send] http error", response.status, responseText);
        throw new Error(`HTTP ${response.status}: ${preview}`);
      }

      const res = data as { sent: number; total: number; errors?: any[] };
      toast.success(`${res.sent}/${res.total} enviadas`);
      if (res.errors?.length) {
        toast.error(`${res.errors.length} falha(s) no envio`, {
          description: JSON.stringify(res.errors).slice(0, 500),
          duration: 15000,
        });
      }
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      // Toast detalhado já foi emitido nos blocos acima; aqui só fallback
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.error("[wapi-send] final catch", e);
      // Evita toast duplicado se já tratado
      if (!msg.startsWith("HTTP ") && !msg.includes("Falha de rede")) {
        toast.error(msg, { duration: 15000 });
      }
    } finally {
      setSending(false);
    }
  };

  const handleTestDdsNotify = async (mode: "today" | "tomorrow" = "today") => {
    if (mode === "tomorrow") setTestingDdsTomorrow(true); else setTestingDds(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-dds-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada a enviar", { description: data.reason || "Sem DDS encontrado", duration: 8000 });
      } else {
        toast.success(`DDS (${mode === "tomorrow" ? "amanhã" : "hoje"}): ${data?.sent ?? 0}/${data?.total ?? 0} enviadas`);
        if (Array.isArray(data?.results)) {
          const failed = data.results.filter((r: { ok: boolean }) => !r.ok);
          if (failed.length) {
            toast.error(`${failed.length} falha(s)`, { description: JSON.stringify(failed).slice(0, 500), duration: 15000 });
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      if (mode === "tomorrow") setTestingDdsTomorrow(false); else setTestingDds(false);
    }
  };

  const handleTestCronogramaMirante = async () => {
    setTestingCronogramaMirante(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-cronograma-mirante-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada a enviar", { description: data.reason || "Sem alertas", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Alerta do Cronograma do Mirante enviado (${data.total} item(ns))`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingCronogramaMirante(false);
    }
  };

  const handleTestAsoNotify = async () => {
    setTestingAso(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-aso-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada a enviar", { description: data.reason || "Nenhum ASO no alvo", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Alerta de ASO enviado (${data.total} colaborador(es))`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingAso(false);
    }
  };

  const handleTestTrainingNotify = async () => {
    setTestingTraining(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-training-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada a enviar", { description: data.reason || "Nenhum treinamento no alvo", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Alerta de treinamento enviado (${data.total} item(ns))`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingTraining(false);
    }
  };

  const handleTestAtaContrato = async () => {
    setTestingAtaContrato(true);
    try {
      const { data: latest, error: lErr } = await supabase
        .from("meeting_minutes")
        .select("id, title")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lErr) throw lErr;
      if (!latest) {
        toast.info("Nenhuma ata importada", { description: "Importe um PDF em Planejamento › Ata Reunião de Contrato primeiro.", duration: 8000 });
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-ata-contrato-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minute_id: latest.id, reason: "imported", force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada a enviar", { description: data.reason || "Ignorado", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Resumo da ata "${latest.title}" enviado (${data.done}/${data.total} concluídos)`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingAtaContrato(false);
    }
  };

  const handleTestDesvioDue = async () => {
    setTestingDesvioDue(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-desvio-due-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada a enviar", { description: data.reason || "Ignorado", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Alerta enviado: ${data.due_today || 0} vencendo hoje, ${data.due_3d || 0} em 3 dias`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingDesvioDue(false);
    }
  };

  const handleTestMatrixNotify = async () => {
    setTestingMatrix(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-matrix-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada enviado", { description: data.reason || "—", duration: 8000 });
      } else if (data?.success) {
        if (data.totalPending === 0) {
          toast.success(`Matriz: todos preencheram! 🎉`);
        } else {
          toast.success(`Matriz enviada (${data.totalPending} pendente(s) de ${data.totalUsers})`);
        }
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingMatrix(false);
    }
  };

  const handleTestForbiddenColorNotify = async () => {
    setTestingForbiddenColor(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-forbidden-color-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada enviado", { description: data.reason || "—", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Cor proibida enviada: ${data.color} (${data.month})`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingForbiddenColor(false);
    }
  };

  const handleTestCampaignNotify = async () => {
    setTestingCampaign(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-campaign-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada enviado", { description: data.reason || "—", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Campanha do mês enviada: ${data.month}${data.hasImage ? " (com imagem)" : " (sem imagem)"}`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingCampaign(false);
    }
  };

  const openParteDiariaDialog = async () => {
    setParteDiariaOpen(true);
    setParteDiariaLoading(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("daily_shift_records")
        .select("id, equipment_id, equipment_name, plate, driver_name, shift_end_time, shift_start_time, created_at")
        .eq("shift_date", today)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setParteDiariaRecords(data || []);
    } catch (e: any) {
      toast.error("Erro ao carregar turnos: " + (e?.message || e));
    } finally {
      setParteDiariaLoading(false);
    }
  };

  const handleSendParteDiaria = async (rec: any) => {
    setSendingParteId(rec.id);
    try {
      const { data: eq, error: eqErr } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", rec.equipment_id)
        .maybeSingle();
      if (eqErr || !eq) throw eqErr || new Error("Equipamento não encontrado");

      toast.info("Gerando Parte Diária em PNG...");
      const imageUrl = await generateAndUploadParteDiariaPng(eq as any);
      if (!imageUrl) throw new Error("Falha ao gerar/enviar a imagem ao storage");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-driver-status-notify`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId: rec.equipment_id,
          equipmentName: rec.equipment_name,
          plate: rec.plate,
          newStatus: "end_of_shift",
          driverName: rec.driver_name,
          shiftRecordId: rec.id,
          imageUrl,
          imageCaption: `📄 Parte Diária — ${rec.equipment_name} (${rec.plate})\n👤 Motorista: ${rec.driver_name || "—"}`,
          extraInfo: "♻️ Reenvio manual da Parte Diária pelo painel admin.",
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      toast.success("Parte Diária enfileirada para o grupo!");
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || e));
    } finally {
      setSendingParteId(null);
    }
  };

  const handleTestPlanningNotify = async () => {

    setTestingPlanning(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-planning-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "monthly_summary", force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada enviado", { description: data.reason || "—", duration: 8000 });
      } else if (data?.success) {
        toast.success("Resumo do Planejamento enviado ao grupo");
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingPlanning(false);
    }
  };

  const handleTestBillingNotify = async () => {
    setTestingBilling(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-billing-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada enviado", { description: data.reason || "—", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Cobrança enviada ao grupo (${data.month})`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingBilling(false);
    }
  };

  const handleTestVehicleInspectionNotify = async () => {
    setTestingVehicleInspection(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-vehicle-inspection-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada enviado", { description: data.reason || "—", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Alerta de vistoria enviado (${data.total} item(ns))`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingVehicleInspection(false);
    }
  };

  const handleTestPlannedActivitiesNotify = async () => {
    setTestingPlannedActivities(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-planned-activities-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada enviado", { description: data.reason || "—", duration: 8000 });
      } else if (data?.success) {
        toast.success("Alerta de Atividades Previstas enviado ao grupo");
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingPlannedActivities(false);
    }
  };

  const handleTestSlingInspectionNotify = async () => {
    setTestingSlingInspection(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-sling-inspection-notify`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

      if (!response.ok) {
        toast.error(`Erro HTTP ${response.status}`, { description: text.slice(0, 500), duration: 15000 });
        return;
      }
      if (data?.skipped) {
        toast.info("Nada enviado", { description: data.reason || "—", duration: 8000 });
      } else if (data?.success) {
        toast.success(`Alerta de cintas enviado (${data.total} pendente(s))`);
      } else {
        toast.error("Falha no envio", { description: data?.error || "Erro desconhecido", duration: 15000 });
      }
      queryClient.invalidateQueries({ queryKey: ["wapi-logs"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao executar teste", { description: msg, duration: 15000 });
    } finally {
      setTestingSlingInspection(false);
    }
  };

  if (authLoading || adminLoading) return <Layout><div className="p-8">Carregando...</div></Layout>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl">
        <div className="flex items-center gap-3">
          <img loading="lazy" decoding="async" src="/whatsapp-api-icon.png" className="w-7 h-7 object-contain" alt="WhatsApp API" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">WhatsApp API (W-API)</h1>
            <p className="text-sm text-muted-foreground">Configure a instância e envie mensagens automáticas</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuração da Instância</CardTitle>
            <CardDescription>Informe a URL base da instância W-API, o ID da instância e o Token de autenticação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL da Instância</Label>
                <Input
                  placeholder="https://api.w-api.app/v1"
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Instance ID</Label>
                <Input
                  placeholder="ABCDE-12345"
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Token</Label>
              <Input
                type="password"
                placeholder="Bearer token da instância"
                value={instanceToken}
                onChange={(e) => setInstanceToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wapi-group">ID do Grupo (opcional)</Label>
              <Input
                id="wapi-group"
                placeholder="120363XXXXXXXXXXXX@g.us"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Informe o ID do grupo do WhatsApp (formato: 120363...@g.us). Será usado quando a opção "Enviar para grupo" estiver ativa.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wapi-delay">Intervalo entre envios (segundos)</Label>
              <Input
                id="wapi-delay"
                type="number"
                min={0}
                max={600}
                step={1}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Aguarda esse tempo entre cada mensagem para evitar bloqueio/banimento do número no WhatsApp. Recomendado: 5–15s.
              </p>
              <p className="text-xs text-primary">
                ⏱️ Todas as mensagens automáticas (lembretes, ASO, matriz, pedidos, equipamentos, planejamento, cor proibida e campanha) entram em uma fila global e respeitam este intervalo — mesmo quando disparadas no mesmo horário.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="wapi-reroute" className="text-sm font-medium">
                    Rerotear envios privados para o grupo principal
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Quando ativado, todas as mensagens direcionadas a números privados são redirecionadas automaticamente para o grupo configurado acima. Desative para manter o envio direto ao WhatsApp privado do destinatário.
                  </p>
                </div>
                <Switch
                  id="wapi-reroute"
                  checked={reroutePrivateToGroup}
                  onCheckedChange={setReroutePrivateToGroup}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={enabled} onCheckedChange={setEnabled} id="wapi-enabled" />
                <Label htmlFor="wapi-enabled">Integração habilitada</Label>
              </div>
              <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
                <Save className="w-4 h-4 mr-2" /> Salvar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Lembrete Automático do DDS
            </CardTitle>
            <CardDescription>
              Envia mensagens automáticas no WhatsApp do palestrante agendado, com base no horário do Pará.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="dds-auto-notify"
                  checked={ddsAutoNotify}
                  onCheckedChange={setDdsAutoNotify}
                />
                <Label htmlFor="dds-auto-notify" className="cursor-pointer">
                  Lembrete às <strong>06:00h do dia do DDS</strong> (hoje é o seu dia)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ddsAutoNotify ? "default" : "secondary"}>
                  {ddsAutoNotify ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => handleTestDdsNotify("today")} disabled={testingDds}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingDds ? "..." : "Testar"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="dds-notify-day-before"
                  checked={ddsNotifyDayBefore}
                  onCheckedChange={setDdsNotifyDayBefore}
                />
                <Label htmlFor="dds-notify-day-before" className="cursor-pointer">
                  Aviso <strong>1 dia antes às 16:00h</strong> (você palestra amanhã)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ddsNotifyDayBefore ? "default" : "secondary"}>
                  {ddsNotifyDayBefore ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => handleTestDdsNotify("tomorrow")} disabled={testingDdsTomorrow}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingDdsTomorrow ? "..." : "Testar"}
                </Button>
              </div>
            </div>

            <div className="rounded-md border p-3 bg-primary/5 space-y-2">
              <Label htmlFor="gid-dds-unified" className="text-sm font-semibold">
                📢 ID do grupo para mensagens do DDS
              </Label>
              <p className="text-xs text-muted-foreground">
                Este grupo receberá <strong>todas as mensagens automáticas relacionadas ao DDS</strong>:
                lembretes do palestrante, aviso 1 dia antes <strong>e a foto da Lista de Presença</strong> postada no dia.
                Se deixar em branco, será usado o grupo padrão configurado acima.
              </p>
              <GroupIdOverrideInput id="gid-dds-unified" value={groupIdDds} onChange={setGroupIdDds} defaultGroupId={groupId} />
            </div>

            <p className="text-xs text-muted-foreground">
              Requisitos: integração W-API habilitada, palestrante com usuário interno cadastrado e número de WhatsApp preenchido no perfil.
              Lembre-se de salvar a configuração após alterar estes botões.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Envio Automático de Requisições
            </CardTitle>
            <CardDescription>
              Quando habilitado, ao finalizar uma requisição (EPI ou Material) o sistema envia automaticamente
              para o <strong>grupo configurado</strong> uma mensagem com os detalhes dos itens e a <strong>imagem da requisição</strong>,
              respeitando o intervalo de segurança configurado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-req"
                  checked={autoSendReq}
                  onCheckedChange={setAutoSendReq}
                />
                <Label htmlFor="auto-send-req" className="cursor-pointer">
                  Ativar envio automático ao finalizar uma requisição
                </Label>
              </div>
              <Badge variant={autoSendReq ? "default" : "secondary"}>
                {autoSendReq ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <GroupIdOverrideInput id="gid-requisitions" value={groupIdRequisitions} onChange={setGroupIdRequisitions} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e ID do grupo preenchido. Lembre-se de salvar a configuração após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Envio Automático de Lembretes
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente os lembretes <strong>respeitando o agendamento</strong>:
              <br />• Lembretes <strong>com horário definido</strong> são enviados no horário escolhido (Pará UTC-4).
              <br />• Lembretes <strong>sem horário</strong> são enviados às <strong>06:00h</strong> da manhã.
              <br />• Se houver <strong>aviso antecipado</strong> (ex: 1 dia antes), também é enviado às 06:00h naqueles dias.
              <br />• Lembretes <strong>recorrentes</strong> (dias da semana) são enviados no horário configurado.
              <br />• Se mencionar <strong>todos</strong> → vai para o <strong>grupo configurado</strong>; senão → vai no <strong>privado</strong> do criador e dos usuários mencionados.
              <br />• Se o <strong>criador adiar</strong> o lembrete para outro dia, o envio do WhatsApp também é <strong>adiado automaticamente</strong> para a nova data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-reminders"
                  checked={autoSendReminders}
                  onCheckedChange={setAutoSendReminders}
                />
                <Label htmlFor="auto-send-reminders" className="cursor-pointer">
                  Ativar envio automático de lembretes no horário agendado
                </Label>
              </div>
              <Badge variant={autoSendReminders ? "default" : "secondary"}>
                {autoSendReminders ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <GroupIdOverrideInput id="gid-reminders" value={groupIdReminders} onChange={setGroupIdReminders} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada, ID do grupo preenchido (para lembretes de "todos") e usuários com WhatsApp cadastrado (para envios privados). Lembre-se de salvar a configuração após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alerta Automático de ASO (10 dias antes)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente uma mensagem para o <strong>grupo configurado</strong> quando
              faltarem <strong>10 dias</strong> para o vencimento do ASO de algum colaborador. A verificação roda <strong>diariamente às 06:00h</strong> (Pará UTC-4)
              e cada alerta é enviado apenas <strong>uma vez por colaborador/vencimento</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-aso"
                  checked={autoSendAsoAlert}
                  onCheckedChange={setAutoSendAsoAlert}
                />
                <Label htmlFor="auto-send-aso" className="cursor-pointer">
                  Ativar alerta automático de ASO no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendAsoAlert ? "default" : "secondary"}>
                  {autoSendAsoAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestAsoNotify} disabled={testingAso}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingAso ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-aso" value={groupIdAso} onChange={setGroupIdAso} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e ID do grupo preenchido. O botão "Testar" envia o alerta imediatamente,
              ignorando o filtro de duplicidade.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alerta Automático Cronograma do Mirante (2 dias antes e no dia)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente uma mensagem para o <strong>grupo configurado</strong> avisando
              sobre as atividades do <strong>Cronograma de Manutenção do Mirante</strong>: <strong>2 dias antes</strong> e <strong>no dia</strong> da execução.
              A verificação roda <strong>diariamente às 07:00h</strong> (Pará UTC-3) e cada alerta é enviado apenas <strong>uma vez por atividade/data</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-cronograma-mirante"
                  checked={autoSendCronogramaMirante}
                  onCheckedChange={setAutoSendCronogramaMirante}
                />
                <Label htmlFor="auto-send-cronograma-mirante" className="cursor-pointer">
                  Ativar alerta automático do Cronograma do Mirante
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendCronogramaMirante ? "default" : "secondary"}>
                  {autoSendCronogramaMirante ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestCronogramaMirante} disabled={testingCronogramaMirante}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingCronogramaMirante ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-cronograma" value={groupIdCronogramaMirante} onChange={setGroupIdCronogramaMirante} defaultGroupId={groupId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alerta Automático Atividades Previstas
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente uma mensagem para o <strong>grupo configurado</strong> sempre que as
              <strong> Atividades Previstas</strong> (Gabião e Jardinagem) forem salvas na página correspondente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-planned-activities"
                  checked={autoSendPlannedActivities}
                  onCheckedChange={setAutoSendPlannedActivities}
                />
                <Label htmlFor="auto-send-planned-activities" className="cursor-pointer">
                  Ativar alerta automático de Atividades Previstas
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendPlannedActivities ? "default" : "secondary"}>
                  {autoSendPlannedActivities ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestPlannedActivitiesNotify} disabled={testingPlannedActivities}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingPlannedActivities ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-planned-activities" value={groupIdPlannedActivities} onChange={setGroupIdPlannedActivities} defaultGroupId={groupId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alerta Automático de Treinamento NR (10 dias antes e no dia)
            </CardTitle>
            <CardDescription>
              Quando habilitado, envia automaticamente para o <strong>grupo configurado</strong> os colaboradores cujos
              treinamentos <strong>NR 20</strong> ou <strong>NR 35</strong> vencem em <strong>10 dias</strong> ou
              <strong> no próprio dia do vencimento</strong>. Verificação <strong>diária às 06:00h</strong> (Pará UTC-3),
              cada alerta enviado <strong>uma única vez por colaborador/treinamento</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-training"
                  checked={autoSendTrainingAlert}
                  onCheckedChange={setAutoSendTrainingAlert}
                />
                <Label htmlFor="auto-send-training" className="cursor-pointer">
                  Ativar alerta automático de Treinamento NR no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendTrainingAlert ? "default" : "secondary"}>
                  {autoSendTrainingAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestTrainingNotify} disabled={testingTraining}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingTraining ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-training" value={groupIdTraining} onChange={setGroupIdTraining} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              O botão "Testar" envia o alerta imediatamente, ignorando o controle de duplicidade.
              Salve a configuração após alterar o botão ou o ID do grupo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Auto-envio Ata de Reunião de Contrato
            </CardTitle>
            <CardDescription>
              Quando habilitado, sempre que um <strong>item da ata</strong> for marcado como
              <strong> concluído</strong>, ou quando um <strong>novo PDF</strong> da ata for
              importado, o sistema envia automaticamente para o <strong>grupo configurado</strong>
              uma mensagem detalhada com <strong>todos os itens concluídos</strong> e os que
              ainda <strong>faltam</strong>, organizados por seção. Itens já concluídos em atas
              anteriores são <strong>reaproveitados</strong> automaticamente na nova importação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-ata-contrato"
                  checked={autoSendAtaContrato}
                  onCheckedChange={setAutoSendAtaContrato}
                />
                <Label htmlFor="auto-send-ata-contrato" className="cursor-pointer">
                  Ativar envio automático no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendAtaContrato ? "default" : "secondary"}>
                  {autoSendAtaContrato ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestAtaContrato} disabled={testingAtaContrato}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingAtaContrato ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-ata-contrato" value={groupIdAtaContrato} onChange={setGroupIdAtaContrato} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              O botão "Testar" envia o resumo completo da última ata importada para o grupo configurado.
              Salve a configuração após alterar o botão ou o ID do grupo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alerta Automático da Matriz (toda Quinta às 10:00h)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente para o <strong>grupo configurado</strong> uma mensagem
              listando os colaboradores que <strong>ainda não preencheram</strong> a Matriz de Responsabilidades do mês,
              com os detalhes de quais tarefas estão pendentes. Se <strong>todos</strong> tiverem preenchido, será enviada uma
              mensagem de <strong>parabéns</strong> à equipe. Execução semanal: <strong>toda Quinta-feira às 10:00h</strong> (Pará UTC-4),
              sempre atualizada conforme o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-matrix"
                  checked={autoSendMatrixAlert}
                  onCheckedChange={setAutoSendMatrixAlert}
                />
                <Label htmlFor="auto-send-matrix" className="cursor-pointer">
                  Ativar envio automático do alerta da Matriz no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendMatrixAlert ? "default" : "secondary"}>
                  {autoSendMatrixAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestMatrixNotify} disabled={testingMatrix}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingMatrix ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-matrix" value={groupIdMatrix} onChange={setGroupIdMatrix} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e ID do grupo preenchido. O botão "Testar" envia a mensagem imediatamente.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alerta da Cor Proibida do Mês (todo dia 1º às 07:00h)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente para o <strong>grupo configurado</strong> uma mensagem
              avisando qual é a <strong>cor proibida do novo mês</strong>, sempre no dia da virada (todo dia 1º) às
              <strong> 07:00h (Pará UTC-4)</strong>. A mensagem inclui o mês de referência, a cor proibida e um alerta
              de atenção para que ninguém utilize itens, vestimentas ou EPIs nessa cor durante o mês.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-forbidden-color"
                  checked={autoSendForbiddenColorAlert}
                  onCheckedChange={setAutoSendForbiddenColorAlert}
                />
                <Label htmlFor="auto-send-forbidden-color" className="cursor-pointer">
                  Ativar envio automático da cor proibida do mês no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendForbiddenColorAlert ? "default" : "secondary"}>
                  {autoSendForbiddenColorAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestForbiddenColorNotify} disabled={testingForbiddenColor}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingForbiddenColor ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-forbidden" value={groupIdForbiddenColor} onChange={setGroupIdForbiddenColor} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e ID do grupo preenchido. O botão "Testar" envia a mensagem imediatamente,
              ignorando a regra de "somente no dia 1º".
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Campanha do Mês (todo dia 1º às 09:00h)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente para o <strong>grupo configurado</strong> a
              <strong> campanha do mês vigente</strong> (Janeiro Branco, Outubro Rosa, etc.) com a
              <strong> imagem da campanha</strong> em anexo, no <strong>dia 1º de cada mês às 09:00h (Pará UTC-4)</strong>.
              A legenda inclui o nome de todas as campanhas do mês, suas cores e descrições.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-campaign"
                  checked={autoSendCampaignAlert}
                  onCheckedChange={setAutoSendCampaignAlert}
                />
                <Label htmlFor="auto-send-campaign" className="cursor-pointer">
                  Ativar envio automático da campanha do mês no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendCampaignAlert ? "default" : "secondary"}>
                  {autoSendCampaignAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestCampaignNotify} disabled={testingCampaign}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingCampaign ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-campaign" value={groupIdCampaign} onChange={setGroupIdCampaign} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada, ID do grupo preenchido e banner do mês carregado em
              <code className="mx-1 px-1 rounded bg-muted">announcements/campaign-banners/campanha-{`{mês}`}.png</code>.
              Se a imagem não existir, será enviado apenas o texto.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Alertas de Pedidos no WhatsApp
            </CardTitle>
            <CardDescription>
              Quando habilitado, ao criar um pedido, o <strong>usuário encaminhado (mencionado)</strong> recebe no WhatsApp
              cadastrado todos os detalhes do pedido (itens, quantidades, descrições, data esperada e solicitante).
              A cada <strong>mudança de status</strong>, o <strong>solicitante</strong> também recebe automaticamente
              uma mensagem com o status anterior, o novo status e quem alterou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-order-alerts"
                  checked={autoSendOrderAlerts}
                  onCheckedChange={setAutoSendOrderAlerts}
                />
                <Label htmlFor="auto-send-order-alerts" className="cursor-pointer">
                  Ativar envio automático de alertas de pedidos no WhatsApp
                </Label>
              </div>
              <Badge variant={autoSendOrderAlerts ? "default" : "secondary"}>
                {autoSendOrderAlerts ? "Ativo" : "Desativado"}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30 mt-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-orders-to-group"
                  checked={autoSendOrdersToGroup}
                  onCheckedChange={setAutoSendOrdersToGroup}
                />
                <Label htmlFor="auto-send-orders-to-group" className="cursor-pointer">
                  Enviar também para o <strong>grupo do WhatsApp</strong> (criação e mudança de status)
                </Label>
              </div>
              <Badge variant={autoSendOrdersToGroup ? "default" : "secondary"}>
                {autoSendOrdersToGroup ? "Ativo" : "Desativado"}
              </Badge>
            </div>

            <GroupIdOverrideInput id="gid-orders" value={groupIdOrders} onChange={setGroupIdOrders} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e usuários com WhatsApp cadastrado no perfil. Quando "Enviar também para o grupo" está ativo,
              as mensagens vão para os números pessoais mencionados/solicitante <strong>e</strong> para o grupo configurado abaixo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Movimentação de Equipamentos no Grupo
            </CardTitle>
            <CardDescription>
              Quando habilitado, a cada <strong>entrada ou saída de equipamento</strong> registrada no sistema,
              o <strong>grupo do WhatsApp configurado</strong> recebe automaticamente uma mensagem com
              equipamento, placa, data, horário, motivo (no caso de saída), descrição do problema, observação e quem registrou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-equipment-movements"
                  checked={autoSendEquipmentMovements}
                  onCheckedChange={setAutoSendEquipmentMovements}
                />
                <Label htmlFor="auto-send-equipment-movements" className="cursor-pointer">
                  Ativar envio automático de movimentações no grupo
                </Label>
              </div>
              <Badge variant={autoSendEquipmentMovements ? "default" : "secondary"}>
                {autoSendEquipmentMovements ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <GroupIdOverrideInput id="gid-equipment" value={groupIdEquipmentMovements} onChange={setGroupIdEquipmentMovements} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido. Cada movimentação registrada
              dispara um envio imediato.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Status do Motorista no Grupo
            </CardTitle>
            <CardDescription>
              Quando habilitado, toda alteração de status feita pelo motorista no Painel
              (<strong>Operar, Aguardando, Chuva, Abastecendo, Fim de Turno</strong>) e também
              <strong> Pontos de Água</strong> é enviada automaticamente para o grupo do WhatsApp
              configurado, com equipamento, placa, motorista, horário e detalhes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-driver-status"
                  checked={autoSendDriverStatus}
                  onCheckedChange={setAutoSendDriverStatus}
                />
                <Label htmlFor="auto-send-driver-status" className="cursor-pointer">
                  Ativar envio automático de status do motorista no grupo
                </Label>
              </div>
              <Badge variant={autoSendDriverStatus ? "default" : "secondary"}>
                {autoSendDriverStatus ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <GroupIdOverrideInput id="gid-driver-status" value={groupIdDriverStatus} onChange={setGroupIdDriverStatus} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido.
              Cada mudança de status do motorista dispara um envio imediato.
            </p>

            <div className="mt-4 rounded-md border p-3 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Switch
                    id="auto-send-driver-app-reminder"
                    checked={autoSendDriverAppReminder}
                    onCheckedChange={setAutoSendDriverAppReminder}
                  />
                  <Label htmlFor="auto-send-driver-app-reminder" className="cursor-pointer">
                    Lembrete diário às 07:30 para motoristas usarem o app
                  </Label>
                </div>
                <Badge variant={autoSendDriverAppReminder ? "default" : "secondary"}>
                  {autoSendDriverAppReminder ? "Ativo" : "Desativado"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Envia diariamente às <strong>07:30 (horário do Pará)</strong> uma mensagem no grupo
                lembrando todos os motoristas e operadores de utilizarem o aplicativo, preenchendo
                <strong> KM, Horímetro</strong> e o <strong>nome do ajudante</strong>.
              </p>
              <GroupIdOverrideInput
                id="gid-driver-app-reminder"
                value={groupIdDriverAppReminder}
                onChange={setGroupIdDriverAppReminder}
                defaultGroupId={groupIdDriverStatus || groupId}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={testingDriverAppReminder}
                onClick={async () => {
                  setTestingDriverAppReminder(true);
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData.session?.access_token;
                    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-driver-app-reminder`;
                    const res = await fetch(url, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({}),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(json?.error || "Falha no envio");
                    if (json?.skipped) toast.warning(`Pulado: ${json.reason}`);
                    else toast.success("Lembrete enviado ao grupo");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Erro");
                  } finally {
                    setTestingDriverAppReminder(false);
                  }
                }}
              >
                {testingDriverAppReminder ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                Enviar agora (teste)
              </Button>
            </div>

            <div className="mt-4 rounded-md border bg-background p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Reenviar Parte Diária ao grupo</p>
                <p className="text-xs text-muted-foreground">
                  Gera novamente o PNG da Parte Diária de um equipamento do dia atual e envia ao grupo configurado.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={openParteDiariaDialog}>
                <FileImage className="w-4 h-4 mr-1" />
                Reenviar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={parteDiariaOpen} onOpenChange={setParteDiariaOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Reenviar Parte Diária ao Grupo</DialogTitle>
              <DialogDescription>
                Turnos registrados hoje. Ao clicar em "Enviar", a Parte Diária do equipamento é gerada e enviada ao grupo configurado.
              </DialogDescription>
            </DialogHeader>

            {parteDiariaLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
              </div>
            ) : parteDiariaRecords.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum turno registrado hoje.
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Fim Turno</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parteDiariaRecords.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.equipment_name}
                          <div className="text-xs text-muted-foreground">{r.plate}</div>
                        </TableCell>
                        <TableCell>{r.driver_name || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.shift_end_time ? format(new Date(r.shift_end_time), "HH:mm") : "em andamento"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleSendParteDiaria(r)}
                            disabled={sendingParteId === r.id}
                          >
                            {sendingParteId === r.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-1" />
                                Enviar
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setParteDiariaOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>




        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Planejamento — Metas e Resumo Mensal
            </CardTitle>
            <CardDescription>
              Quando habilitado: ao <strong>concluir uma meta no Planejamento</strong> (realizado ≥ meta),
              o grupo recebe imediatamente os detalhes (atividade, categoria, meta, realizado, atingimento).
              Todo <strong>dia 16 às 09:00h (Pará UTC-4)</strong>, o grupo também recebe o
              <strong> resumo mensal</strong> com o avanço geral, lista do que foi concluído e o que faltou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-planning"
                  checked={autoSendPlanningAlerts}
                  onCheckedChange={setAutoSendPlanningAlerts}
                />
                <Label htmlFor="auto-send-planning" className="cursor-pointer">
                  Ativar alertas do Planejamento no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendPlanningAlerts ? "default" : "secondary"}>
                  {autoSendPlanningAlerts ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestPlanningNotify} disabled={testingPlanning}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingPlanning ? "..." : "Testar Resumo"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-planning" value={groupIdPlanning} onChange={setGroupIdPlanning} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido. O botão "Testar Resumo"
              envia o resumo mensal imediatamente, ignorando a regra do dia 16.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Cobrança Mensal — WhatsApp Automático (todo dia 25 às 09:00h)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente para o <strong>grupo configurado</strong> a
              <strong> cobrança da mensalidade</strong> referente à implementação do WhatsApp de mensagens automáticas,
              <strong> todo dia 25 de cada mês às 09:00h (Pará UTC-4)</strong>. A mensagem inclui os dados do PIX
              (chave <code className="mx-1 px-1 rounded bg-muted">07027339382</code>, Banco Inter, Domingues Fabrício)
              e o mês de referência.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-billing"
                  checked={autoSendBillingAlert}
                  onCheckedChange={setAutoSendBillingAlert}
                />
                <Label htmlFor="auto-send-billing" className="cursor-pointer">
                  Ativar envio automático da cobrança mensal no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendBillingAlert ? "default" : "secondary"}>
                  {autoSendBillingAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestBillingNotify} disabled={testingBilling}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingBilling ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-billing" value={groupIdBilling} onChange={setGroupIdBilling} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido. O botão "Testar" envia
              a cobrança imediatamente, ignorando a regra do dia 25/09:00h. Lembre-se de salvar após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Vistoria de Equipamentos (10 dias antes do vencimento)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente para o <strong>grupo configurado</strong> uma mensagem
              quando faltarem <strong>10 dias</strong> para o vencimento de qualquer data de vistoria de equipamentos
              (Vistoria, Laudo Opacidade, Laudo Mecânico, Plano Manutenção e Cronógrafo). A verificação roda
              <strong> diariamente às 06:00h (Pará UTC-4)</strong> e cada alerta é enviado apenas
              <strong> uma vez por placa/campo/vencimento</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-vehicle-inspection"
                  checked={autoSendVehicleInspectionAlert}
                  onCheckedChange={setAutoSendVehicleInspectionAlert}
                />
                <Label htmlFor="auto-send-vehicle-inspection" className="cursor-pointer">
                  Ativar alerta automático de vistoria no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendVehicleInspectionAlert ? "default" : "secondary"}>
                  {autoSendVehicleInspectionAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestVehicleInspectionNotify} disabled={testingVehicleInspection}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingVehicleInspection ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-vehicle" value={groupIdVehicleInspection} onChange={setGroupIdVehicleInspection} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido. O botão "Testar" envia
              imediatamente os alertas para itens vencendo em exatamente 10 dias, ignorando a duplicidade. Lembre-se de
              salvar após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Vistorias de Cintas Pendentes (dias 10 e 28 às 14h)
            </CardTitle>
            <CardDescription>
              Quando habilitado, o sistema envia automaticamente para o <strong>grupo configurado</strong> exatamente
              a mesma lista de cintas que aparece no destaque <strong>"Vistorias de Cintas Pendentes"</strong> do Admin
              (cintas da cor do mês ainda não inspecionadas). A verificação roda
              <strong> nos dias 10 e 28 de cada mês, às 14:00h (Pará UTC-4)</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-sling-inspection"
                  checked={autoSendSlingInspectionAlert}
                  onCheckedChange={setAutoSendSlingInspectionAlert}
                />
                <Label htmlFor="auto-send-sling-inspection" className="cursor-pointer">
                  Ativar alerta automático de cintas pendentes no grupo
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={autoSendSlingInspectionAlert ? "default" : "secondary"}>
                  {autoSendSlingInspectionAlert ? "Ativo" : "Desativado"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleTestSlingInspectionNotify} disabled={testingSlingInspection}>
                  <Play className="w-4 h-4 mr-1" />
                  {testingSlingInspection ? "..." : "Testar"}
                </Button>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-sling" value={groupIdSlingInspection} onChange={setGroupIdSlingInspection} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido. O botão "Testar"
              envia imediatamente a lista de cintas pendentes da cor do mês, ignorando a janela de dias/horário.
              Lembre-se de salvar após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Envio Automático de Pós Chuva
            </CardTitle>
            <CardDescription>
              Quando habilitado, ao <strong>salvar</strong> uma inspeção <strong>Pós Chuva</strong> o sistema gera
              automaticamente uma <strong>imagem PNG completa</strong> do formulário (com todos os detalhes, checklist,
              plano de ação, observações e assinaturas) e envia para o <strong>grupo configurado</strong>,
              respeitando o intervalo de segurança configurado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-pos-chuva"
                  checked={autoSendPosChuva}
                  onCheckedChange={setAutoSendPosChuva}
                />
                <Label htmlFor="auto-send-pos-chuva" className="cursor-pointer">
                  Ativar envio automático ao salvar uma inspeção Pós Chuva
                </Label>
              </div>
              <Badge variant={autoSendPosChuva ? "default" : "secondary"}>
                {autoSendPosChuva ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <GroupIdOverrideInput id="gid-pos-chuva" value={groupIdPosChuva} onChange={setGroupIdPosChuva} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido (use o campo acima
              para enviar para um grupo diferente do padrão). Lembre-se de salvar a configuração após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Envio Automático de Foto do DDS
            </CardTitle>
            <CardDescription>
              Quando habilitado, ao <strong>salvar a Lista de Presença do DDS</strong> o sistema envia
              automaticamente para o <strong>grupo configurado</strong> a <strong>mesma foto e descrição completa</strong>
              que é publicada no InstaCena (presentes, ausentes, total, cor proibida do mês e local),
              respeitando o intervalo de segurança configurado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-dds-photo"
                  checked={autoSendDdsPhoto}
                  onCheckedChange={setAutoSendDdsPhoto}
                />
                <Label htmlFor="auto-send-dds-photo" className="cursor-pointer">
                  Ativar envio automático da foto do DDS ao grupo
                </Label>
              </div>
              <Badge variant={autoSendDdsPhoto ? "default" : "secondary"}>
                {autoSendDdsPhoto ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo do DDS</strong> preenchido na seção
              <em> "Lembrete Automático do DDS"</em> acima (esse mesmo grupo recebe a foto). Lembre-se de salvar a configuração após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Envio Automático da Lista de Presença
            </CardTitle>
            <CardDescription>
              Quando habilitado, ao <strong>salvar a Lista de Presença diária</strong> (Gabião, Jardinagem ou ADM)
              o sistema envia automaticamente para o <strong>grupo configurado</strong> o
              <strong> texto formatado</strong> com presentes, ausentes e total da área,
              respeitando o intervalo de segurança configurado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-attendance"
                  checked={autoSendAttendance}
                  onCheckedChange={setAutoSendAttendance}
                />
                <Label htmlFor="auto-send-attendance" className="cursor-pointer">
                  Ativar envio automático ao salvar a Lista de Presença
                </Label>
              </div>
              <Badge variant={autoSendAttendance ? "default" : "secondary"}>
                {autoSendAttendance ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <GroupIdOverrideInput id="gid-attendance" value={groupIdAttendance} onChange={setGroupIdAttendance} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido (use o campo acima
              para enviar para um grupo diferente do padrão). Lembre-se de salvar a configuração após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Envio Automático de Desvios
            </CardTitle>
            <CardDescription>
              Quando habilitado, ao <strong>registrar um Desvio</strong> o sistema envia automaticamente
              para o <strong>grupo configurado</strong> a <strong>foto anexada</strong> junto com a
              <strong> descrição completa</strong> (responsáveis, prazo, itens e quem registrou),
              respeitando o intervalo de segurança configurado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-desvios"
                  checked={autoSendDesvios}
                  onCheckedChange={setAutoSendDesvios}
                />
                <Label htmlFor="auto-send-desvios" className="cursor-pointer">
                  Ativar envio automático ao registrar um Desvio
                </Label>
              </div>
              <Badge variant={autoSendDesvios ? "default" : "secondary"}>
                {autoSendDesvios ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <GroupIdOverrideInput id="gid-desvios" value={groupIdDesvios} onChange={setGroupIdDesvios} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido (use o campo acima
              para enviar para um grupo diferente do padrão). Lembre-se de salvar a configuração após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Alerta de Prazo de Desvios (3 dias antes e no dia)
            </CardTitle>
            <CardDescription>
              Quando habilitado, todos os dias às <strong>06:00h (horário do Pará)</strong> o sistema verifica
              os <strong>desvios em aberto</strong> e envia um alerta no <strong>grupo configurado</strong>:
              <br />• <strong>3 dias antes</strong> da previsão de término
              <br />• <strong>No dia</strong> da previsão de término
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-desvio-due"
                  checked={autoSendDesvioDue}
                  onCheckedChange={setAutoSendDesvioDue}
                />
                <Label htmlFor="auto-send-desvio-due" className="cursor-pointer">
                  Ativar alerta automático de prazo de desvios
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleTestDesvioDue} disabled={testingDesvioDue}>
                  <Send className="w-4 h-4 mr-1" />
                  {testingDesvioDue ? "..." : "Testar"}
                </Button>
                <Badge variant={autoSendDesvioDue ? "default" : "secondary"}>
                  {autoSendDesvioDue ? "Ativo" : "Desativado"}
                </Badge>
              </div>
            </div>
            <GroupIdOverrideInput id="gid-desvio-due" value={groupIdDesvioDue} onChange={setGroupIdDesvioDue} defaultGroupId={groupIdDesvios || groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada, desvio com <strong>data de previsão</strong> preenchida e
              status diferente de "corrigido". Use o botão "Testar" para forçar um envio imediato com os desvios atuais.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Envio Automático de Estoque Baixo / Zerado
            </CardTitle>
            <CardDescription>
              Quando habilitado, sempre que um item do <strong>Almoxarifado</strong> ficar com
              quantidade <strong>abaixo do mínimo</strong> ou <strong>zerar</strong>, o sistema envia
              automaticamente para o <strong>grupo configurado</strong> os <strong>detalhes completos</strong>
              do item (categoria, quantidade atual, mínimo, local, CA, observações e quem registrou a movimentação).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="auto-send-low-stock"
                  checked={autoSendLowStock}
                  onCheckedChange={setAutoSendLowStock}
                />
                <Label htmlFor="auto-send-low-stock" className="cursor-pointer">
                  Ativar alerta automático de estoque baixo / zerado
                </Label>
              </div>
              <Badge variant={autoSendLowStock ? "default" : "secondary"}>
                {autoSendLowStock ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <GroupIdOverrideInput id="gid-low-stock" value={groupIdLowStock} onChange={setGroupIdLowStock} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido (use o campo acima
              para enviar para um grupo diferente do padrão). Lembre-se de salvar a configuração após alterar este botão.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Envio Automático de Entrada / Retirada de Adubo
            </CardTitle>
            <CardDescription>
              Quando habilitado, toda <strong>entrada</strong> (admin) e <strong>retirada</strong> (qualquer usuário)
              de adubo é enviada automaticamente para o <strong>grupo configurado</strong> com quantidade,
              saldo, data, hora, motivo, quem retirou e quem registrou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch id="auto-send-adubo" checked={autoSendAdubo} onCheckedChange={setAutoSendAdubo} />
                <Label htmlFor="auto-send-adubo" className="cursor-pointer">
                  Ativar alerta automático de Adubo
                </Label>
              </div>
              <Badge variant={autoSendAdubo ? "default" : "secondary"}>
                {autoSendAdubo ? "Ativo" : "Desativado"}
              </Badge>
            </div>
            <GroupIdOverrideInput id="gid-adubo" value={groupIdAdubo} onChange={setGroupIdAdubo} defaultGroupId={groupId} />
            <p className="text-xs text-muted-foreground mt-3">
              Requisitos: integração W-API habilitada e <strong>ID do grupo</strong> preenchido (use o campo acima
              para enviar para um grupo específico). Salve a configuração após alterar.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Envio de Mensagem</CardTitle>
            <CardDescription>Selecione os usuários e escreva a mensagem. Apenas usuários com WhatsApp cadastrado aparecem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Digite a mensagem..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={4000}
            />
            <div className="text-xs text-muted-foreground text-right">{message.length}/4000</div>

            <Separator />

            <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/30">
              <Switch id="send-to-group" checked={sendToGroup} onCheckedChange={setSendToGroup} />
              <Label htmlFor="send-to-group" className="cursor-pointer">Enviar para grupo do WhatsApp</Label>
            </div>

            {sendToGroup ? (
              <div className="space-y-2">
                <Label htmlFor="group-override">ID do Grupo</Label>
                <Input
                  id="group-override"
                  placeholder={groupId || "120363XXXXXXXXXXXX@g.us"}
                  value={groupIdOverride}
                  onChange={(e) => setGroupIdOverride(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para usar o grupo padrão configurado acima ({groupId || "nenhum"}).
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou número..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                  />
                  <Badge variant="secondary" className="ml-auto">
                    <Users className="w-3 h-3 mr-1" /> {selected.size} selecionado(s)
                  </Badge>
                </div>

                <div className="border rounded-md max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>WhatsApp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            Nenhum usuário com WhatsApp cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                      {filtered.map((p: { user_id: string; full_name: string | null; whatsapp_number: string | null }) => (
                        <TableRow key={p.user_id}>
                          <TableCell>
                            <Checkbox
                              checked={selected.has(p.user_id)}
                              onCheckedChange={(v) => {
                                const next = new Set(selected);
                                if (v) next.add(p.user_id); else next.delete(p.user_id);
                                setSelected(next);
                              }}
                            />
                          </TableCell>
                          <TableCell>{p.full_name || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{formatBR(p.whatsapp_number || "")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={sending || !enabled}>
                <Send className="w-4 h-4 mr-2" />
                {sending
                  ? "Enviando..."
                  : sendToGroup
                  ? "Enviar para o grupo"
                  : `Enviar para ${selected.size}`}
              </Button>
            </div>
            {!enabled && (
              <p className="text-xs text-amber-600">Habilite a integração para enviar mensagens.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Envios</CardTitle>
            <CardDescription>Últimas 50 mensagens enviadas via W-API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Nenhum envio registrado
                      </TableCell>
                    </TableRow>
                  )}
                  {(logs || []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">{l.recipient_name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{l.recipient_phone}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === "sent" ? "default" : "destructive"}>
                          {l.status === "sent" ? "Enviado" : "Falhou"}
                        </Badge>
                        {l.error_message && (
                          <div className="text-[10px] text-destructive mt-1">{l.error_message}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">{l.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminWhatsApp;
