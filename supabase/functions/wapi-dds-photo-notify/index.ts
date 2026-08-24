// @ts-nocheck
// Enfileira no wapi_outbox o envio da foto da Lista de Presença do DDS para o grupo configurado,
// respeitando o throttle global do worker wapi-queue-worker.
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
    const { caption, image_url } = body || {};

    if (!caption || typeof caption !== "string") {
      return new Response(JSON.stringify({ error: "caption obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hasImage = !!(image_url && typeof image_url === "string" && image_url.trim());

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, group_id, group_id_dds, auto_send_dds_photo")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetGroupId = (cfg?.group_id_dds || "").trim();
    if (!cfg || !cfg.enabled || !cfg.auto_send_dds_photo || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled-or-no-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await admin.from("wapi_outbox").insert({
      kind: hasImage ? "image" : "text",
      target_type: "group",
      phone: targetGroupId,
      message: hasImage ? null : caption,
      caption: hasImage ? caption : null,
      image_url: hasImage ? image_url : null,
      origin: "dds_photo",
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
    console.error("[wapi-dds-photo-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
