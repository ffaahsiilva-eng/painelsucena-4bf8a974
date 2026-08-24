// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const inspectionDate: string | undefined = body?.inspection_date;
    const userName: string | undefined = body?.user_name;

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, instance_url, instance_token, instance_id, group_id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled || !cfg.instance_url || !cfg.instance_token || !cfg.instance_id) {
      return new Response(JSON.stringify({ skipped: "wapi_disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const groupId = (cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: "no_group" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let dateBr = "—";
    if (inspectionDate) {
      const [y, m, d] = inspectionDate.split("-");
      if (y && m && d) dateBr = `${d}/${m}/${y}`;
    }

    const nowPara = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const hhmm = `${String(nowPara.getUTCHours()).padStart(2, "0")}:${String(nowPara.getUTCMinutes()).padStart(2, "0")}`;

    const message =
      `✅ *INSPEÇÃO DE CANTEIRO CONCLUÍDA*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Data prevista:* ${dateBr}\n` +
      `*Concluída em:* ${hhmm}\n` +
      (userName ? `*Responsável:* ${userName}\n` : "") +
      `\nA inspeção foi realizada e salva no histórico.\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `_Mensagem automática - Sucena_`;

    const { error: qErr } = await admin.from("wapi_outbox").insert({
      kind: "text",
      target_type: "group",
      phone: groupId,
      message,
      origin: "site-inspection-done",
      recipient_name: "Grupo - Inspeção Canteiro",
    });

    if (qErr) {
      return new Response(JSON.stringify({ error: qErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
