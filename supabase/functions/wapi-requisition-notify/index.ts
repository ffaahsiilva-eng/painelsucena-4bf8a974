// @ts-nocheck
// Enfileira mensagem de requisição (EPI/Material) no wapi_outbox para envio ao grupo,
// respeitando o delay global definido pelo Admin (worker wapi-queue-worker).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { type, caption, image_url, external_id } = body || {};
    const externalKind = type === "epi" ? "epi_exchange" : "material_requisition";

    if (!type || (type !== "epi" && type !== "material")) {
      return new Response(JSON.stringify({ error: "type inválido (epi|material)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!caption || typeof caption !== "string") {
      return new Response(JSON.stringify({ error: "caption obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // image_url é preferencial; se ausente, envia somente texto (fallback) para não perder a notificação
    const hasImage = !!(image_url && typeof image_url === "string" && image_url.trim());

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, group_id, group_id_requisitions, auto_send_requisitions")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetGroupId = (cfg?.group_id_requisitions || cfg?.group_id || "").trim();
    if (!cfg || !cfg.enabled || cfg.auto_send_requisitions === false || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled-or-no-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dedupeKey = external_id ? `requisition|${type}|${external_id}` : null;
    const { error: insErr } = await admin.from("wapi_outbox").insert({
      kind: hasImage ? "image" : "text",
      target_type: "group",
      phone: targetGroupId,
      message: hasImage ? null : caption,
      caption: hasImage ? caption : null,
      image_url: hasImage ? image_url : null,
      origin: `requisition_${type}`,
      external_kind: externalKind,
      external_id: external_id || null,
      dedupe_key: dedupeKey,
    });


    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ queued: true }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-requisition-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
