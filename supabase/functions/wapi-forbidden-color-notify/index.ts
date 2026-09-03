// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mesma rotação fixa do componente ForbiddenColorIndicator
const COLOR_MAP: Record<number, { name: string; emoji: string }> = {
  0: { name: "Vermelha", emoji: "🔴" },
  1: { name: "Azul", emoji: "🔵" },
  2: { name: "Amarela", emoji: "🟡" },
  3: { name: "Verde", emoji: "🟢" },
  4: { name: "Vermelha", emoji: "🔴" },
  5: { name: "Azul", emoji: "🔵" },
  6: { name: "Amarela", emoji: "🟡" },
  7: { name: "Verde", emoji: "🟢" },
  8: { name: "Vermelha", emoji: "🔴" },
  9: { name: "Azul", emoji: "🔵" },
  10: { name: "Amarela", emoji: "🟡" },
  11: { name: "Verde", emoji: "🟢" },
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const buildWapiEndpoint = (rawUrl: string, instanceId: string) => {
  const url = new URL(rawUrl.trim());
  if (url.hostname === "painel.w-api.app" || url.pathname.startsWith("/app")) {
    url.protocol = "https:";
    url.hostname = "api.w-api.app";
  }
  if (!url.pathname.replace(/\/+$/, "").endsWith("/send-text")) {
    url.pathname = "/v1/message/send-text";
  }
  url.searchParams.set("instanceId", instanceId);
  return url.toString();
};

// Pará UTC-3
const paraDate = () => {
  const now = new Date();
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
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

    if (!cfg.auto_send_forbidden_color_alert && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "Alerta de cor proibida desabilitado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupId = (cfg.group_id_forbidden_color || cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const para = paraDate();
    const day = para.getUTCDate();
    const month = para.getUTCMonth();
    const year = para.getUTCFullYear();

    // Só envia no dia 1º (mudança de mês), exceto em modo force (teste)
    if (day !== 1 && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: `Hoje não é dia 1 (Pará: ${day}/${month + 1})` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const colorInfo = COLOR_MAP[month];
    const monthName = MONTH_NAMES[month];

    const lines: string[] = [];
    lines.push(`🎨 *MUDANÇA DA COR PROIBIDA DO MÊS*`);
    lines.push("");
    lines.push(`📅 Mês de referência: *${monthName}/${year}*`);
    lines.push("");
    lines.push(`⛔ *Cor proibida deste mês:* ${colorInfo.emoji} *${colorInfo.name.toUpperCase()}*`);
    lines.push("");
    lines.push(`⚠️ *ATENÇÃO!* Fiquem atentos com a cor proibida do mês.`);
    lines.push(`Não utilizem nenhum item, vestimenta ou EPI na cor *${colorInfo.name}* durante todo o mês de ${monthName}.`);
    lines.push("");
    lines.push(`🛡️ Sigam rigorosamente as orientações de segurança.`);
    lines.push(`Em caso de dúvidas, procurem a equipe de HSE.`);
    lines.push("");
    lines.push(`_Mensagem automática - Sucena_`);
    const message = lines.join("\n");

    let ok = false;
    let errorMsg: string | null = null;
    try {
      const { error: qErr } = await admin.from("wapi_outbox").insert({
        kind: "text", target_type: "group", phone: groupId, message, origin: "forbidden-color",
        recipient_name: "Grupo - Cor Proibida do Mês",
      });
      ok = !qErr;
      if (qErr) errorMsg = qErr.message;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
    }

    return new Response(JSON.stringify({
      success: ok,
      month: monthName,
      color: colorInfo.name,
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
