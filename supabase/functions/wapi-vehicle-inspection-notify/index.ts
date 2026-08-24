// @ts-nocheck
// Alerta automático no grupo do WhatsApp 10 dias antes do vencimento de qualquer
// data de vistoria de equipamentos (vistoria, laudo opacidade, laudo mecânico,
// plano de manutenção, cronógrafo). Cron diário às 06:00h Pará (UTC-3).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALERT_DAYS = 10;

const FIELDS: { key: string; label: string }[] = [
  { key: "vistoria", label: "Vistoria" },
  { key: "laudo_opacidade", label: "Laudo Opacidade" },
  { key: "laudo_mecanico", label: "Laudo Mecânico" },
  { key: "plano_manutencao", label: "Plano Manutenção" },
  { key: "cronografo", label: "Cronógrafo" },
];

// Pará UTC-3 today at midnight (em ms UTC)
const paraTodayUTC = () => {
  const now = new Date();
  const para = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return Date.UTC(para.getUTCFullYear(), para.getUTCMonth(), para.getUTCDate());
};

// Datas no banco vêm como ISO 'YYYY-MM-DD'
const parseISO = (d: string | null | undefined): number | null => {
  if (!d || typeof d !== "string") return null;
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const da = parseInt(m[3], 10);
  if (!y || !mo || !da) return null;
  return Date.UTC(y, mo - 1, da);
};

const fmtDateBR = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
};
const fmtDateISO = (ms: number) => new Date(ms).toISOString().slice(0, 10);

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

    if (!cfg.auto_send_vehicle_inspection_alert && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "Alerta de vistoria desabilitado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupId = (cfg.group_id_vehicle_inspection || cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rows, error: vErr } = await admin
      .from("vehicle_inspections")
      .select("placa, modelo_veiculo, numero_cracha, vistoria, laudo_opacidade, laudo_mecanico, plano_manutencao, cronografo");
    if (vErr) throw vErr;

    const todayMs = paraTodayUTC();
    const targetMs = todayMs + ALERT_DAYS * 86400000;

    type Item = {
      key: string;
      placa: string;
      modelo: string;
      cracha: string;
      fieldKey: string;
      fieldLabel: string;
      expiryMs: number;
    };

    const expiring: Item[] = [];
    for (const r of rows || []) {
      for (const f of FIELDS) {
        const ms = parseISO(r[f.key]);
        if (!ms) continue;
        if (ms === targetMs) {
          expiring.push({
            key: `${r.placa}:${f.key}:${fmtDateISO(ms)}`,
            placa: r.placa,
            modelo: r.modelo_veiculo || "",
            cracha: r.numero_cracha || "",
            fieldKey: f.key,
            fieldLabel: f.label,
            expiryMs: ms,
          });
        }
      }
    }

    if (expiring.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: `Nenhuma vistoria vencendo em ${ALERT_DAYS} dias` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotência
    const keys = expiring.map((e) => e.key);
    const { data: sentRows } = await admin
      .from("wapi_vehicle_alerts_sent")
      .select("alert_key")
      .in("alert_key", keys);
    const sentSet = new Set((sentRows || []).map((r: { alert_key: string }) => r.alert_key));

    const toSend = force ? expiring : expiring.filter((e) => !sentSet.has(e.key));
    if (toSend.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Todos os alertas já foram enviados" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Agrupa por placa para mensagem mais limpa
    const byPlaca = new Map<string, { modelo: string; cracha: string; items: Item[] }>();
    for (const e of toSend) {
      if (!byPlaca.has(e.placa)) byPlaca.set(e.placa, { modelo: e.modelo, cracha: e.cracha, items: [] });
      byPlaca.get(e.placa)!.items.push(e);
    }

    const lines: string[] = [];
    lines.push(`🚛 *ALERTA DE VENCIMENTO DE VISTORIA*`);
    lines.push(`_Faltam *${ALERT_DAYS} dias* para o vencimento da(s) data(s) abaixo:_`);
    lines.push("");
    let i = 0;
    for (const [placa, info] of byPlaca.entries()) {
      if (i > 0) lines.push("━━━━━━━━━━━━━━━━━━━━");
      i++;
      lines.push(`🚜 *Placa:* ${placa}`);
      if (info.modelo) lines.push(`🔧 *Modelo:* ${info.modelo}`);
      if (info.cracha) lines.push(`🆔 *Crachá:* ${info.cracha}`);
      lines.push("");
      for (const it of info.items) {
        lines.push(`• *${it.fieldLabel}:* vence em *${fmtDateBR(it.expiryMs)}*`);
      }
    }
    lines.push("");
    lines.push(`⚠️ Providencie a renovação com antecedência.`);
    lines.push(`_Mensagem automática - Sucena_`);
    const message = lines.join("\n");

    let ok = false;
    let errorMsg: string | null = null;
    try {
      const { error: qErr } = await admin.from("wapi_outbox").insert({
        kind: "text", target_type: "group", phone: groupId, message, origin: "vehicle-inspection",
        recipient_name: "Grupo - Alerta Vistoria",
      });
      ok = !qErr;
      if (qErr) errorMsg = qErr.message;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
    }

    if (ok && !force) {
      const inserts = toSend.map((e) => ({
        alert_key: e.key,
        placa: e.placa,
        field_key: e.fieldKey,
        expiry_date: fmtDateISO(e.expiryMs),
      }));
      await admin.from("wapi_vehicle_alerts_sent").insert(inserts);
    }

    return new Response(JSON.stringify({
      success: ok,
      total: toSend.length,
      placas: Array.from(byPlaca.keys()),
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
