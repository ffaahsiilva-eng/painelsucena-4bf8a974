// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendWapiGroupText(cfg: any, groupId: string, message: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(supabaseUrl, serviceKey);
  
  const { error } = await client.from("wapi_outbox").insert({
    kind: "text",
    target_type: "group",
    phone: groupId,
    message,
    origin: "planned-activities",
  });
  return { ok: !error, error };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const payload = await req.json().catch(() => ({}));
    const { planned, date, force, area } = payload || {};

    // Get config
    const { data: cfg } = await admin.from("wapi_config").select("*").limit(1).single();
    if (!cfg || !cfg.enabled || (!cfg.auto_send_planned_activities && !force)) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetGroupId = (cfg.group_id_planned_activities || cfg.group_id || "").trim();
    if (!targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!planned && !force) {
      return new Response(JSON.stringify({ error: "planned object is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formattedDate = date ? new Date(date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    
    let message = `📋 *ATIVIDADES PREVISTAS - ${formattedDate}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    let hasContent = false;

    const manualGabList: string[] = Array.isArray(planned?.manual_gabiao_list)
      ? planned.manual_gabiao_list.map((s: string) => (s || "").trim()).filter(Boolean)
      : (planned?.manual_gabiao ? [String(planned.manual_gabiao).trim()].filter(Boolean) : []);
    const manualJardList: string[] = Array.isArray(planned?.manual_jardinagem_list)
      ? planned.manual_jardinagem_list.map((s: string) => (s || "").trim()).filter(Boolean)
      : (planned?.manual_jardinagem ? [String(planned.manual_jardinagem).trim()].filter(Boolean) : []);

    if ((!area || area === "gabiao") && ((planned?.gabiao && planned.gabiao.length > 0) || manualGabList.length > 0)) {
      message += `*🧱 GABIÃO:*\n`;
      if (planned.faixa_gabiao) message += `📍 Faixa: ${planned.faixa_gabiao}\n`;
      if (planned.unidade_gabiao) message += `🧱 Unidade: ${planned.unidade_gabiao}\n`;
      (planned.gabiao || []).forEach((act: string) => {
        message += `• ${act}\n`;
      });
      manualGabList.forEach((act) => {
        message += `📝 ${act}\n`;
      });
      message += `\n`;
      hasContent = true;
    }

    if ((!area || area === "jardinagem") && ((planned?.jardinagem && planned.jardinagem.length > 0) || manualJardList.length > 0)) {
      message += `*🌿 JARDINAGEM:*\n`;
      if (planned.faixa_jardinagem) message += `📍 Faixa: ${planned.faixa_jardinagem}\n`;
      (planned.jardinagem || []).forEach((act: string) => {
        message += `• ${act}\n`;
      });
      manualJardList.forEach((act) => {
        message += `📝 ${act}\n`;
      });
      message += `\n`;
      hasContent = true;
    }

    if (!hasContent) {
      if (force) {
        message += `_Nenhuma atividade prevista registrada para esta área._\n`;
      } else {
        return new Response(JSON.stringify({ skipped: true, reason: "no-activities-for-area" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `✅ Planejamento atualizado.`;

    const result = await sendWapiGroupText(cfg, targetGroupId, message);

    return new Response(
      JSON.stringify({ success: result.ok, error: result.error }),
      { status: result.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[wapi-planned-activities-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
