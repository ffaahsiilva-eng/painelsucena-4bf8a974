// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pará UTC-3 hoje à meia-noite (em UTC ms)
const paraTodayUTC = () => {
  const now = new Date();
  const para = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return Date.UTC(para.getUTCFullYear(), para.getUTCMonth(), para.getUTCDate());
};

const fmtBR = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

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
    } catch { /* ignore */ }

    const { data: cfg } = await admin
      .from("wapi_config").select("*")
      .order("updated_at", { ascending: false })
      .limit(1).maybeSingle();

    if (!cfg || !cfg.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "W-API desabilitada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!cfg.auto_send_desvio_due_alert && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "Alerta de prazo de desvio desabilitado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupId = (cfg.group_id_desvio_due || cfg.group_id_desvios || cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todayMs = paraTodayUTC();
    const in3Ms = todayMs + 3 * 86400000;
    const todayISO = new Date(todayMs).toISOString().slice(0, 10);
    const in3ISO = new Date(in3Ms).toISOString().slice(0, 10);

    // Busca desvios em aberto com vencimento hoje ou daqui 3 dias
    const { data: desvios, error: dErr } = await admin
      .from("desvios")
      .select("id, description, due_date, status, mentioned_user_name, mentioned_user_names, created_by_name, environment, items")
      .neq("status", "corrigido")
      .in("due_date", [todayISO, in3ISO]);
    if (dErr) throw dErr;

    if (!desvios || desvios.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Nenhum desvio com prazo hoje ou em 3 dias" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotência
    const candidates = desvios.map((d: any) => {
      const alertType = d.due_date === todayISO ? "due_today" : "due_3d";
      return { ...d, alertType, key: `${d.id}:${d.due_date}:${alertType}` };
    });

    const keys = candidates.map((c) => c.key);
    const { data: sentRows } = await admin
      .from("wapi_desvio_due_alerts_sent")
      .select("desvio_key")
      .in("desvio_key", keys);
    const sent = new Set((sentRows || []).map((r: any) => r.desvio_key));
    const toSend = force ? candidates : candidates.filter((c) => !sent.has(c.key));

    if (toSend.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Todos os alertas já foram enviados" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Agrupa por tipo de alerta
    const dueToday = toSend.filter((c) => c.alertType === "due_today");
    const due3d = toSend.filter((c) => c.alertType === "due_3d");

    const lines: string[] = [];
    lines.push(`⚠️ *ALERTA DE PRAZO DE DESVIOS*`);
    lines.push("");

    const renderBlock = (list: any[], title: string) => {
      if (list.length === 0) return;
      lines.push(`*${title}* — ${list.length} item(ns)`);
      lines.push("");
      list.forEach((d, idx) => {
        if (idx > 0) lines.push("━━━━━━━━━━━━━━━━━━━━");
        const desc = (d.description || "").trim();
        lines.push(`📝 ${desc.length > 200 ? desc.slice(0, 200) + "…" : desc}`);
        const responsaveis = Array.isArray(d.mentioned_user_names) && d.mentioned_user_names.length > 0
          ? d.mentioned_user_names.join(", ")
          : (d.mentioned_user_name || "—");
        lines.push(`👤 *Responsáveis:* ${responsaveis}`);
        lines.push(`📅 *Prazo:* ${fmtBR(d.due_date)}`);
        if (d.environment) lines.push(`🏷️ *Ambiente:* ${String(d.environment).toUpperCase()}`);
        if (d.created_by_name) lines.push(`✍️ *Registrado por:* ${d.created_by_name}`);
        if (Array.isArray(d.items) && d.items.length > 0) {
          const pend = d.items.filter((it: any) => !it?.done);
          if (pend.length > 0) {
            lines.push(`📋 *Itens pendentes:*`);
            pend.slice(0, 8).forEach((it: any) => {
              lines.push(`   • ${String(it?.text ?? it?.title ?? "").slice(0, 120)}`);
            });
            if (pend.length > 8) lines.push(`   ...e mais ${pend.length - 8}`);
          }
        }
        lines.push("");
      });
    };

    if (dueToday.length > 0) {
      renderBlock(dueToday, "🚨 VENCE HOJE");
    }
    if (due3d.length > 0) {
      if (dueToday.length > 0) lines.push("════════════════════");
      renderBlock(due3d, "⏰ FALTAM 3 DIAS");
    }

    lines.push(`_Mensagem automática - Sucena_`);
    const message = lines.join("\n");

    let ok = false;
    let errorMsg: string | null = null;
    try {
      const { error: qErr } = await admin.from("wapi_outbox").insert({
        kind: "text",
        target_type: "group",
        phone: groupId,
        message,
        origin: "desvio_due",
        recipient_name: "Grupo - Alerta Prazo Desvios",
      });
      ok = !qErr;
      if (qErr) errorMsg = qErr.message;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
    }

    if (ok && !force) {
      const inserts = toSend.map((c) => ({
        desvio_key: c.key,
        due_date: c.due_date,
        alert_type: c.alertType,
      }));
      await admin.from("wapi_desvio_due_alerts_sent").insert(inserts);
    }

    return new Response(JSON.stringify({
      success: ok,
      total: toSend.length,
      due_today: dueToday.length,
      due_3d: due3d.length,
      error: errorMsg,
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
