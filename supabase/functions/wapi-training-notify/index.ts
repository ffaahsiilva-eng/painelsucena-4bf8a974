// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALERT_DAYS = 10;
const FN_VERSION = "v1.0.1";

const paraTodayUTC = () => {
  const now = new Date();
  const para = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return Date.UTC(para.getUTCFullYear(), para.getUTCMonth(), para.getUTCDate());
};

const fmtBR = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
};
const fmtISO = (ms: number) => new Date(ms).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    let force = false;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        force = !!body?.force;
      }
    } catch {}

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "W-API desabilitada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!cfg.auto_send_training_alert && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "Alerta de treinamento desabilitado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupId = (cfg.group_id_training || cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: trainings, error: tErr } = await admin
      .from("nr_trainings")
      .select("*")
      .not("training_date", "is", null);
    if (tErr) throw tErr;

    const todayMs = paraTodayUTC();
    const target10Ms = todayMs + ALERT_DAYS * 86400000;

    const collected: Array<{
      key: string;
      type: "10d" | "0d";
      training: any;
      expiryMs: number;
    }> = [];

    for (const t of trainings || []) {
      const validity = t.validity_days ?? 730;
      const d = new Date(t.training_date + "T00:00:00Z");
      const expiryMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + validity);

      if (expiryMs === target10Ms) {
        collected.push({
          key: `${t.id}:${fmtISO(expiryMs)}:10d`,
          type: "10d",
          training: t,
          expiryMs,
        });
      } else if (expiryMs === todayMs) {
        collected.push({
          key: `${t.id}:${fmtISO(expiryMs)}:0d`,
          type: "0d",
          training: t,
          expiryMs,
        });
      }
    }

    if (collected.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Nenhum treinamento vencendo hoje ou em 10 dias" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keys = collected.map((c) => c.key);
    const { data: sentRows } = await admin
      .from("wapi_training_alerts_sent")
      .select("alert_key")
      .in("alert_key", keys);
    const sentSet = new Set((sentRows || []).map((r: any) => r.alert_key));

    const toSend = force ? collected : collected.filter((c) => !sentSet.has(c.key));
    if (toSend.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Todos os alertas já foram enviados" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const due10 = toSend.filter((c) => c.type === "10d");
    const due0 = toSend.filter((c) => c.type === "0d");

    const lines: string[] = [];
    lines.push(`🎓 *ALERTA DE TREINAMENTOS NR*`);
    lines.push("");

    if (due0.length > 0) {
      lines.push(`🚨 *VENCEM HOJE (${due0.length}):*`);
      due0.forEach((c, i) => {
        if (i > 0) lines.push("─────────────────");
        const t = c.training;
        lines.push(`👤 *${t.collaborator_name}*`);
        if (t.matricula) lines.push(`🔢 Matrícula: ${t.matricula}`);
        if (t.role) lines.push(`💼 Função: ${t.role}`);
        if (t.area) lines.push(`📍 Área: ${t.area}`);
        lines.push(`🎓 Treinamento: *${t.training === "NR20" ? "NR 20" : "NR 35"}*`);
        lines.push(`📅 Vence em: *${fmtBR(c.expiryMs)}* (HOJE)`);
      });
      lines.push("");
    }

    if (due10.length > 0) {
      lines.push(`⚠️ *VENCEM EM ${ALERT_DAYS} DIAS (${due10.length}):*`);
      due10.forEach((c, i) => {
        if (i > 0) lines.push("─────────────────");
        const t = c.training;
        lines.push(`👤 *${t.collaborator_name}*`);
        if (t.matricula) lines.push(`🔢 Matrícula: ${t.matricula}`);
        if (t.role) lines.push(`💼 Função: ${t.role}`);
        if (t.area) lines.push(`📍 Área: ${t.area}`);
        lines.push(`🎓 Treinamento: *${t.training === "NR20" ? "NR 20" : "NR 35"}*`);
        lines.push(`📅 Vence em: *${fmtBR(c.expiryMs)}* (em ${ALERT_DAYS} dias)`);
      });
      lines.push("");
    }

    lines.push(`⚠️ Providencie a reciclagem com antecedência.`);
    lines.push(`_Mensagem automática - Sucena_`);
    const message = lines.join("\n");

    const { error: qErr } = await admin.from("wapi_outbox").insert({
      kind: "text",
      target_type: "group",
      phone: groupId,
      message,
      origin: "training",
      recipient_name: "Grupo - Alerta Treinamento NR",
    });

    if (qErr) {
      return new Response(JSON.stringify({ error: qErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!force) {
      const inserts = toSend.map((c) => ({
        alert_key: c.key,
        training_id: c.training.id,
        expiry_date: fmtISO(c.expiryMs),
        alert_type: c.type,
      }));
      await admin.from("wapi_training_alerts_sent").insert(inserts);
    }

    return new Response(JSON.stringify({
      success: true,
      total: toSend.length,
      due_today: due0.length,
      due_10_days: due10.length,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
