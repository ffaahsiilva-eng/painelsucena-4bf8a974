// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment",
};

const ATIVIDADE_NOMES: Record<string, string> = {
  limpeza_mirante: "Limpeza no Mirante",
  roco: "Roço",
  reparo_mudas: "Reparo de Mudas",
  adubacao: "Adubação",
  lavagem_pipa: "Lavagem com Pipa",
  limpeza_soprador: "Limpeza com Soprador",
};

// Pará UTC-3 today (midnight UTC ms)
const paraTodayUTC = () => {
  const now = new Date();
  const para = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return Date.UTC(para.getUTCFullYear(), para.getUTCMonth(), para.getUTCDate());
};

const fmtDateBR = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
};
const fmtISO = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Parse "dd/MM" or "dd/MM/yyyy" -> ms (assume current year if no year)
function parseDate(str: string, refYear: number): number | null {
  if (!str) return null;
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  let y = m[3] ? parseInt(m[3], 10) : refYear;
  if (y < 100) y += 2000;
  return Date.UTC(y, mo, d);
}

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
      .from("wapi_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled || !cfg.instance_url || !cfg.instance_token || !cfg.instance_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "W-API não configurada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!cfg.auto_send_cronograma_mirante && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "Alerta do Cronograma do Mirante desabilitado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const groupId = (cfg.group_id_cronograma_mirante || cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todayMs = paraTodayUTC();
    const refYear = new Date(todayMs).getUTCFullYear();
    const targets = [
      { ms: todayMs, type: "due_today", label: "HOJE" },
      { ms: todayMs + 2 * 86400000, type: "due_in_2_days", label: "EM 2 DIAS" },
    ];

    const { data: rows, error } = await admin
      .from("cronograma_mirante")
      .select("atividade_key, datas");
    if (error) throw error;

    type Pending = { atividade_key: string; nome: string; ms: number; type: string; label: string; key: string };
    const pending: Pending[] = [];
    for (const row of rows || []) {
      const datas = Array.isArray(row.datas) ? row.datas : [];
      for (const d of datas) {
        if (d?.done) continue;
        const ms = parseDate(d?.date, refYear);
        if (ms == null) continue;
        for (const t of targets) {
          if (ms === t.ms) {
            pending.push({
              atividade_key: row.atividade_key,
              nome: ATIVIDADE_NOMES[row.atividade_key] || row.atividade_key,
              ms,
              type: t.type,
              label: t.label,
              key: `${row.atividade_key}:${fmtISO(ms)}:${t.type}`,
            });
          }
        }
      }
    }

    if (pending.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Nenhuma atividade do cronograma para hoje ou em 2 dias" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotência
    const keys = pending.map((p) => p.key);
    const { data: sentRows } = await admin
      .from("wapi_cronograma_mirante_alerts_sent")
      .select("alert_key")
      .in("alert_key", keys);
    const sentSet = new Set((sentRows || []).map((r: any) => r.alert_key));
    const toSend = force ? pending : pending.filter((p) => !sentSet.has(p.key));
    if (toSend.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Todos os alertas já foram enviados" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Agrupa por tipo (hoje vs 2 dias)
    const byType: Record<string, Pending[]> = {};
    for (const p of toSend) {
      (byType[p.type] = byType[p.type] || []).push(p);
    }

    const lines: string[] = [];
    lines.push(`📅 *CRONOGRAMA DE MANUTENÇÃO - MIRANTE*`);
    lines.push("");
    if (byType["due_today"]?.length) {
      lines.push(`🔔 *ATIVIDADES PARA HOJE (${fmtDateBR(todayMs)}):*`);
      for (const p of byType["due_today"]) {
        lines.push(`   • ${p.nome}`);
      }
      lines.push("");
    }
    if (byType["due_in_2_days"]?.length) {
      const futureMs = todayMs + 2 * 86400000;
      lines.push(`⏰ *FALTAM 2 DIAS (${fmtDateBR(futureMs)}):*`);
      for (const p of byType["due_in_2_days"]) {
        lines.push(`   • ${p.nome}`);
      }
      lines.push("");
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
        origin: "cronograma_mirante",
        recipient_name: "Grupo - Cronograma Mirante",
      });
      ok = !qErr;
      if (qErr) errorMsg = qErr.message;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
    }

    if (ok && !force) {
      const inserts = toSend.map((p) => ({
        alert_key: p.key,
        atividade_key: p.atividade_key,
        scheduled_date: fmtISO(p.ms),
        alert_type: p.type,
      }));
      await admin.from("wapi_cronograma_mirante_alerts_sent").insert(inserts);
    }

    return new Response(JSON.stringify({
      success: ok,
      total: toSend.length,
      atividades: toSend.map((p) => ({ nome: p.nome, data: fmtDateBR(p.ms), tipo: p.type })),
      error: errorMsg,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
